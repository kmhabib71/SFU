 // ...................   Creating and Sending SDP Answer from the Backend.................


// ...................backend.................
 
// #### async function handlePeerConnection(socketId, offer) {
//     ...................
//     ...................
// await peerConnection.setRemoteDescription(offer);
//console.log(`Offer set as remote description for client: ${socketId}`);

// Create an answer
// First, we use the `createAnswer` method to generate an SDP answer.
// This answer is the counterpart to the SDP offer we received earlier.
// It tells the initiating peer (client) how this peer (server) intends to communicate.
const answer = await peerConnection.createAnswer();

// After creating the answer, we need to set it as the local description for this peer connection.
// Setting the local description tells the WebRTC API, "This is my part of the connection details."
await peerConnection.setLocalDescription(answer);

// We return the `peerConnection` and the `answer` so they can be used elsewhere in the code.
// The `peerConnection` object keeps track of the ongoing WebRTC connection,
// and the `answer` is the SDP that will be sent back to the client.
return { peerConnection, answer };

/ }     


// #### socket.on("offer", async (data) => {
//     try {
//       const { peerConnection, answer } = await handlePeerConnection(
//         socket.id,
//         data.offer
//       );

//       // Store the PeerConnection in the clients object
//       clients[socket.id].peerConnection = peerConnection;

      // Send the answer back to the client
// Using the socket connection, we emit the "answer" event to the client.
// The event carries the generated SDP answer in the `answer` object.
// This is crucial for completing the WebRTC handshake,
// as the client needs this information to finalize their connection setup.
socket.emit("answer", { answer });


 // #### })