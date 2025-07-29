import logging
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

from models import Workflow, WorkflowExecution
from schemas import WorkflowCreate, WorkflowUpdate, WorkflowExecutionCreate
from services.llm_service import LLMService
from services.embedding_service import EmbeddingService
from services.web_search_service import WebSearchService

logger = logging.getLogger(__name__)
class WorkflowService:
    def __init__(self, db: Session):
        self.db = db

    def create_workflow(self, workflow_data: WorkflowCreate, owner_id: int) -> Workflow:
        """Create a new workflow"""
        workflow_data_dict = workflow_data.dict()
        if not workflow_data_dict.get('workflow_data'):
            workflow_data_dict['workflow_data'] = {'nodes': [], 'edges': []}
        db_workflow = Workflow(
            name=workflow_data.name,
            description=workflow_data.description,
            workflow_data=workflow_data_dict['workflow_data'], 
            owner_id=owner_id
        )
        self.db.add(db_workflow)
        self.db.commit()
        self.db.refresh(db_workflow)
        return db_workflow

    def get_workflow(self, workflow_id: int) -> Optional[Workflow]:
        """Get a workflow by ID"""
        return self.db.query(Workflow).filter(Workflow.id == workflow_id).first()

    def get_workflows(self, owner_id: Optional[int] = None, skip: int = 0, limit: int = 100, active_only: bool = True) -> List[Workflow]:
        """Get workflows with pagination and optional owner filter"""
        query = self.db.query(Workflow)
        if active_only:
            query = query.filter(Workflow.is_active == True)
        if owner_id:
            query = query.filter(Workflow.owner_id == owner_id)
        return query.offset(skip).limit(limit).all()

    def update_workflow(self, workflow_id: int, workflow_update: WorkflowUpdate) -> Optional[Workflow]:
        workflow = self.get_workflow(workflow_id)
        if not workflow:
            return None
        update_data = workflow_update.dict(exclude_unset=True)
        if 'workflow_data' in update_data:
            # Deep copy to preserve nested config
            update_data['workflow_data'] = json.loads(json.dumps(update_data['workflow_data']))
        for field, value in update_data.items():
            setattr(workflow, field, value)
        workflow.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(workflow)
        return workflow

    def delete_workflow(self, workflow_id: int) -> bool:
        """Delete a workflow"""
        workflow = self.get_workflow(workflow_id)
        if workflow:
            self.db.delete(workflow)
            self.db.commit()
            return True
        return False

    def validate_workflow(self, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate workflow structure"""
        nodes = workflow_data.get('nodes', [])
        edges = workflow_data.get('edges', [])

        if not nodes:
            raise ValueError("Workflow must have at least one node")

        # Check for required components
        component_types = [node['data']['component_type'] for node in nodes]
        
        if 'userQuery' not in component_types:
            raise ValueError("Workflow must have a User Query component")
        
        if 'outputN' not in component_types:
            raise ValueError("Workflow must have an Output component")

        if 'llm' not in component_types:
            raise ValueError("Workflow must have an LLM Engine component")

        # Validate connections
        node_ids = {node['id'] for node in nodes}
        for edge in edges:
            if edge['source'] not in node_ids or edge['target'] not in node_ids:
                raise ValueError(f"Invalid edge connection: {edge['source']} -> {edge['target']}")

        # Check for cycles (basic check)
        if self._has_cycles(nodes, edges):
            raise ValueError("Workflow contains cycles")

        # Validate component configurations
        for node in nodes:
            self._validate_component_config(node)

        return {
            "nodes_count": len(nodes),
            "edges_count": len(edges),
            "components": component_types
        }

    def _has_cycles(self, nodes: List[Dict], edges: List[Dict]) -> bool:
        """Simple cycle detection using DFS"""
        graph = {}
        for node in nodes:
            graph[node['id']] = []
        
        for edge in edges:
            graph[edge['source']].append(edge['target'])

        visited = set()
        rec_stack = set()

        def dfs(node):
            visited.add(node)
            rec_stack.add(node)
            
            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True
            
            rec_stack.remove(node)
            return False

        for node_id in graph:
            if node_id not in visited:
                if dfs(node_id):
                    return True
        return False

    def _validate_component_config(self, node: Dict[str, Any]):
        """Validate individual component configuration"""
        component_type = node['data']['component_type']
        config = node['data'].get('config', {})

        if component_type == 'llm_engine':
            if not config.get('model'):
                raise ValueError(f"LLM Engine component {node['id']} missing model configuration")
            if not config.get('apiKey'):
                raise ValueError(f"LLM Engine component {node['id']} missing apiKey")
        
        elif component_type == 'knowledge_base':
            if not config.get('apiKey'):
                raise ValueError(f"Knowledge Base component {node['id']} missing apiKey")
            if not config.get('selectedDocuments') and not config.get('document_ids'):
                # This is a warning rather than an error
                pass
        elif component_type == 'web_search':
            if not config.get('apiKey'):
                raise ValueError(f"Web Search component {node['id']} missing apiKey")

    async def execute_workflow(self, workflow_id: int, user_query: str) -> WorkflowExecution:
        """Execute a workflow with a user query"""
        workflow = self.get_workflow(workflow_id)
        if not workflow:
            raise ValueError("Workflow not found")

        # Create execution record
        execution = WorkflowExecution(
            workflow_id=workflow_id,
            user_query=user_query,
            execution_status="running"
        )
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)

        try:
            # Execute the workflow
            result = await self._execute_workflow_logic(workflow.workflow_data, user_query)
            
            # Update execution record
            execution.execution_result = result
            execution.execution_status = "completed"
            execution.completed_at = datetime.utcnow()
            
        except Exception as e:
            execution.execution_status = "failed"
            execution.execution_logs = {"error": str(e)}
            
        self.db.commit()
        self.db.refresh(execution)
        return execution

    async def _execute_workflow_logic(self, workflow_data: Dict[str, Any], user_query: str) -> Dict[str, Any]:
        """Execute the actual workflow logic"""
        nodes = workflow_data.get('nodes', [])
        edges = workflow_data.get('edges', [])

        # Build execution graph
        execution_graph = self._build_execution_graph(nodes, edges)
        
        # Find starting node (user_query component)
        start_node = None
        for node in nodes:
            if node['data']['component_type'] == 'userQuery':
                start_node = node
                break

        if not start_node:
            raise ValueError("No user query component found")

        # Execute workflow
        context = {"user_query": user_query}
        result = await self._execute_node(start_node, context, execution_graph, nodes, workflow_data)
        
        # FIXED: Return the final context, not just the last node result
        # The output component should have been executed and added its result to context
        final_response = context.get("response") or context.get("llm_response") or result.get("response")
        
        return {
            "response": final_response,
            "llm_response": context.get("llm_response"),
            "sources": context.get("sources", []),
            "metadata": context.get("metadata", {})
        }


    def _build_execution_graph(self, nodes: List[Dict], edges: List[Dict]) -> Dict[str, List[str]]:
        """Build a graph for execution order"""
        graph = {}
        for node in nodes:
            graph[node['id']] = []
        
        for edge in edges:
            graph[edge['source']].append(edge['target'])
        
        return graph

    async def _execute_node(self, node: Dict, context: Dict, graph: Dict, all_nodes: List[Dict], workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single node and its children"""
        component_type = node['data']['component_type']
        config = node['data'].get('config', {})

        if component_type == 'userQuery':
            result = {"query": context["user_query"]}
            
        elif component_type == 'knowledgeBase':
            result = await self._execute_knowledge_base(config, context, workflow_data)
            
        elif component_type == 'llm':
            result = await self._execute_llm_engine(config, context, workflow_data)
            
        elif component_type == 'webSearch':
            result = await self._execute_web_search(config, context, workflow_data)
            
        elif component_type == 'outputN':
            result = await self._execute_output(config, context)
            
        else:
            raise ValueError(f"Unknown component type: {component_type}")

        # FIXED: Update context with result BEFORE executing next nodes
        context.update(result)

        # Execute next nodes with updated context
        next_node_ids = graph.get(node['id'], [])
        for next_node_id in next_node_ids:
            next_node = next((n for n in all_nodes if n['id'] == next_node_id), None)
            if next_node:
                # Execute next node with updated context
                next_result = await self._execute_node(next_node, context, graph, all_nodes, workflow_data)
                # Update context again with next node's result
                context.update(next_result)

        return result
    async def _execute_knowledge_base(self, config: Dict, context: Dict, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute knowledge base component"""
        user_query = context.get("user_query", "")
        document_ids = [doc['id'] for doc in config.get("selectedDocuments", [])]
        top_k = config.get("top_k", 5)
        api_key = config.get("apiKey")
        model = config.get("model", "openai/text-embedding-3-large")  # Keep your format

        try:
        # Initialize embedding service with node-specific API key
            embedding_service = EmbeddingService(self.db, api_key=api_key)
        
        # FIXED: Check if embeddings exist first, don't regenerate every time!
            missing_embeddings = []
            for doc_id in document_ids:
                validation = embedding_service.validate_document_for_embeddings(doc_id)
                if not validation.get("valid") or validation.get("existing_embeddings", 0) == 0:
                    missing_embeddings.append(doc_id)
                    logger.info(f"Document {doc_id} needs embeddings")
                else:
                    logger.info(f"Document {doc_id} already has embeddings")
        
        # Only generate embeddings for documents that don't have them
            for doc_id in missing_embeddings:
                logger.info(f"Generating embeddings for document {doc_id}")
                await embedding_service.generate_document_embeddings(
                    document_id=doc_id,
                    model=model,
                    chunk_size=config.get("chunkSize", 1000),
                    chunk_overlap=config.get("chunkOverlap", 200)
                )
        
            # Search for relevant documents
            search_results = await embedding_service.search_similar(
                query=user_query,
                top_k=top_k,
                document_ids=document_ids if document_ids else None,
                model=model
            )

            # Combine relevant chunks
            relevant_context = "\n\n".join([
                f"Document: {result.document_name}\nContent: {result.chunk_text}"
                for result in search_results
            ])

            logger.info(f"Knowledge base found {len(search_results)} relevant chunks")

            return {
                "knowledge_context": relevant_context,
                "sources": [
                    {
                     "document_id": result.document_id,
                     "document_name": result.document_name,
                     "similarity_score": result.similarity_score,
                     "chunk_text": result.chunk_text[:200] + "..." if len(result.chunk_text) > 200 else result.chunk_text
                    }
                    for result in search_results
                ]
            }
        except Exception as e:
            logger.error(f"Knowledge base execution failed: {str(e)}")
            return {"knowledge_context": "", "sources": [], "error": str(e)}


    async def _execute_llm_engine(self, config: Dict, context: Dict, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute LLM engine component"""
        user_query = context.get("user_query", "")
        knowledge_context = context.get("knowledge_context", "")
        custom_prompt = config.get("prompt", "")
        model = config.get("model", "")
        use_web_search = config.get("webSearchEnabled", False)
        temperature = float(config.get("temperature", 0.7))
        api_key = config.get("apiKey")
        serpapi_key = config.get("serpApi")

        # Initialize LLM service with node-specific API keys
        llm_service = LLMService(
            api_key=api_key,
            github_token=api_key if api_key and api_key.startswith("gh") else None
        )

        # Build prompt
        system_prompt = custom_prompt if custom_prompt else "You are a helpful AI assistant."

        user_prompt = user_query
        if knowledge_context:
            user_prompt = f"Context:\n{knowledge_context}\n\nQuestion: {user_query}"

        # Get web search results if enabled
        web_context = ""
        if use_web_search:
            try:
                web_search_service = WebSearchService(serpapi_key=serpapi_key)
                web_results = await web_search_service.search(user_query, search_api="SerpAPI")
                if web_results:
                    web_context = "\n\nWeb Search Results:\n" + "\n".join([
                        f"- {result['title']}: {result['snippet']}"
                        for result in web_results[:3]
                    ])
                    user_prompt += web_context
            except Exception as e:
                logger.error(f"Web search failed: {e}")

        try:
            # Generate response using LLM
            response = await llm_service.generate_response(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model=model,
                temperature=temperature
            )

            logger.info(f"LLM generated response: {response}")  # Debug log
            
            # FIXED: Ensure response is properly returned
            if not response or response.strip() == "":
                response = "I apologize, but I couldn't generate a response. Please try again."
                
            return {
                "llm_response": str(response),
                "model_used": model,
                "web_search_used": use_web_search
            }
        except Exception as e:
            logger.error(f"LLM execution error: {str(e)}")
            return {
                "llm_response": f"Error generating response: {str(e)}",
                "model_used": model,
                "web_search_used": use_web_search
            }

    async def _execute_web_search(self, config: Dict, context: Dict, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute web search component"""
        user_query = context.get("user_query", "")
        num_results = config.get("numResults", 5)
        search_api = config.get("searchAPI", "SerpAPI")
        api_key = config.get("apiKey")

        try:
            # Initialize web search service with node-specific API key
            web_search_service = WebSearchService(
                serpapi_key=api_key if search_api == "SerpAPI" else None,
                brave_api_key=api_key if search_api == "Brave Search" else None
            )

            # Perform search based on search type
            if config.get("searchType") == "news":
                results = await web_search_service.search_news(user_query, num_results, search_api)
            else:
                results = await web_search_service.search(user_query, num_results, search_api)

            web_context = "\n".join([
                f"- {result['title']}: {result['snippet']}"
                for result in results
            ])

            return {
                "web_context": web_context,
                "web_results": results
            }
        except Exception as e:
            print(f"Web search execution failed: {e}")
            return {"web_context": "", "web_results": []}

    async def _execute_output(self, config: Dict, context: Dict) -> Dict[str, Any]:
        """Execute output component"""
        # Get the LLM response from context
        llm_response = context.get("llm_response", "")
        sources = context.get("sources", [])
        
        logger.info(f"Output component received llm_response: {llm_response}")  # Debug log
        
        # FIXED: Ensure we have a valid response
        if not llm_response or str(llm_response).strip() == "":
            llm_response = "No response was generated. Please try again."
            logger.warning("Output component: Empty llm_response detected")
        
        return {
            "response": str(llm_response),  # This is what gets returned to chat
            "sources": sources,
            "metadata": {
                "model_used": context.get("model_used"),
                "web_search_used": context.get("web_search_used", False)
            }
        }


    def get_workflow_executions(self, workflow_id: int, skip: int = 0, limit: int = 50) -> List[WorkflowExecution]:
        """Get execution history for a workflow"""
        return self.db.query(WorkflowExecution).filter(
            WorkflowExecution.workflow_id == workflow_id
        ).order_by(WorkflowExecution.created_at.desc()).offset(skip).limit(limit).all()

    def get_execution(self, execution_id: int) -> Optional[WorkflowExecution]:
        """Get a specific execution"""
        return self.db.query(WorkflowExecution).filter(WorkflowExecution.id == execution_id).first()