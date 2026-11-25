import { io, Socket } from 'socket.io-client';
import { BASE_SERVER_URL } from './api';

export const socket: Socket = io(BASE_SERVER_URL, {
  transports: ['websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
});

socket.on('connect', () => {
  console.log('📱 Mobile WebSocket terhubung ke TAURUS server:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Mobile WebSocket terputus:', reason);
});

export default socket;
