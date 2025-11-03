/**
 * Text-to-Speech utilities
 * Handles both browser TTS and external TTS services (Gemini API)
 */

/**
 * Generate TTS audio from text using Gemini API
 * Returns audio blob for upload to S3 or direct playback
 * 
 * NOTE: Gemini TTS API is currently DISABLED to reduce API costs during testing.
 * Browser TTS fallback will be used instead.
 * Re-enable by setting GEMINI_TTS_ENABLED = true below.
 */
export const generateTTSAudio = async (text: string): Promise<Blob | null> => {
  const GEMINI_TTS_ENABLED = false; // Toggle this to re-enable Gemini TTS
  
  // Skip Gemini TTS and use browser fallback
  if (!GEMINI_TTS_ENABLED) {
    console.log(`[TTS] ⏭️ Gemini TTS disabled - using browser TTS fallback`);
    return null;
  }
  
  const maxRetries = 2;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("/api/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error(`TTS API failed: ${response.status}`);

      const audioBlob = await response.blob();
      console.log(`[TTS] ✓ Gemini TTS generated`);
      return audioBlob;
    } catch (error) {
      console.warn(`[TTS] Attempt ${attempt}/${maxRetries} failed:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  console.error(`[TTS] Failed after ${maxRetries} attempts, will use browser TTS fallback`);
  return null;
};

/**
 * Play audio using browser's built-in speech synthesis
 * Used as fallback when Gemini TTS is unavailable
 */
export const playBrowserTTS = (
  text: string,
  language: string = 'en-US',
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (event: SpeechSynthesisErrorEvent) => void
): void => {
  if (!text || typeof window === 'undefined') {
    onEnd?.();
    return;
  }
  
  if (!window.speechSynthesis) {
    console.warn('[TTS] Browser does not support speech synthesis');
    onEnd?.();
    return;
  }
  
  try {
    onStart?.();
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9;  // Slightly slower for clarity
    utterance.pitch = 1.0;
    
    // Select voice - prefer female voice for consistency
    const voices = window.speechSynthesis.getVoices();
    const languageCode = language.substring(0, 2);
    
    const preferredVoice = voices.find(v => 
      v.lang.startsWith(languageCode) && 
      v.name.toLowerCase().includes('female')
    ) || voices.find(v => v.lang.startsWith(languageCode));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.onend = () => {
      console.log('[TTS] Browser TTS completed');
      onEnd?.();
    };
    
    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      console.error('[TTS] Browser TTS error:', event);
      onError?.(event);
      onEnd?.();
    };
    
    window.speechSynthesis.speak(utterance);
    console.log('[TTS] Using browser TTS fallback', {
      text: text.substring(0, 50) + '...',
      voice: preferredVoice?.name || 'default',
      lang: language
    });
  } catch (error) {
    console.error('[TTS] Browser TTS failed:', error);
    onEnd?.();
  }
};

/**
 * Load available browser voices
 * Call this on app initialization or when voices change
 */
export const loadBrowserVoices = (): SpeechSynthesisVoice[] => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return [];
  }
  
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    console.log(`[TTS] Loaded ${voices.length} browser voices for fallback`);
  }
  return voices;
};

/**
 * Cancel any ongoing browser TTS playback
 */
export const cancelBrowserTTS = (): void => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  console.log('[TTS] Cancelled browser TTS');
};

/**
 * Check if browser supports speech synthesis
 */
export const isBrowserTTSSupported = (): boolean => {
  return typeof window !== 'undefined' && !!window.speechSynthesis;
};
