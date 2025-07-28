import api from './api';

export const chatService = {
  createChatSession: async (workflowId, sessionName = null) => {
    return api.post('/api/chat/sessions', {
      workflow_id: workflowId,
      session_name: sessionName
    });
  },

  getChatSessions: async (params = {}) => {
    const { workflow_id = null, skip = 0, limit = 100 } = params;
    return api.get('/api/chat/sessions', {
      params: { workflow_id, skip, limit }
    });
  },

  getChatSession: async (sessionId) => {
    return api.get(`/api/chat/sessions/${sessionId}`);
  },

  deleteChatSession: async (sessionId) => {
    return api.delete(`/api/chat/sessions/${sessionId}`);
  },

  getChatMessages: async (sessionId, params = {}) => {
    const { skip = 0, limit = 100 } = params;
    return api.get(`/api/chat/sessions/${sessionId}/messages`, {
      params: { skip, limit }
    });
  },

  sendMessage: async (sessionId, message) => {
    return api.post(`/api/chat/sessions/${sessionId}/messages`, {
      session_id: sessionId,
      message: message
    });
  },

  quickChat: async (workflowId, message) => {
    return api.post('/api/chat/quick-chat', {
      workflow_id: workflowId,
      message: message
    });
  }
};