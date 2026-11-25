// Utility Audio & Notifikasi Suara "Klunting" untuk TAURUS

let sharedAudioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

// Dapatkan atau inisialisasi AudioContext secara aman
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (e) {
    console.warn('AudioContext error:', e);
    return null;
  }
}

// Buka kunci AudioContext pada interaksi pertama pengguna (klik, ketik, sentuh)
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          isAudioUnlocked = true;
        }).catch(() => {});
      } else {
        isAudioUnlocked = true;
      }
    } catch {
      // ignore
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };

  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

// Mainkan sebuah nada menggunakan Web Audio Oscillator dengan envelope bel/chime
function playChimeTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  peakVolume: number
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Envelope lonceng: attack cepat (10ms), decay eksponensial lembut
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakVolume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch (err) {
    console.warn('Gagal memutar nada audio:', err);
  }
}

/**
 * Memainkan suara "Klunting" khas notifikasi chat (cerah & merdu).
 * Menggunakan kombinasi nada D5/A5 lalu melompat ke nada kristal E6 (1318.5Hz).
 */
export function playKluntingSound() {
  try {
    // Cek apakah suara dinonaktifkan di localStorage (opsional pengguna)
    const isMuted = localStorage.getItem('taurus_sound_muted') === 'true';
    if (isMuted) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Nada 1: "Klun" (nada awal, 880 Hz / A5)
    playChimeTone(ctx, 880, now, 0.14, 0.30);
    playChimeTone(ctx, 1760, now, 0.10, 0.08); // overtone harmonik

    // Nada 2: "Ting" (nada tinggi lonceng jernih, 1318.51 Hz / E6)
    playChimeTone(ctx, 1318.51, now + 0.08, 0.55, 0.40);
    playChimeTone(ctx, 2637.02, now + 0.08, 0.45, 0.12); // kristal shimmer
  } catch (err) {
    console.warn('Gagal memainkan bunyi klunting:', err);
  }
}

/**
 * Memainkan suara notifikasi sistem (Tiket baru / Job baru).
 * Arpeggio 3 nada ceria: C5 -> E5 -> G5
 */
export function playNotificationSound() {
  try {
    const isMuted = localStorage.getItem('taurus_sound_muted') === 'true';
    if (isMuted) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // C5 (523.25 Hz)
    playChimeTone(ctx, 523.25, now, 0.2, 0.25);
    // E5 (659.25 Hz)
    playChimeTone(ctx, 659.25, now + 0.09, 0.25, 0.30);
    // G5 (783.99 Hz)
    playChimeTone(ctx, 783.99, now + 0.18, 0.45, 0.35);
  } catch (err) {
    console.warn('Gagal memainkan suara notifikasi sistem:', err);
  }
}

/**
 * Menampilkan notifikasi desktop bawaan sistem operasi / browser jika diizinkan
 */
export function showDesktopNotification(title: string, body: string, iconUrl?: string) {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: iconUrl || '/favicon.svg',
      });
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: iconUrl || '/favicon.svg',
          });
        }
      });
    }
  } catch (e) {
    console.warn('Desktop notification error:', e);
  }
}

/**
 * Meminta izin notifikasi desktop secara eksplisit
 */
export async function requestDesktopNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  try {
    const res = await Notification.requestPermission();
    return res === 'granted';
  } catch {
    return false;
  }
}
