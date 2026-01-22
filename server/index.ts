import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:5173" } 
});

// Use an object to track who is in which slot
let playerSlots: { X: string | null; O: string | null } = {
  X: null,
  O: null
};

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Assign the first available slot
  let assignedRole: 'X' | 'O' | 'Spectator' = 'Spectator';

  if (!playerSlots.X) {
    playerSlots.X = socket.id;
    assignedRole = 'X';
  } else if (!playerSlots.O) {
    playerSlots.O = socket.id;
    assignedRole = 'O';
  }

  socket.emit('assign_role', assignedRole);
  console.log(`User ${socket.id} assigned as ${assignedRole}`);

  socket.on('send_move', (data) => {
    socket.broadcast.emit('receive_move', data);
  });

  socket.on('request_reset', () => {
    // io.emit sends the message to EVERYONE connected, including the sender
    io.emit('reset_game');
    console.log('Game reset by player');
  });

  socket.on('disconnect', () => {
    // When someone leaves, free up their specific slot
    if (playerSlots.X === socket.id) {
      playerSlots.X = null;
      console.log('Player X disconnected');
    } else if (playerSlots.O === socket.id) {
      playerSlots.O = null;
      console.log('Player O disconnected');
    }
  });
});

httpServer.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});