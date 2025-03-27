let net = require("net");
let singleton = require("./Singleton");
let ClientsHandler = require("./ClientsHandler");

let HOST = "127.0.0.1";
let PORT = 3000;

// Initialize any global counters or timers
singleton.init();

// Create the server and start listening
let mediaServer = net.createServer().listen(PORT, HOST);

console.log(`Server listening on ${HOST}:${PORT}`);

mediaServer.on("connection", (sock) => {
  // "Connected: x.x.x.x:port"
  console.log(`Connected: ${sock.remoteAddress}:${sock.remotePort}`);

  // "Client joined: x.x.x.x:port"
  console.log(`Client joined: ${sock.remoteAddress}:${sock.remotePort}`);

  // Delegate the rest of the handling to ClientsHandler
  ClientsHandler.handleClientJoining(sock);
});
