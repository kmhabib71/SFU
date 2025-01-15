// ...................Handling User Disconnection on the Frontend.................


// ...................Frontend.................

socket.on("user-disconnected", (data) => {
    // This event is triggered when the server informs the client that a user has disconnected.
    const streamId = data.streamId; // Extract the stream ID of the disconnected user.

    // Log the disconnection event for visibility and debugging.
    console.log(`User disconnected: Stream ID=${streamId}`);

    // **Step 1: Find the Video Element**
    // Locate the video element associated with the disconnected user's stream.
    const remoteVideo = document.getElementById(`video-${streamId}`);

    if (remoteVideo) {
        // **Step 2: Clear and Remove the Video Element**
        // If the video element exists, first clear its media source.
        remoteVideo.srcObject = null;

        // Then, remove the video element from the DOM to clean up the interface.
        remoteVideo.remove();

        // Log a success message confirming the video element was removed.
        console.log(`Removed video element for stream ID: ${streamId}`);
    } else {
        // If no video element is found, log a warning.
        console.warn(`No video element found for Stream ID: ${streamId}`);
    }
});
