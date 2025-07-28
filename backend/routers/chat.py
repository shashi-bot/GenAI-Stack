from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from schemas import (
    ChatSessionCreate, ChatSessionResponse,
    ChatMessageResponse, ChatRequest, ChatResponse
)
from services.chat_service import ChatService
from services.workflow_service import WorkflowService
from dependencies import get_current_user
from models import User

router = APIRouter()

@router.post("/sessions", response_model=ChatSessionResponse)
async def create_chat_session(
    session_data: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new chat session"""
    chat_service = ChatService(db)
    
    # Verify workflow exists and belongs to the current user
    workflow_service = WorkflowService(db)
    workflow = workflow_service.get_workflow(session_data.workflow_id)
    if not workflow or workflow.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workflow not found or not authorized")
    
    return chat_service.create_session(session_data, current_user.id)

@router.get("/sessions", response_model=List[ChatSessionResponse])
async def list_chat_sessions(
    workflow_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List chat sessions for the current user"""
    chat_service = ChatService(db)
    return chat_service.get_sessions(
        workflow_id=workflow_id,
        owner_id=current_user.id,
        skip=skip,
        limit=limit
    )

@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific chat session"""
    chat_service = ChatService(db)
    session = chat_service.get_session(session_id)
    if not session or session.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat session not found or not authorized")
    return session

@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a chat session and all its messages"""
    chat_service = ChatService(db)
    session = chat_service.get_session(session_id)
    if not session or session.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat session not found or not authorized")
    success = chat_service.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {"message": "Chat session deleted successfully"}

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    session_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get messages for a chat session"""
    chat_service = ChatService(db)
    
    # Verify session exists and belongs to the current user
    session = chat_service.get_session(session_id)
    if not session or session.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat session not found or not authorized")
    
    return chat_service.get_messages(session_id, skip=skip, limit=limit)

@router.post("/sessions/{session_id}/messages", response_model=ChatResponse)
async def send_message(
    session_id: int,
    chat_request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message and get AI response"""
    chat_service = ChatService(db)
    
    # Verify session exists and belongs to the current user
    session = chat_service.get_session(session_id)
    if not session or session.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat session not found or not authorized")
    
    try:
        # Process the message through the workflow
        response = await chat_service.process_message(session_id, chat_request.message)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing message: {str(e)}")

@router.post("/quick-chat", response_model=ChatResponse)
async def quick_chat(
    workflow_id: int,
    message: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Quick chat without creating a persistent session"""
    workflow_service = WorkflowService(db)
    
    # Verify workflow exists and belongs to the current user
    workflow = workflow_service.get_workflow(workflow_id)
    if not workflow or workflow.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workflow not found or not authorized")
    
    try:
        # Execute workflow directly
        execution = await workflow_service.execute_workflow(workflow_id, message)
        
        response_data = execution.execution_result or {}
        return ChatResponse(
            response=response_data.get("response", "No response generated"),
            execution_id=execution.id,
            sources=response_data.get("sources", []),
            metadata=response_data.get("metadata", {})
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing message: {str(e)}")