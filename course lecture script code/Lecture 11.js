// ...................  Creating RTCPeerConnection on the Frontend.................


// ...................Frontend.................

// RTCPeerConnection instance for handling WebRTC communication.
let peerConnection; // This will manage our WebRTC connection.


// ####### async function loadLocalStream() {
//     try {
//       localStream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true,
//       });
//       localVideo.srcObject = localStream;
//       console.log("Local stream loaded successfully.");
      await createPeerConnection();
  
//     } catch (error) {
//       console.error("Error loading local stream:", error);
//     }
//  ####### }

// after getting the local stream
// First, we define a configuration object. This is like giving instructions to our WebRTC connection
// on how to handle network traversal. Specifically, we include ICE servers.
// ICE servers help devices connect even when they’re behind routers or firewalls.
// Here, we’re using Google’s public STUN server to figure out the public IP and port.
const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }], // Using a STUN server for connection setup.
};

// Next, we define an asynchronous function to create a peer connection.
// This is where the actual WebRTC connection setup begins.
async function createPeerConnection() {
    // Inside this function, we create a new RTCPeerConnection instance using our configuration.
    // This is like setting up the main engine that will handle all the WebRTC magic.
    peerConnection = new RTCPeerConnection(configuration);

    // We log a message to the console to confirm that the peer connection is being created.
    // Logging like this is super helpful to understand what’s happening as the code runs.
    console.log("Creating peer connection");

    // Now, let’s add the local media stream to our peer connection.
    // The `getTracks` method fetches all the individual tracks (like video or audio) from the local stream.
    localStream.getTracks().forEach((track) => {
        // For each track, we add it to the peer connection using the `addTrack` method.
        // This ensures that both video and audio from the local stream are shared.
        peerConnection.addTrack(track, localStream);

        // We also log each track as it’s added. This helps us see exactly what’s being shared.
        console.log("Adding local stream track:", track);
    });
}
