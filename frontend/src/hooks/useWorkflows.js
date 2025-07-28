import { useState, useEffect, useCallback } from 'react';
import { workflowService } from '../services';

export const useWorkflows = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWorkflows = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await workflowService.getWorkflows(params);
      setWorkflows(data);
      return data;
    } catch (err) {
      const errorMessage = err.response?.status === 404 || err.response?.status === 401
        ? 'No authorized workflows found'
        : err.response?.data?.detail || 'Failed to fetch workflows';
      setError(errorMessage);
      console.error('Error fetching workflows:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createWorkflow = useCallback(async (workflowData) => {
    setLoading(true);
    setError(null);
    try {
      const newWorkflow = await workflowService.createWorkflow(workflowData);
      setWorkflows(prev => [...prev, newWorkflow]);
      return newWorkflow;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to create workflow';
      setError(errorMessage);
      console.error('Error creating workflow:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateWorkflow = useCallback(async (workflowId, updateData) => {
    setLoading(true);
    setError(null);
    try {
      const updatedWorkflow = await workflowService.updateWorkflow(workflowId, updateData);
      setWorkflows(prev => 
        prev.map(workflow => 
          workflow.id === workflowId ? updatedWorkflow : workflow
        )
      );
      return updatedWorkflow;
    } catch (err) {
      const errorMessage = err.response?.status === 404 || err.response?.status === 401
        ? 'Not authorized to update this workflow'
        : err.response?.data?.detail || 'Failed to update workflow';
      setError(errorMessage);
      console.error('Error updating workflow:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteWorkflow = useCallback(async (workflowId) => {
    setLoading(true);
    setError(null);
    try {
      await workflowService.deleteWorkflow(workflowId);
      setWorkflows(prev => prev.filter(workflow => workflow.id !== workflowId));
      return true;
    } catch (err) {
      const errorMessage = err.response?.status === 404 || err.response?.status === 401
        ? 'Not authorized to delete this workflow'
        : err.response?.data?.detail || 'Failed to delete workflow';
      setError(errorMessage);
      console.error('Error deleting workflow:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const executeWorkflow = useCallback(async (workflowId, userQuery) => {
    setError(null);
    try {
      const execution = await workflowService.executeWorkflow(workflowId, userQuery);
      return execution;
    } catch (err) {
      const errorMessage = err.response?.status === 404 || err.response?.status === 401
        ? 'Not authorized to execute this workflow'
        : err.response?.data?.detail || 'Failed to execute workflow';
      setError(errorMessage);
      console.error('Error executing workflow:', err);
      throw new Error(errorMessage);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  return {
    workflows,
    loading,
    error,
    fetchWorkflows,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    executeWorkflow,
    setError
  };
};