import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// useNavigate removed as it's not used in this component
import { useQuery } from '@tanstack/react-query';
import { socketService } from '../services/socket';
import { gameAPI } from '../services/api';
import { useGame } from '../context/GameContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Zap, Users, Plus, RefreshCw, HelpCircle, AlertCircle, X } from 'lucide-react';

export const HomePage: React.FC = () => {
  // navigate removed as it's not used
  const { isJoining, isCreating, setIsJoining, setIsCreating } = useGame();
  
  const [playerName, setPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [maxScore, setMaxScore] = useState(7);
  const [roundTimer, setRoundTimer] = useState(45);
  const [joiningRoomId, setJoiningRoomId] = useState<string>('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Fetch public rooms
  const { data: roomsData, isLoading, refetch } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => gameAPI.getRooms(),
    refetchInterval: 1000,
  });

  const handleCreateRoom = async () => {
    if (!playerName.trim() || !roomName.trim()) return;
    
    setIsCreating(true);
    
    // Connect socket and create room
    socketService.connect();
    socketService.createRoom(roomName.trim(), playerName.trim(), maxPlayers, maxScore, roundTimer);
  };

  const handleJoinRoom = (roomId: string) => {
    if (!playerName.trim()) return;
    
    setJoiningRoomId(roomId);
    setIsJoining(true);
    
    // Connect socket and join room
    socketService.connect();
    socketService.joinRoom(roomId, playerName.trim());
  };

  const rooms = roomsData?.data.rooms || [];

  const HowToPlayModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">How to Play Bad Cards</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowHowToPlay(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-game-blue">🃏 Game Setup</h4>
            <p>Each player gets 7 black answer cards. One player is the judge each round.</p>
          </div>
          <div>
            <h4 className="font-semibold text-game-blue">📝 How to Play</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>A white prompt card is revealed</li>
              <li>All players (except judge) pick their funniest black answer cards</li>
              <li>Judge reads all combinations and picks the winner</li>
              <li>Winner gets a point, new judge for next round</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold text-game-blue">🏆 Winning</h4>
            <p>First player to reach the target score wins the game! (Customizable when creating a room)</p>
          </div>
          <div>
            <h4 className="font-semibold text-game-blue">🎯 Strategy</h4>
            <p>Play to the judge's sense of humor. The most outrageous or clever answer usually wins!</p>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen supports-[height:100dvh]:min-h-[100dvh] bad-cards-bg">
      <div className="container mx-auto px-4 py-8">


        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="w-12 h-12 text-white" />
            <h1 className="text-6xl font-bold text-white">Bad Cards</h1>
            <Zap className="w-12 h-12 text-white" />
          </div>
          <p className="text-xl text-white/90 mb-4">
            The Party Game of Terrible Answers
          </p>
          <p className="text-white/70 mb-6">
            Fill in the blanks with hilariously inappropriate answers!
          </p>
          <Button
            variant="outline"
            onClick={() => setShowHowToPlay(true)}
            className="border-2 border-white bg-white/10 text-white hover:bg-white hover:text-black font-semibold backdrop-blur"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            How to Play
          </Button>
        </motion.div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create/Join Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/95 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create or Join Game
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Player Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Your Name
                  </label>
                  <Input
                    placeholder="Enter your display name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    disabled={isCreating || isJoining}
                  />
                </div>

                {/* Create Room Section */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Create New Room</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Room Name
                      </label>
                      <Input
                        placeholder="Enter room name"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        maxLength={30}
                        disabled={isCreating || isJoining}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Max Players
                      </label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                        value={maxPlayers}
                        onChange={(e) => setMaxPlayers(Number(e.target.value))}
                        disabled={isCreating || isJoining}
                      >
                        {[3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                          <option key={num} value={num}>{num} players</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Points to Win
                      </label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                        value={maxScore}
                        onChange={(e) => setMaxScore(Number(e.target.value))}
                        disabled={isCreating || isJoining}
                      >
                        {[3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                          <option key={num} value={num}>{num} points</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Round Timer
                      </label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                        value={roundTimer}
                        onChange={(e) => setRoundTimer(Number(e.target.value))}
                        disabled={isCreating || isJoining}
                      >
                        <option value={30}>30 seconds</option>
                        <option value={45}>45 seconds</option>
                        <option value={60}>1 minute</option>
                        <option value={90}>1 min 30 sec</option>
                        <option value={120}>2 minutes</option>
                      </select>
                    </div>
                    <Button
                      onClick={handleCreateRoom}
                      disabled={!playerName.trim() || !roomName.trim() || isCreating || isJoining}
                      className="w-full bg-game-blue hover:bg-game-blue-dark disabled:opacity-50"
                    >
                      {isCreating ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Creating Room...
                        </div>
                      ) : 'Create Room'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Active Rooms Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white/95 backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Active Rooms
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isLoading || isCreating || isJoining}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading rooms...
                  </div>
                ) : rooms.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No active rooms</p>
                    <p className="text-sm">Create one to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {rooms.map((room) => (
                      <motion.div
                        key={room.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex-1">
                          <div className="font-medium">{room.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {room.playerCount}/{room.maxPlayers} players • {room.status} • {room.maxScore} points to win
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleJoinRoom(room.id)}
                          disabled={!playerName.trim() || 
                                   room.playerCount >= room.maxPlayers ||
                                   room.status !== 'waiting' ||
                                   isCreating ||
                                   (isJoining && joiningRoomId !== room.id)}
                          className="bg-game-blue hover:bg-game-blue-dark disabled:opacity-50"
                        >
                          {(isJoining && joiningRoomId === room.id) ? (
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                              Joining...
                            </div>
                          ) : room.playerCount >= room.maxPlayers ? 'Full' :
                             room.status !== 'waiting' ? 'In Game' : 'Join'}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* How to Play Modal */}
      {showHowToPlay && <HowToPlayModal />}
    </div>
  );
};
