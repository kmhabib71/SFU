
 // ...................Processing the Remote SDP Answer on the Frontend.................


// ...................frontend.................
 
// We’re setting up a listener for the "answer" event on the socket.
// This event is triggered when the server sends an SDP answer to the client.
socket.on("answer", async (data) => {
    // First, we log a message to indicate that an answer has been received from the server.
    console.log("Answer received from server:");
    // (Optional) You could log the local SDP offer here for debugging purposes.
    // console.log("Local SDP Offer:", peerConnection.localDescription.sdp);

    // Before applying the answer, we check the signaling state of the peer connection.
    // The signaling state should be "have-local-offer," which means the client has sent an offer,
    // and it's now waiting for the server's answer.
    if (peerConnection.signalingState === "have-local-offer") {
        try {
            // If the signaling state is correct, we apply the server's answer to the peer connection.
            // `setRemoteDescription` tells the WebRTC API, "Here’s the server’s response to our offer."
            // We wrap the answer in an `RTCSessionDescription` object to ensure it’s properly formatted.
            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(data.answer)
            );

            // If everything goes well, we log a success message.
            console.log("Answer applied successfully.");
        } catch (error) {
            // If an error occurs while setting the remote description, we catch it here.
            // This might happen if the answer is malformed or if there’s a network issue.
            console.error("Failed to apply remote description:", error);
        }
    } else {
        // If the signaling state isn’t "have-local-offer," something is off.
        // We log a warning to indicate that we’re in an unexpected state.
        console.warn("Unexpected signaling state:", peerConnection.signalingState);
    }
});
