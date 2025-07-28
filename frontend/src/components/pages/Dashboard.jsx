import React, { useState } from 'react';
import { Plus, RefreshCw, AlertCircle } from 'lucide-react';
import Header from '../layout/Header';
import CreateStackModal from '../modals/CreateStackModal';

const Dashboard = ({ 
  stacks, 
  loading, 
  error, 
  onCreateStack, 
  onSelectStack, 
  onRefresh 
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleNewStack = () => {
    setShowCreateModal(true);
  };

  const handleCreateStackSubmit = async (stackData) => {
    setCreating(true);
    try {
      await onCreateStack(stackData);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create stack:', error);
      // Error is already handled by the hook, just log it here
    } finally {
      setCreating(false);
    }
  };

  const handleRefresh = () => {
    if (onRefresh && !loading) {
      onRefresh();
    }
  };

  // Loading state
  if (loading && stacks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading your stacks...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">My Stacks</h2>
            {onRefresh && (
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Refresh stacks"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
          <button
            onClick={handleNewStack}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {creating ? 'Creating...' : 'New Stack'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            {onRefresh && (
              <button
                onClick={handleRefresh}
                className="ml-auto text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && stacks.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Create New Stack</h3>
              <p className="text-gray-600 mb-6">
                Start building your generative AI apps with our essential tools and frameworks
              </p>
              <button
                onClick={handleNewStack}
                disabled={creating}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                {creating ? 'Creating...' : 'New Stack'}
              </button>
            </div>
          </div>
        )}

        {/* Stacks Grid */}
        {stacks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stacks.map((stack) => (
              <div
                key={stack.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onSelectStack(stack.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1">
                    {stack.name}
                  </h3>
                  {!stack.is_active && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      Inactive
                    </span>
                  )}
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {stack.description || 'No description available'}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Created {new Date(stack.created_at).toLocaleDateString()}
                  </span>
                  {stack.updated_at && stack.updated_at !== stack.created_at && (
                    <span>
                      Updated {new Date(stack.updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Workflow Info */}
                {stack.workflow_data && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {stack.workflow_data.nodes?.length || 0} components
                      </span>
                      <span>
                        {stack.workflow_data.edges?.length || 0} connections
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Loading Overlay for Refresh */}
        {loading && stacks.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-10">
            <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-green-600" />
              <span className="text-gray-700">Refreshing stacks...</span>
            </div>
          </div>
        )}
      </main>

      <CreateStackModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateStackSubmit}
        loading={creating}
      />
    </div>
  );
};

export default Dashboard;