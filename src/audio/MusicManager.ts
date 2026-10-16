export type MusicTrack = 'mist' | 'heart' | 'warmth' | 'oracle' | 'patterns';

export interface TrackInfo {
  id: MusicTrack;
  title: string;
  epoch: string;
}

export const TRACK_INFO: Record<MusicTrack, TrackInfo> = {
  mist: { id: 'mist', title: 'Nebel der Urzeit', epoch: 'Altsteinzeit (Kapitel 1)' },
  heart: { id: 'heart', title: 'Puls der Wildnis', epoch: 'Mittelsteinzeit (Kapitel 2)' },
  warmth: { id: 'warmth', title: 'Wärme des Langhauses', epoch: 'Jungstein- & Kupferzeit (Kapitel 3 & 4)' },
  oracle: { id: 'oracle', title: 'Das Himmels-Orakel', epoch: 'Bronzezeit (Kapitel 5)' },
  patterns: { id: 'patterns', title: 'Rhythmus des Schmiedefeuers', epoch: 'Eisenzeit (Kapitel 6)' },
};

class MusicManager {
  private currentAudio: HTMLAudioElement | null = null;
  private currentTrack: MusicTrack | null = null;
  private targetVolume: number = 0.35;
  private isMuted: boolean = false;
  private fadeTimer: number | null = null;
  private unlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('snes_retro_music_muted');
      if (savedMute !== null) this.isMuted = savedMute === 'true';

      const savedVol = localStorage.getItem('snes_retro_music_vol');
      if (savedVol !== null) {
        const v = Number(savedVol);
        if (!isNaN(v) && v >= 0 && v <= 1) this.targetVolume = v;
      }

      this.setupUnlockListeners();
    }
  }

  private setupUnlockListeners(): void {
    const unlock = () => {
      this.unlocked = true;
      if (this.currentAudio && !this.isMuted && this.currentAudio.paused) {
        this.currentAudio.play().catch(() => {});
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: false, passive: true });
    window.addEventListener('keydown', unlock, { once: false, passive: true });
    window.addEventListener('touchstart', unlock, { once: false, passive: true });
  }

  getTrackForChapter(ch: number): MusicTrack {
    switch (ch) {
      case 1:
        return 'mist';
      case 2:
        return 'heart';
      case 3:
      case 4:
        return 'warmth';
      case 5:
        return 'oracle';
      case 6:
      default:
        return 'patterns';
    }
  }

  playChapterMusic(ch: number, fadeDurationMs = 1500): void {
    const track = this.getTrackForChapter(ch);
    this.playTrack(track, fadeDurationMs);
  }

  playTrack(track: MusicTrack, fadeDurationMs = 1500): void {
    if (this.currentTrack === track && this.currentAudio) {
      if (this.unlocked && !this.isMuted && this.currentAudio.paused) {
        this.currentAudio.play().catch(() => {});
      }
      return;
    }

    const nextAudio = new Audio(`assets/music/${track}.mp3`);
    nextAudio.loop = true;
    nextAudio.volume = 0;

    const oldAudio = this.currentAudio;
    this.currentAudio = nextAudio;
    this.currentTrack = track;

    if (this.unlocked && !this.isMuted) {
      nextAudio.play().catch(() => {});
    }

    // Sanfte Überblendung (Crossfade)
    if (this.fadeTimer) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }

    const steps = 25;
    const stepTime = Math.max(16, Math.floor(fadeDurationMs / steps));
    const target = this.isMuted ? 0 : this.targetVolume;
    let step = 0;

    this.fadeTimer = window.setInterval(() => {
      step++;
      const progress = step / steps;

      if (oldAudio) {
        oldAudio.volume = Math.max(0, (1 - progress) * target);
      }
      if (nextAudio) {
        nextAudio.volume = Math.min(target, progress * target);
      }

      if (step >= steps) {
        if (this.fadeTimer) {
          window.clearInterval(this.fadeTimer);
          this.fadeTimer = null;
        }
        if (oldAudio) {
          oldAudio.pause();
          oldAudio.src = '';
        }
      }
    }, stepTime);
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('snes_retro_music_muted', String(this.isMuted));
    } catch {}

    if (this.currentAudio) {
      this.currentAudio.volume = this.isMuted ? 0 : this.targetVolume;
      if (!this.isMuted && this.currentAudio.paused) {
        this.currentAudio.play().catch(() => {});
      }
    }
    return this.isMuted;
  }

  setVolume(vol: number): void {
    this.targetVolume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('snes_retro_music_vol', String(this.targetVolume));
    } catch {}

    if (this.currentAudio && !this.isMuted) {
      this.currentAudio.volume = this.targetVolume;
    }
  }

  getVolume(): number {
    return this.targetVolume;
  }

  isMutedState(): boolean {
    return this.isMuted;
  }

  getCurrentTrack(): MusicTrack | null {
    return this.currentTrack;
  }

  getCurrentTrackInfo(): TrackInfo | null {
    return this.currentTrack ? TRACK_INFO[this.currentTrack] : null;
  }
}

export const music = new MusicManager();
