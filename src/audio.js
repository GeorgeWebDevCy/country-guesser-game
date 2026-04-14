// Synthesised sounds via Web Audio API — no audio files required.
let ctx = null
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

function tone(freq, dur, type = 'sine', gain = 0.28, delay = 0) {
  const c = getCtx()
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.connect(g)
  g.connect(c.destination)
  osc.type = type
  osc.frequency.value = freq
  const t = c.currentTime + delay
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.start(t)
  osc.stop(t + dur)
}

export const audio = {
  correct() {
    tone(523, 0.12, 'sine', 0.28, 0.00) // C5
    tone(659, 0.12, 'sine', 0.28, 0.10) // E5
    tone(784, 0.25, 'sine', 0.28, 0.20) // G5
  },
  wrong() {
    tone(300, 0.10, 'sawtooth', 0.22, 0.00)
    tone(220, 0.20, 'sawtooth', 0.22, 0.10)
  },
  complete() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'sine', 0.28, i * 0.14))
  },
  timeout() {
    tone(220, 0.15, 'sawtooth', 0.38, 0.00)
    tone(180, 0.35, 'sawtooth', 0.38, 0.15)
  },
  tick() {
    tone(800, 0.04, 'square', 0.07)
  },
}
