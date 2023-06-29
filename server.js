const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

let waitingClients = [];

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  // Assign a unique identifier to the connected client
  const clientId = socket.id;

  // Add the client to the waiting list
  waitingClients.push(clientId);

  // Check for available matches
  checkForMatch();

  // Listen for disconnect event
  socket.on('disconnect', () => {
    console.log('A client disconnected:', socket.id);

    // Remove the client from the waiting list
    const index = waitingClients.indexOf(clientId);
    if (index !== -1) {
      waitingClients.splice(index, 1);
    }
  });
});

function checkForMatch() {
  // Check if there are at least two clients in the waiting list
  if (waitingClients.length >= 2) {
    // Get the first two clients for the match
    const client1 = waitingClients.shift();
    const client2 = waitingClients.shift();

    // Create a unique room for the match
    const room = `${client1}-${client2}`;

    // Notify the clients about the match
    io.to(client1).emit('matchFound', room);
    io.to(client2).emit('matchFound', room);
  }
}

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
