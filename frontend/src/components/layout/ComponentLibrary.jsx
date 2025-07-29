import React from 'react';
import { User, Brain, Database, Search, MessageSquare, Info } from 'lucide-react';

const ComponentLibrary = ({ onDragStart }) => {
  const components = [
    { 
      type: 'userQuery', 
      icon: User, 
      label: 'User Query', 
      color: 'text-blue-600',
      description: 'Entry point for user input with query history and saved queries'
    },
    { 
      type: 'llm', 
      icon: Brain, 
      label: 'LLM Engine', 
      color: 'text-purple-600',
      description: 'AI language model processing with multiple provider support'
    },
    { 
      type: 'knowledgeBase', 
      icon: Database, 
      label: 'Knowledge Base', 
      color: 'text-green-600',
      description: 'Document upload, processing, and semantic search capabilities'
    },
    { 
      type: 'webSearch', 
      icon: Search, 
      label: 'Web Search', 
      color: 'text-blue-600',
      description: 'Real-time web search integration with multiple search APIs'
    },
    { 
      type: 'outputN', 
      icon: MessageSquare, 
      label: 'Output', 
      color: 'text-green-600',
      description: 'Workflow result display with testing and export capabilities'
    },
  ];

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-4 max-h-screen overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Components</h3>
        <Info className="w-4 h-4 text-gray-500" title="Drag components to the canvas to build your workflow" />
      </div>
      
      <div className="space-y-3">
        {components.map((component) => {
          const Icon = component.icon;
          return (
            <div
              key={component.type}
              className="bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={(event) => onDragStart(event, component.type)}
            >
              <div className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`w-5 h-5 ${component.color}`} />
                  <span className="font-medium text-gray-800">{component.label}</span>
                  <div className="flex gap-1 ml-auto">
                    <div className="w-1 h-4 bg-gray-300 rounded"></div>
                    <div className="w-1 h-4 bg-gray-300 rounded"></div>
                    <div className="w-1 h-4 bg-gray-300 rounded"></div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {component.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">How to Use</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Drag components to the canvas</li>
          <li>• Connect them by dragging from output to input handles</li>
          <li>• Configure each component's settings</li>
          <li>• Select the documents from the available documents if using Knowledge Base Node</li>
          <li>• Save your workflow first then you can start chatting with you workflow</li>

        </ul>
      </div>

      </div>
  );
};

export default ComponentLibrary;