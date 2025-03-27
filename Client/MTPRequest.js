const HEADER_SIZE = 12;

module.exports = {
  /**
   * Initializes the MTP request packet.
   * @param {string} mediaName - The media file name (without extension) to request.
   * @param {number} mediaType - The 4-bit media type (e.g., 1 for JPEG, 2 for BMP, etc.).
   * @param {number} timestamp - The 32-bit timestamp from the client's timer.
   */
  init: function (mediaName, mediaType, timestamp) {
    // Convert the media name string into an array of bytes.
    this.payload = Buffer.from(stringToBytes(mediaName));
    // The file name size is the length of the payload.
    this.payloadSize = this.payload.length;
    // Allocate a buffer for the header.
    this.requestHeader = Buffer.alloc(HEADER_SIZE);

    // Pack the header fields into the requestHeader buffer.
    storeBitPacket(this.requestHeader, 18, 0, 5); // MTP Version = 18
    storeBitPacket(this.requestHeader, 0, 5, 25); // Reserved = 0
    storeBitPacket(this.requestHeader, 0, 30, 2); // Request Type = 0 (Query)
    storeBitPacket(this.requestHeader, timestamp, 32, 32); // Timestamp
    storeBitPacket(this.requestHeader, mediaType, 64, 4); // IT Media Type
    storeBitPacket(this.requestHeader, this.payloadSize, 68, 28); // File Name Size
  },

  /**
   * Constructs and returns the complete MTP request packet (header + payload) as a Buffer.
   * @returns {Buffer} The full MTP request packet.
   */
  getBytePacket: function () {
    let packet = Buffer.alloc(this.payload.length + HEADER_SIZE);
    // Copy the header into the packet.
    for (let Hi = 0; Hi < HEADER_SIZE; Hi++) {
      packet[Hi] = this.requestHeader[Hi];
    }
    // Append the payload (media file name bytes) to the packet.
    for (let Pi = 0; Pi < this.payload.length; Pi++) {
      packet[Pi + HEADER_SIZE] = this.payload[Pi];
    }
    return packet;
  },
};

// Converts a string to an array of bytes.
function stringToBytes(str) {
  var ch,
    st,
    re = [];
  for (var i = 0; i < str.length; i++) {
    ch = str.charCodeAt(i); // Get character code.
    st = [];
    do {
      st.push(ch & 0xff); // Push byte to stack.
      ch = ch >> 8; // Shift down by one byte.
    } while (ch);
    // Reverse the stack and concatenate.
    re = re.concat(st.reverse());
  }
  return re;
}

// Stores an integer value into a packet bit stream at a given offset and length.
function storeBitPacket(packet, value, offset, length) {
  let lastBitPosition = offset + length - 1;
  let number = value.toString(2);
  let j = number.length - 1;
  for (var i = 0; i < number.length; i++) {
    let bytePosition = Math.floor(lastBitPosition / 8);
    let bitPosition = 7 - (lastBitPosition % 8);
    if (number.charAt(j--) == "0") {
      packet[bytePosition] &= ~(1 << bitPosition);
    } else {
      packet[bytePosition] |= 1 << bitPosition;
    }
    lastBitPosition--;
  }
}
