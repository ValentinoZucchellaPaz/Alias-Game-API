class TimerManager {
  constructor() {
    this.timers = {};
  }

  startTimer(roomCode, duration, callback) {
    // Clear existing timer if any
    if (this.timers[roomCode]) {
      clearTimeout(this.timers[roomCode]);
    }

    this.timers[roomCode] = setTimeout(() => {
      callback();
      delete this.timers[roomCode];
    }, duration * 1000);
  }

  clearTimer(roomCode) {
    if (this.timers[roomCode]) {
      clearTimeout(this.timers[roomCode]);
      delete this.timers[roomCode];
    }
  }
}

const timeManager = new TimerManager();
export default timeManager;
