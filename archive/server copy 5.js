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

  // Listen for incoming tracks
  peerConnection.ontrack = (event) => {
    console.log("ontrack event for socket id: ", socketId);
    const [stream] = event.streams;
    // console.log(" stream id from ontrack: ", stream.id);
    // Ensure the stream has a valid live video track
    if (
      stream &&
      stream
        .getTracks()
        .some((track) => track.kind === "video" && track.readyState === "live")
    ) {
      // Store the latest stream ID, replacing any previous streams
      if (!clients[socketId].streams.includes(stream.id)) {
        clients[socketId].streams = [stream.id]; // Replace with the latest stream ID
        console.log(
          `Updated streams for client ${socketId}: ${clients[socketId].streams}`
        );
      }

      // Forward the track
      stream.getTracks().forEach((track) => {
        forwardTrackToOthers(socketId, track, stream);
      });
      clients[socketId].streams.forEach((streamId) => {
        console.log(
          `Streams associated with client ${socketId}:`,
          clients[socketId].streams
        );
      });
    } else {
      console.warn(
        `Stream ${
          stream?.id || "undefined"
        } does not have a valid live video track. Skipping.`
      );
    }
  };

  // Handle ICE candidates from the client
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      clients[socketId].socket.emit("ice-candidate", {
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        usernameFragment: event.candidate.usernameFragment,
      });
    }
  };

  // peerConnection.onnegotiationneeded = async () => {
  //   console.log(`Negotiation needed for client: ${socketId}`);
  //   if (!clients[socketId].isRenegotiating) {
  //     clients[socketId].isRenegotiating = true;

  //     try {
  //       const offer = await peerConnection.createOffer();
  //       await peerConnection.setLocalDescription(offer);
  //       clients[socketId].socket.emit("renegotiation-offer", { offer });
  //       //console.log(`Renegotiation offer sent to client: ${socketId}`);
  //       console.log(
  //         `Streams for client ${socketId} during renegotiation: ${clients[socketId].streams}`
  //       );
  //     } catch (error) {
  //       console.error("Error during renegotiation:", error);
  //     } finally {
  //       clients[socketId].isRenegotiating = false;
  //     }
  //   }
  // };
  peerConnection.onnegotiationneeded = async () => {
    console.log(`Negotiation needed for client: ${socketId}`);
    if (!clients[socketId].isRenegotiating) {
      clients[socketId].isRenegotiating = true;
      clients[socketId].forwardedTracks = new Map(); // Reset forwarded tracks
      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        clients[socketId].socket.emit("renegotiation-offer", { offer });
      } catch (error) {
        console.error("Error during renegotiation:", error);
      } finally {
        clients[socketId].isRenegotiating = false;
      }
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

  return { peerConnection, answer };
}
function forwardTrackToOthers(sourceSocketId, track, stream) {
  if (track.readyState !== "live") {
    console.warn(
      `Track ${track.id} from Stream ID ${stream.id} is not live (readyState: ${track.readyState}). Skipping.`
    );
    return;
  }
  console.log(
    "stream object in forwardTrackToOthers for ",
    { sourceSocketId },
    {
      id: stream.id,
      tracks: stream.getTracks().map((track) => ({
        id: track.id,
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState,
      })),
    }
  );
  Object.keys(clients).forEach((socketId) => {
    if (socketId !== sourceSocketId && clients[socketId].peerConnection) {
      const receiverConnection = clients[socketId].peerConnection;

      // Ensure forwardedTracks exists
      if (!clients[socketId].forwardedTracks) {
        clients[socketId].forwardedTracks = new Map();
      }

      const forwardedTracks = clients[socketId].forwardedTracks;

      // Check if the track has already been forwarded
      if (forwardedTracks.has(track.id)) {
        console.warn(
          `Track ${track.id} already forwarded to receiver ${socketId}. Skipping.`
        );
        return;
      }
      // Validate stream for video tracks
      const hasValidVideoTrack = stream
        .getVideoTracks()
        .some((track) => track.enabled);
      if (!hasValidVideoTrack) {
        console.warn(
          `Stream ${stream.id} has no valid video tracks. Skipping.`
        );
        return;
      }
      try {
        console.log(
          `Forwarding track ${track.kind} (Stream ID: ${stream.id}) from ${sourceSocketId} to ${socketId}`
        );
        if (!stream) {
          console.warn(`Stream is missing for track ${track.id}. Skipping.`);
          return;
        }
        // Check if the track is already added
        const existingSender = receiverConnection
          .getSenders()
          .find((sender) => sender.track && sender.track.id === track.id);

        if (existingSender) {
          console.warn(
            `Track ${track.id} already exists in receiver connection. Skipping.`
          );
          return;
        }
        // Add track and associate it with the correct stream
        // Forward all tracks in the stream
        // stream.getTracks().forEach((track) => {
        //   console.log(`Forwarding track: ${track.kind}, ID: ${track.id}`);
        receiverConnection.addTrack(track, stream);
        clients[socketId].streams.push(stream.id); // Add the latest stream ID
        // });

        // Mark track as forwarded
        forwardedTracks.set(track.id, stream.id);
        // console.log(`Track ${track.id} added to receiver ${socketId}`);
      } catch (error) {
        console.error(
          `Error forwarding track ${track.id} (Stream ID: ${stream.id}) to ${socketId}:`,
          error
        );
      }
    } else {
      console.log("");
    }
  });
}

// function forwardTrackToOthers(sourceSocketId, track, stream) {
//   Object.keys(clients).forEach((socketId) => {
//     if (socketId !== sourceSocketId && clients[socketId].peerConnection) {
//       const receiverConnection = clients[socketId].peerConnection;

//       // Maintain a map of forwarded tracks per receiver
//       if (!clients[socketId].forwardedTracks) {
//         clients[socketId].forwardedTracks = new Map();
//       }

//       const forwardedTracks = clients[socketId].forwardedTracks;

//       try {
//         // Check if the track is already forwarded
//         if (forwardedTracks.has(track.id)) {
//           console.warn(
//             `Track ${track.id} is already forwarded to receiver ${socketId}. Skipping.`
//           );
//           return;
//         }

//         //console.log(
//           `Forwarding track ${track.id} of kind ${track.kind} from ${sourceSocketId} to ${socketId}`
//         );

//         if (!stream) {
//           console.warn(
//             `Stream is missing for track ${track.id}. Creating a new MediaStream.`
//           );
//           stream = new MediaStream();
//           stream.addTrack(track);
//         }

//         receiverConnection.addTrack(track, stream);

//         // Mark track as forwarded
//         forwardedTracks.set(track.id, track);
//         //console.log(`Track ${track.id} added to receiver ${socketId}`);
//       } catch (error) {
//         console.error(
//           `Error forwarding track ${track.id} to ${socketId}:`,
//           error
//         );
//       }
//     }
//   });
// }

// Socket.IO connection handling

io.on("connection", (socket) => {
  console.log("............................................................");
  console.log("............................................................");
  console.log("A user connected:", socket.id);

  // Add the user to the clients object
  clients[socket.id] = {
    socket,
    peerConnection: null,
    isRenegotiating: false,
    streams: [],
  };
  //console.log("Current clients:", Object.keys(clients));

  // Listen for the offer from the client
  socket.on("offer", async (data) => {
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

      // Forward tracks from existing clients to the new client
      // console.log("Forwarding existing tracks to new client...");
      Object.keys(clients).forEach((existingSocketId) => {
        if (existingSocketId !== socket.id) {
          const existingClient = clients[existingSocketId];
          if (existingClient.peerConnection) {
            existingClient.peerConnection.getSenders().forEach((sender) => {
              const track = sender.track;
              if (track) {
                forwardTrackToOthers(
                  existingSocketId,
                  track,
                  new MediaStream([track])
                );
              }
            });
          }
        }
      });
    } catch (error) {
      console.error(`Failed to process offer for client ${socket.id}:`, error);
    }
  });

  socket.on("ice-candidate", async (data) => {
    const client = clients[socket.id];
    if (client && client.peerConnection) {
      try {
        await client.peerConnection.addIceCandidate(data);
        //console.log(`ICE candidate added for client: ${socket.id}`);
      } catch (err) {
        console.error(
          `Failed to add ICE candidate for client: ${socket.id}`,
          err
        );
      }
    }
  });

  socket.on("renegotiation-answer", async (data) => {
    console.log("renegotiation-answer socket id: ", socket.id);
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
    const client = clients[socket.id];

    if (client && client.streams.length > 0) {
      console.log(
        `Streams associated with client ${socket.id}:`,
        client.streams
      );

      client.streams.forEach((streamId) => {
        socket.broadcast.emit("user-disconnected", { streamId });
        console.log(
          `Emitted user-disconnected for stream ID: ${streamId}, SocketID ${socket.id}`
        );
      });
    } else {
      console.warn(`No streams found for client ${socket.id}`);
    }

    if (client?.peerConnection) {
      client.peerConnection.close();
      console.log(`PeerConnection closed for client: ${socket.id}`);
    }

    delete clients[socket.id];
    console.log(`Client removed: ${socket.id}`);
    console.log(
      `....................End of user disconnect....................`
    );
    console.log(
      `....................End of user disconnect....................`
    );
  });

  // socket.on("disconnect", () => {
  //   //console.log(`User disconnected: ${socket.id}`);

  //   const client = clients[socket.id];
  //   if (client && client.streams.length > 0) {
  //     client.streams.forEach((streamId) => {
  //       socket.broadcast.emit("user-disconnected", { streamId });
  //       console.log(`Emitted user-disconnected for stream ID: ${streamId}`);
  //     });
  //   }

  //   if (client?.peerConnection) {
  //     client.peerConnection.close();
  //     console.log(`PeerConnection closed for client: ${socket.id}`);
  //   }

  //   delete clients[socket.id];
  //   console.log(`Client removed: ${socket.id}`);
  // });
});

const PORT = 3000;
server.listen(PORT, () => {
  //console.log(`SFU server running at http://localhost:${PORT}`);
});
