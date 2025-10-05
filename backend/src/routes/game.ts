import express from 'express';
import { gameManager } from '../index';

const router = express.Router();

// Get all active rooms
router.get('/rooms', (req, res) => {
  try {
    const rooms = gameManager.getAllRooms();
    const publicRooms = rooms.map(room => ({
      id: room.id,
      name: room.name,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      status: room.status,
      createdAt: room.createdAt
    }));
    res.json({ rooms: publicRooms });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Get specific room details
router.get('/rooms/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    const room = gameManager.getRoom(roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ room });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeRooms: gameManager.getAllRooms().length
  });
});

export default router;
