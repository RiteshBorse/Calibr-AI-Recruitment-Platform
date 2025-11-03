"use client";
import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { Button } from "@/components/ui/button";
import { AlertCircle, Camera as CameraIcon } from "lucide-react";
import { updateVideoState } from "@/lib/interview/videoQueueIntegration";

export default function VideoProcessing({ autoStart = false }: { autoStart?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const workerRef = useRef<Worker | null>(null);
  const cameraRef = useRef<any>(null);
  const holisticRef = useRef<any>(null);
  const hasUsedCameraRef = useRef<boolean>(false); // Track if camera was used before

  const [moodLogs, setMoodLogs] = useState<any[]>([]);
  const [violationLogs, setViolationLogs] = useState<any[]>([]);
  const [cameraStatus, setCameraStatus] = useState<
    "idle" | "requesting" | "granted" | "denied" | "initializing"
  >("idle");
  const [error, setError] = useState<string>("");
  const [mediapipeLoaded, setMediapipeLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Histories for smoothing
  const moodHistory = useRef<string[]>([]);
  const gestureHistory = useRef<string[]>([]);
  const objectsHistory = useRef<string[][]>([]);

  // Last logged values
  const lastMood = useRef<string | null>(null);
  const lastGesture = useRef<string | null>(null);
  const lastObjects = useRef<string[]>([]);
  const lastLogTime = useRef<number>(0);

  // Duration tracking for threshold violations (only log if sustained)
  const violationStartTime = useRef<{
    mood: number | null;
    gesture: number | null;
    objects: number | null;
  }>({
    mood: null,
    gesture: null,
    objects: null,
  });

  // Last logged non-neutral states (to detect actual changes)
  const lastLoggedMood = useRef<string | null>(null);
  const lastLoggedGesture = useRef<string | null>(null);
  const lastLoggedObjects = useRef<string[]>([]);

  // Duration thresholds in milliseconds
  const MOOD_DURATION_THRESHOLD = 1000; // 1 second for mood
  const VIOLATION_DURATION_THRESHOLD = 3000; // 3 seconds for violations

  // Counters for throttling
  const frameCount = useRef<number>(0);
  const lastFaceCheck = useRef<number>(0);

  // Load logs from localStorage on mount
  useEffect(() => {
    try {
      const savedMoodLogs = localStorage.getItem("calibr_mood_logs");
      const savedViolationLogs = localStorage.getItem("calibr_violation_logs");

      if (savedMoodLogs) {
        setMoodLogs(JSON.parse(savedMoodLogs));
      }
      if (savedViolationLogs) {
        setViolationLogs(JSON.parse(savedViolationLogs));
      }
    } catch (err) {
      console.error("Error loading logs from localStorage:", err);
    }
  }, []);

  // Save logs to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("calibr_mood_logs", JSON.stringify(moodLogs));
    } catch (err) {
      console.error("Error saving mood logs to localStorage:", err);
    }
  }, [moodLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "calibr_violation_logs",
        JSON.stringify(violationLogs)
      );
    } catch (err) {
      console.error("Error saving violation logs to localStorage:", err);
    }
  }, [violationLogs]);

  /** Utility: load external scripts safely */
  const loadScript = (src: string) =>
    new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(s);
    });

  /** Smooth detection outputs */
  const smoothDetection = (
    newValue: string | string[],
    historyRef: any,
    maxLength = 5
  ) => {
    const history = historyRef.current;
    history.push(newValue);
    if (history.length > maxLength) history.shift();

    if (Array.isArray(newValue)) {
      // Objects: majority vote
      const flat = history.flat();
      const count: Record<string, number> = {};
      flat.forEach((obj: string) => (count[obj] = (count[obj] || 0) + 1));
      return Object.keys(count).filter(
        (key) => count[key] >= Math.floor(maxLength / 2)
      );
    } else {
      // Mood/Gaze/Gesture: most frequent
      const count: Record<string, number> = {};
      history.forEach((v: string) => (count[v] = (count[v] || 0) + 1));
      return Object.keys(count).reduce((a, b) => (count[a] > count[b] ? a : b));
    }
  };

  /** Compare arrays safely */
  const arraysEqual = (a: string[] = [], b: string[] = []) =>
    [...a].sort().join(",") === [...b].sort().join(",");

  /** Log updates only when violations persist for threshold duration */
  const updateLog = (updates: any) => {
    const now = Date.now();

    // Update internal state tracking
    if (updates.mood) lastMood.current = updates.mood;
    if (updates.gesture) lastGesture.current = updates.gesture;
    if (updates.objects) lastObjects.current = updates.objects;

    // === MOOD LOGGING (Separate - not a violation) ===
    const currentMood =
      lastMood.current !== "neutral" ? lastMood.current : null;

    // Track when mood starts (or reset if neutral)
    if (currentMood) {
      if (violationStartTime.current.mood === null) {
        violationStartTime.current.mood = now;
      }
    } else {
      violationStartTime.current.mood = null;
    }

    // Check if mood has persisted long enough (1 second)
    const moodPersisted =
      currentMood &&
      violationStartTime.current.mood &&
      now - violationStartTime.current.mood >= MOOD_DURATION_THRESHOLD;

    // Check if mood actually CHANGED from last logged mood
    const moodChanged = moodPersisted && currentMood !== lastLoggedMood.current;

    if (moodChanged) {
      const moodLog = {
        time: new Date().toLocaleTimeString(),
        timestamp: new Date().toISOString(),
        mood: currentMood,
      };
      console.log("😊 Mood Change (sustained 1s+):", moodLog);

      setMoodLogs((prev) => {
        const next = [...prev, moodLog];
        if (next.length > 500) next.shift(); // cap at 500
        return next;
      });

      lastLoggedMood.current = currentMood;
      
      // === UPDATE QUEUE 0 - MOOD CHANGE ===
      // Only store in DB when mood actually changes (not every frame)
      updateVideoState({
        mood: currentMood || undefined,
        gesture: lastGesture.current || undefined,
        objects: lastObjects.current
      });
    }

    // === VIOLATION LOGGING (Gesture + Objects only) ===
    const currentGesture =
      lastGesture.current !== "facing_forward" ? lastGesture.current : null;

    // Filter out normal single person detection (the test-taker themselves)
    const rawObjects = lastObjects.current || [];
    const currentObjects = rawObjects.filter((obj) => {
      // Allow single "person" (test-taker), but flag if multiple people
      if (obj === "person") {
        const personCount = rawObjects.filter((o) => o === "person").length;
        return personCount > 1; // Only flag if 2+ people detected
      }
      return true; // Keep all other objects
    });

    // Track when violations start (or reset if they stop)
    if (currentGesture) {
      if (violationStartTime.current.gesture === null) {
        violationStartTime.current.gesture = now;
      }
    } else {
      violationStartTime.current.gesture = null;
    }

    if (currentObjects.length > 0) {
      if (violationStartTime.current.objects === null) {
        violationStartTime.current.objects = now;
      }
    } else {
      violationStartTime.current.objects = null;
    }

    // Check if violations have persisted long enough
    const gesturePersisted =
      currentGesture &&
      violationStartTime.current.gesture &&
      now - violationStartTime.current.gesture >= VIOLATION_DURATION_THRESHOLD;
    const objectsPersisted =
      currentObjects.length > 0 &&
      violationStartTime.current.objects &&
      now - violationStartTime.current.objects >= VIOLATION_DURATION_THRESHOLD;

    // Check if any violation state actually CHANGED from last log
    const gestureChanged =
      gesturePersisted && currentGesture !== lastLoggedGesture.current;
    const objectsChanged =
      objectsPersisted &&
      !arraysEqual(currentObjects, lastLoggedObjects.current);

    const violationChanged = gestureChanged || objectsChanged;

    if (violationChanged && now - lastLogTime.current > 1000) {
      // Build violation log object
      const violationLog: any = {
        time: new Date().toLocaleTimeString(),
        timestamp: new Date().toISOString(),
      };

      if (gesturePersisted && currentGesture)
        violationLog.gesture = currentGesture;
      if (objectsPersisted && currentObjects.length > 0)
        violationLog.objects = currentObjects;

      // Only log if there's at least one violation field
      if (Object.keys(violationLog).length > 2) {
        // More than just time and timestamp
        console.log("🚨 Violation (sustained 3s+):", violationLog);

        setViolationLogs((prev) => {
          const next = [...prev, violationLog];
          if (next.length > 500) next.shift(); // cap at 500 logs
          return next;
        });

        // Update last logged states
        if (gesturePersisted) lastLoggedGesture.current = currentGesture;
        if (objectsPersisted) lastLoggedObjects.current = currentObjects;
        lastLogTime.current = now;
        
        // === UPDATE QUEUE 0 - VIOLATION DETECTED ===
        // Only store in DB when violation actually occurs (not every frame)
        updateVideoState({
          mood: lastMood.current || undefined,
          gesture: currentGesture || undefined,
          objects: currentObjects.length > 0 ? currentObjects : undefined
        });
      }
    }
  };

  /** Load models + scripts once */
  useEffect(() => {
    // Suppress verbose MediaPipe console spam
    const originalWarn = console.warn;
    const originalLog = console.log;
    const originalError = console.error;

    // Filter function for MediaPipe noise
    const isMediaPipeNoise = (...args: any[]) => {
      const msg = args.join(" ");
      // Suppress WASM binary logs (single ")" or very short messages from WASM)
      if (args.length === 1 && typeof args[0] === "string" && args[0].trim() === ")") {
        return true;
      }
      return (
        msg.includes("dependency:") ||
        msg.includes("still waiting on run dependencies") ||
        msg.includes("(end of list)") ||
        msg.includes("Calculator::Open()") ||
        msg.includes("Calculator::Process()") ||
        msg.includes("Failed to read file third_party/mediapipe") ||
        msg.includes("third_party/mediapipe") ||
        msg.includes("holistic_solution_packed_assets") ||
        msg.includes("Cannot read properties of undefined") ||
        msg.includes("fetchRemotePackage") ||
        msg.includes("loadPackage") ||
        msg.includes("XMLHttpRequest") ||
        msg.includes("Source Location Trace") ||
        msg.includes("Stack trace:") ||
        msg.includes("Check failure stack trace") ||
        msg.includes("Aborted(") ||
        msg.includes("calculator_node.cc") ||
        msg.includes("inference_calculator") ||
        msg.includes("image_to_tensor") ||
        msg.includes("ImageToTensorCalculator") ||
        msg.includes("RET_CHECK failure") ||
        msg.includes("roi->width") ||
        msg.includes("roi->height") ||
        msg.includes("ROI width and height") ||
        msg.includes("type.googleapis.com/mediapipe") ||
        msg.includes("resource_util_emscripten") ||
        msg.includes("tflite_model_loader") ||
        msg.includes("solutions_wasm.embind") ||
        msg.includes("holistic_solution_simd_wasm_bin") ||
        msg.includes("holisticlandmarkgpu") ||
        msg.includes("poselandmarkgpu") ||
        msg.includes("put_char") ||
        msg.includes("write @") ||
        msg.includes("doWritev") ||
        msg.includes("_fd_write") ||
        msg.includes("EEXIST") ||
        msg.includes("ErrnoError") ||
        msg.includes("File exists") ||
        msg.includes("memory access out of bounds") ||
        msg.includes("RuntimeError") ||
        msg.includes("Frame send error") ||
        msg.includes("E0000 00:00:") ||
        msg.includes("I0000 00:00:") ||
        msg.includes("W0000 00:00:") ||
        msg.includes("F0000 00:00:")
      );
    };

    console.warn = (...args) => {
      if (isMediaPipeNoise(...args)) return;
      originalWarn.apply(console, args);
    };

    console.log = (...args) => {
      if (isMediaPipeNoise(...args)) return;
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      if (isMediaPipeNoise(...args)) return;
      originalError.apply(console, args);
    };

    const init = async () => {
      try {
        // Load face-api.js models
        await faceapi.nets.tinyFaceDetector.loadFromUri("/face-api/");
        await faceapi.nets.faceExpressionNet.loadFromUri("/face-api/");
        console.log("✅ face-api.js models loaded");

        // Load MediaPipe scripts (removed deprecated iris.js)
        const scripts = [
          "https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js",
          "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
        ];
        await Promise.all(scripts.map(loadScript));
        console.log("✅ MediaPipe scripts loaded");

        // Don't initialize Holistic here - do it per session in startDetection
        setMediapipeLoaded(true);
        
        // Notify window that MediaPipe is loaded
        if (typeof window !== 'undefined') {
          (window as any).mediaPipeLoaded = true;
          window.dispatchEvent(new Event('mediapipe-loaded'));
        }

        // Init YOLO worker
        workerRef.current = new Worker(
          new URL("../workers/yolo.worker.js", import.meta.url)
        );
        workerRef.current.onmessage = (e) => {
          if (e.data.type === "result") {
            updateLog({
              objects: smoothDetection(e.data.objects, objectsHistory),
            });
          } else if (e.data.type === "yolo-ready") {
            // Notify window that YOLO is loaded (only once)
            if (typeof window !== 'undefined' && !(window as any).yoloLoaded) {
              console.log("✅ YOLO model ready");
              (window as any).yoloLoaded = true;
              window.dispatchEvent(new Event('yolo-loaded'));
            }
          }
        };
        workerRef.current.postMessage({ type: "load" });
      } catch (err) {
        console.error("❌ Initialization failed", err);
      }
    };
    init();

    return () => {
      // Restore original console methods
      console.warn = originalWarn;
      console.log = originalLog;
      console.error = originalError;

      // Cleanup all resources on component unmount only
      (async () => {
        if (cameraRef.current) {
          try {
            await cameraRef.current.stop();
          } catch (err) {
            console.warn("Cleanup camera error:", err);
          }
          cameraRef.current = null;
        }
        
        // Close Holistic on unmount
        if (holisticRef.current) {
          try {
            await holisticRef.current.close();
            console.log("🧹 Holistic closed (component unmounted)");
          } catch (err) {
            console.warn("Cleanup holistic error:", err);
          }
          holisticRef.current = null;
        }
      })();

      workerRef.current?.terminate();
      
      const tracks = (videoRef.current?.srcObject as MediaStream)?.getTracks();
      tracks?.forEach((track) => track.stop());
    };
  }, []);

  /** Auto-start camera if autoStart prop is true */
  useEffect(() => {
    if (autoStart && mediapipeLoaded && cameraStatus === "idle" && !hasUsedCameraRef.current) {
      console.log('[VideoProcessing] Auto-starting camera...');
      startDetection();
    }
  }, [autoStart, mediapipeLoaded, cameraStatus]);

  /** Stop detection */
  const startDetection = async () => {
    // If camera was used before, force a page refresh for reliability
    if (hasUsedCameraRef.current) {
      window.location.reload();
      return;
    }

    if (!videoRef.current) {
      console.error("Video element not ready");
      return;
    }

    setIsInitializing(true);
    setCameraStatus("initializing");
    setError("");

    // Clean up previous instances
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
        cameraRef.current = null;
      } catch (err) {
        console.warn("Previous camera cleanup:", err);
      }
    }

    if (holisticRef.current) {
      try {
        await holisticRef.current.close();
        holisticRef.current = null;
      } catch (err) {
        console.warn("Previous holistic cleanup:", err);
      }
    }

    setCameraStatus("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    } catch (err: any) {
      console.error("Camera access denied", err);
      setIsInitializing(false);
      setCameraStatus("denied");
      if (err.name === "NotAllowedError") {
        setError("Camera permission denied. Please allow camera access.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found on your device.");
      } else {
        setError(`Error: ${err.message || "Unknown error occurred"}`);
      }
      return;
    }

    try {
      // Create Holistic instance
      holisticRef.current = new (window as any).Holistic({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
      });
      holisticRef.current.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
      });

      holisticRef.current.onResults(async (results: any) => {
        frameCount.current++;
        const now = Date.now();

        /** Mood (every 1s) */
        let mood: string | null = null;
        if (now - lastFaceCheck.current > 1000) {
          lastFaceCheck.current = now;
          try {
            const detections = await faceapi
              .detectSingleFace(
                videoRef.current!,
                new faceapi.TinyFaceDetectorOptions()
              )
              .withFaceExpressions();
            
            const rawMood = detections?.expressions
              ? Object.entries(detections.expressions).sort(
                  (a, b) => b[1] - a[1]
                )[0][0]
              : null;
            if (rawMood) mood = smoothDetection(rawMood, moodHistory) as string;
          } catch (err) {
            console.error("face-api detection error", err);
          }
        }

        /** Gesture */
        let gesture: string | null = null;
        if (results.poseLandmarks) {
          const leftShoulder = results.poseLandmarks[11];
          const rightShoulder = results.poseLandmarks[12];
          const nose = results.faceLandmarks?.[1];
          if (nose && leftShoulder && rightShoulder) {
            const midX = (leftShoulder.x + rightShoulder.x) / 2;
            const rawGesture =
              nose.x < midX - 0.05
                ? "turned_left"
                : nose.x > midX + 0.05
                ? "turned_right"
                : "facing_forward";
            gesture = smoothDetection(rawGesture, gestureHistory) as string;
          }
        }

        updateLog({ mood, gesture });

        /** Objects every 10 frames */
        if (
          workerRef.current &&
          videoRef.current &&
          frameCount.current % 10 === 0 &&
          videoRef.current.readyState >= 2
        ) {
          try {
            if (
              videoRef.current.readyState >= 2 &&
              !videoRef.current.paused &&
              !videoRef.current.ended
            ) {
              const bitmap = await createImageBitmap(videoRef.current);
              workerRef.current.postMessage(
                { type: "detect", imageBitmap: bitmap },
                [bitmap]
              );
            }
          } catch {
            // Ignore frame processing errors
          }
        }
      });

      cameraRef.current = new (window as any).Camera(videoRef.current, {
        onFrame: async () => {
          if (
            !holisticRef.current ||
            !videoRef.current ||
            !videoRef.current.srcObject ||
            videoRef.current.readyState < 2
          ) {
            return;
          }
          
          try {
            await holisticRef.current.send({ image: videoRef.current });
          } catch {
            // Silently ignore WASM errors
          }
        },
      });
      cameraRef.current.start();

      // Mark camera as used and ready
      hasUsedCameraRef.current = true;
      setIsInitializing(false);
      setCameraStatus("granted");
    } catch (err: any) {
      console.error("Error starting MediaPipe holistic", err);
      setIsInitializing(false);
      setCameraStatus("denied");
      setError(`Error: ${err.message || "Unknown error occurred"}`);
    }
  };

  const handleStopCamera = () => {
    setCameraStatus("idle");

    // Stop camera
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
      } catch (err) {
        console.warn("Camera stop warning:", err);
      }
      cameraRef.current = null;
    }

    // Stop video stream tracks
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    // Close Holistic instance
    if (holisticRef.current) {
      try {
        holisticRef.current.close();
        holisticRef.current = null;
      } catch (err) {
        console.warn("Holistic close warning:", err);
      }
    }

    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    // Reset frame counter
    frameCount.current = 0;
    lastFaceCheck.current = 0;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Show video directly - smooth and hardware-accelerated */}
      <div className={`relative ${cameraStatus === "granted" ? "" : "hidden"}`}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          width="640"
          height="480"
          className="rounded-lg border border-white/20"
        />
        {/* Canvas hidden - only used internally for processing if needed */}
        <canvas ref={canvasRef} width="640" height="480" className="hidden" />
      </div>

      {/* Control buttons when camera is active */}
      {cameraStatus === "granted" && (
        <Button
          onClick={handleStopCamera}
          variant="destructive"
          className="bg-red-600 hover:bg-red-700"
        >
          Stop Camera
        </Button>
      )}

      {!mediapipeLoaded && (
        <div className="text-center space-y-4 p-8 bg-yellow-600/10 rounded-lg border border-yellow-500/30">
          <div className="animate-spin h-12 w-12 mx-auto border-4 border-yellow-500 border-t-transparent rounded-full" />
          <p className="text-yellow-300">Loading MediaPipe libraries...</p>
        </div>
      )}

      {mediapipeLoaded && cameraStatus === "idle" && (
        <div className="text-center space-y-4 p-8 bg-white/5 rounded-lg border border-white/10">
          <CameraIcon className="h-16 w-16 mx-auto text-violet-400" />
          <div>
            <h3 className="text-white font-semibold mb-2">
              Camera Access Required
            </h3>
            <p className="text-white/70 text-sm mb-4">
              Click the button below to start video detection
            </p>
          </div>
          <Button
            onClick={startDetection}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            <CameraIcon className="h-4 w-4 mr-2" />
            Start Camera
          </Button>
        </div>
      )}

      {cameraStatus === "requesting" && (
        <div className="text-center space-y-4 p-8 bg-blue-600/10 rounded-lg border border-blue-500/30">
          <div className="animate-spin h-12 w-12 mx-auto border-4 border-blue-500 border-t-transparent rounded-full" />
          <p className="text-blue-300">Requesting camera access...</p>
        </div>
      )}

      {(cameraStatus === "initializing" || isInitializing) && (
        <div className="text-center space-y-4 p-8 bg-purple-600/10 rounded-lg border border-purple-500/30">
          <div className="animate-spin h-12 w-12 mx-auto border-4 border-purple-500 border-t-transparent rounded-full" />
          <p className="text-purple-300">Initializing AI models...</p>
          <p className="text-purple-200/60 text-xs">
            Please wait while we set up the detection system
          </p>
        </div>
      )}

      {cameraStatus === "denied" && (
        <div className="text-center space-y-4 p-8 bg-red-600/10 rounded-lg border border-red-500/30">
          <AlertCircle className="h-16 w-16 mx-auto text-red-400" />
          <div>
            <h3 className="text-red-300 font-semibold mb-2">
              Camera Access Denied
            </h3>
            <p className="text-red-200/70 text-sm mb-4">{error}</p>
            <p className="text-red-200/70 text-xs">
              Please enable camera permissions in your browser settings and
              refresh the page.
            </p>
          </div>
          <Button
            onClick={startDetection}
            variant="outline"
            className="border-red-500/30 text-red-300 hover:bg-red-600/20"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
