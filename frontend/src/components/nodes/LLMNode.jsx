import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Brain, Settings, Eye, EyeOff } from 'lucide-react';

const LLMNode = ({ data, selected }) => {
  const [model, setModel] = useState(data?.model||'GitHub GPT-4.1');
  const [apiKey, setApiKey] = useState(data?.apiKey|| '');
  const [prompt, setPrompt] = useState(data?.prompt || 'You are a helpful PDF assistant. Use web search if the PDF lacks context');
  const [temperature, setTemperature] = useState(data?.temperature || '0.75');
  const [webSearchEnabled, setWebSearchEnabled] = useState(data?.webSearchEnabled || true);
  const [serpApi, setSerpApi] = useState(data?.serpApi || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSerpApi, setShowSerpApi] = useState(false);

  const models = [
    'GPT 4o- Mini',
    'GPT-4',
    'GPT-3.5-turbo',
    'Claude-3-Sonnet',
    'Claude-3-Haiku',
    'gemini-pro',
   'GitHub GPT-4.1',
   'GitHub GPT-4o-Mini'
  ];
  const mapModelToBackend = (label) => {
    switch (label) {
      case 'GitHub GPT-4.1':
        return 'github://openai/gpt-4.1';
      case 'GitHub GPT-4o-Mini':
        return 'github://openai/gpt-4o-mini';
      default:
        return label; // OpenAI / Gemini / etc. keep original
    }
  };
  const temperatureOptions = [
    { value: '0', label: '0 (Deterministic)' },
    { value: '0.25', label: '0.25 (Conservative)' },
    { value: '0.5', label: '0.5 (Balanced)' },
    { value: '0.75', label: '0.75 (Creative)' },
    { value: '1', label: '1 (Very Creative)' }
  ];

  const handleDataChange = (key, value) => {
    if (data?.onDataChange) {data.onDataChange(key, value);}
  };

  useEffect(() => {
    if (data?.onDataChange) {
    data.onDataChange('config', {
       // Ensure type is set
      model: mapModelToBackend(model),
      apiKey,
      prompt,
      temperature: parseFloat(temperature),
      webSearchEnabled,
      serpApi
    });}
  }, [model, apiKey, prompt, temperature, webSearchEnabled, serpApi]);

  return (
    <div className={`bg-white rounded-lg border-2 shadow-lg p-4 min-w-[320px] max-w-[400px] ${selected ? 'border-blue-500' : 'border-gray-200'}`} onMouseDown={(e) => e.stopPropagation()}
 onMouseUp={(e) => e.stopPropagation()}>
      <Handle type="target" position={Position.Left} id="context-input" className="w-3 h-3 bg-purple-400 border-2 border-white" style={{ left: -6, top: '30%' }} />
      <Handle type="target" position={Position.Left} id="query-input" className="w-3 h-3 bg-orange-400 border-2 border-white" style={{ left: -6, top: '70%' }} />

      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-5 h-5 text-purple-600" />
        <span className="font-semibold text-gray-800">LLM Engine</span>
        <Settings className="w-4 h-4 text-gray-500 ml-auto cursor-pointer" />
      </div>
      <p className="text-sm text-gray-600 mb-3">Run queries with AI language models</p>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <select className="w-full p-2 border border-gray-300 rounded text-sm" value={model} onChange={(e) => {setModel(e.target.value);handleDataChange('model',e.target.value);}}>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <div className="relative">
            <input type={showApiKey ? "text" : "password"} className="w-full p-2 border border-gray-300 rounded text-sm pr-10" value={apiKey} onChange={(e) => {
                setApiKey(e.target.value);
                handleDataChange('apiKey', e.target.value);
              }} placeholder="Enter your API key" />
            <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-2.5">
              {showApiKey ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
          <textarea className="w-full p-2 border border-gray-300 rounded text-sm" rows="3" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="You are a helpful AI assistant..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
          <select className="w-full p-2 border border-gray-300 rounded text-sm" value={temperature} onChange={e => setTemperature(e.target.value)}>
            {temperatureOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Enable Web Search</label>
          <input type="checkbox" className="w-4 h-4" checked={webSearchEnabled} onChange={(e) => {setWebSearchEnabled(e.target.checked);handleDataChange('websearchEnabled',e.target.checked)} }/>
        </div>

        {webSearchEnabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SERP API Key</label>
            <div className="relative">
              <input type={showSerpApi ? "text" : "password"} className="w-full p-2 border border-gray-300 rounded text-sm pr-10" value={serpApi} onChange={e => setSerpApi(e.target.value)} placeholder="Enter SERP API key" />
              <button type="button" onClick={() => setShowSerpApi(!showSerpApi)} className="absolute right-3 top-2.5">
                {showSerpApi ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
              </button>
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="response-output" className="w-3 h-3 bg-green-400 border-2 border-white" style={{ right: -6 }} />
    </div>
  );
};

export default LLMNode;