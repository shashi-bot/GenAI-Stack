import api from './api';

export const workflowService = {
  // Get all workflows
  getWorkflows: async (params = {}) => {
    const { skip = 0, limit = 100, active_only = true } = params;
    return api.get('/api/workflows/', {
      params: { skip, limit, active_only }
    });
  },

  // Get single workflow
  getWorkflow: async (workflowId) => {
    return api.get(`/api/workflows/${workflowId}`);
  },

  // Create new workflow
  createWorkflow: async (workflowData) => {
    return api.post('/api/workflows/', workflowData);
  },

  // Update workflow
  updateWorkflow: async (workflowId, updateData) => {
    return api.put(`/api/workflows/${workflowId}`, updateData);
  },

  // Delete workflow
  deleteWorkflow: async (workflowId) => {
    return api.delete(`/api/workflows/${workflowId}`);
  },

  // Validate workflow
  validateWorkflow: async (workflowId) => {
    return api.post(`/api/workflows/${workflowId}/validate`);
  },

  // Execute workflow
  executeWorkflow: async (workflowId, userQuery) => {
    return api.post(`/api/workflows/${workflowId}/execute`, null, {
      params: { user_query: userQuery }
    });
  },

  // Get workflow executions
  getWorkflowExecutions: async (workflowId, params = {}) => {
    const { skip = 0, limit = 50 } = params;
    return api.get(`/api/workflows/${workflowId}/executions`, {
      params: { skip, limit }
    });
  },

  // Get single execution
  getExecution: async (executionId) => {
    return api.get(`/api/executions/${executionId}`);
  }
};