// ...................Handling User Disconnection on the Backend.................


// ...................Backend.................

socket.on("disconnect", () => {
    // This event is triggered whenever a client disconnects from the server.
    const client = clients[socket.id]; // Retrieve the client object using the socket ID.

    if (client) {
        // **Step 1: Handle and Broadcast Local Streams**
        if (Array.isArray(client.localStreams)) {
            // If the client has a list of local streams, iterate through them.
            client.localStreams.forEach((streamId) => {
                // Inform other clients that this user has disconnected and their stream is no longer available.
                socket.broadcast.emit("user-disconnected", { streamId });

                // Log the stream ID and the socket ID for debugging purposes.
                console.log(
                    `Disconnect stream ID: ${streamId}, SocketID: ${socket.id}`
                );
            });
        } else {
            // If `localStreams` is not an array, log an error for debugging.
            console.error(
                `Expected client.localStreams to be an array but got:`,
                client.localStreams
            );
        }

        // **Step 2: Close the PeerConnection**
        if (client.peerConnection) {
            // Stop all tracks being sent by the client.
            client.peerConnection.getSenders().forEach((sender) => {
                if (sender.track) {
                    sender.track.stop(); // Stop the media track to release resources.
                }
            });

            // Close the peer connection to clean up WebRTC resources.
            client.peerConnection.close();
            console.log(`PeerConnection closed for client: ${socket.id}`);
        }

        // **Step 3: Remove the Client from the Server’s Records**
        delete clients[socket.id]; // Remove the client entry from the `clients` object.
        console.log(`Client removed: ${socket.id}`);

        // Optional: Add visual logs for easier tracking during testing.
        console.log("............................................................");
        console.log("............................................................");
    } else {
        // If no client data exists for the socket ID, log a warning.
        console.warn(`No client data found for socket ID: ${socket.id}`);
    }
});
