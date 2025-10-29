/**
 * Speech-to-Text utilities
 * Handles web API speech recognition and transcript management
 */

export type SpeechRecognitionCallback = (transcript: string) => void;

export interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  language: string;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

/**
 * Initialize Web Speech API for speech recognition
 * Returns the recognition object and cleanup function
 */
export const initWebSpeechRecognition = (
  language: string = 'en-US',
  onResult: SpeechRecognitionCallback
): ISpeechRecognition | null => {
  if (typeof window === 'undefined') return null;
  
  const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
  if (!SpeechRecognitionAPI) {
    console.error('[Speech] ❌ Browser does not support Web Speech API');
    console.log('[Speech] Supported browsers: Chrome, Edge, Safari (iOS 14.5+)');
    console.log('[Speech] Current user agent:', navigator.userAgent);
    return null;
  }
  
  console.log('[Speech] ✅ Web Speech API available');
  
  try {
    const recognition = new SpeechRecognitionAPI() as ISpeechRecognition;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.language = language;
    
    let interimTranscript = '';
    
    recognition.onstart = () => {
      console.log('[Speech] Recognition started');
      interimTranscript = '';
    };
    
    recognition.onresult = (event: any) => {
      interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          console.log('[Speech] Final transcript:', transcript);
          onResult(transcript);
        } else {
          interimTranscript += transcript;
          console.log('[Speech] Interim transcript:', interimTranscript);
        }
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('[Speech] Recognition error:', event.error);
    };
    
    recognition.onend = () => {
      console.log('[Speech] Recognition ended');
    };
    
    return recognition;
  } catch (error) {
    console.error('[Speech] Failed to initialize recognition:', error);
    return null;
  }
};

/**
 * Start speech recognition
 */
export const startSpeechRecognition = (recognition: ISpeechRecognition | null): void => {
  if (!recognition) {
    console.warn('[Speech] Recognition not available');
    return;
  }
  
  try {
    recognition.start();
    console.log('[Speech] Started listening');
  } catch (error) {
    console.error('[Speech] Error starting recognition:', error);
  }
};

/**
 * Stop speech recognition
 */
export const stopSpeechRecognition = (recognition: ISpeechRecognition | null): void => {
  if (!recognition) return;
  
  try {
    recognition.stop();
    console.log('[Speech] Stopped listening');
  } catch (error) {
    console.error('[Speech] Error stopping recognition:', error);
  }
};

/**
 * Abort speech recognition
 */
export const abortSpeechRecognition = (recognition: ISpeechRecognition | null): void => {
  if (!recognition) return;
  
  try {
    recognition.abort();
    console.log('[Speech] Aborted recognition');
  } catch (error) {
    console.error('[Speech] Error aborting recognition:', error);
  }
};

/**
 * Check if Web Speech API is supported
 */
export const isWebSpeechSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
};

/**
 * Clean transcript by removing extra whitespace
 */
export const cleanTranscript = (transcript: string): string => {
  return transcript.trim().replace(/\s+/g, ' ');
};
