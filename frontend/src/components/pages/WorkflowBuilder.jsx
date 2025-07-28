import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  MarkerType,
} from 'reactflow';
import { Save, MessageCircle, User, Brain, Database, Search, MessageSquare, Trash2, ArrowLeft, CheckCircle } from 'lucide-react';
import { nodeTypes } from '../nodes';
import ChatModal from '../modals/ChatModal';
import ComponentLibrary from '../layout/ComponentLibrary';
import { useWorkflow } from '../../hooks/useWorkflow';
import { useChat } from '../../hooks/useChat';

const WorkflowBuilder = ({ onBackToDashboard, user }) => {
  const { id } = useParams(); // Extract workflowId from URL
  const [showChatModal, setShowChatModal] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [workflowData, setWorkflowData] = useState({ nodes: [], edges: [] });
  
  const reactFlowWrapper = useRef(null);
  let nodeId = 0;
  const getId = () => `dndnode_${nodeId++}`;

  const {
    workflow,
    loading: workflowLoading,
    error: workflowError,
    saveWorkflow,
    validateWorkflow
  } = useWorkflow(id);

  const {
    sessions,
    currentSession,
    createSession
  } = useChat(id);

  useEffect(() => {
    if (workflow?.workflow_data) {
        console.log('Loaded workflowData:', JSON.stringify(workflow.workflow_data, null, 2));
        // Deep merge to preserve nested config
        setWorkflowData(prev => ({
            nodes: workflow.workflow_data.nodes.map(node => ({
                ...node,
                data: { ...node.data, config: { ...node.data.config } }
            })),
            edges: workflow.workflow_data.edges
        }));
    }
}, [workflow]);



  useEffect(() => {
    if (workflow && workflow.workflow_data) {
      const workflowData = workflow.workflow_data;
      
      if (workflowData.nodes) {
        const loadedNodes = workflowData.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onDataChange: (key, value) => handleNodeDataChange(node.id, key, value)
          }
        }));
        setNodes(loadedNodes);
      }
      
      if (workflowData.edges) {
        setEdges(workflowData.edges);
      }
    }
  }, [workflow, setNodes, setEdges]);

  const handleNodeDataChange = useCallback((nodeId, key, value) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              [key]: value,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const onConnect = useCallback((params) => {
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);
    
    if (!sourceNode || !targetNode) return;

    const connectionRules = {
      userQuery: ['knowledgeBase', 'llm', 'outputN'],
      knowledgeBase: ['llm'],
      llm: ['outputN', 'webSearch'],
      webSearch: ['llm', 'outputN'],
      outputN: []
    };

    const sourceType = sourceNode.type;
    const targetType = targetNode.type;

    if (!connectionRules[sourceType]?.includes(targetType)) {
      alert(`Invalid connection: ${sourceType} cannot connect to ${targetType}`);
      return;
    }

    const edge = {
      ...params,
      type: 'smoothstep',
      animated: true,
      style: { 
        stroke: getConnectionColor(sourceType, targetType),
        strokeWidth: 2
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: getConnectionColor(sourceType, targetType),
      },
    };
    
    setEdges((eds) => addEdge(edge, eds));
  }, [nodes, setEdges]);

  const getConnectionColor = (sourceType, targetType) => {
    const colorMap = {
      userQuery: '#f59e0b',
      knowledgeBase: '#8b5cf6',
      llm: '#3b82f6',
      webSearch: '#10b981',
      outputN: '#10b981'
    };
    return colorMap[sourceType] || '#6b7280';
  };

  const deleteSelectedEdge = useCallback(() => {
    if (selectedEdge) {
      setEdges((edges) => edges.filter((edge) => edge.id !== selectedEdge));
      setSelectedEdge(null);
    }
  }, [selectedEdge, setEdges]);

  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    setSelectedEdge(edge.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedEdge(null);
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      
      const newNodeId = getId();
      const newNode = {
        id: newNodeId,
        type,
        position,
        data: { 
          label: `${type} node`,
          component_type: type,
          onDataChange: (key, value) => handleNodeDataChange(newNodeId, key, value)
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, handleNodeDataChange]
  );

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleSaveWorkflow = async () => {
    try {
      setSaving(true);
      
      const workflowData = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            ...node.data,
            
            onDataChange: undefined
          }
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle
        }))
      };

      await saveWorkflow(workflowData);
      setLastSaved(new Date());
      console.log('Received workflowData:', JSON.stringify(workflowData, null, 2));
      alert('Workflow saved successfully!');
  
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert(error.message || 'Failed to save workflow. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBuildStack = async () => {
    try {
      const validation = await validateWorkflow();
      
      if (!validation.valid) {
        alert(`Workflow validation failed: ${validation.message}`);
        return;
      }

      const hasUserQuery = nodes.some(node => node.type === 'userQuery');
      const hasLLM = nodes.some(node => node.type === 'llm');
      const hasOutput = nodes.some(node => node.type === 'outputN');
      
      if (!hasUserQuery) {
        alert('Stack must have at least one User Query node to accept input');
        return;
      }
      
      if (!hasLLM) {
        alert('Stack must have at least one LLM node to process queries');
        return;
      }
      
      if (!hasOutput) {
        alert('Stack must have at least one Output node to display results');
        return;
      }

      const hasValidFlow = edges.some(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        return sourceNode?.type === 'userQuery' && 
               (targetNode?.type === 'llm' || targetNode?.type === 'knowledgeBase');
      });

      if (!hasValidFlow) {
        alert('Please connect User Query to either LLM directly or through Knowledge Base');
        return;
      }

      await handleSaveWorkflow();

      alert(`Stack built successfully! 
      
Flow validated:
✓ User Query → ${nodes.some(n => n.type === 'knowledgeBase') ? 'Knowledge Base → ' : ''}LLM → Output
${nodes.some(n => n.type === 'webSearch') ? '✓ Web Search integration enabled' : ''}
${nodes.some(n => n.type === 'knowledgeBase') ? '✓ PDF context processing enabled' : ''}

You can now chat with your stack!`);
    } catch (error) {
      console.error('Error building stack:', error);
      alert(error.message || 'Failed to build stack. Please check your workflow configuration.');
    }
  };

  const handleChatWithStack = async () => {
    try {
      if (!currentSession) {
        await createSession(`Chat Session - ${new Date().toLocaleString()}`);
      }
      setShowChatModal(true);
    } catch (error) {
      console.error('Error creating chat session:', error);
      alert(error.message || 'Failed to start chat session. Please try again.');
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedEdge) {
          deleteSelectedEdge();
        }
      }
      
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSaveWorkflow();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedEdge, deleteSelectedEdge]);

  if (workflowLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (workflowError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{workflowError}</p>
          <button
            onClick={onBackToDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToDashboard}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">G</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              {workflow?.name || 'Workflow Builder'}
            </h1>
          </div>
          {lastSaved && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {selectedEdge && (
            <button
              onClick={deleteSelectedEdge}
              className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Connection
            </button>
          )}
          
          <button
            onClick={handleSaveWorkflow}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {user?.full_name ? user.full_name.split(' ').map(n => n[0].toUpperCase()).join('') : 'U'}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <ComponentLibrary onDragStart={onDragStart} />
        
        <div className="flex-1 relative">
          <div ref={reactFlowWrapper} className="w-full h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges.map(edge => ({
                ...edge,
                style: {
                  ...edge.style,
                  stroke: selectedEdge === edge.id ? '#ef4444' : edge.style?.stroke
                }
              }))}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onEdgeClick={onEdgeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              connectionMode={ConnectionMode.Loose}
              fitView
              className="bg-gray-50"
              deleteKeyCode={['Backspace', 'Delete']}
            >
              <Controls className="bg-white border border-gray-200" />
              <Background color="#e5e7eb" gap={20} />
            </ReactFlow>
          </div>
          
          <div className="absolute bottom-6 right-6 flex flex-col gap-3">
            <button
              onClick={handleBuildStack}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              Build Stack
            </button>
            <button
              onClick={handleChatWithStack}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg"
            >
              <MessageCircle className="w-5 h-5" />
              Chat with Stack
            </button>
          </div>
        </div>
      </div>

      <ChatModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        workflowId={id}
        user={user}
      />
    </div>
  );
};

export default WorkflowBuilder;