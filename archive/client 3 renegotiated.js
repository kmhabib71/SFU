const socket = io("http://localhost:3000");
const localVideo = document.getElementById("localVideo");

let localStream;
let peerConnection;

socket.on("connect", () => {
  console.log("Connected to Socket.IO server with ID:", socket.id);
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

  // Listen for remote tracks
  peerConnection.ontrack = (event) => {
    console.log("Remote track received:", event.track);
    console.log("Stream from remote track:", event.streams[0]);

    const remoteVideo = document.createElement("video");
    remoteVideo.srcObject = event.streams[0];
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;
    document.getElementById("remoteVideos").appendChild(remoteVideo);
  };

  // Monitor signaling state changes
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

  console.log("Offer created: ", offer.sdp);

  socket.emit("offer", { offer });
}

// Handle incoming answer
socket.on("answer", async (data) => {
  console.log("Answer received from server:");
  console.log("Local SDP Offer:", peerConnection.localDescription.sdp);

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
  console.log("Renegotiation offer received from server:", data.offer);

  try {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.offer)
    );
    console.log("Remote description set for renegotiation offer.");

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    console.log("Renegotiation answer created:", answer.sdp);
    socket.emit("renegotiation-answer", { answer });
    console.log("Renegotiation answer sent to server.");
  } catch (error) {
    console.error("Error handling renegotiation offer:", error);
  }
});

// Initialize
