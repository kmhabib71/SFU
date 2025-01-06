const socket = io("http://localhost:3000");
const localVideo = document.getElementById("localVideo");

let localStream;
let peerConnection;

socket.on("connect", () => {
  console.log("Connected to Socket.IO server with ID:", socket.id);
  document.title = socket.id.slice(-4);
  cleanUpResources();
  loadLocalStream();
});

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

async function createPeerConnection() {
  peerConnection = new RTCPeerConnection(configuration);

  console.log("Creating peer connection");

  // Add local stream tracks to the connection
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
    console.log("Adding local stream track:", track);
  });

  // Log and emit ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("New ICE candidate:");
      socket.emit("ice-candidate", event.candidate); // Send to the server
    }
  };

  // peerConnection.ontrack = (event) => {
  //   const stream = event.streams[0];
  //   const streamId = stream.id; // Unique stream ID
  //   const remoteVideoId = `video-${streamId}`;
  //   console.log("Remote stream received:", event.streams[0]);
  //   // Check if a video element already exists
  //   let remoteVideo = document.getElementById(remoteVideoId);

  //   console.log(
  //     "Remote track received:",
  //     event.track.id,
  //     "of kind:",
  //     event.track.kind
  //   );

  //   const existingVideos = Array.from(
  //     document.getElementById("remoteVideos").children
  //   );
  //   const trackAlreadyRendered = existingVideos.some(
  //     (video) => video.srcObject === event.streams[0]
  //   );

  //   if (!trackAlreadyRendered) {
  //     if (!remoteVideo) {
  //       // Create a new video element for the track
  //       remoteVideo = document.createElement("video");
  //       remoteVideo.id = remoteVideoId; // Assign a unique ID
  //       remoteVideo.srcObject = stream; // Attach stream
  //       remoteVideo.autoplay = true;
  //       remoteVideo.playsInline = true;
  //       document.getElementById("remoteVideos").appendChild(remoteVideo);
  //       console.log(`Added video element for track: ${event.track.id}`);
  //     } else {
  //       console.warn(
  //         `Video element already exists for track: ${event.track.id}`
  //       );
  //     }
  //   } else {
  //     console.warn("Remote track already rendered:", event.track.id);
  //   }
  // };

  // Monitor signaling state changes

  peerConnection.ontrack = (event) => {
    const stream = event.streams[0];
    const streamId = stream.id;
    const remoteVideoId = `video-${streamId}`;

    console.log(
      `Remote stream received: Stream ID=${streamId} track kind=${event.track.kind}`
    );
    // console.log("stream getTracks", stream);

    // Validate the stream and its video tracks
    if (
      !stream ||
      stream.getTracks().length === 0 ||
      !stream.getVideoTracks().some((track) => track.enabled)
    ) {
      console.warn(`Stream ${streamId} has no valid video tracks. Skipping.`);
      return;
    }

    let remoteVideo = document.getElementById(remoteVideoId);

    // Prevent duplicate video elements
    if (!remoteVideo) {
      remoteVideo = document.createElement("video");
      remoteVideo.id = remoteVideoId;
      remoteVideo.srcObject = stream;
      remoteVideo.autoplay = true;
      remoteVideo.playsInline = true;
      document.getElementById("remoteVideos").appendChild(remoteVideo);
      // console.log(`Added video element for stream ID: ${streamId}`);
    } else {
      console.warn(`Video element already exists for Stream ID: ${streamId}`);
    }
  };

  peerConnection.onsignalingstatechange = () => {
    console.log("Signaling state changed:", peerConnection.signalingState);

    // Check signaling state before taking actions
    if (peerConnection.signalingState === "stable") {
      console.log("Connection is stable and ready.");
    } else if (peerConnection.signalingState === "closed") {
      console.warn("Connection is closed. Reinitializing...");
    }
  };

  // Monitor connection state
  peerConnection.onconnectionstatechange = () => {
    console.log("Connection state changed:", peerConnection.connectionState);

    if (peerConnection.connectionState === "failed") {
      console.error("Connection failed. Closing peer connection...");
      peerConnection.close();
    }
  };

  // Monitor ICE connection state
  peerConnection.oniceconnectionstatechange = () => {
    console.log(
      "ICE connection state changed:",
      peerConnection.iceConnectionState
    );

    if (peerConnection.iceConnectionState === "disconnected") {
      console.warn("Disconnected. Attempting to reconnect...");
    } else if (peerConnection.iceConnectionState === "failed") {
      console.error("ICE connection failed. Restarting ICE...");
      peerConnection.restartIce();
    }
  };
}

// Load local stream
async function loadLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localVideo.srcObject = localStream;
    console.log("Local stream loaded successfully.");
    await createPeerConnection();

    if (socket.connected) {
      await createOffer(); // Proceed after local stream is ready
    } else {
      console.log("Socket not connected");
    }
  } catch (error) {
    console.error("Error loading local stream:", error);
  }
}

// Create and send an offer
async function createOffer() {
  if (peerConnection.signalingState !== "stable") {
    console.warn(
      "Cannot create offer. Signaling state:",
      peerConnection.signalingState
    );
    return;
  }

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // console.log("Offer created: ", offer.sdp);

  socket.emit("offer", { offer });
}

// Handle incoming answer
socket.on("answer", async (data) => {
  console.log("Answer received from server:");
  // console.log("Local SDP Offer:", peerConnection.localDescription.sdp);

  if (peerConnection.signalingState === "have-local-offer") {
    try {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );
      console.log("Answer applied successfully.");
    } catch (error) {
      console.error("Failed to apply remote description:", error);
    }
  } else {
    console.warn("Unexpected signaling state:", peerConnection.signalingState);
  }
});

// Handle incoming ICE candidates
socket.on("ice-candidate", async (data) => {
  console.log("ICE candidate received from server:", data);

  try {
    const candidate = new RTCIceCandidate({
      candidate: data.candidate,
      sdpMid: data.sdpMid,
      sdpMLineIndex: data.sdpMLineIndex,
      usernameFragment: data.usernameFragment,
    });

    await peerConnection.addIceCandidate(candidate);
    console.log("ICE candidate added successfully.");
  } catch (error) {
    console.error("Error adding ICE candidate:", error);
  }
});

// Handle renegotiation offer from the server
socket.on("renegotiation-offer", async (data) => {
  console.log("Renegotiation offer received:", data.offer);

  if (peerConnection.signalingState !== "stable") {
    console.warn(
      "Skipping renegotiation as signaling state is:",
      peerConnection.signalingState
    );
    return;
  }

  try {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.offer)
    );
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("renegotiation-answer", { answer });
    console.log("Renegotiation completed successfully.");
  } catch (error) {
    console.error("Error handling renegotiation:", error);
  }
});
// socket.on("user-disconnected", (data) => {
//   const streamId = data.streamId;
//   console.log(`User disconnected: Stream ID=${streamId}`);

//   const remoteVideo = document.getElementById(`video-${streamId}`);
//   if (remoteVideo) {
//     remoteVideo.remove();
//     console.log(`Removed video element for stream ID: ${streamId}`);
//   } else {
//     console.warn(`No video element found for stream ID: ${streamId}`);
//   }
// });
socket.on("user-disconnected", (data) => {
  const streamId = data.streamId;
  console.log(`User disconnected: Stream ID=${streamId}`);

  const remoteVideo = document.getElementById(`video-${streamId}`);
  if (remoteVideo) {
    remoteVideo.srcObject = null; // Clear the video element source
    remoteVideo.remove(); // Remove the video element from the DOM
    console.log(`Removed video element for stream ID: ${streamId}`);
  } else {
    console.warn(`No video element found for Stream ID: ${streamId}`);
  }
});

function cleanUpResources() {
  // Stop local media tracks
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      track.stop();
      console.log(`Stopped local track: ${track.id}`);
    });
    localStream = null;
  }

  // Close PeerConnection
  if (peerConnection) {
    peerConnection.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
        console.log(`Stopped sender track: ${sender.track.id}`);
      }
    });
    peerConnection.close();
    console.log("PeerConnection closed.");
    peerConnection = null;
  }

  // Remove all remote video elements
  const remoteVideos = document.getElementById("remoteVideos");
  if (remoteVideos) {
    remoteVideos.innerHTML = ""; // Clear all remote video elements
    console.log("Removed all remote video elements.");
  }
}

// Trigger cleanup on page unload
window.addEventListener("beforeunload", cleanUpResources);


// Example: Trigger cleanup on a button click or before unloading the page
window.addEventListener("beforeunload", cleanUpResources);

// Initialize
