// ...................Handling ontrack Event on the Frontend.................


// ...................frontend.................

peerConnection.ontrack = (event) => {
    // When a remote media track (like video or audio) is received through the peer connection,
    // this event is triggered. It provides the media stream and details about the track.

    const stream = event.streams[0]; // Extract the first media stream from the event.
    const streamId = stream.id;      // Get the unique ID of the stream.
    const remoteVideoId = `video-${streamId}`; // Create a unique ID for the video element.

    // Log information about the received remote stream for debugging and visibility.
    console.log(
        `Remote stream received: Stream ID=${streamId} track kind=${event.track.kind}`
    );

    // **Step 1: Validate the Stream**
    // Before doing anything with the stream, we make sure it is valid and contains usable video tracks.
    if (
        !stream ||                            // Check if the stream exists.
        stream.getTracks().length === 0 ||   // Ensure the stream has tracks.
        !stream.getVideoTracks().some((track) => track.enabled) // Ensure at least one video track is enabled.
    ) {
        console.warn(`Stream ${streamId} has no valid video tracks. Skipping.`);
        return; // If the stream is invalid, skip further processing.
    }

    // **Step 2: Check for Existing Video Element**
    let remoteVideo = document.getElementById(remoteVideoId);

    if (!remoteVideo) {
        // If no video element exists for this stream, create one.
        remoteVideo = document.createElement("video"); // Create a new video element.
        remoteVideo.id = remoteVideoId;               // Assign the unique ID.
        remoteVideo.srcObject = stream;               // Attach the stream to the video element.
        remoteVideo.autoplay = true;                  // Enable autoplay for the video.
        remoteVideo.playsInline = true;               // Ensure the video plays inline (important for mobile browsers).

        // Append the newly created video element to the `remoteVideos` container.
        document.getElementById("remoteVideos").appendChild(remoteVideo);
        console.log(`Added video element for stream ID: ${streamId}`);
    } else {
        // If a video element already exists for this stream, log a warning and skip creating a new one.
        console.warn(`Video element already exists for Stream ID: ${streamId}`);
    }
};
