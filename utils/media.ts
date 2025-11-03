/**
 * Media Utilities for Technical Interview
 * Handles audio/video recording and media streams only
 */

/**
 * Get microphone stream (audio only)
 */
export async function getMicStreamAudioOnly(): Promise<MediaStream> {
  return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}

/**
 * Get microphone and camera stream
 */
export async function getMicAndCameraStream(): Promise<MediaStream> {
  return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
}

/**
 * Start audio recording
 */
export async function startAudioRecording(
  onDataAvailable?: (blob: Blob) => void
): Promise<{ mediaRecorder: MediaRecorder; stream: MediaStream }> {
  const stream = await getMicStreamAudioOnly();
  const mediaRecorder = new MediaRecorder(stream);
  const audioChunks: Blob[] = [];

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
    if (onDataAvailable) onDataAvailable(audioBlob);
  };

  mediaRecorder.start();
  return { mediaRecorder, stream };
}

/**
 * Stop all tracks in a media stream
 */
export function stopMediaStream(stream: MediaStream | null) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
}

/**
 * Toggle mute on audio tracks
 */
export function toggleAudioMute(stream: MediaStream | null, muted: boolean): boolean {
  if (stream) {
    const audioTracks = stream.getAudioTracks();
    audioTracks.forEach((track) => {
      track.enabled = !muted;
    });
    return !muted;
  }
  return muted;
}

/**
 * Speech Recognition Management Utilities
 * Uses the same interface as stt.ts for compatibility
 */

export interface ISpeechRecognition {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  language: string;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: any) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: any) => void) | null;
}

/**
 * Pause speech recognition (stop STT but keep mic stream active)
 */
export function pauseSpeechRecognition(recognition: ISpeechRecognition | null): void {
  if (recognition) {
    try {
      recognition.stop();
      console.log("[STT] 🔇 Paused speech recognition");
    } catch (error) {
      // Ignore if already stopped
    }
  }
}

/**
 * Resume speech recognition - only if not user-muted
 */
export function resumeSpeechRecognition(
  recognition: ISpeechRecognition | null,
  isUserMuted: boolean
): void {
  if (!recognition) {
    console.error("[STT] ❌ Cannot resume - not initialized");
    return;
  }

  if (isUserMuted) {
    console.log("[STT] 🔇 Not resuming - user has muted mic");
    return;
  }

  try {
    recognition.start();
    console.log("[STT] 🎤 Resumed speech recognition");
  } catch (error: any) {
    // Silently ignore "already started" errors
    if (error.message && !error.message.includes("already started")) {
      console.error("[STT] Error resuming:", error);
    }
  }
}

/**
 * Timeout Management for Pause Detection
 */

/**
 * Clear pause timeout safely
 */
export function clearPauseTimeout(
  timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
): void {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
}

/**
 * Set pause timeout for answer submission
 */
export function setPauseTimeout(
  timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  callback: () => void,
  delay: number
): void {
  clearPauseTimeout(timeoutRef);
  timeoutRef.current = setTimeout(callback, delay);
}