const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('Server is running');
});

let waitingClients = [];
let matches = [];

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

    // If the client was in a match, notify the opponent and remove the match
    const match = getMatchByClientId(clientId);
    if (match) {
      const opponentId = getOpponentId(match, clientId);
      io.to(opponentId).emit('opponentDisconnected');
      removeMatch(match);
    }
  });

  // Listen for 'start-matchmaking' event
  socket.on('start-matchmaking', () => {
    // Add the client to the waiting list
    waitingClients.push(clientId);

    // Check for available matches
    checkForMatch();
  });

  // Listen for 'place-stone' event
  socket.on('place-stone', ({ row, col, color }) => {
    // Find the match where the client is involved
    const match = getMatchByClientId(clientId);
    if (match) {
      // Get the opponent's ID from the match
      const opponentId = getOpponentId(match, clientId);

      // Emit the 'place-stone' event to the opponent
      io.to(opponentId).emit('place-stone', { row, col, color });
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

    // Add the match to the matches array
    matches.push({ room, clients: [client1, client2] });

    // Notify the clients about the match
    io.to(client1).emit('matchFound', room);
    io.to(client2).emit('matchFound', room);
  }
}

function getMatchByClientId(clientId) {
  // Find the match where the client is involved
  return matches.find((match) => match.clients.includes(clientId))?.room;
}

function getOpponentId(match, clientId) {
  // Get the opponent's ID from the match
  const [client1, client2] = match.split('-');
  return client1 === clientId ? client2 : client1;
}

function removeMatch(match) {
  // Remove the match from the matches array
  matches = matches.filter((m) => m.room !== match);
}

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
