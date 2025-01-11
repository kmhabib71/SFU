

 // ...................ICE Candidate Exchange.................


// ...................frontend.................

// #### async function createPeerConnection() {
//     peerConnection = new RTCPeerConnection(configuration);
  
//     console.log("Creating peer connection");
  
//     // Add local stream tracks to the connection
//     localStream.getTracks().forEach((track) => {
//       peerConnection.addTrack(track, localStream);
//       console.log("Adding local stream track:", track);
//     });
  
   // Log and emit ICE candidates
// When a peer connection is created, we listen for ICE candidates.
// ICE candidates are network connection details that help establish a direct connection between peers.
peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        // If an ICE candidate is generated, we log it for debugging.
        console.log("New ICE candidate:", event.candidate);

        // Then, we send the ICE candidate to the server using the socket connection.
        socket.emit("ice-candidate", event.candidate);
    }
};

// #### }

// Listen for incoming "ice-candidate" events from the server.
// This event is triggered when the server sends an ICE candidate from another peer.
socket.on("ice-candidate", async (data) => {
    // Log the received ICE candidate for debugging purposes.
    console.log("ICE candidate received from server:", data);

    try {
        // Create a new `RTCIceCandidate` object using the data received from the server.
        // This object represents the network connection details shared by the other peer.
        const candidate = new RTCIceCandidate({
            candidate: data.candidate,       // The actual ICE candidate information.
            sdpMid: data.sdpMid,             // Identifies the media section this candidate belongs to.
            sdpMLineIndex: data.sdpMLineIndex, // The index of the media description.
            usernameFragment: data.usernameFragment, // Optional username fragment for identification.
        });

        // Add the candidate to the current peer connection.
        // This helps the WebRTC engine establish the connection using this candidate.
        await peerConnection.addIceCandidate(candidate);

        // Log a success message to confirm the ICE candidate was added without issues.
        console.log("ICE candidate added successfully.");
    } catch (error) {
        // If adding the ICE candidate fails, log the error for debugging.
        // Common reasons might include a malformed candidate or connection issues.
        console.error("Error adding ICE candidate:", error);
    }
});



  // ...................server.................

//  #### async function handlePeerConnection(socketId, offer) {

peerConnection.onicecandidate = (event) => {
    // This event triggers whenever the peer connection generates a new ICE candidate.
    if (event.candidate) {
        // If there's a valid ICE candidate, we send it to the corresponding client.
        clients[socketId].socket.emit("ice-candidate", {
            candidate: event.candidate.candidate,       // The actual ICE candidate information.
            sdpMid: event.candidate.sdpMid,             // Identifies the media section this candidate belongs to.
            sdpMLineIndex: event.candidate.sdpMLineIndex, // Index of the media description.
            usernameFragment: event.candidate.usernameFragment, // Optional identifier for this candidate.
        });
        console.log("ICE candidate sent to client:", socketId);
    }
};

// }
socket.on("ice-candidate", async (data) => {
    // This listener waits for an "ice-candidate" event from a client.
    // It handles ICE candidates sent by the client to add them to the corresponding peer connection.
    const client = clients[socket.id]; // Find the client associated with this socket.

    if (client && client.peerConnection) {
        try {
            // Add the received ICE candidate to the client's peer connection.
            await client.peerConnection.addIceCandidate(data);

            // Optional: Log a success message to confirm the candidate was added.
            console.log(`ICE candidate added for client: ${socket.id}`);
        } catch (err) {
            // If adding the ICE candidate fails, log an error for debugging.
            console.error(`Failed to add ICE candidate for client: ${socket.id}`, err);
        }
    }
});
