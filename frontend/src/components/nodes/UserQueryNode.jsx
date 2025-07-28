import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { User, Settings, History, Save, Trash2 } from 'lucide-react';

const UserQueryNode = ({ data, selected }) => {
  const [query, setQuery] = useState(data?.query || '');
  const [queryHistory, setQueryHistory] = useState(data?.queryHistory || []);
  const [showHistory, setShowHistory] = useState(false);
  const [savedQueries, setSavedQueries] = useState(data?.savedQueries || []);

  const commonQueries = [
    "What is this document about?",
    "Summarize the main points",
    "What are the key findings?",
    "Explain the methodology used",
    "What are the conclusions?",
    "List the important facts",
    "What problems does this solve?",
    "Who is the target audience?"
  ];

  const handleQueryChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // Update node data
    if (data?.onDataChange) {
      data.onDataChange('query', newQuery);
    }
  };
  useEffect(() => {
    if (data?.onDataChange) {
      data.onDataChange('config', {
          // Ensure type is set
        query,
        queryHistory,
        savedQueries
      });
    }
  }, [query, queryHistory, savedQueries]);
  const selectCommonQuery = (selectedQuery) => {
    setQuery(selectedQuery);
    addToHistory(selectedQuery);
    
    if (data?.onDataChange) {
      data.onDataChange('query', selectedQuery);
    }
  };

  const addToHistory = (queryText) => {
    if (!queryText.trim() || queryHistory.includes(queryText)) {
      return;
    }

    const updatedHistory = [queryText, ...queryHistory.slice(0, 9)]; // Keep last 10 queries
    setQueryHistory(updatedHistory);
    
    if (data?.onDataChange) {
      data.onDataChange('queryHistory', updatedHistory);
    }
  };

  const saveCurrentQuery = () => {
    if (!query.trim() || savedQueries.some(saved => saved.query === query)) {
      return;
    }

    const savedQuery = {
      id: Date.now(),
      query: query,
      savedAt: new Date().toISOString(),
      name: query.length > 30 ? query.substring(0, 30) + '...' : query
    };

    const updatedSaved = [savedQuery, ...savedQueries.slice(0, 4)]; // Keep last 5 saved
    setSavedQueries(updatedSaved);
    
    if (data?.onDataChange) {
      data.onDataChange('savedQueries', updatedSaved);
    }
  };

  const loadSavedQuery = (savedQuery) => {
    setQuery(savedQuery.query);
    addToHistory(savedQuery.query);
    
    if (data?.onDataChange) {
      data.onDataChange('query', savedQuery.query);
    }
  };

  const deleteSavedQuery = (queryId) => {
    const updatedSaved = savedQueries.filter(saved => saved.id !== queryId);
    setSavedQueries(updatedSaved);
    
    if (data?.onDataChange) {
      data.onDataChange('savedQueries', updatedSaved);
    }
  };

  const clearQuery = () => {
    setQuery('');
    if (data?.onDataChange) {
      data.onDataChange('query', '');
    }
  };

  const clearHistory = () => {
    setQueryHistory([]);
    if (data?.onDataChange) {
      data.onDataChange('queryHistory', []);
    }
  };

  // Update query when data changes from parent
  useEffect(() => {
    if (data?.query !== undefined && data.query !== query) {
      setQuery(data.query);
    }
    if (data?.queryHistory) {
      setQueryHistory(data.queryHistory);
    }
    if (data?.savedQueries) {
      setSavedQueries(data.savedQueries);
    }
  }, [data?.query, data?.queryHistory, data?.savedQueries]);

  return (
    <div className={`bg-white rounded-lg border-2 shadow-lg p-4 min-w-[320px] max-w-[400px] ${selected ? 'border-blue-500' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        <User className="w-5 h-5 text-blue-600" />
        <span className="font-semibold text-gray-800">User Query</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title="Query history"
          >
            <History className="w-4 h-4" />
          </button>
          <Settings className="w-4 h-4 text-gray-500 cursor-pointer" />
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-3">Entry point for user queries into the workflow</p>
      
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Query</label>
            <div className="flex gap-1">
              {query.trim() && (
                <button
                  onClick={saveCurrentQuery}
                  className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                  title="Save query"
                >
                  <Save className="w-3 h-3" />
                </button>
              )}
              {query.trim() && (
                <button
                  onClick={clearQuery}
                  className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                  title="Clear query"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <textarea
            className="w-full p-2 border border-gray-300 rounded text-sm"
            placeholder="Enter your query here..."
            rows="3"
            value={query}
            onChange={handleQueryChange}
            onBlur={() => {
              if (query.trim()) {
                addToHistory(query);
              }
            }}
          />
          <div className="text-xs text-gray-500 mt-1">
            Characters: {query.length} | Words: {query.split(/\s+/).filter(w => w.length > 0).length}
          </div>
        </div>

        {/* Common Queries */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Quick Start Queries</label>
          <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
            {commonQueries.map((commonQuery, index) => (
              <button
                key={index}
                onClick={() => selectCommonQuery(commonQuery)}
                className="text-left p-2 text-xs bg-blue-50 hover:bg-blue-100 rounded transition-colors border border-blue-200"
              >
                {commonQuery}
              </button>
            ))}
          </div>
        </div>

        {/* Saved Queries */}
        {savedQueries.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Saved Queries</label>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {savedQueries.map((savedQuery) => (
                <div key={savedQuery.id} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                  <button
                    onClick={() => loadSavedQuery(savedQuery)}
                    className="flex-1 text-left text-xs text-green-700 hover:text-green-800"
                    title={savedQuery.query}
                  >
                    {savedQuery.name}
                  </button>
                  <button
                    onClick={() => deleteSavedQuery(savedQuery.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                    title="Delete saved query"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Query History */}
        {showHistory && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Recent Queries</label>
              {queryHistory.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Clear All
                </button>
              )}
            </div>
            {queryHistory.length > 0 ? (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {queryHistory.map((historyQuery, index) => (
                  <button
                    key={index}
                    onClick={() => selectCommonQuery(historyQuery)}
                    className="w-full text-left p-2 text-xs bg-gray-50 hover:bg-gray-100 rounded transition-colors border border-gray-200 truncate"
                    title={historyQuery}
                  >
                    {historyQuery}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-2">No query history yet</p>
            )}
          </div>
        )}

        {/* Query Status */}
        <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
          <div className="flex items-center justify-between">
            <span className="text-blue-700 font-medium">Status</span>
            <span className={`${query.trim() ? 'text-green-600' : 'text-gray-500'}`}>
              {query.trim() ? 'Ready' : 'Waiting for input'}
            </span>
          </div>
          {query.trim() && (
            <div className="text-blue-600 mt-1">
              Query will be sent to connected components
            </div>
          )}
        </div>
      </div>
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="query-output"
        className="w-3 h-3 bg-orange-400 border-2 border-white"
        style={{ right: -6 }}
      />
    </div>
  );
};

export default UserQueryNode;