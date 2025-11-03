/**
 * Audio Playback Utilities
 * Handles playing TTS audio from S3 URLs with proper state management
 */

export interface AudioPlaybackOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  volume?: number; // 0.0 to 1.0
}

/**
 * Play audio from URL (S3 or blob URL)
 */
export async function playAudioFromUrl(
  audioUrl: string,
  options: AudioPlaybackOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio(audioUrl);
      
      // Set volume
      if (options.volume !== undefined) {
        audio.volume = Math.max(0, Math.min(1, options.volume));
      }

      // Event listeners
      audio.addEventListener("loadeddata", () => {
        console.log("[Audio] Loaded audio from:", audioUrl);
        options.onStart?.();
      });

      audio.addEventListener("ended", () => {
        console.log("[Audio] Playback completed");
        options.onEnd?.();
        resolve();
      });

      audio.addEventListener("error", (e) => {
        const error = new Error(
          `Audio playback failed: ${audio.error?.message || "Unknown error"}`
        );
        console.error("[Audio] Playback error:", error);
        options.onError?.(error);
        reject(error);
      });

      // Start playback
      audio.play().catch((error) => {
        console.error("[Audio] Failed to start playback:", error);
        options.onError?.(error);
        reject(error);
      });
    } catch (error) {
      console.error("[Audio] Setup error:", error);
      const err = error instanceof Error ? error : new Error(String(error));
      options.onError?.(err);
      reject(err);
    }
  });
}

/**
 * Preload audio for faster playback
 */
export function preloadAudio(audioUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);
    
    audio.addEventListener("canplaythrough", () => {
      console.log("[Audio] Preloaded:", audioUrl);
      resolve();
    });

    audio.addEventListener("error", (e) => {
      console.error("[Audio] Preload error:", e);
      reject(new Error("Failed to preload audio"));
    });

    // Start loading
    audio.load();
  });
}

/**
 * Batch preload multiple audio URLs
 */
export async function preloadMultipleAudio(
  audioUrls: string[]
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  const promises = audioUrls.map((url) =>
    preloadAudio(url)
      .then(() => {
        success++;
      })
      .catch(() => {
        failed++;
      })
  );

  await Promise.all(promises);

  console.log(
    `[Audio] Preloaded ${success}/${audioUrls.length} audio files (${failed} failed)`
  );

  return { success, failed };
}

/**
 * Create an audio player instance with controls
 */
export class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;

  constructor(private volume: number = 1.0) {}

  /**
   * Play audio from URL
   */
  async play(
    audioUrl: string,
    options: AudioPlaybackOptions = {}
  ): Promise<void> {
    // Stop current audio if playing
    this.stop();

    this.currentUrl = audioUrl;
    
    return playAudioFromUrl(audioUrl, {
      ...options,
      volume: options.volume ?? this.volume,
      onStart: () => {
        options.onStart?.();
      },
      onEnd: () => {
        this.currentUrl = null;
        this.audio = null;
        options.onEnd?.();
      },
      onError: (error) => {
        this.currentUrl = null;
        this.audio = null;
        options.onError?.(error);
      },
    });
  }

  /**
   * Stop current playback
   */
  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    this.currentUrl = null;
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  /**
   * Resume playback
   */
  resume(): void {
    if (this.audio) {
      this.audio.play().catch((error) => {
        console.error("[Audio] Resume failed:", error);
      });
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  /**
   * Check if currently playing
   */
  isPlaying(): boolean {
    return this.audio !== null && !this.audio.paused;
  }

  /**
   * Get current URL being played
   */
  getCurrentUrl(): string | null {
    return this.currentUrl;
  }
}
