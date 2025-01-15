// ...................Implementing forwardTrackToOthers Function.................


// ...................backend.................

function forwardTrackToOthers(sourceSocketId, track, stream, source) {
    // First, we check if the track is live. If it’s not, we skip it.
    // A track must have a "live" state to be forwarded to other peers.
    if (track.readyState !== "live") {
        console.warn(
            `Track ${track.id} from Stream ID ${stream.id} is not live (readyState: ${track.readyState}). Skipping.`
        );
        return;
    }

    // Next, we validate the stream to ensure it has at least one enabled video track.
    const hasValidVideoTrack = stream
        .getVideoTracks()
        .some((track) => track.enabled);

    // If the stream has a valid video track and hasn’t been forwarded already, we mark it.
    if (hasValidVideoTrack && !clients[sourceSocketId].localStreams.includes(stream.id)) {
        clients[sourceSocketId].localStreams.push(stream.id);
    }

    // Log the stream ID for the source client, helpful for debugging and tracking.
    console.log("Stream ID for:", sourceSocketId, "is:", clients[sourceSocketId].localStreams);

    // Now, iterate through all connected clients to forward the track.
    Object.keys(clients).forEach((destinationSocketId) => {
        // Skip the source client; we only forward to other clients.
        if (destinationSocketId !== sourceSocketId && clients[destinationSocketId].peerConnection) {
            const receiverConnection = clients[destinationSocketId].peerConnection;

            // Ensure the destination client has a `forwardedTracks` map to track forwarded tracks.
            if (!clients[destinationSocketId].forwardedTracks) {
                clients[destinationSocketId].forwardedTracks = new Map();
            }

            const forwardedTracks = clients[destinationSocketId].forwardedTracks;

            // Create a unique key to track this forwarded track.
            const trackKey = `${track.id}|${stream.id}|${sourceSocketId}|${destinationSocketId}`;

            // If this track has already been forwarded, we skip it.
            if (forwardedTracks.has(trackKey)) {
                console.warn(
                    `Track ${track.id} already forwarded to receiver ${destinationSocketId}. Skipping.`
                );
                return;
            }

            // Check if there’s already an identical forwarded track, to avoid duplicates.
            const existingForwardedTrack = Array.from(forwardedTracks.keys()).find((key) => {
                const [trackId, streamId, sourceId, destId] = key.split("|");
                return (
                    sourceId === sourceSocketId &&
                    destId === destinationSocketId &&
                    forwardedTracks.get(key).kind === track.kind // Ensure the type matches (video/audio)
                );
            });

            if (existingForwardedTrack) {
                console.log(
                    `Track ${track.id} (Stream ID: ${stream.id}) already forwarded from ${sourceSocketId} to ${destinationSocketId}. Skipping.`
                );
                return;
            }

            // If the track is valid and hasn’t been forwarded yet, proceed with forwarding.
            if (!hasValidVideoTrack) {
                console.warn(`Stream ${stream.id} has no valid video tracks. Skipping.`);
                return;
            }

            try {
                console.log(
                    `Forwarding track ${track.kind} ${track.id} (Stream ID: ${stream.id}) from ${sourceSocketId} to ${destinationSocketId}`
                );

                // Before adding the track, ensure the stream exists.
                if (!stream) {
                    console.warn(`Stream is missing for track ${track.id}. Skipping.`);
                    return;
                }

                // Check if the track has already been added to the receiver connection.
                const existingSender = receiverConnection
                    .getSenders()
                    .find((sender) => sender.track && sender.track.id === track.id);

                if (existingSender) {
                    console.warn(
                        `Track ${track.id} already exists in receiver connection. Skipping.`
                    );
                    return;
                }

                // Add the track to the receiver’s peer connection.
                receiverConnection.addTrack(track, stream);

                // Mark this track as forwarded to avoid duplication.
                forwardedTracks.set(trackKey, { kind: track.kind });
            } catch (error) {
                // Log any errors encountered while forwarding the track.
                console.error(
                    `Error forwarding track ${track.id} (Stream ID: ${stream.id}) to ${destinationSocketId}:`,
                    error
                );
            }
        }
    });
}

// #### socket.on("offer", async (data) => {
//     try {
//       const { peerConnection, answer } = await handlePeerConnection(
//         socket.id,
//         data.offer
//       );

//       // Store the PeerConnection in the clients object
//       clients[socket.id].peerConnection = peerConnection;

//       // Send the answer back to the client
//       socket.emit("answer", { answer });

Object.keys(clients).forEach((existingSocketId) => {
    // First, we loop through all the connected clients.
    // `Object.keys(clients)` gives us an array of all client socket IDs, and `forEach` lets us process each one.
    if (existingSocketId !== socket.id) {
        // We check if the current `existingSocketId` is **not** the same as the `socket.id` of the current client.
        // This ensures we don’t forward tracks back to the same client that sent them.
        const existingClient = clients[existingSocketId]; // Fetch the client object for this `existingSocketId`.

        if (existingClient.peerConnection) {
            // If the client has an active peer connection, proceed to forward its tracks.

            // Get all the senders (media tracks like video/audio) from the peer connection.
            existingClient.peerConnection.getSenders().forEach((sender) => {
                const track = sender.track; // Extract the track (audio or video) from the sender.

                const source = "from offer"; // Add a debug source tag to track where this forwarding originated.

                if (track) {
                    // If the track exists (it’s valid and active), we forward it to other clients.
                    forwardTrackToOthers(
                        existingSocketId,             // The socket ID of the client sending the track.
                        track,                        // The media track being forwarded.
                        new MediaStream([track]),     // Create a new media stream containing just this track.
                        source                        // Pass the source context for debugging/logging.
                    );
                }
            });
        }
    }
});
