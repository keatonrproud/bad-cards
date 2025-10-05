import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';

import gameRoutes from './routes/game';
import { GameLogicManager } from './lib/gameLogic';
import { SocketHandler } from './lib/socketHandler';

const app = express();
const server = createServer(app);

// Initialize game manager
export const gameManager = new GameLogicManager();

// CORS configuration
const CORS_ORIGIN = process.env.NODE_ENV === 'production' 
  ? process.env.FRONTEND_URL || 'https://bad-cards.com'
  : 'http://localhost:3000';

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
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e8
});

// Initialize socket handler
const socketHandler = new SocketHandler(io, gameManager);

// Handle socket connections
io.on('connection', (socket) => {
  socketHandler.handleConnection(socket);
});

// Serve frontend static files in production
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Serve index.html for non-API routes (SPA fallback)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3002;

// Admin cleanup endpoint
app.post('/api/admin/cleanup', (req, res) => {
  gameManager.manualCleanup();
  const stats = gameManager.getRoomStatistics();
  res.json({ 
    message: 'Cleanup completed',
    rooms: stats
  });
});

server.listen(PORT, () => {
  console.log(`🃏 Bad Cards server running on port ${PORT}`);
  console.log(`🌐 CORS origin: ${CORS_ORIGIN}`);
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
