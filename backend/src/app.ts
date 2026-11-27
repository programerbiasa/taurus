import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { connectDatabase } from './config/database';
import authRouter from './routes/auth';
import ticketRouter from './routes/tickets';
import jobRouter from './routes/jobs';
import uploadRouter from './routes/upload';
import categoryRouter from './routes/categories';
import priorityRouter from './routes/priorities';
import unitRouter from './routes/units';
import settingRouter from './routes/settings';
import chatRouter from './routes/chat';
import radiosRouter from './routes/radios';
import dashcamsRouter from './routes/dashcams';
import dashcamBrandsRouter from './routes/dashcamBrands';
import internetProvidersRouter from './routes/internetProviders';
import problemsRouter from './routes/problems';
import inspectionsRouter from './routes/inspections';
import inventoryRouter from './routes/inventory';
import { verifyToken } from './middleware/auth';

const app = express();

// Middleware dasar
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sajikan folder uploads secara statis agar attachment dapat diakses langsung
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'TAURUS IT Support API',
    timestamp: new Date().toISOString(),
  });
});

// Routing API
app.use('/api/auth', authRouter);
app.use('/api/tickets', verifyToken, ticketRouter);
app.use('/api/jobs', verifyToken, jobRouter);
app.use('/api/upload', verifyToken, uploadRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/priorities', priorityRouter);
app.use('/api/units', unitRouter);
app.use('/api/radios', verifyToken, radiosRouter);
app.use('/api/dashcams', verifyToken, dashcamsRouter);
app.use('/api/dashcam-brands', verifyToken, dashcamBrandsRouter);
app.use('/api/internet-providers', verifyToken, internetProvidersRouter);
app.use('/api/problems', problemsRouter);
app.use('/api/inspections', inspectionsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/settings', settingRouter);
app.use('/api/chat', verifyToken, chatRouter);

// Setup HTTP Server & Socket.IO
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

io.on('connection', (socket) => {
  console.log('🟢 Klien WebSocket terhubung:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔴 Klien WebSocket terputus:', socket.id);
  });
});

// Jadikan io tersedia secara global untuk diakses dari controller/route
(global as any).io = io;

const PORT = Number(process.env.PORT) || 4000;

// Jalankan database dan server
const startServer = async () => {
  await connectDatabase();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 TAURUS Backend Server berjalan di http://0.0.0.0:${PORT}`);
  });
};

startServer();

export { app, server, io };
