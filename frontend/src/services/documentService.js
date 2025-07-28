import api from './api';

export const documentService = {
  // Upload document
  uploadDocument: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get all documents
  getDocuments: async (params = {}) => {
    const { skip = 0, limit = 100 } = params;
    return api.get('/api/documents/', {
      params: { skip, limit }
    });
  },

  // Get single document
  getDocument: async (documentId) => {
    return api.get(`/api/documents/${documentId}`);
  },

  // Delete document
  deleteDocument: async (documentId) => {
    return api.delete(`/api/documents/${documentId}`);
  },



  // Get document embeddings
  getDocumentEmbeddings: async (documentId) => {
        return api.get(`/api/embeddings/documents/${documentId}`);
      }
};