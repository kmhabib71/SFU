 // ...................Handling ontrack Event on the Backend.................


// ...................backend.................

async function handlePeerConnection(socketId, offer) {
    // First, we create a new `RTCPeerConnection` for the client identified by `socketId`.
    // This is the foundation of any WebRTC connection—it handles everything from media to signaling.
    const peerConnection = new RTCPeerConnection();

    // Now, we set up an important event listener, `ontrack`.
    // This event is triggered when the peer connection receives a media track (like audio or video) from the client.
    peerConnection.ontrack = (event) => {
        console.log("ontrack event for socket id:", socketId);

        // From the event, we extract the media stream.
        // A media stream is a container for tracks (e.g., audio and video tracks).
        const [stream] = event.streams;

        // Before doing anything with the stream, we need to check if it’s valid.
        // Specifically, we’re looking for at least one live video track in the stream.
        if (
            stream &&
            stream
                .getTracks()
                .some((track) => track.kind === "video" && track.readyState === "live")
        ) {
            // If the stream has a live video track, we want to share it with other clients.
            const source = "from ontrack"; // This is just a tag to help us debug where the track is coming from.

            // Here’s the key step: we loop through all the tracks in the stream and forward them.
            stream.getTracks().forEach((track) => {
                forwardTrackToOthers(socketId, track, stream, source);
            });
        } else {
            // If the stream doesn’t have a valid video track, we log a warning and skip it.
            console.warn(
                `Stream ${
                    stream?.id || "undefined"
                } does not have a valid live video track. Skipping.`
            );
        }
    };
}


