import { useState, useEffect, useCallback } from 'react';
import { chatService } from '../services';

export const useChat = (workflowId) => {
    const [sessions, setSessions] = useState([]);
    const [currentSession, setCurrentSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sending, setSending] = useState(false);

    const fetchSessions = useCallback(async () => {
        if (!workflowId) {
            setError('No workflow ID provided');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            console.log('Fetching sessions for workflow:', workflowId);
            const data = await chatService.getChatSessions({ workflow_id: workflowId });
            console.log('Fetched sessions:', data);
            setSessions(data);
            if (data.length > 0 && !currentSession) {
                setCurrentSession(data[0]);
                await selectSession(data[0].id);
            }
        } catch (err) {
            const errorMessage = err.response?.status === 404 || err.response?.status === 401
                ? 'No authorized chat sessions found for this workflow'
                : err.response?.data?.detail || 'Failed to fetch chat sessions';
            setError(errorMessage);
            console.error('Error fetching sessions:', err);
        } finally {
            setLoading(false);
        }
    }, [workflowId]);

    const createSession = useCallback(async (sessionName = null) => {
        if (!workflowId) {
            setError('No workflow ID provided');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            console.log('Creating session for workflow:', workflowId, sessionName);
            const newSession = await chatService.createChatSession(workflowId, sessionName);
            console.log('Created session:', newSession);
            setSessions(prev => [...prev, newSession]);
            setCurrentSession(newSession);
            setMessages([]);
            return newSession;
        } catch (err) {
            const errorMessage = err.response?.status === 404 || err.response?.status === 401
                ? 'Not authorized to create a session for this workflow'
                : err.response?.data?.detail || 'Failed to create chat session';
            setError(errorMessage);
            console.error('Error creating session:', err);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [workflowId]);

    const selectSession = useCallback(async (sessionId) => {
        setLoading(true);
        setError(null);
        try {
            console.log('Selecting session:', sessionId);
            const session = await chatService.getChatSession(sessionId);
            const sessionMessages = await chatService.getChatMessages(sessionId);
            setCurrentSession(session);
            setMessages(sessionMessages);
            console.log('Selected session:', session, 'Messages:', sessionMessages);
            return session;
        } catch (err) {
            const errorMessage = err.response?.status === 404 || err.response?.status === 401
                ? 'Chat session not found or not authorized'
                : err.response?.data?.detail || 'Failed to select session';
            setError(errorMessage);
            console.error('Error selecting session:', err);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    const sendMessage = useCallback(async (message) => {
        if (!currentSession) {
            setError('No active session');
            return;
        }
        setSending(true);
        setError(null);
        const userMessage = {
            id: Date.now(),
            message_type: 'user',
            content: message,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMessage]);
        try {
            console.log('Sending message to session:', currentSession.id, message);
            const response = await chatService.sendMessage(currentSession.id, message);
            const assistantMessage = {
                id: Date.now() + 1,
                message_type: 'assistant',
                content: response.response,
                created_at: new Date().toISOString(),
                metadata_msg: {
                    execution_id: response.execution_id,
                    sources: response.sources,
                    ...response.metadata
                }
            };
            setMessages(prev => [...prev, assistantMessage]);
            return response;
        } catch (err) {
            const errorMessage = err.response?.status === 404 || err.response?.status === 401
                ? 'Not authorized to send messages in this session'
                : err.response?.data?.detail || 'Failed to send message';
            setError(errorMessage);
            console.error('Error sending message:', err);
            setMessages(prev => [
                ...prev.filter(msg => msg.id !== userMessage.id),
                userMessage,
                {
                    id: Date.now() + 1,
                    message_type: 'assistant',
                    content: 'Sorry, I encountered an error processing your message. Please try again.',
                    created_at: new Date().toISOString(),
                    metadata_msg: { error: true }
                }
            ]);
            throw new Error(errorMessage);
        } finally {
            setSending(false);
        }
    }, [currentSession]);

    const quickChat = useCallback(async (message) => {
        if (!workflowId) {
            setError('No workflow ID provided');
            return;
        }
        setSending(true);
        setError(null);
        try {
            console.log('Quick chat for workflow:', workflowId, message);
            const response = await chatService.quickChat(workflowId, message);
            return response;
        } catch (err) {
            const errorMessage = err.response?.status === 404 || err.response?.status === 401
                ? 'Not authorized to perform quick chat with this workflow'
                : err.response?.data?.detail || 'Failed to send quick chat';
            setError(errorMessage);
            console.error('Error with quick chat:', err);
            throw new Error(errorMessage);
        } finally {
            setSending(false);
        }
    }, [workflowId]);

    const deleteSession = useCallback(async (sessionId) => {
        try {
            console.log('Deleting session:', sessionId);
            await chatService.deleteChatSession(sessionId);
            setSessions(prev => prev.filter(session => session.id !== sessionId));
            if (currentSession && currentSession.id === sessionId) {
                setCurrentSession(null);
                setMessages([]);
            }
            return true;
        } catch (err) {
            const errorMessage = err.response?.status === 404 || err.response?.status === 401
                ? 'Not authorized to delete this session'
                : err.response?.data?.detail || 'Failed to delete session';
            setError(errorMessage);
            console.error('Error deleting session:', err);
            throw new Error(errorMessage);
        }
    }, [currentSession]);

    useEffect(() => {
        if (workflowId) {
            fetchSessions();
        }
    }, [fetchSessions, workflowId]);

    return {
        sessions,
        currentSession,
        messages,
        loading,
        error,
        sending,
        fetchSessions,
        createSession,
        selectSession,
        sendMessage,
        quickChat,
        deleteSession,
        setError
    };
};