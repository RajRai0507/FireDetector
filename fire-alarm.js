// fire-alarm.js — plays your custom fire alarm audio file
function createFireAlarm() {
  // ✅ PUT YOUR AUDIO FILE NAME HERE ↓
  const AUDIO_FILE = "fire.mp3";

  const audio = new Audio(AUDIO_FILE);
  audio.loop        = true;  // keep looping while fire is detected
  audio.volume      = 1.0;   // 0.0 (silent) → 1.0 (full volume)
  audio.preload     = "auto"; // load the file immediately

  return {
    // Call this once during a user-click so the browser allows future play() calls
    unlock() {
      audio.muted = true;
      audio.play()
        .then(() => { audio.pause(); audio.muted = false; audio.currentTime = 0; })
        .catch(() => { audio.muted = false; });
    },
    start() {
      if (!audio.paused) return;
      audio.muted = false;
      audio.currentTime = 0;
      audio.play().catch((err) => {
        console.warn("Audio play blocked by browser:", err);
      });
    },
    stop() {
      audio.pause();
      audio.currentTime = 0;
    },
    get playing() {
      return !audio.paused;
    },
  };
}
