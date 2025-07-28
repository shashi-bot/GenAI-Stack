from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from schemas import (
    WorkflowCreate, WorkflowResponse, WorkflowUpdate,
    WorkflowExecutionCreate, WorkflowExecutionResponse
)
from services.workflow_service import WorkflowService
from dependencies import get_current_user
from models import User

router = APIRouter()

@router.post("/", response_model=WorkflowResponse)
async def create_workflow(
    workflow: WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new workflow"""
    workflow_service = WorkflowService(db)
    return workflow_service.create_workflow(workflow, current_user.id)

@router.get("/", response_model=List[WorkflowResponse])
async def list_workflows(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all workflows for the current user"""
    workflow_service = WorkflowService(db)
    workflows= workflow_service.get_workflows(
        owner_id=current_user.id,
        skip=skip,
        limit=limit,
        active_only=active_only
    )
    for workflow in workflows:
        print(f"Workflow ID: {workflow.id}, Workflow Data: {workflow.workflow_data}")
    return workflows

@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific workflow"""
    workflow_service = WorkflowService(db)
    workflow = workflow_service.get_workflow(workflow_id)
    if not workflow or workflow.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workflow not found or not authorized")
    return workflow

@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: int,
    workflow_update: WorkflowUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a workflow"""
    workflow_service = WorkflowService(db)
    
    # Verify workflow exists and belongs to the current user
    workflow = workflow_service.get_workflow(workflow_id)
    if not workflow or workflow.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workflow not found or not authorized")
    
    # Validate workflow structure if provided
    if workflow_update.workflow_data:
        try:
            workflow_service.validate_workflow(workflow_update.workflow_data)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    workflow = workflow_service.update_workflow(workflow_id, workflow_update)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow

@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a workflow"""
    workflow_service = WorkflowService(db)
    workflow = workflow_service.get_workflow(workflow_id)
    if not workflow or workflow.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workflow not found or not authorized")
    success = workflow_service.delete_workflow(workflow_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"message": "Workflow deleted successfully"}

@router.post("/{workflow_id}/validate")
async def validate_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Validate a workflow structure"""
    workflow_service = WorkflowService(db)
    workflow = workflow_service.get_workflow(workflow_id)
    if not workflow or workflow.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workflow not found or not authorized")
    
    try:
        validation_result = workflow_service.validate_workflow(workflow.workflow_data)
        return {
            "valid": True,
            "message": "Workflow is valid",
            "validation_details": validation_result
        }
    except ValueError as e:
        return {
            "valid": False,
            "message": str(e),
            "validation_details": None
        }

@router.post("/{workflow_id}/execute", response_model=WorkflowExecutionResponse)
async def execute_workflow(
    workflow_id: int,
    user_query: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Execute a workflow with a user query"""
    workflow_service = WorkflowService(db)
    
    # Verify workflow exists and belongs to the current user
    workflow = workflow_service.get_workflow(workflow_id)
    if not workflow or workflow.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workflow not found or not authorized")
    
    try:
        execution = await workflow_service.execute_workflow(workflow_id, user_query)
        return execution
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")

@router.get("/{workflow_id}/executions", response_model=List[WorkflowExecutionResponse])
async def get_workflow_executions(
    workflow_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get execution history for a workflow"""
    workflow_service = WorkflowService(db)
    workflow = workflow_service.get_workflow(workflow_id)
    if not workflow or workflow.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workflow not found or not authorized")
    return workflow_service.get_workflow_executions(workflow_id, skip=skip, limit=limit)

@router.get("/executions/{execution_id}", response_model=WorkflowExecutionResponse)
async def get_execution(
    execution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific execution"""
    workflow_service = WorkflowService(db)
    execution = workflow_service.get_execution(execution_id)
    if not execution or execution.workflow.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Execution not found or not authorized")
    return execution