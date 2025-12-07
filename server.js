import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { parse } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Store timer state per room code
const rooms = new Map();

function getRoom(roomCode) {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, {
      timeLeft: 150,
      isRunning: false,
      startTime: null,
      clients: new Set()
    });
  }
  return rooms.get(roomCode);
}

app.use(express.static('public'));
app.use('/sounds', express.static('sounds'));

wss.on('connection', (ws, req) => {
  const { query } = parse(req.url, true);
  const roomCode = query.room;
  
  if (!roomCode || roomCode.length < 3 || roomCode.length > 20) {
    ws.close();
    return;
  }
  
  const room = getRoom(roomCode);
  room.clients.add(ws);
  ws.roomCode = roomCode;
  
  // Send current state to new client
  ws.send(JSON.stringify({ type: 'state', timeLeft: room.timeLeft, isRunning: room.isRunning, startTime: room.startTime }));

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    const room = getRoom(ws.roomCode);
    
    switch(data.type) {
      case 'start':
        room.isRunning = true;
        room.startTime = Date.now();
        broadcastToRoom(ws.roomCode, { type: 'start', timeLeft: room.timeLeft, isRunning: room.isRunning, startTime: room.startTime });
        break;
      
      case 'stop':
        if (room.isRunning) {
          room.isRunning = false;
          room.timeLeft = data.timeLeft;
          broadcastToRoom(ws.roomCode, { type: 'stop', timeLeft: room.timeLeft, isRunning: room.isRunning, startTime: room.startTime });
        }
        break;
      
      case 'end':
        room.isRunning = false;
        room.timeLeft = 0;
        broadcastToRoom(ws.roomCode, { type: 'end', timeLeft: room.timeLeft, isRunning: room.isRunning, startTime: room.startTime });
        break;
      
      case 'reset':
        room.timeLeft = 150;
        room.isRunning = false;
        room.startTime = null;
        broadcastToRoom(ws.roomCode, { type: 'reset', timeLeft: room.timeLeft, isRunning: room.isRunning, startTime: room.startTime });
        break;
    }
  });
  
  ws.on('close', () => {
    const room = rooms.get(ws.roomCode);
    if (room) {
      room.clients.delete(ws);
      // Clean up empty rooms after 5 minutes
      if (room.clients.size === 0) {
        setTimeout(() => {
          const r = rooms.get(ws.roomCode);
          if (r && r.clients.size === 0) {
            rooms.delete(ws.roomCode);
          }
        }, 300000);
      }
    }
  });
});

function broadcastToRoom(roomCode, data) {
  const room = rooms.get(roomCode);
  if (room) {
    room.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(data));
      }
    });
  }
}

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Timer server running on http://localhost:${PORT}`);
  console.log(`Access from other devices using your local IP on port ${PORT}`);
});
