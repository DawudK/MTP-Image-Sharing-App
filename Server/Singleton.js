// Global variables for sequence number and timer
let sequenceNumber = 0;
let timer = Math.floor(Math.random() * 999) + 1;

module.exports = {
  init: function () {
    // Start a timer that ticks every 10 milliseconds.
    // Increment the timer by 1 each tick.
    // When timer reaches 232, reset it to 0.
    setInterval(function () {
      timer++;
      if (timer >= 232) {
        timer = 0;
      }
    }, 10);
  },

  //--------------------------
  // getSequenceNumber: return the current sequence number and then increment it.
  //--------------------------
  getSequenceNumber: function () {
    let current = sequenceNumber;
    // Increment and wrap modulo 2^26.
    sequenceNumber = (sequenceNumber + 1) % (1 << 26);
    return current;
  },

  //--------------------------
  // getTimestamp: return the current timer value.
  //--------------------------
  getTimestamp: function () {
    return timer;
  },

  // Alias for getSequenceNumber for compatibility (e.g., ClientsHandler.js calls getNextSequence)
  getNextSequence: function () {
    return module.exports.getSequenceNumber();
  },
};
