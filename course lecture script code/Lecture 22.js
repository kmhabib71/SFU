
// ...................Implementing a Cleanup Function.................


// ...................Frontend.................

function cleanUpResources() {
    // **Step 1: Stop Local Media Tracks**
    if (localStream) {
      // Iterate through all the tracks (audio or video) in the local media stream.
      localStream.getTracks().forEach((track) => {
        track.stop(); // Stop each track to release the media resources (camera/microphone).
        console.log(`Stopped local track: ${track.id}`); // Log the track ID for debugging.
      });
  
      // After stopping the tracks, clear the `localStream` variable to indicate it’s no longer in use.
      localStream = null;
    }
  
    // **Step 2: Close the PeerConnection**
    if (peerConnection) {
      // Iterate through all the media senders (tracks sent to remote peers) in the peer connection.
      peerConnection.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop(); // Stop the media track to release resources.
          console.log(`Stopped sender track: ${sender.track.id}`); // Log the track ID for debugging.
        }
      });
  
      // Close the peer connection to terminate the WebRTC session.
      peerConnection.close();
      console.log("PeerConnection closed."); // Confirm the connection has been closed.
  
      // Clear the `peerConnection` variable to indicate it’s no longer active.
      peerConnection = null;
    }
  
    // **Step 3: Remove All Remote Video Elements**
    const remoteVideos = document.getElementById("remoteVideos"); // Find the container holding remote video elements.
    if (remoteVideos) {
      remoteVideos.innerHTML = ""; // Remove all child elements (video elements) from the container.
      console.log("Removed all remote video elements."); // Confirm the removal for debugging.
    }
  }
  

  // Trigger cleanup when the user is about to leave the page.
window.addEventListener("beforeunload", cleanUpResources);
