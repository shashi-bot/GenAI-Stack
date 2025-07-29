import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2, AlertCircle } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
const ChatModal = ({ isOpen, onClose, workflowId, user }) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const { sessions, currentSession, messages, loading, error, sending, createSession, selectSession, sendMessage, setError } = useChat(workflowId);

    useEffect(() => {
        console.log('ChatModal state:', { workflowId, sessions, currentSession, messages, loading, error, sending, sendMessage: typeof sendMessage });
        if (isOpen && workflowId && !currentSession && sessions.length === 0) {
            createSession(`Chat Session - ${new Date().toLocaleString()}`).catch(err => {
                setError('Failed to create session: ' + err.message);
            });
        }
    }, [isOpen, workflowId, currentSession, sessions.length, createSession, setError]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || sending || !currentSession) return;
        try {
            console.log('Calling sendMessage with:', { sessionId: currentSession.id, message: newMessage });
            if (typeof sendMessage !== 'function') {
                throw new Error('sendMessage is not a function');
            }
            await sendMessage(newMessage);
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
            setError('Failed to send message: ' + error.message);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleCreateNewSession = async () => {
        try {
            await createSession(`New Chat - ${new Date().toLocaleString()}`);
        } catch (error) {
            console.error('Failed to create new session:', error);
            setError('Failed to create new session: ' + error.message);
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">GenAI Stack Chat</h2>
                            <p className="text-sm text-gray-500">
                                {currentSession ? currentSession.session_name : 'Loading...'}
                                {user?.full_name && ` - ${user.full_name}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {sessions.length > 1 && (
                            <select
                                value={currentSession?.id || ''}
                                onChange={(e) => selectSession(parseInt(e.target.value))}
                                className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {sessions.map((session) => (
                                    <option key={session.id} value={session.id}>
                                        {session.session_name || `Session ${session.id}`}
                                    </option>
                                ))}
                            </select>
                        )}
                        <button
                            onClick={handleCreateNewSession}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            disabled={loading}
                        >
                            New Chat
                        </button>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 rounded">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {loading && messages.length === 0 && (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                                <p className="text-gray-600 text-sm">Loading chat session...</p>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm">{error}</span>
                            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    {messages.length === 0 && !loading && !error && (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Bot className="w-6 h-6 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to your AI Workflow</h3>
                            <p className="text-gray-600 text-sm max-w-md mx-auto">
                                Start a conversation with your intelligent workflow. Your AI assistant is ready to help with queries, document analysis, and more.
                            </p>
                        </div>
                    )}
                    {messages.map((message) => (
                        <div key={message.id} className={`flex ${message.message_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-3xl ${message.message_type === 'user' ? 'order-2' : 'order-1'}`}>
                                <div className={`flex items-center gap-2 mb-1 ${message.message_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex items-center gap-2 ${message.message_type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {message.message_type === 'user' ? (
                                            <User className="w-4 h-4 text-blue-600" />
                                        ) : (
                                            <Bot className="w-4 h-4 text-green-600" />
                                        )}
                                        <span className="text-xs text-gray-500">
                                            {message.message_type === 'user' ? user?.full_name || 'You' : 'AI Assistant'}
                                        </span>
                                        <span className="text-xs text-gray-400">{formatTime(message.created_at)}</span>
                                    </div>
                                </div>
                                <div className={`p-3 rounded-lg ${message.message_type === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-200'}`}>
                                {message.message_type === 'user' ? (
                                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                                                ) : (
                                                                    <div className="prose prose-sm max-w-none">
                                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                           {message.content}
                                                                       </ReactMarkdown>
                                                                        </div>
                                                     )}
                                    {message.metadata_msg && message.metadata_msg.sources && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                            <p className="text-xs text-gray-500 mb-1">Sources:</p>
                                            <div className="space-y-1">
                                                {message.metadata_msg.sources.map((source, index) => (
                                                    <div key={index} className="text-xs text-blue-600">
                                                        📄 {source.document_name} (Score: {source.similarity_score?.toFixed(2)})
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {message.metadata_msg && message.metadata_msg.execution_id && (
                                        <div className="mt-1 text-xs text-gray-500">Execution ID: {message.metadata_msg.execution_id}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {sending && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <Bot className="w-4 h-4 text-green-600" />
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Send a message..."
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                rows="1"
                                style={{ minHeight: '44px', maxHeight: '120px' }}
                                disabled={sending || !currentSession || error}
                            />
                        </div>
                        <button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || sending || !currentSession || error}
                            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span>{currentSession ? `Session: ${currentSession.session_name}` : 'No active session'}</span>
                        <span>Press Shift+Enter for new line, Enter to send</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatModal;