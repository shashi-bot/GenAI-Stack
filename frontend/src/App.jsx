import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Dashboard from './components/pages/Dashboard';
import WorkflowBuilder from './components/pages/WorkflowBuilder';
import LoginPage from './components/pages/LoginPage';
import RegisterPage from './components/pages/RegisterPage';
import { useWorkflows } from './hooks/useWorkflows';
import { useAuth } from './hooks/useAuth';
import 'reactflow/dist/style.css';

const App = () => {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);
  const { user, token, logout } = useAuth();
  const { workflows, loading, error, createWorkflow, fetchWorkflows } = useWorkflows();
  const navigate = useNavigate();

  // Handle navigation to workflow builder
  const handleSelectStack = (workflowId) => {
    setSelectedWorkflowId(workflowId);
    navigate(`/workflow/${workflowId}`);
  };

  // Handle navigation back to dashboard
  const handleBackToDashboard = () => {
    setSelectedWorkflowId(null);
    navigate('/');
    fetchWorkflows();
  };

  // Handle creating new workflow
  const handleCreateStack = async (stackData) => {
    try {
      const newWorkflow = await createWorkflow(stackData);
      handleSelectStack(newWorkflow.id);
      return newWorkflow;
    } catch (error) {
      console.error('Failed to create workflow:', error);
      throw error;
    }
  };



  return (
    <div className="App">
      <Routes>
        <Route
          path="/login"
          element={token && user ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={token && user ? <Navigate to="/" replace /> : <RegisterPage />}
        />
        <Route
          path="/"
          element={
            token && user ? (
              <Dashboard
                stacks={workflows}
                loading={loading}
                error={error}
                onCreateStack={handleCreateStack}
                onSelectStack={handleSelectStack}
                onRefresh={fetchWorkflows}
                user={user}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/workflow/:id"
          element={
            token && user ? (
              <WorkflowBuilder
                workflowId={selectedWorkflowId}
                onBackToDashboard={handleBackToDashboard}
                user={user}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          }
        />
      </Routes>
    </div>
  );
};

export default App;