import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { MessageSquare, Settings, Copy, Download, Play, Square, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useWorkflows } from '../../hooks/useWorkflows';
import { useChat } from '../../hooks/useChat';

const OutputNode = ({ data, selected, workflowId }) => {
  const [output, setOutput] = useState(data?.output || 'Ready to display workflow output...');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastExecution, setLastExecution] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [testQuery, setTestQuery] = useState('Tell me about this document');
  const [testMode, setTestMode] = useState(false); // Add test mode flag

  // Only initialize hooks if workflowId exists
  const { executeWorkflow, loading: workflowLoading } = workflowId ? useWorkflows() : { executeWorkflow: null, loading: false };
  const { quickChat, sending: chatSending } = workflowId ? useChat(workflowId) : { quickChat: null, sending: false };

  const handleDataChange = (key, value) => {
    if (data?.onDataChange) {
      data.onDataChange(key, value);
    }
  };
  useEffect(() => {
    if (data?.onDataChange) {
      data.onDataChange('config', {
          // Ensure type is set
        output,
        lastExecution
      });
    }
  }, [output, lastExecution]);
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy to clipboard');
    }
  };

  const downloadOutput = () => {
    const element = document.createElement('a');
    const file = new Blob([output], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `workflow-output-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const testWorkflow = async () => {
    if (!workflowId) {
      setOutput('Error: No workflow selected. Please save the workflow first.');
      return;
    }
    
    if (!testQuery.trim()) {
      setOutput('Error: Please enter a test query.');
      return;
    }

    if (!executeWorkflow) {
      setOutput('Error: Workflow execution service not available.');
      return;
    }

    setIsGenerating(true);
    setOutput('Executing workflow...');

    try {
      const execution = await executeWorkflow(workflowId, testQuery);
      
      if (execution && execution.execution_result) {
        const result = execution.execution_result;
        let formattedOutput = '';

        // Format the output based on the execution result structure
        if (result.response) {
          formattedOutput = result.response;
        } else if (result.llm_response) {
          formattedOutput = result.llm_response;
        } else {
          formattedOutput = JSON.stringify(result, null, 2);
        }

        // Add metadata if available
        if (result.metadata || result.sources) {
          formattedOutput += '\n\n--- Execution Details ---\n';
          
          if (result.metadata) {
            formattedOutput += `Model: ${result.metadata.model_used || 'Unknown'}\n`;
            formattedOutput += `Web Search: ${result.metadata.web_search_used ? 'Yes' : 'No'}\n`;
          }
          
          if (result.sources && result.sources.length > 0) {
            formattedOutput += '\nSources:\n';
            result.sources.forEach((source, index) => {
              formattedOutput += `${index + 1}. ${source.document_name || 'Unknown Document'}\n`;
              if (source.similarity_score) {
                formattedOutput += `   Relevance: ${(source.similarity_score * 100).toFixed(1)}%\n`;
              }
            });
          }
        }

        setOutput(formattedOutput);
        setLastExecution(execution);
        handleDataChange('output', formattedOutput);
        handleDataChange('lastExecution', execution);
      } else {
        setOutput('Workflow executed but no result was returned');
      }
    } catch (error) {
      const errorMessage = `Execution failed: ${error.message || 'Unknown error'}`;
      setOutput(errorMessage);
      console.error('Workflow execution error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const quickChatTest = async () => {
    if (!workflowId) {
      setOutput('Error: No workflow selected. Please save the workflow first.');
      return;
    }
    
    if (!testQuery.trim()) {
      setOutput('Error: Please enter a test query.');
      return;
    }

    if (!quickChat) {
      setOutput('Error: Quick chat service not available.');
      return;
    }

    setIsGenerating(true);
    setOutput('Processing quick chat...');

    try {
      const response = await quickChat(testQuery);
      
      if (response) {
        const formattedOutput = typeof response === 'string' ? response : JSON.stringify(response, null, 2);
        setOutput(formattedOutput);
        handleDataChange('output', formattedOutput);
      } else {
        setOutput('Quick chat completed but no response was returned');
      }
    } catch (error) {
      const errorMessage = `Quick chat failed: ${error.message || 'Unknown error'}`;
      setOutput(errorMessage);
      console.error('Quick chat error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const stopExecution = () => {
    setIsGenerating(false);
    setOutput('Execution stopped by user');
  };

  const clearOutput = () => {
    setOutput('Ready to display workflow output...');
    setLastExecution(null);
    handleDataChange('output', '');
    handleDataChange('lastExecution', null);
  };

  // Update output when data changes from parent
  useEffect(() => {
    if (data?.output && data.output !== output) {
      setOutput(data.output);
    }
  }, [data?.output]);

  const isLoading = isGenerating || workflowLoading || chatSending;
  const hasOutput = output && output !== 'Ready to display workflow output...';
  const canTest = workflowId && testQuery.trim();

  return (
    <div className={`bg-white rounded-lg border-2 shadow-lg p-4 min-w-[350px] max-w-[450px] ${selected ? 'border-blue-500' : 'border-gray-200'}`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="output-input"
        className="w-3 h-3 bg-green-400 border-2 border-white"
        style={{ left: -6 }}
      />

      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-5 h-5 text-green-600" />
        <span className="font-semibold text-gray-800">Output</span>
        <div className="ml-auto flex items-center gap-2">
          {lastExecution && (
            <CheckCircle className="w-4 h-4 text-green-500" title="Last execution successful" />
          )}
          {!workflowId && (
            <AlertTriangle className="w-4 h-4 text-yellow-500" title="Workflow not saved" />
          )}
          <Settings className="w-4 h-4 text-gray-500 cursor-pointer" />
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-3">Display workflow execution results</p>
      
      <div className="space-y-3">
        {/* Workflow Status */}
        {!workflowId && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Workflow Not Saved</span>
            </div>
            <p className="text-yellow-600 text-xs mt-1">
              Save your workflow first to enable testing and execution.
            </p>
          </div>
        )}

        {/* Test Controls */}
        <div className="border border-gray-200 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Test Workflow</label>
            <button
              onClick={() => setTestMode(!testMode)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {testMode ? 'Hide' : 'Show'} Controls
            </button>
          </div>
          
          {(testMode || !workflowId) && (
            <div className="space-y-2">
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded text-sm"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Enter test query..."
                disabled={isLoading || !workflowId}
              />
              <div className="flex gap-2">
                <button
                  onClick={testWorkflow}
                  disabled={isLoading || !canTest}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Execute
                    </>
                  )}
                </button>
                <button
                  onClick={quickChatTest}
                  disabled={isLoading || !canTest}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Quick Chat
                </button>
                {isLoading && (
                  <button
                    onClick={stopExecution}
                    className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Output Display */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Output</label>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                disabled={!hasOutput}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={copySuccess ? "Copied!" : "Copy to clipboard"}
              >
                <Copy className={`w-4 h-4 ${copySuccess ? 'text-green-500' : ''}`} />
              </button>
              <button
                onClick={downloadOutput}
                disabled={!hasOutput}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download output"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={clearOutput}
                disabled={!hasOutput}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear output"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className={`w-full p-3 border border-gray-300 rounded text-sm min-h-[150px] max-h-[300px] overflow-y-auto ${
            isLoading ? 'bg-blue-50' : hasOutput ? 'bg-white' : 'bg-gray-50'
          }`}>
            {isLoading ? (
              <div className="flex items-center gap-2 text-blue-600">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              <div className="text-gray-700 whitespace-pre-wrap break-words">{output}</div>
            )}
          </div>
          
          {/* Output Statistics */}
          {hasOutput && (
            <div className="mt-2 flex gap-4 text-xs text-gray-500">
              <span>Characters: {output.length}</span>
              <span>Words: {output.split(/\s+/).filter(word => word.length > 0).length}</span>
              <span>Lines: {output.split('\n').length}</span>
              {lastExecution && (
                <span>Executed: {new Date(lastExecution.created_at).toLocaleString()}</span>
              )}
            </div>
          )}
        </div>

        {/* Execution Status */}
        {lastExecution && (
          <div className="p-2 bg-green-50 border border-green-200 rounded text-xs">
            <div className="flex items-center justify-between">
              <span className="text-green-700 font-medium">Last Execution</span>
              <span className="text-green-600">{lastExecution.execution_status}</span>
            </div>
            <div className="text-green-600 mt-1">
              Query: "{lastExecution.user_query}"
            </div>
            {lastExecution.execution_logs && (
              <div className="text-green-600 mt-1">
                Logs: {JSON.stringify(lastExecution.execution_logs)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputNode;