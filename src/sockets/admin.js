export default function setupAdminNamespace(io) {
  const adminIo = io.of("/admin");
  adminIo.on("connection", (socket) => {
    console.log(
      `socket ${socket.id} has conected to /admin namespace as (username): ` + socket.username
    );
  });
  adminIo.use((socket, next) => {
    if (socket.handshake.auth.token) {
      socket.username = getUsernameFromToken(socket.handshake.auth.token);
      next();
    } else {
      next(new Error("Please send a token"));
    }
  });
  //Utility functions below:
  function getUsernameFromToken(token) {
    //get user information from token
    return token; //now just returning token
  }
}
