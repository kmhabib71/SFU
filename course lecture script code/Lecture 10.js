// ................... Loading Local Media Devices.................


// ...................Frontend.................

// #### socket.on("connect", () => {
// ####   console.log("Connected to Socket.IO server with ID:", socket.id);
// #### document.title = socket.id.slice(-4);
  loadLocalStream();

// #### });

// Alright, here’s our `loadLocalStream` function. 
// It’s *asynchronous*, which means it can handle tasks that might take some time without freezing the whole app.
async function loadLocalStream() {
  // First, let’s wrap everything in a `try` block. Why? 
  // Because things can go wrong, like the user denying permission or no camera being available.
  try {
      // Now, here’s the star of the show: `navigator.mediaDevices.getUserMedia`.
      // This method is like asking the browser, "Hey, can I use the camera and microphone?"
      // It returns a media stream, but because it takes some time, we use `await` to pause until it’s ready.
      localStream = await navigator.mediaDevices.getUserMedia({
          video: true, // We’re saying, "Yes, I want the video stream."
          audio: true, // And also, "Please include the audio too."
      });

      // Great! If everything worked, we now have our media stream. 
      // The next step is to display it in a video element on the page.
      // Here, `localVideo.srcObject` tells the browser, "Hey, show this stream in the video player."
      localVideo.srcObject = localStream;

      // And to confirm everything went smoothly, we’ll log a happy message to the console.
      console.log("Local stream loaded successfully.");
  } catch (error) {
      // But, as we know, life doesn’t always go as planned.
      // If something goes wrong—like the user says "No" to the camera request—this `catch` block will handle it.
      // We’re logging the error to the console so we know what went wrong.
      console.error("Error loading local stream:", error);
  }
}

// ...................Backend.................

