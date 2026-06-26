/**
 * Web Audio API synthesizer for hardware notification chimes
 * Bypasses the need for external .mp3 assets, generating clear frequencies directly.
 */
export function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    // Play dual harmonic chime
    // Note 1: E5 (659.25 Hz)
    // Note 2: A5 (880.00 Hz)
    const playTone = (freq: number, startTime: number, duration: number, type: OscillatorType = "sine") => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      
      // Gentle rise, exponential decay for premium soft bell sound
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = ctx.currentTime;
    playTone(659.25, now, 0.5, "sine"); // Warm first tone
    playTone(880.00, now + 0.12, 0.7, "sine"); // Higher bright tone
    
  } catch (err) {
    console.warn("Hardware audio notification not supported or user interaction required:", err);
  }
}
