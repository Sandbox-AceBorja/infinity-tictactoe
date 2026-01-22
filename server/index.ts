import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);

// FIX: Corrected the CORS origin array syntax and added Port Binding
const PORT = process.env.PORT || 3001;

const io = new Server(httpServer, { 
  cors: { 
    origin: ["http://localhost:5173", "https://infinity-tictactoe.vercel.app"],
    methods: ["GET", "POST"]
  } 
});

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

    if (room.passcode && room.passcode !== passcode) {
      return socket.emit('error_message', 'Wrong passcode');
    }

    let role: 'X' | 'O' | 'Spectator' = 'Spectator';
    if (!room.players.X) {
      room.players.X = socket.id;
      role = 'X';
    } else if (!room.players.O) {
      room.players.O = socket.id;
      role = 'O';
    }

    socket.join(roomId);

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

      moves.push(index);
      gameState.board[index] = playerSymbol;

      if (moves.length > 3) {
        const oldest = moves.shift();
        if (oldest !== undefined) gameState.board[oldest] = null;
      }

      gameState.isXNext = !gameState.isXNext;
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
    for (const roomId of socket.rooms) {
      const room = rooms.get(roomId);
      if (room) {
        if (room.players.X === socket.id) room.players.X = null;
        if (room.players.O === socket.id) room.players.O = null;
        
        if (!room.players.X && !room.players.O) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted.`);
        }
      }
    }
  });
});

// FIX: Bind to 0.0.0.0 and dynamic PORT for Render deployment
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Multiplayer Server running on port ${PORT}`);
});