import { useState, useEffect, useCallback } from 'react';
import { workflowService } from '../services';

export const useWorkflow = (workflowId) => {
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [executions, setExecutions] = useState([]);

  const fetchWorkflow = useCallback(async () => {
    if (!workflowId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await workflowService.getWorkflow(workflowId);
      setWorkflow(data);
      return data;
    } catch (err) {
      const errorMessage = err.response?.status === 404 || err.response?.status === 401
        ? 'Workflow not found or not authorized'
        : err.response?.data?.detail || 'Failed to fetch workflow';
      setError(errorMessage);
      console.error('Error fetching workflow:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  const fetchExecutions = useCallback(async (params = {}) => {
    if (!workflowId) return;
    
    try {
      const data = await workflowService.getWorkflowExecutions(workflowId, params);
      setExecutions(data);
      return data;
    } catch (err) {
      const errorMessage = err.response?.status === 404 || err.response?.status === 401
        ? 'No authorized executions found for this workflow'
        : err.response?.data?.detail || 'Failed to fetch executions';
      console.error('Error fetching executions:', err);
      return [];
    }
  }, [workflowId]);

  const saveWorkflow = useCallback(async (workflowData) => {
    if (!workflowId) return;
    
    setLoading(true);
    setError(null);
    try {
      const updated = await workflowService.updateWorkflow(workflowId, {
        workflow_data: workflowData
      });
      setWorkflow(updated);
      return updated;
    } catch (err) {
      const errorMessage = err.response?.status === 404 || err.response?.status === 401
        ? 'Not authorized to update this workflow'
        : err.response?.data?.detail || 'Failed to save workflow';
      setError(errorMessage);
      console.error('Error saving workflow:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  const validateWorkflow = useCallback(async () => {
    if (!workflowId) return;
    
    try {
      const validation = await workflowService.validateWorkflow(workflowId);
      return validation;
    } catch (err) {
      const errorMessage = err.response?.status === 404 || err.response?.status === 401
        ? 'Not authorized to validate this workflow'
        : err.response?.data?.detail || 'Failed to validate workflow';
      console.error('Error validating workflow:', err);
      throw new Error(errorMessage);
    }
  }, [workflowId]);

  useEffect(() => {
    if (workflowId) {
      fetchWorkflow();
    }
  }, [fetchWorkflow]);

  return {
    workflow,
    loading,
    error,
    executions,
    fetchWorkflow,
    fetchExecutions,
    saveWorkflow,
    validateWorkflow,
    setError
  };
};