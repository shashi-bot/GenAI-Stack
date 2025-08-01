import api from './api';

export const embeddingService = {
  // Search embeddings
  searchEmbeddings: async (searchQuery) => {
    return api.post('/api/embeddings/search', searchQuery);
  },

  // Generate document embeddings
  generateDocumentEmbeddings: async (documentId, params) => {
    const response = await api.post(`/api/embeddings/documents/${documentId}/generate?${params}`);
    return response.data;
},

  // Delete document embeddings
  deleteDocumentEmbeddings: async (documentId) => {
    return api.delete(`/api/embeddings/documents/${documentId}`);
  },

  // Get embedding stats
  getEmbeddingStats: async () => {
    return api.get('/api/embeddings/stats');
  }
};
