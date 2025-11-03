"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Trash2 } from "lucide-react";
import { 
  initWebSpeechRecognition, 
  isWebSpeechSupported,
  type ISpeechRecognition 
} from "@/utils/stt";

export default function RecordAudioTestPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [batchTranscript, setBatchTranscript] = useState("");
  
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const transcriptBufferRef = useRef<string>("");
  const batchBufferRef = useRef<string>("");
  const lastActivityRef = useRef<number>(Date.now());
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PAUSE_THRESHOLD = 2000; // 2 seconds

  // Add log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 50));
    console.log(message);
  };

  // Log batch after 2 second pause
  const logBatch = () => {
    if (batchBufferRef.current.trim()) {
      const batchText = batchBufferRef.current.trim();
      setBatchTranscript(prev => prev + (prev ? "\n---\n" : "") + batchText);
      addLog(`📦 BATCH LOGGED: "${batchText}"`);
      batchBufferRef.current = "";
    }
  };

  // Check browser support
  useEffect(() => {
    const supported = isWebSpeechSupported();
    setIsSupported(supported);
    
    if (supported) {
      addLog("✅ Web Speech API is supported");
    } else {
      addLog("❌ Web Speech API is NOT supported in this browser");
      setError("Web Speech API is not supported. Please use Chrome, Edge, or Safari.");
    }

    // Initialize recognition
    if (supported) {
      const recognition = initWebSpeechRecognition(
        "en-US",
        (finalTranscript: string) => {
          addLog(`📝 Final transcript received: "${finalTranscript}"`);
          transcriptBufferRef.current += " " + finalTranscript;
          setTranscript(transcriptBufferRef.current.trim());
        }
      );

      if (recognition) {
        // Override onresult to capture interim results
        recognition.onresult = (event: any) => {
          let interim = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPart = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
              addLog(`✓ Final: "${transcriptPart}"`);
              transcriptBufferRef.current += " " + transcriptPart;
              batchBufferRef.current += " " + transcriptPart;
              setTranscript(transcriptBufferRef.current.trim());
              setInterimTranscript("");
              
              // Update last activity time
              lastActivityRef.current = Date.now();
              
              // Clear existing timeout and set new one
              if (pauseTimeoutRef.current) {
                clearTimeout(pauseTimeoutRef.current);
              }
              
              // Log batch after 2 seconds of pause
              pauseTimeoutRef.current = setTimeout(() => {
                logBatch();
              }, PAUSE_THRESHOLD);
            } else {
              interim += transcriptPart;
              lastActivityRef.current = Date.now();
            }
          }
          
          if (interim) {
            addLog(`⋯ Interim: "${interim}"`);
            setInterimTranscript(interim);
          }
        };

        recognition.onstart = () => {
          addLog("🎤 Recognition started");
          setIsRecording(true);
          setError("");
        };

        recognition.onerror = (event: any) => {
          addLog(`❌ Error: ${event.error}`);
          setError(`Error: ${event.error}`);
          setIsRecording(false);
        };

        recognition.onend = () => {
          addLog("🛑 Recognition ended");
          setIsRecording(false);
          setInterimTranscript("");
          
          // Log any remaining batch on end
          if (batchBufferRef.current.trim()) {
            logBatch();
          }
          
          // Clear timeout
          if (pauseTimeoutRef.current) {
            clearTimeout(pauseTimeoutRef.current);
          }
        };

        recognitionRef.current = recognition;
        addLog("✅ Speech recognition initialized");
      } else {
        addLog("❌ Failed to initialize speech recognition");
        setError("Failed to initialize speech recognition");
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, []);

  const startRecording = () => {
    if (!recognitionRef.current) {
      addLog("❌ Recognition not available");
      setError("Recognition not initialized");
      return;
    }

    try {
      recognitionRef.current.start();
      addLog("▶️ Starting recognition...");
    } catch (error: any) {
      addLog(`❌ Failed to start: ${error.message}`);
      setError(error.message);
    }
  };

  const stopRecording = () => {
    if (!recognitionRef.current) {
      addLog("❌ Recognition not available");
      return;
    }

    try {
      recognitionRef.current.stop();
      addLog("⏸️ Stopping recognition...");
      setInterimTranscript("");
    } catch (error: any) {
      addLog(`❌ Failed to stop: ${error.message}`);
      setError(error.message);
    }
  };

  const clearTranscript = () => {
    transcriptBufferRef.current = "";
    batchBufferRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    setBatchTranscript("");
    addLog("🗑️ Transcript cleared");
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎤 Speech-to-Text Test Page
          </h1>
          <p className="text-white/70 mb-4">
            Test the Web Speech API speech recognition in your browser
          </p>

          {/* Browser Support Status */}
          <div className={`p-4 rounded-lg mb-6 ${
            isSupported 
              ? 'bg-green-500/20 border border-green-500/50' 
              : 'bg-red-500/20 border border-red-500/50'
          }`}>
            <p className={`font-semibold ${isSupported ? 'text-green-300' : 'text-red-300'}`}>
              {isSupported ? '✅ Browser Supported' : '❌ Browser Not Supported'}
            </p>
            <p className="text-white/70 text-sm mt-1">
              Browser: {navigator.userAgent}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg mb-6">
              <p className="text-red-300 font-semibold">Error</p>
              <p className="text-white/70 text-sm">{error}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-4 mb-6">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!isSupported}
              size="lg"
              className={`${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-5 h-5 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Start Recording
                </>
              )}
            </Button>

            <Button
              onClick={clearTranscript}
              variant="outline"
              size="lg"
              className="border-white/20 text-white bg-white/10"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              Clear Transcript
            </Button>
          </div>

          {/* Recording Status */}
          {isRecording && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg mb-6 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <p className="text-red-300 font-semibold">Recording in progress...</p>
              </div>
            </div>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transcript Display */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">📝 Transcript</h2>
            
            {/* Batch Transcript */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-purple-300 mb-2">📦 Batches (2s pause):</h3>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 min-h-[150px] max-h-[300px] overflow-y-auto">
                {batchTranscript ? (
                  <p className="text-purple-200 whitespace-pre-wrap">{batchTranscript}</p>
                ) : (
                  <p className="text-white/40 italic">Batched transcripts will appear here after 2 second pauses...</p>
                )}
              </div>
            </div>

            {/* Final Transcript */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white/80 mb-2">Final (All):</h3>
              <div className="bg-black/30 border border-white/10 rounded-lg p-4 min-h-[150px] max-h-[300px] overflow-y-auto">
                {transcript ? (
                  <p className="text-white whitespace-pre-wrap">{transcript}</p>
                ) : (
                  <p className="text-white/40 italic">No transcript yet. Start recording to see results.</p>
                )}
              </div>
            </div>

            {/* Interim Transcript */}
            <div>
              <h3 className="text-lg font-semibold text-white/80 mb-2">Interim (Live):</h3>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 min-h-[100px]">
                {interimTranscript ? (
                  <p className="text-yellow-200 italic">{interimTranscript}</p>
                ) : (
                  <p className="text-white/40 italic">Interim results will appear here while speaking...</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 p-3 bg-white/5 rounded-lg">
              <p className="text-white/60 text-sm">
                Total Words: <span className="text-white font-semibold">{transcript.split(/\s+/).filter(Boolean).length}</span>
              </p>
              <p className="text-white/60 text-sm">
                Batches: <span className="text-white font-semibold">{batchTranscript.split('---').filter(b => b.trim()).length}</span>
              </p>
              <p className="text-white/60 text-sm">
                Total Chars: <span className="text-white font-semibold">{transcript.length}</span>
              </p>
            </div>
          </div>

          {/* Logs Display */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">📋 Event Logs</h2>
              <Button
                onClick={clearLogs}
                variant="outline"
                size="sm"
                className="border-white/20 text-white bg-white/10"
              >
                Clear Logs
              </Button>
            </div>
            
            <div className="bg-black/30 border border-white/10 rounded-lg p-4 h-[500px] overflow-y-auto font-mono text-sm">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div key={index} className="text-green-300 mb-1">
                    {log}
                  </div>
                ))
              ) : (
                <p className="text-white/40 italic">No logs yet. Events will appear here.</p>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 mt-6">
          <h3 className="text-xl font-bold text-blue-300 mb-3">📖 How to Use</h3>
          <ol className="text-white/80 space-y-2 list-decimal list-inside">
            <li>Click <strong>&quot;Start Recording&quot;</strong> to begin speech recognition</li>
            <li>Speak clearly into your microphone</li>
            <li>Watch the <strong>Interim</strong> section for live transcription</li>
            <li>The <strong>Final</strong> section shows completed sentences</li>
            <li>Click <strong>&quot;Stop Recording&quot;</strong> when done</li>
            <li>Check the <strong>Event Logs</strong> to see what&apos;s happening under the hood</li>
          </ol>
          
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
            <p className="text-yellow-200 text-sm">
              <strong>⚠️ Note:</strong> Make sure to allow microphone permissions when prompted. 
              Web Speech API works best in Chrome, Edge, and Safari (iOS 14.5+).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
