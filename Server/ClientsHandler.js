var MTPpacket = require("./MTPResponse");
var singleton = require("./Singleton");
var fs = require("fs");
var path = require("path");

// Constants for MTP Request parsing
const REQUEST_HEADER_SIZE = 12;
const EXPECTED_MTP_VERSION = 18;

module.exports = {
  handleClientJoining: function (sock) {
    let clientId = singleton.getTimestamp();

    // Login Timestamp
    console.log(`\nClient-${clientId} is connected at timestamp: ${clientId}`);

    // On receiving data
    sock.on("data", function (data) {
      console.log("\nMTP packet received:");

      printPacketBit(data);

      // Parse out the request fields
      let version = parseBitPacket(data, 0, 5); // MTP version (5 bits)
      let requestType = parseBitPacket(data, 30, 2); // 2-bit request type
      let timestamp = parseBitPacket(data, 32, 32); // 32-bit timestamp
      let mediaType = parseBitPacket(data, 64, 4); // 4-bit media type
      let fileNameSize = parseBitPacket(data, 68, 28);
      let fileNameBytes = data.slice(
        REQUEST_HEADER_SIZE,
        REQUEST_HEADER_SIZE + fileNameSize
      );
      let mediaName = bytesToString(fileNameBytes);

      // Turn numeric request type into a string
      let requestTypeStr = interpretRequestType(requestType);
      // Turn numeric media type into a string extension
      let mediaExtStr = interpretMediaType(mediaType);

      // Show the "Client-1476 requests:"
      console.log(`\nClient-${clientId} requests:`);
      console.log(`  --MTP version: ${version}`);
      console.log(`  --Timestamp: ${timestamp}`);
      console.log(`  --Request type: ${requestTypeStr}`);
      console.log(`  --Image file extension(s): ${mediaExtStr}`);
      console.log(`  --Image file name: ${mediaName}`);

      // Check if file exists in "images" subfolder
      let filePath = path.join(__dirname, "images", mediaName);
      if (!fs.existsSync(filePath)) {
        console.log(`Media file ${filePath} not found.`);

        // Construct a response packet with response type "Not found" (2)
        let response = Object.create(MTPpacket);
        response.init(2, 0, singleton.getTimestamp(), true, Buffer.alloc(0));
        sock.write(response.getBytePacket());
        sock.end();
      } else {
        // File exists => read file, send response type "Found" (1)
        let payload = fs.readFileSync(filePath);
        console.log(
          `Media file ${filePath} found, size: ${payload.length} bytes.`
        );

        let sequenceNumber = singleton.getSequenceNumber();
        let ts = singleton.getTimestamp();

        let response = Object.create(MTPpacket);
        response.init(1, sequenceNumber, ts, true, payload);
        sock.write(response.getBytePacket());
        sock.end();
      }
    });

    // When the client disconnects
    sock.on("close", function () {
      console.log(
        `Client disconnected from ${sock.remoteAddress}:${sock.remotePort}`
      );
      console.log("Client closed connection");
    });

    sock.on("error", function (err) {
      console.error(`Socket error: ${err}`);
    });
  },
};

// Parse bits from a buffer
function parseBitPacket(packet, offset, length) {
  let number = 0;
  for (let i = 0; i < length; i++) {
    let bytePosition = Math.floor((offset + i) / 8);
    let bitPosition = 7 - ((offset + i) % 8);
    let bit = (packet[bytePosition] >> bitPosition) & 1;
    number = (number << 1) | bit;
  }
  return number;
}

// Convert array of bytes to string
function bytesToString(array) {
  let result = "";
  for (let i = 0; i < array.length; i++) {
    result += String.fromCharCode(array[i]);
  }
  return result;
}

// Interpret the 2-bit request type
function interpretRequestType(rt) {
  switch (rt) {
    case 0:
      return "Query";
    case 1:
      return "Found";
    case 2:
      return "Not found";
    default:
      return "Unknown";
  }
}

// Interpret the 4-bit media type into a label
function interpretMediaType(mt) {
  switch (mt) {
    case 1:
      return "JPEG";
    case 2:
      return "BMP";
    case 3:
      return "TIFF";
    case 4:
      return "PNG";
    case 5:
      return "GIF";
    default:
      return "Unknown";
  }
}

// Print the entire packet in bits, 4 bytes (32 bits) per line
function printPacketBit(packet) {
  let bitString = "";
  for (let i = 0; i < packet.length; i++) {
    let byteStr = packet[i].toString(2).padStart(8, "0");
    if (i > 0 && i % 4 === 0) {
      bitString += "\n";
    }
    bitString += " " + byteStr;
  }
  console.log(bitString);
}
