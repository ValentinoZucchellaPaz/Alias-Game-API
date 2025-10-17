export default function setupAdminNamespace(io) {
  //creates admin namespace based on `io` socket.io server instance
  //1
  const adminIo = io.of("/admin");

  //3
  adminIo.on("connection", (socket) => {
    console.log(
      `socket ${socket.id} has conected to /admin namespace as (username): ` + socket.username
    );
  });

  //authentication middleware
  //2
  adminIo.use((socket, next) => {
    if (socket.handshake.auth.token) {
      socket.username = getUsernameFromToken(socket.handshake.auth.token);
      next();
    } else {
      next(new Error("Please send a token"));
    }
  });

  //Utility functions below:

  //todo: decode token to return username
  function getUsernameFromToken(token) {
    return token.payload.user;
  }
}
