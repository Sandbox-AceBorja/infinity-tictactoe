import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "http://localhost:5173", "https://infinity-tictactoe.vercel.app/" } });

interface RoomData {
  players: { X: string | null; O: string | null };
  passcode: string | null;
  gameState: {
    board: (string | null)[];
    xMoves: number[];
    oMoves: number[];
    isXNext: boolean;
  };
}

const rooms = new Map<string, RoomData>();

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  socket.on('join_room', ({ roomId, passcode }) => {
    // 1. Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      if (rooms.size >= 10) return socket.emit('error_message', 'Server is full');
      
      rooms.set(roomId, { 
        players: { X: null, O: null }, 
        passcode: passcode || null,
        gameState: {
          board: Array(9).fill(null),
          xMoves: [],
          oMoves: [],
          isXNext: true
        }
      });
    }

    const room = rooms.get(roomId)!;

    // 2. Check Passcode
    if (room.passcode && room.passcode !== passcode) {
      return socket.emit('error_message', 'Wrong passcode');
    }

    // 3. Assign Role (X, O, or Spectator)
    let role: 'X' | 'O' | 'Spectator' = 'Spectator';
    if (!room.players.X) {
      room.players.X = socket.id;
      role = 'X';
    } else if (!room.players.O) {
      room.players.O = socket.id;
      role = 'O';
    }

    socket.join(roomId);

    // 4. Send role and board state back to the user
    socket.emit('assign_role', { 
      role, 
      roomId, 
      initialState: room.gameState 
    });
    
    console.log(`User ${socket.id} joined room ${roomId} as ${role}`);
  });

  socket.on('send_move', ({ roomId, index }) => {
    const room = rooms.get(roomId);
    if (room) {
      const { gameState } = room;
      const playerSymbol = gameState.isXNext ? 'X' : 'O';
      const moves = gameState.isXNext ? gameState.xMoves : gameState.oMoves;

      // Update server state
      moves.push(index);
      gameState.board[index] = playerSymbol;

      if (moves.length > 3) {
        const oldest = moves.shift();
        if (oldest !== undefined) gameState.board[oldest] = null;
      }

      gameState.isXNext = !gameState.isXNext;
      
      // Tell everyone else in that specific room
      socket.to(roomId).emit('receive_move', { index });
    }
  });

  socket.on('request_reset', (roomId) => {
    const room = rooms.get(roomId);
    if (room) {
      room.gameState = {
        board: Array(9).fill(null),
        xMoves: [],
        oMoves: [],
        isXNext: true
      };
      io.to(roomId).emit('reset_game');
    }
  });

  socket.on('disconnecting', () => {
    // Clean up player slots when they leave
    for (const roomId of socket.rooms) {
      const room = rooms.get(roomId);
      if (room) {
        if (room.players.X === socket.id) room.players.X = null;
        if (room.players.O === socket.id) room.players.O = null;
        
        // Delete room if no players are left (keep spectators from holding rooms open)
        if (!room.players.X && !room.players.O) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted.`);
        }
      }
    }
  });
});

httpServer.listen(3001, () => {
  console.log('Multiplayer Server running on port 3001');
});