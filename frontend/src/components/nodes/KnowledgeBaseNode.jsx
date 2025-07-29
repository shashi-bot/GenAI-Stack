import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { Database, Settings, Eye, EyeOff, Upload, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useDocuments } from '../../hooks/useDocuments';
import { useEmbeddings } from '../../hooks/useEmbeddings';

const KnowledgeBaseNode = ({ data, selected }) => {
  const [embeddingModel, setEmbeddingModel] = useState(data?.embeddingModel || 'GitHub text-embedding-3-large');
  const [apiKey, setApiKey] = useState(data?.apiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState(data?.selectedDocuments || []);
  const [processing, setProcessing] = useState({});
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef(null);

  const { 
    documents, 
    loading: documentsLoading, 
    error: documentsError,
    uploadDocument, 
    deleteDocument, 
    fetchDocuments 
  } = useDocuments();

  const { 
    generateDocumentEmbeddings, 
    deleteDocumentEmbeddings,
    loading: embeddingLoading, 
    error: embeddingError 
  } = useEmbeddings();

  const embeddingModels = [
    'text-embedding-3-large',
    'text-embedding-3-small',
    'text-embedding-ada-002',
    'GitHub text-embedding-3-large',
    'GitHub text-embedding-3-small'
  ];

  const mapEmbeddingModelToBackend = (label) => {
    switch (label) {
      case 'GitHub text-embedding-3-large':
        return 'github://openai/text-embedding-3-large';
      case 'GitHub text-embedding-3-small':
        return 'github://openai/text-embedding-3-small';
      default:
        return label;
    }
  };

  const handleDataChange = (key, value) => {
    if (data?.onDataChange) {
      data.onDataChange(key, value);
    }
  };

  useEffect(() => {
    if (apiKey && !initialized) {
      setInitialized(true);
      fetchDocuments().catch(err => {
        console.warn('Failed to fetch documents:', err);
      });
    }
  }, [apiKey, initialized, fetchDocuments]);

  useEffect(() => {
    if (data?.onDataChange) {
      data.onDataChange('config', {
        model: mapEmbeddingModelToBackend(embeddingModel),
        apiKey,
        selectedDocuments: selectedDocuments.map(doc => ({ id: doc.id, original_filename: doc.original_filename }))
      });
    }
  }, [embeddingModel, apiKey, selectedDocuments]);

  const handleRefreshDocuments = async () => {
    if (!apiKey) {
      alert('Please configure API key first');
      return;
    }
    try {
      await fetchDocuments();
    } catch (error) {
      console.error('Failed to refresh documents:', error);
    }
  };

  const handleFileUpload = async (event) => {
    if (!apiKey) {
      alert('Please configure API key before uploading documents');
      return;
    }
    const uploadedFiles = Array.from(event.target.files);
    for (const file of uploadedFiles) {
      try {
        const uploadedDoc = await uploadDocument(file);
        console.log('Document uploaded:', uploadedDoc);
        // Trigger processing immediately after upload

        setProcessing(prev => ({ ...prev, [uploadedDoc.id]: true }));
        await generateDocumentEmbeddings(uploadedDoc.id, {
          model: mapEmbeddingModelToBackend(embeddingModel),
          apiKey,
          chunk_size: 1000,
          chunk_overlap: 200
        });
        setProcessing(prev => ({ ...prev, [uploadedDoc.id]: false }));
        document.extracted_text= true; // Assuming the document is processed successfully
        document.embeddings_generated = true; // Assuming embeddings are generated successfully
        
        await fetchDocuments(); // Refresh documents after upload
        console.log('Document processed:', uploadedDoc.id);
        setSelectedDocuments(prev => [...prev, { id: uploadedDoc.id, original_filename: uploadedDoc.original_filename }]);
    
      } catch (error) {
        console.error('Failed to upload document:', error);
        alert(`Failed to upload ${file.name}: ${error.message}`);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDocumentSelect = (document) => {
    const isSelected = selectedDocuments.some(doc => doc.id === document.id);
    let updatedSelection;
    if (isSelected) {
      updatedSelection = selectedDocuments.filter(doc => doc.id !== document.id);
    } else {
      updatedSelection = [...selectedDocuments, { id: document.id, original_filename: document.original_filename }];
    }
    console.log('Selecting document:', document.id, 'New selection:', updatedSelection);
    setSelectedDocuments(updatedSelection);
  };

  const handleProcessDocument = async (documentId) => {
    if (!apiKey) {
      alert('Please configure API key before processing documents');
      return;
    }
    setProcessing(prev => ({ ...prev, [documentId]: true }));
    try {
      await generateDocumentEmbeddings(documentId, {
        model: mapEmbeddingModelToBackend(embeddingModel),
        apiKey,
        chunk_size: 1000,
        chunk_overlap: 200
    });
      await fetchDocuments();
    } catch (error) {
      console.error('Failed to process document:', error);
      alert(`Failed to process document: ${error.message}`);
    } finally {
      setProcessing(prev => ({ ...prev, [documentId]: false }));
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }
    try {
      await deleteDocumentEmbeddings(documentId);
      await deleteDocument(documentId);
      setSelectedDocuments(prev => prev.filter(doc => doc.id !== documentId));
      handleDataChange('selectedDocuments', selectedDocuments.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert(`Failed to delete document: ${error.message}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentStatus = (document) => {
    console.log('Document status check:', document.id, {
      extracted_text: !!document.extracted_text,
      embeddings_generated: !!document.embeddings_generated
    });
    if (processing[document.id]) return 'processing';
    return 'ready';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing':
        return <Loader className="w-3 h-3 animate-spin text-blue-500" />;
      case 'ready':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'needs_embeddings':
        return <AlertCircle className="w-3 h-3 text-yellow-500" />;
      case 'needs_processing':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <AlertCircle className="w-3 h-3 text-gray-500" />;
    }
  };

  return (
    <div className={`bg-white rounded-lg border-2 shadow-lg p-4 min-w-[320px] max-w-[400px] ${selected ? 'border-blue-500' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Left} id="query-input" className="w-3 h-3 bg-orange-400 border-2 border-white" style={{ left: -6 }} />
      <div className="flex items-center gap-2 mb-3">
        <Database className="w-5 h-5 text-purple-600" />
        <span className="font-semibold text-gray-800">Knowledge Base</span>
        <Settings className="w-4 h-4 text-gray-500 ml-auto cursor-pointer" />
      </div>
      <p className="text-sm text-gray-600 mb-3">Let LLM search info in your files using query context</p>
      
      <div className="space-y-3 max-h-90 overflow-y-auto">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Key <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              className="w-full p-2 border border-gray-300 rounded text-sm pr-10"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                handleDataChange('apiKey', e.target.value);
              }}
              placeholder="Enter your API key"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-2.5"
            >
              {showApiKey ? (
                <EyeOff className="w-4 h-4 text-gray-500" />
              ) : (
                <Eye className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
          {!apiKey && (
            <p className="text-xs text-red-500 mt-1">API key is required to use this component</p>
          )}
        </div>

        {apiKey && (
          <>
            {(documentsError || embeddingError) && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {documentsError || embeddingError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Documents</label>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <p className="text-xs text-gray-600">Click to upload files</p>
                <p className="text-xs text-gray-500">PDF, TXT, DOCX supported</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.docx,.doc"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Available Documents ({documents.length})
                </label>
                <button
                  onClick={handleRefreshDocuments}
                  disabled={documentsLoading}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {documentsLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              {documentsLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="ml-2 text-sm text-gray-600">Loading documents...</span>
                </div>
              ) : documents.length > 0 ? (
                <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
                  {documents.map((document) => {
                    const status = getDocumentStatus(document);
                    const isSelected = selectedDocuments.some(doc => doc.id === document.id);
                    
                    return (
                      <div key={document.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleDocumentSelect(document)}
                          className="w-3 h-3"
                          
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {document.original_filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(document.file_size)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(status)}
                          {status === 'needs_processing' || status === 'needs_embeddings' ? (
                            <button
                              onClick={() => handleProcessDocument(document.id)}
                              disabled={processing[document.id]}
                              className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                              Process
                            </button>
                          ) : null}
                          <button
                            onClick={() => handleDeleteDocument(document.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-2">
                  No documents uploaded. Upload documents to get started.
                </p>
              )}
            </div>

            {selectedDocuments.length > 0 && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-700 font-medium">
                  Selected: {selectedDocuments.length} document(s)
                </p>
                <div className="text-xs text-blue-600 space-y-1 mt-1">
                  {selectedDocuments.map(doc => (
                    <div key={doc.id} className="truncate">{doc.original_filename}</div>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Embedding Model</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded text-sm"
                value={embeddingModel}
                onChange={(e) => {
                  setEmbeddingModel(e.target.value);
                  handleDataChange('embeddingModel', e.target.value);
                }}
              >
                {embeddingModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="context-output"
        className="w-3 h-3 bg-purple-400 border-2 border-white"
        style={{ right: -6 }}
      />
    </div>
  );
};

export default KnowledgeBaseNode;