import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(isAuthenticated: boolean, onUpdate: () => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const token = localStorage.getItem('dashboard_token');
    if (!token) {
      return;
    }

    // Initialize socket connection
    socketRef.current = io('/', {
      auth: {
        token,
      },
      autoConnect: true,
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to real-time updates');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from real-time updates');
    });

    // Dashboard-specific events
    socket.on('new_note_request', (data) => {
      console.log('New note request:', data);
      onUpdate();
    });

    socket.on('note_request_updated', (data) => {
      console.log('Note request updated:', data);
      onUpdate();
    });

    socket.on('community_note_created', (data) => {
      console.log('Community note created:', data);
      onUpdate();
    });

    socket.on('request_stats_updated', (data) => {
      console.log('Request stats updated:', data);
      onUpdate();
    });

    // Error handling
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('auth_error', (error) => {
      console.error('Socket auth error:', error);
      // Optionally trigger logout
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, onUpdate]);

  // Method to manually emit events
  const emit = (event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  };

  return {
    socket: socketRef.current,
    emit,
  };
}