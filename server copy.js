const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { RTCPeerConnection } = require("wrtc");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Object to keep track of connected clients
const clients = {};

// Function to handle WebRTC PeerConnection
async function handlePeerConnection(socketId, offer) {
  try {
    const peerConnection = new RTCPeerConnection();

    // Set the remote description with the received offer
    await peerConnection.setRemoteDescription(offer);
    console.log(`Offer set as remote description for client: ${socketId}`);

    // Create an answer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    console.log(`Answer created for client: ${socketId}`);

    // Return the PeerConnection and the answer
    return { peerConnection, answer };
  } catch (error) {
    console.error(
      `Error handling PeerConnection for client ${socketId}:`,
      error
    );
    throw error;
  }
}

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Add the user to the clients object
  clients[socket.id] = { socket, peerConnection: null };
  console.log("Current clients:", Object.keys(clients));

  // Listen for the offer from the client
  socket.on("offer", async (data) => {
    console.log(`Offer received from ${socket.id}`);

    try {
      const { peerConnection, answer } = await handlePeerConnection(
        socket.id,
        data.offer
      );

      // Store the PeerConnection in the clients object
      clients[socket.id].peerConnection = peerConnection;

      // Send the answer back to the client
      socket.emit("answer", { answer });
      console.log(`Answer sent to client: ${socket.id}`);
    } catch (error) {
      console.error(`Failed to process offer for client ${socket.id}:`, error);
    }
  });

  // Clean up when a user disconnects
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Close the PeerConnection if it exists
    if (clients[socket.id]?.peerConnection) {
      clients[socket.id].peerConnection.close();
      console.log(`PeerConnection closed for client: ${socket.id}`);
    }

    // Remove the client from the clients object
    delete clients[socket.id];
    console.log("Current clients:", Object.keys(clients));
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`SFU server running at http://localhost:${PORT}`);
});
