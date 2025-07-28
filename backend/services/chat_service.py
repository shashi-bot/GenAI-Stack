from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from models import ChatSession, ChatMessage
from schemas import ChatSessionCreate, ChatMessageCreate, ChatResponse
from services.workflow_service import WorkflowService

class ChatService:
    def __init__(self, db: Session):
        self.db = db
        self.workflow_service = WorkflowService(db)

    def create_session(self, session_data: ChatSessionCreate, owner_id: int) -> ChatSession:
        """Create a new chat session"""
        db_session = ChatSession(
            workflow_id=session_data.workflow_id,
            session_name=session_data.session_name or f"Chat Session - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
            owner_id=owner_id
        )
        self.db.add(db_session)
        self.db.commit()
        self.db.refresh(db_session)
        return db_session

    def get_session(self, session_id: int) -> Optional[ChatSession]:
        """Get a chat session by ID"""
        return self.db.query(ChatSession).filter(ChatSession.id == session_id).first()

    def get_sessions(self, workflow_id: Optional[int] = None, owner_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[ChatSession]:
        """Get chat sessions with optional filtering"""
        query = self.db.query(ChatSession)
        if workflow_id:
            query = query.filter(ChatSession.workflow_id == workflow_id)
        if owner_id:
            query = query.filter(ChatSession.owner_id == owner_id)
        return query.order_by(ChatSession.updated_at.desc()).offset(skip).limit(limit).all()

    def delete_session(self, session_id: int) -> bool:
        """Delete a chat session and all its messages"""
        session = self.get_session(session_id)
        if session:
            # Delete messages first
            self.db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
            # Delete session
            self.db.delete(session)
            self.db.commit()
            return True
        return False

    def add_message(self, session_id: int, message_data: ChatMessageCreate) -> ChatMessage:
        """Add a message to a chat session"""
        db_message = ChatMessage(
            session_id=session_id,
            message_type=message_data.message_type,
            content=message_data.content,
            metadata_msg=message_data.metadata_msg
        )
        self.db.add(db_message)
        
        # Update session timestamp
        session = self.get_session(session_id)
        if session:
            session.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(db_message)
        return db_message

    def get_messages(self, session_id: int, skip: int = 0, limit: int = 100) -> List[ChatMessage]:
        """Get messages for a chat session"""
        return self.db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.created_at.asc()).offset(skip).limit(limit).all()

    async def process_message(self, session_id: int, user_message: str) -> ChatResponse:
        """Process a user message through the workflow"""
        session = self.get_session(session_id)
        if not session:
            raise ValueError("Chat session not found")

        # Add user message to chat history
        user_msg_data = ChatMessageCreate(
            message_type="user",
            content=user_message,
            metadata_msg=None
        )
        self.add_message(session_id, user_msg_data)

        try:
            # Execute workflow
            execution = await self.workflow_service.execute_workflow(
                session.workflow_id, 
                user_message
            )

            # Extract response from execution result
            execution_result = execution.execution_result or {}
            response_text = str(execution_result.get("llm_response"))
            sources = execution_result.get("sources", [])
            metadata = execution_result.get("metadata", {})

            # Add assistant message to chat history
            assistant_msg_data = ChatMessageCreate(
                message_type="assistant",
                content=str(response_text),
                metadata_msg={
                    "execution_id": execution.id,
                    "sources": sources,
                    "metadata": metadata
                }
            )
            self.add_message(session_id, assistant_msg_data)

            return ChatResponse(
                response=str(response_text),
                execution_id=execution.id,
                sources=sources,
                metadata_msg=metadata
            )

        except Exception as e:
            # Add error message to chat history
            error_msg = f"Sorry, I encountered an error: {str(e)}"
            error_msg_data = ChatMessageCreate(
                message_type="assistant",
                content=error_msg,
                metadata_msg={"error": True, "error_message": str(e)}
            )
            self.add_message(session_id, error_msg_data)

            return ChatResponse(
                response=error_msg,
                metadata_msg={"error": True, "error_message": str(e)}
            )

    def get_chat_history(self, session_id: int, include_metadata: bool = False) -> List[dict]:
        """Get formatted chat history"""
        messages = self.get_messages(session_id)
        history = []
        
        for message in messages:
            msg_dict = {
                "id": message.id,
                "type": message.message_type,
                "content": message.content,
                "timestamp": message.created_at.isoformat()
            }
            
            if include_metadata and message.metadata_msg:
                msg_dict["metadata_msg"] = message.metadata_msg
            
            history.append(msg_dict)
        
        return history

    def update_session_name(self, session_id: int, new_name: str) -> bool:
        """Update session name"""
        session = self.get_session(session_id)
        if session:
            session.session_name = new_name
            session.updated_at = datetime.utcnow()
            self.db.commit()
            return True
        return False

    def get_session_stats(self, session_id: int) -> dict:
        """Get statistics for a chat session"""
        session = self.get_session(session_id)
        if not session:
            return {}

        messages = self.get_messages(session_id)
        user_messages = [m for m in messages if m.message_type == "user"]
        assistant_messages = [m for m in messages if m.message_type == "assistant"]
        
        return {
            "session_id": session_id,
            "workflow_id": session.workflow_id,
            "total_messages": len(messages),
            "user_messages": len(user_messages),
            "assistant_messages": len(assistant_messages),
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat() if session.updated_at else None,
            "session_name": session.session_name
        }