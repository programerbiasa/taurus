import { io, Socket } from 'socket.io-client';

// Inisialisasi socket.io client dengan auto-connect
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('⚡ Terhubung ke TAURUS WebSocket Server:', socket.id);
});

socket.on('disconnect', () => {
  console.log('🔌 Terputus dari TAURUS WebSocket Server');
});

export default socket;
