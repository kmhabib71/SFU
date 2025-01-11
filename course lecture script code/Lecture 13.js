// ...................  Receiving and Processing SDP Offer on the Backend.................


// ...................backend.................

// This is the backend code that listens for an SDP offer from a client
// and handles setting up the WebRTC peer connection in response.

async function handlePeerConnection(socketId, offer) {
    // First, we create a new RTCPeerConnection instance.
    // This will handle the communication between the peers.
    const peerConnection = new RTCPeerConnection();

    // Next, we set the remote description of this peer connection.
    // The remote description is the offer sent by the client (socketId) that initiated the connection.
    // This tells the WebRTC API what the other peer's connection details look like.
    await peerConnection.setRemoteDescription(offer);

    // Finally, we return the `peerConnection` object so it can be used elsewhere in the code.
    return { peerConnection };
}

// Now we listen for the "offer" event on the socket.
// When a client sends an SDP offer, this event will trigger.
socket.on("offer", async (data) => {
    try {
        // We call the `handlePeerConnection` function to process the incoming offer.
        // The `socket.id` identifies the client sending the offer, and `data.offer` contains the SDP offer itself.
        const { peerConnection } = await handlePeerConnection(
            socket.id,      // The ID of the client sending the offer.
            data.offer      // The SDP offer being processed.
        );

        // Once the peer connection is created, we store it in a `clients` object.
        // This allows us to track and manage the peer connection for this specific client.
        clients[socket.id].peerConnection = peerConnection;

    } catch (error) {
        // If anything goes wrong during this process, we catch the error and log it.
        // This ensures we can debug issues without crashing the server.
        console.error(`Failed to process offer for client ${socket.id}:`, error);
    }
});
