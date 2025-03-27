const HEADER_SIZE = 12;

module.exports = {
  /**
   * Initializes the MTP response packet.
   * @param {number} responseType - 3-bit response type (0: Query, 1: Found, 2: Not found, 3: Busy)
   * @param {number} sequenceNumber - 26-bit sequence number (starts at 0)
   * @param {number} timestamp - 32-bit current server timer value
   * @param {boolean} lastPacket - true if this is the final packet for the file
   * @param {Buffer} payload - Buffer containing the media data to send
   */
  init: function (
    responseType,
    sequenceNumber,
    timestamp,
    lastPacket,
    payload
  ) {
    this.payload = payload;
    this.payloadSize = payload.length;
    this.responseHeader = Buffer.alloc(HEADER_SIZE);

    storeBitPacket(this.responseHeader, 18, 0, 5); // Version = 9
    storeBitPacket(this.responseHeader, responseType, 4, 3); // Response Type
    storeBitPacket(this.responseHeader, sequenceNumber, 7, 26); // Sequence Number
    storeBitPacket(this.responseHeader, timestamp, 33, 32); // Timestamp
    storeBitPacket(this.responseHeader, lastPacket ? 1 : 0, 65, 1); // Last Packet flag
    storeBitPacket(this.responseHeader, this.payloadSize, 66, 31); // Payload Size
  },

  /**
   * Constructs and returns the complete packet (header + payload) as a Buffer.
   * @returns {Buffer} The full MTP response packet.
   */
  getBytePacket: function () {
    let packet = Buffer.alloc(this.payloadSize + HEADER_SIZE);
    // Copy header into packet
    for (let i = 0; i < HEADER_SIZE; i++) {
      packet[i] = this.responseHeader[i];
    }
    // Append payload after header
    for (let i = 0; i < this.payloadSize; i++) {
      packet[i + HEADER_SIZE] = this.payload[i];
    }
    return packet;
  },
};

// Helper function: Stores an integer value into a packet bit stream at a given offset and bit-length.
function storeBitPacket(packet, value, offset, length) {
  let lastBitPosition = offset + length - 1;
  let number = value.toString(2);
  let j = number.length - 1;
  for (let i = 0; i < number.length; i++) {
    let bytePosition = Math.floor(lastBitPosition / 8);
    let bitPosition = 7 - (lastBitPosition % 8);
    if (number.charAt(j--) === "0") {
      packet[bytePosition] &= ~(1 << bitPosition);
    } else {
      packet[bytePosition] |= 1 << bitPosition;
    }
    lastBitPosition--;
  }
}

// Helper function: Prints the entire packet in binary (bit) format.
function printPacketBit(packet) {
  let bitString = "";
  for (let i = 0; i < packet.length; i++) {
    let b = "00000000" + packet[i].toString(2);

    if (i > 0 && i % 4 === 0) bitString += "\n";
    bitString += " " + b.substr(b.length - 8);
  }
  console.log(bitString);
}
