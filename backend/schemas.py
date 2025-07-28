from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional
from datetime import datetime
#User Schemas
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Document Schemas
class DocumentBase(BaseModel):
    filename: str
    original_filename: str

class DocumentCreate(DocumentBase):
    file_path: str
    file_size: int
    content_type: str
    extracted_text: Optional[str] = None

class DocumentResponse(DocumentBase):
    id: int
    file_size: int
    content_type: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class DocumentWithText(DocumentResponse):
    extracted_text: Optional[str] = None

# Workflow Schemas
class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None

class WorkflowCreate(WorkflowBase):
    workflow_data: Optional[Dict[str, Any]] = {}

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    workflow_data: Optional[Dict[str, Any]] = {}
    is_active: Optional[bool] = None

class WorkflowResponse(WorkflowBase):
    id: int
    workflow_data: Optional[Dict[str, Any]]={}
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    owner_id: int
    class Config:
        from_attributes = True

# Execution Schemas  
class WorkflowExecutionCreate(BaseModel):
    workflow_id: int
    user_query: str

class WorkflowExecutionResponse(BaseModel):
    id: int
    workflow_id: int
    user_query: str
    execution_result: Optional[Dict[str, Any]] = None
    execution_status: str
    execution_logs: Optional[Dict[str, Any]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Chat Schemas
class ChatSessionCreate(BaseModel):
    workflow_id: int
    session_name: Optional[str] = None

class ChatSessionResponse(BaseModel):
    id: int
    workflow_id: int
    session_name: Optional[str] = None
    created_at: datetime
    owner_id: int
    class Config:
        from_attributes = True

class ChatMessageCreate(BaseModel):
    message_type: str = Field(..., pattern="^(user|assistant|system)$")
    content: str
    metadata_msg: Optional[Dict[str, Any]] = None

class ChatMessageResponse(BaseModel):
    id: int
    message_type: str
    content: str
    metadata_msg: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    session_id: int
    message: str

class ChatResponse(BaseModel):
    response: str
    execution_id: Optional[int] = None
    sources: Optional[List[Dict[str, Any]]] = None
    metadata_msg: Optional[Dict[str, Any]] = None

# Component Schemas
class ComponentConfig(BaseModel):
    component_type: str
    config: Dict[str, Any]

class NodeData(BaseModel):
    label: str
    component_type: str
    config: Dict[str, Any]

    @validator('config')
    def validate_config(cls, v, values):
        component_type = values.get('component_type')
        if component_type == 'llm':
            if not v.get('apiKey'):
                raise ValueError('LLM Engine requires apiKey in config')
            if not v.get('model'):
                raise ValueError('LLM Engine requires model in config')
            if v.get('webSearchEnabled') and not v.get('serpApi'):
                raise ValueError('LLM Engine with web search enabled requires serpApi in config')
        elif component_type == 'knowledgeBase':
            if not v.get('apiKey'):
                raise ValueError('Knowledge Base requires apiKey in config')
        elif component_type == 'webSearch':
            if not v.get('apiKey'):
                raise ValueError('Web Search requires apiKey in config')
        return v

class WorkflowNode(BaseModel):
    id: str
    type: str
    position: Dict[str, float]
    data: NodeData

class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None

class WorkflowData(BaseModel):
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]

# Embedding Schemas
class EmbeddingCreate(BaseModel):
    document_id: int
    chunk_text: str
    chunk_index: int

class EmbeddingResponse(BaseModel):
    id: int
    document_id: int
    chunk_text: str
    chunk_index: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Search Schemas
class SearchQuery(BaseModel):
    query: str
    top_k: int = 5
    document_ids: Optional[List[int]] = None

class SearchResult(BaseModel):
    document_id: int
    chunk_text: str
    similarity_score: float
    document_name: str