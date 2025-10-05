import axios from 'axios';
import { PublicRoom } from '../types/game';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 10000,
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

export const gameAPI = {
  // Get all public rooms
  getRooms: () => api.get<{ rooms: PublicRoom[] }>('/game/rooms'),
  
  // Get specific room details
  getRoom: (roomId: string) => api.get(`/game/rooms/${roomId}`),
  
  // Validate player name
  validateName: (playerName: string) => api.post<{ valid: boolean; error?: string }>('/game/validate-name', { playerName }),
  
  // Health check
  health: () => api.get('/game/health'),
};

export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
