import { useState, useEffect, useCallback } from 'react';
import { documentService } from '../services';

export const useDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchDocuments = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await documentService.getDocuments(params);
      setDocuments(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch documents');
      console.error('Error fetching documents:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadDocument = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      const newDocument = await documentService.uploadDocument(file);
      setDocuments(prev => [...prev, newDocument]);
      setUploadProgress(100);
      return newDocument;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload document');
      console.error('Error uploading document:', err);
      throw err;
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  }, []);

  const deleteDocument = useCallback(async (documentId) => {
    setLoading(true);
    setError(null);
    try {
      await documentService.deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete document');
      console.error('Error deleting document:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);



  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    loading,
    error,
    uploadProgress,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
   
    setError
  };
};