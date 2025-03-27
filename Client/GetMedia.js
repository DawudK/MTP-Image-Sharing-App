const net = require("net");
const fs = require("fs");
const open = require("open");
const MTPRequest = require("./MTPRequest");
const singleton = require("./Singleton");

// ------------------
// Parse CLI arguments
// ------------------
let args = process.argv.slice(2);
let serverArg, queryArg, versionArg;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "-s" && args[i + 1]) {
    serverArg = args[i + 1];
    i++;
  } else if (args[i] === "-q" && args[i + 1]) {
    queryArg = args[i + 1];
    i++;
  } else if (args[i] === "-v" && args[i + 1]) {
    versionArg = parseInt(args[i + 1]);
    i++;
  }
}

if (!serverArg || !queryArg || !versionArg) {
  console.error(
    "Usage: node GetMedia -s <serverIP>:<port> -q <image/video name> -v <version>"
  );
  process.exit(1);
}

let [serverIP, portStr] = serverArg.split(":");
let port = parseInt(portStr, 10);

// ------------------
// Determine media type based on extension
// ------------------
function getMediaType(filename) {
  let ext = filename.split(".").pop().toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return 1;
    case "bmp":
      return 2;
    case "tiff":
    case "tif":
      return 3;
    case "png":
      return 4;
    case "gif":
      return 5;
    case "raw":
      return 15;
    case "mp4":
      return 6;
    case "avi":
      return 7;
    case "mov":
      return 8;
    default:
      return 0; // unknown
  }
}
let mediaType = getMediaType(queryArg);

// ------------------
// Build MTP request packet
// ------------------
let timestamp = Date.now() % 0x100000000; // 32-bit timestamp
MTPRequest.init(queryArg, mediaType, timestamp, versionArg);
let requestPacket = MTPRequest.getBytePacket();

// Print the command line as entered
console.log(`node GetMedia -s ${serverArg} -q ${queryArg} -v ${versionArg}`);

// ------------------
// Connect to server and accumulate data
// ------------------
let client = net.createConnection({ host: serverIP, port: port }, () => {
  console.log(`Connected to MediaDB server on: ${serverIP}:${port}`);
  client.write(requestPacket);
});

let responseBuffer = Buffer.alloc(0);
let totalPacketsReceived = 0;

client.on("data", (data) => {
  totalPacketsReceived++;
  responseBuffer = Buffer.concat([responseBuffer, data]);
});

client.on("end", () => {
  console.log("\nDisconnected from the server");
  console.log("Connection closed");

  // Now responseBuffer contains the full response.
  // Extract the first 12 bytes (header) and print them in bits.
  const HEADER_SIZE = 12;
  if (responseBuffer.length < HEADER_SIZE) {
    console.error("Error: Incomplete header received.");
    process.exit(1);
  }

  let headerBuffer = responseBuffer.slice(0, HEADER_SIZE);
  console.log("\nMTP response packet (header only):");
  printFirst12BytesInBits(headerBuffer);

  // Parse header fields from the full response (first 12 bytes)
  let version = parseBitPacket(responseBuffer, 0, 4);
  let responseType = parseBitPacket(responseBuffer, 4, 3);
  let respTimestamp = parseBitPacket(responseBuffer, 33, 32);
  let payloadSize = parseBitPacket(responseBuffer, 66, 30);

  console.log(`\nVersion: ${version}`);
  console.log(`Response type: ${responseTypeToString(responseType)}`);
  console.log(`Timestamp: ${respTimestamp}`);
  console.log(`Payload size: ${payloadSize}`);

  // Extract the payload (everything after the first 12 bytes)
  let payload = responseBuffer.slice(HEADER_SIZE);
  console.log(`Processing complete packet 0, payload size: ${payload.length}`);

  // Write the payload to file
  fs.writeFileSync(queryArg, payload);
  console.log(`\nFile saved successfully with size: ${payload.length}`);
  console.log(`Total packets received: ${totalPacketsReceived}`);

  // Open the file using the default media viewer
  open(queryArg).catch((err) => {
    console.error(`Error opening file: ${err}`);
  });
});

client.on("error", (err) => {
  console.error("Client error:", err);
});

// ------------------
// Helper Functions
// ------------------

/**
 * Print ONLY the provided buffer (expected to be 12 bytes) in bits,
 * 4 bytes per line.
 */
function printFirst12BytesInBits(buffer) {
  let line = "";
  for (let i = 0; i < buffer.length; i++) {
    let byteStr = buffer[i].toString(2).padStart(8, "0");
    if (i > 0 && i % 4 === 0) {
      console.log(line.trim());
      line = "";
    }
    line += " " + byteStr;
  }
  if (line.trim().length > 0) {
    console.log(line.trim());
  }
}

/**
 * parseBitPacket: Read 'length' bits from 'data' at 'offset'
 */
function parseBitPacket(data, offset, length) {
  let number = 0;
  for (let i = 0; i < length; i++) {
    let bytePos = Math.floor((offset + i) / 8);
    let bitPos = 7 - ((offset + i) % 8);
    let bit = (data[bytePos] >> bitPos) & 1;
    number = (number << 1) | bit;
  }
  return number;
}

/**
 Convert numeric response type to a descriptive string.
 */
function responseTypeToString(rt) {
  switch (rt) {
    case 0:
      return "Query";
    case 1:
      return "Found";
    case 2:
      return "Not found";
    case 3:
      return "Busy";
    default:
      return "Unknown";
  }
}
