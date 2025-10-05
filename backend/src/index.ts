import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { APP_PORT, CORS_ORIGIN, IS_PRODUCTION } from './config/env';

import gameRoutes from './routes/game';
import { GameLogicManager } from './lib/gameLogic';
import { SocketHandler } from './lib/socketHandler';

const app = express();
const server = createServer(app);

// Initialize game manager
export const gameManager = new GameLogicManager();

// CORS configuration
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

// Middleware
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/game', gameRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const roomStats = gameManager.getRoomStatistics();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    rooms: roomStats
  });
});

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Initialize socket handler
const socketHandler = new SocketHandler(io, gameManager);

// Handle socket connections
io.on('connection', (socket) => {
  socketHandler.handleConnection(socket);
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: IS_PRODUCTION ? 'Internal server error' : err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Admin cleanup endpoint
app.post('/api/admin/cleanup', (req, res) => {
  gameManager.manualCleanup();
  const stats = gameManager.getRoomStatistics();
  res.json({ 
    message: 'Cleanup completed',
    rooms: stats
  });
});

// In production, serve the frontend build from the container
if (IS_PRODUCTION) {
  const frontendDistPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

server.listen(APP_PORT, () => {
  console.log(`🃏 Bad Cards server running on port ${APP_PORT}`);
  console.log(`🌐 CORS origin: ${typeof CORS_ORIGIN === 'string' ? CORS_ORIGIN : 'dynamic'}`);
  console.log(`🎮 Game manager initialized with ${gameManager.getAllRooms().length} active rooms`);
  console.log(`🧹 Room cleanup running every ${gameManager['CLEANUP_CONFIG']?.CLEANUP_INTERVAL / 1000 / 60 || 5} minutes`);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(() => {
    console.log('🔌 HTTP server closed');
    
    // Cleanup game manager
    gameManager.shutdown();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.log('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
