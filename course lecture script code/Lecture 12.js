// ...................  Creating and Sending SDP Offer from the Frontend.................


// ...................Frontend.................



// ##### async function loadLocalStream() {
//     try {
//       localStream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true,
//       });
//       localVideo.srcObject = localStream;
//       console.log("Local stream loaded successfully.");
//       await createPeerConnection();
  

// First, we check if the socket is connected. 
// A socket connection is necessary because we need it to communicate with the other peer.
if (socket.connected) {
    // If the socket is connected, we proceed by calling `createOffer`.
    // `createOffer` will handle creating and sending an offer for the WebRTC connection.
    // But remember, this should happen after the local stream is ready.
    await createOffer();
} else {
    // If the socket isn’t connected, we log a message to indicate that the connection isn’t ready.
    console.log("Socket not connected");
}



//     } catch (error) {
//       console.error("Error loading local stream:", error);
//     }
// #####  }

// This is the `createOffer` function, which is responsible for initiating the WebRTC connection by creating an offer.
// The offer contains details about the media streams and connection parameters for the peer.
async function createOffer() {
    // First, we check the signaling state of the peer connection.
    // The signaling state must be "stable" before creating an offer.
    // If it's not stable, we log a warning and exit the function. This prevents errors during the connection process.
    if (peerConnection.signalingState !== "stable") {
        console.warn(
            "Cannot create offer. Signaling state:",
            peerConnection.signalingState
        );
        return; // Exit the function since the state isn't ready.
    }

    // If the signaling state is stable, we move on to creating an offer.
    // `createOffer` generates an SDP (Session Description Protocol) offer, which describes the media connection.
    const offer = await peerConnection.createOffer();

    // Once the offer is created, we set it as the local description of the peer connection.
    // This tells the WebRTC API that this device is initiating the connection with this offer.
    await peerConnection.setLocalDescription(offer);

    // At this point, the offer is ready to be sent to the other peer via the signaling server.
    // We use the socket connection to emit the offer to the other peer.
    socket.emit("offer", { offer });

    // Optional: You can log the offer's SDP (Session Description Protocol) for debugging purposes.
    // console.log("Offer created: ", offer.sdp);
}
