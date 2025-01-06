const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { RTCPeerConnection, MediaStream } = require("wrtc");

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

async function handlePeerConnection(socketId, offer) {
  const peerConnection = new RTCPeerConnection();
  const mediaStreams = {}; // To store incoming media streams
  const deferredTracks = []; // Queue for deferred tracks
  let remoteDescriptionSet = false; // Flag to ensure track processing only after SDP setup

  // Listen for incoming tracks
  peerConnection.ontrack = (event) => {
    //console.log(`Track received from client: ${socketId}`);
    const [stream] = event.streams;

    // Store the stream for the client if not already stored
    if (!mediaStreams[socketId]) {
      mediaStreams[socketId] = stream;
    }

    // Defer the track handling if remoteDescriptionSet is not yet true
    if (!remoteDescriptionSet) {
      //console.log(`Deferring track from ${socketId}`);
      deferredTracks.push({ track: event.track, stream });
      return;
    }

    // Forward the track immediately if SDP setup is complete
    forwardTrackToOthers(socketId, event.track, mediaStreams[socketId]);
    //console.log("forwardTrackToOthers executed in handlePeerConnection");
  };

  // Handle ICE candidates from the server
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      //console.log(`Emitting ICE candidate from SFU to client: ${socketId}`);
      clients[socketId].socket.emit("ice-candidate", {
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        usernameFragment: event.candidate.usernameFragment,
      });
    }
  };
  peerConnection.onnegotiationneeded = async () => {
    try {
      //console.log(`Negotiation needed for client: ${socketId}`);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send the renegotiation offer to the client
      clients[socketId].socket.emit("renegotiation-offer", {
        offer: peerConnection.localDescription,
      });
      //console.log(`Renegotiation offer sent to client: ${socketId}`);
    } catch (error) {
      console.error(
        `Error during renegotiation for client ${socketId}:`,
        error
      );
    }
  };
  // Set the remote description with the received offer
  await peerConnection.setRemoteDescription(offer);
  //console.log(`Offer set as remote description for client: ${socketId}`);

  // Create an answer
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  //console.log(
  //   `Answer created and set as local description for client: ${socketId}`
  // );

  // Mark remoteDescriptionSet as true
  remoteDescriptionSet = true;
  //console.log(`remoteDescriptionSet true: ${remoteDescriptionSet}`);

  // Process deferred tracks
  //console.log(`Processing deferred tracks for client: ${socketId}`);
  deferredTracks.forEach(({ track, stream }) => {
    forwardTrackToOthers(socketId, track, stream); // Forward deferred track
    //console.log(`Deferred track forwarded from ${socketId}`);
  });

  // Return the PeerConnection and the answer
  return { peerConnection, answer };
}

function forwardTrackToOthers(sourceSocketId, track, stream) {
  Object.keys(clients).forEach((socketId) => {
    //console.log("socket id", socketId);
    //console.log(
    //   "clients[socketId].peerConnection:",
    //   clients[socketId].peerConnection
    // );
    if (socketId !== sourceSocketId && clients[socketId].peerConnection) {
      const receiverConnection = clients[socketId].peerConnection;

      try {
        //console.log(`Adding track from ${sourceSocketId} to ${socketId}`);
        if (!stream) {
          console.warn(
            `Stream is missing for track ${track.id}. Creating a new MediaStream.`
          );
          stream = new MediaStream(); // Create a new stream if undefined
          stream.addTrack(track);
        }
        receiverConnection.addTrack(track, stream); // Ensure stream association

        //console.log(`Track forwarded from ${sourceSocketId} to ${socketId}`);
        //console.log(
        //   "ReceiverConnection sdp:",
        //   receiverConnection.localDescription.sdp
        // );
      } catch (error) {
        console.error(
          `Error forwarding track from ${sourceSocketId} to ${socketId}:`,
          error
        );
      }
    }
  });
}

// Socket.IO connection handling
io.on("connection", (socket) => {
  //console.log("A user connected:", socket.id);

  // Add the user to the clients object
  clients[socket.id] = { socket, peerConnection: null };
  //console.log("Current clients:", Object.keys(clients));

  // Listen for the offer from the client
  socket.on("offer", async (data) => {
    //console.log(`Offer received from ${socket.id}`);

    try {
      const { peerConnection, answer } = await handlePeerConnection(
        socket.id,
        data.offer
      );

      // Store the PeerConnection in the clients object
      clients[socket.id].peerConnection = peerConnection;

      // Send the answer back to the client
      socket.emit("answer", { answer });
      //console.log(`Answer sent to client: ${socket.id}`);
    } catch (error) {
      console.error(`Failed to process offer for client ${socket.id}:`, error);
    }
  });
  socket.on("ice-candidate", async (data) => {
    //console.log(`ICE candidate received from client: ${socket.id}`);

    const client = clients[socket.id];
    if (client && client.peerConnection) {
      try {
        await client.peerConnection.addIceCandidate(data);
        //console.log(`ICE candidate added to SFU for client: ${socket.id}`);
      } catch (err) {
        console.error(
          `Failed to add ICE candidate for client: ${socket.id}`,
          err
        );
      }
    }
  });
  socket.on("renegotiation-answer", async (data) => {
    //console.log(`Renegotiation answer received from client: ${socket.id}`);

    const client = clients[socket.id];
    if (client && client.peerConnection) {
      try {
        await client.peerConnection.setRemoteDescription(data.answer);
        //console.log(`Renegotiation answer applied for client: ${socket.id}`);
      } catch (err) {
        console.error(
          `Failed to apply renegotiation answer for client: ${socket.id}`,
          err
        );
      }
    }
  });

  // Clean up when a user disconnects
  socket.on("disconnect", () => {
    //console.log("User disconnected:", socket.id);

    // Close the PeerConnection if it exists
    if (clients[socket.id]?.peerConnection) {
      clients[socket.id].peerConnection.close();
      //console.log(`PeerConnection closed for client: ${socket.id}`);
    }

    // Remove the client from the clients object
    delete clients[socket.id];
    //console.log("Current clients:", Object.keys(clients));
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  //console.log(`SFU server running at http://localhost:${PORT}`);
});
