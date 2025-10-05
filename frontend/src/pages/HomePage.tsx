import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { socketService } from '../services/socket';
import { gameAPI } from '../services/api';
import { useGame } from '../context/GameContext';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Collapsible } from '../components/ui/Collapsible';
import { Users, Plus, RefreshCw, HelpCircle, X } from 'lucide-react';

export const HomePage = () => {
  const { isJoining, isCreating, setIsJoining, setIsCreating } = useGame();
  const { toast } = useToast();
  
  const [playerName, setPlayerName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [isValidatingName, setIsValidatingName] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [maxScore, setMaxScore] = useState(7);
  const [roundTimer, setRoundTimer] = useState(45);
  const [joiningRoomId, setJoiningRoomId] = useState<string>('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  // Step-based flow: 1 = name input, 2 = room selection/creation
  const currentStep = nameSubmitted && playerName.trim() ? 2 : 1;

  // Fetch public rooms only when we have a player name
  const { data: roomsData, isLoading, refetch } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => gameAPI.getRooms(),
    refetchInterval: currentStep === 2 ? 1000 : false,
    enabled: currentStep === 2,
  });

  const handleNameSubmit = async () => {
    if (!playerName.trim()) return;
    
    setIsValidatingName(true);
    
    try {
      const response = await gameAPI.validateName(playerName.trim());
      
      if (response.data.valid) {
        setNameSubmitted(true);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to validate name';
      toast({
        title: "Name unavailable",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsValidatingName(false);
    }
  };

  const handleNameKeyPress = (e: any) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    }
  };

  const handleChangeName = () => {
    setNameSubmitted(false);
    setPlayerName('');
  };

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
        className="bg-card rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-border"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">How to Play Bad Cards</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowHowToPlay(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-primary">😈 Game Setup</h4>
            <p>Each player gets 7 black answer cards. One player is the judge each round.</p>
          </div>
          <div>
            <h4 className="font-semibold text-primary">📝 How to Play</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>A white prompt card is revealed</li>
              <li>All players (except judge) pick their funniest black answer cards</li>
              <li>Judge reads all combinations and picks the winner</li>
              <li>Winner gets a point, new judge for next round</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold text-primary">🏆 Winning</h4>
            <p>First player to reach the target score wins the game! (Customizable when creating a room)</p>
          </div>
          <div>
            <h4 className="font-semibold text-primary">🎯 Strategy</h4>
            <p>Play to the judge's sense of humor. The most outrageous or clever answer usually wins!</p>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen supports-[height:100dvh]:min-h-[100dvh] bad-cards-bg">
      <div className="container mx-auto px-4 py-4 md:py-6 max-w-md">
        {/* Header */}
        <motion.div 
          className="text-center mb-6 md:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-center gap-2 mb-2 md:mb-3">
            <span className="text-3xl md:text-4xl">😈</span>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Bad Cards</h1>
          </div>
          <p className="text-base md:text-lg text-white/90 mb-1 md:mb-2">
            The Party Game of Terrible Answers
          </p>
          <p className="text-white/70 text-sm hidden md:block">
            Fill in the blanks with hilariously inappropriate answers!
          </p>
        </motion.div>

        {/* Step 1: Name Input */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="bg-card/95 backdrop-blur border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-center">What's your name?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <Input
                    placeholder="Enter your display name"
                    value={playerName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlayerName(e.target.value)}
                    onKeyPress={handleNameKeyPress}
                    maxLength={20}
                    disabled={isCreating || isJoining || isValidatingName}
                  className="text-center text-lg h-12"
                  autoFocus
                />
                <Button
                  onClick={handleNameSubmit}
                  disabled={!playerName.trim() || isCreating || isJoining || isValidatingName}
                  className="w-full bg-primary hover:bg-primary/90 h-12"
                >
                  {isValidatingName ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Checking name...
                    </div>
                  ) : 'Continue'}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  You'll need a name to join or create games
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Room Selection/Creation */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 md:space-y-4"
          >
            {/* Welcome back message */}
            <div className="text-center mb-4 md:mb-6">
              <p className="text-white/90">
                Welcome, <span className="font-semibold text-primary">{playerName}</span>!
              </p>
              <button
                onClick={handleChangeName}
                className="text-xs text-white/60 hover:text-white/80 underline mt-1"
              >
                Change name
              </button>
            </div>

            {/* Active Rooms */}
            <Card className="bg-card/95 backdrop-blur border-border">
              <CardHeader className="pb-2 md:pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Users className="w-4 h-4 md:w-5 md:h-5" />
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
              <CardContent className="space-y-2 md:space-y-3">
                {isLoading ? (
                  <div className="text-center py-4 md:py-6 text-muted-foreground">
                    <RefreshCw className="w-5 h-5 md:w-6 md:h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading rooms...</p>
                  </div>
                ) : rooms.length === 0 ? (
                  <div className="text-center py-4 md:py-6 text-muted-foreground">
                    <Users className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No active rooms</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 md:max-h-48 overflow-y-auto">
                    {rooms.map((room) => (
                      <motion.div
                        key={room.id}
                        className="flex items-center justify-between p-2 md:p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-sm md:text-base">{room.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {room.playerCount}/{room.maxPlayers} players • {room.status}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleJoinRoom(room.id)}
                          disabled={room.playerCount >= room.maxPlayers ||
                                   room.status !== 'waiting' ||
                                   isCreating ||
                                   (isJoining && joiningRoomId !== room.id)}
                          className="bg-primary hover:bg-primary/90 disabled:opacity-50 ml-2 text-xs md:text-sm px-2 md:px-3"
                        >
                          {(isJoining && joiningRoomId === room.id) ? (
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
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

            {/* Create Room */}
            <Card className="bg-card/95 backdrop-blur border-border">
              <CardHeader className="pb-2 md:pb-3">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Plus className="w-4 h-4 md:w-5 md:h-5" />
                  Create New Room
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                {!showCreateRoom ? (
                  <Button
                    onClick={() => setShowCreateRoom(true)}
                    className="w-full bg-primary hover:bg-primary/90 h-10 md:h-12"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Room
                  </Button>
                ) : (
                  <div className="space-y-3 md:space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Room Name
                      </label>
                      <Input
                        placeholder="Enter room name"
                        value={roomName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoomName(e.target.value)}
                        maxLength={30}
                        disabled={isCreating || isJoining}
                      />
                    </div>
                    
                    <Collapsible title="Advanced Settings" className="bg-muted/20">
                      <div className="grid grid-cols-2 gap-2 md:gap-3 mt-3">
                        <div>
                          <label className="block text-xs font-medium mb-1">
                            Max Players
                          </label>
                          <select
                            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
                            value={maxPlayers}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMaxPlayers(Number(e.target.value))}
                            disabled={isCreating || isJoining}
                          >
                            {[3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">
                            Points to Win
                          </label>
                          <select
                            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
                            value={maxScore}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMaxScore(Number(e.target.value))}
                            disabled={isCreating || isJoining}
                          >
                            {[3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium mb-1">
                            Round Timer
                          </label>
                          <select
                            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
                            value={roundTimer}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRoundTimer(Number(e.target.value))}
                            disabled={isCreating || isJoining}
                          >
                            <option value={30}>30 seconds</option>
                            <option value={45}>45 seconds</option>
                            <option value={60}>1 minute</option>
                            <option value={90}>1 min 30 sec</option>
                            <option value={120}>2 minutes</option>
                          </select>
                        </div>
                      </div>
                    </Collapsible>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateRoom(false)}
                        className="flex-1"
                        disabled={isCreating || isJoining}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateRoom}
                        disabled={!roomName.trim() || isCreating || isJoining}
                        className="flex-1 bg-primary hover:bg-primary/90"
                      >
                        {isCreating ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Creating...
                          </div>
                        ) : 'Create'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* How to Play - Bottom */}
        <motion.div 
          className="mt-6 md:mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHowToPlay(true)}
            className="text-white/60 hover:text-white/80 text-sm"
          >
            <HelpCircle className="w-4 h-4 mr-1" />
            How to Play
          </Button>
        </motion.div>
      </div>

      {/* How to Play Modal */}
      {showHowToPlay && <HowToPlayModal />}
    </div>
  );
};
