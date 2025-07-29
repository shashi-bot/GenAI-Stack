import { useState, useCallback } from 'react';
import { embeddingService } from '../services';

export const useEmbeddings = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [stats, setStats] = useState(null);

  const searchEmbeddings = useCallback(async (searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      const results = await embeddingService.searchEmbeddings(searchQuery);
      setSearchResults(results);
      return results;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to search embeddings';
      setError(errorMessage);
      console.error('Error searching embeddings:', err);
      // Return empty array instead of throwing to prevent crashes
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const generateDocumentEmbeddings = useCallback(async (documentId, options = {}) => {
    setLoading(true);
    setError(null);
    try {
        const {
            model,
            apiKey,
            chunk_size = 1000,
            chunk_overlap = 200
        } = options;

        // Create proper form data or query params as expected by the API
        const params = new URLSearchParams({
            api_key: apiKey,
            model: model,
            chunk_size: chunk_size.toString(),
            chunk_overlap: chunk_overlap.toString()
        });

        const result = await embeddingService.generateDocumentEmbeddings(documentId, params);
        return result;
    } catch (err) {
        const errorMessage = err.response?.data?.detail || 'Failed to generate document embeddings';
        setError(errorMessage);
        console.error('Error generating document embeddings:', err);
        throw err;
    } finally {
        setLoading(false);
    }
}, []);

  const deleteDocumentEmbeddings = useCallback(async (documentId) => {
    setLoading(true);
    setError(null);
    try {
      await embeddingService.deleteDocumentEmbeddings(documentId);
      return true;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to delete document embeddings';
      setError(errorMessage);
      console.error('Error deleting document embeddings:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getEmbeddingStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statsData = await embeddingService.getEmbeddingStats();
      setStats(statsData);
      return statsData;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to get embedding stats';
      setError(errorMessage);
      console.error('Error getting embedding stats:', err);
      // Return null instead of throwing to prevent crashes
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    searchResults,
    stats,
    searchEmbeddings,
    generateDocumentEmbeddings,
    deleteDocumentEmbeddings,
    getEmbeddingStats,
    setError,
    clearError: () => setError(null),
    clearResults: () => setSearchResults([])
  };
};