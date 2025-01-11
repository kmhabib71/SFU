// ...................Connecting Frontend and Backend Sockets.................


// ...................Frontend.................
const socket = io("http://localhost:3000");
socket.on("connect", () => {
    console.log("Connected to Socket.IO server with ID:", socket.id);
    document.title = socket.id.slice(-4);

  });

// ...................Backend.................

// Object to keep track of connected clients
const clients = {};

// io.on("connection", (socket) => {
// console.log("A user connected:", socket.id);

clients[socket.id] = {
    socket,
    peerConnection: null,
    isRenegotiating: false,
    localStreams: [], // Local streams (tracks created by this client)
    // forwardedStreams: [], // Forwarded streams (tracks received from others)
  };
console.log("clients", clients);
// })