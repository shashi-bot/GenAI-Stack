import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Search, Settings, Globe } from 'lucide-react';

const WebSearchNode = ({ data, selected }) => {
  const [searchAPI, setSearchAPI] = useState(data?.searchAPI || 'SerpAPI');
  const [apiKey, setApiKey] = useState(data?.apiKey || '');
  const [numResults, setNumResults] = useState(data?.numResults || 5);
  const [searchType, setSearchType] = useState(data?.searchType || 'web');

  const searchAPIs = [
    { value: 'SerpAPI', label: 'SerpAPI (Google)' },
    { value: 'Brave Search', label: 'Brave Search' },
    { value: 'Google Custom Search', label: 'Google Custom Search' },
    { value: 'Bing Search API', label: 'Bing Search API' }
  ];

  const searchTypes = [
    { value: 'web', label: 'Web Search' },
    { value: 'news', label: 'News Search' },
    { value: 'images', label: 'Image Search' },
    { value: 'videos', label: 'Video Search' }
  ];

  const handleDataChange = (key, value) => {
    if (data?.onDataChange) data.onDataChange(key, value);
  };

  useEffect(() => {
    handleDataChange('config', {
       // Ensure type is set
      searchAPI,
      apiKey,
      numResults,
      searchType
    });
  }, [searchAPI, apiKey, numResults, searchType]);


  return (
    <div className={`bg-white rounded-lg border-2 shadow-lg p-4 min-w-[320px] max-w-[400px] ${selected ? 'border-blue-500' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Left} id="websearch-input" className="w-3 h-3 bg-orange-400 border-2 border-white" style={{ left: -6 }} />

      <div className="flex items-center gap-2 mb-3">
        <Search className="w-5 h-5 text-blue-600" />
        <span className="font-semibold text-gray-800">Web Search</span>
        <Settings className="w-4 h-4 text-gray-500 ml-auto cursor-pointer" />
      </div>
      <p className="text-sm text-gray-600 mb-3">Search the web for additional context and information</p>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search API Provider</label>
          <select className="w-full p-2 border border-gray-300 rounded text-sm" value={searchAPI} onChange={e => setSearchAPI(e.target.value)}>
            {searchAPIs.map(api => <option key={api.value} value={api.value}>{api.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input type="password" className="w-full p-2 border border-gray-300 rounded text-sm" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter your API key" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Type</label>
            <select className="w-full p-2 border border-gray-300 rounded text-sm" value={searchType} onChange={e => setSearchType(e.target.value)}>
              {searchTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Results</label>
            <select className="w-full p-2 border border-gray-300 rounded text-sm" value={numResults} onChange={e => setNumResults(parseInt(e.target.value))}>
              {[3, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div className="p-2 bg-gray-50 rounded text-xs text-gray-600">
          <p><strong>Provider:</strong> {searchAPI}</p>
          <p><strong>Type:</strong> {searchTypes.find(t => t.value === searchType)?.label}</p>
          <p><strong>Max Results:</strong> {numResults}</p>
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="websearch-output" className="w-3 h-3 bg-blue-400 border-2 border-white" style={{ right: -6 }} />
    </div>
  );
};

export default WebSearchNode;