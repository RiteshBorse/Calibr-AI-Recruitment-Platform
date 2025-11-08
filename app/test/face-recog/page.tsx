"use client";

import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

export default function FaceMonitor() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Loading models...");
  const [alert, setAlert] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        // Load models from your folder
        await faceapi.nets.tinyFaceDetector.loadFromUri("/face-api/");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/face-api/");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/face-api/");

        setStatus("Starting camera...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;

        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            video.play();
            resolve();
          };
        });

        setStatus("Initializing reference face...");
        const first = await getFaceDescriptor(videoRef.current);
        if (!first) {
          setStatus("No face detected initially — please face the camera.");
          return;
        }

        let reference = first;
        let diffCount = 0;
        setStatus("Monitoring for face changes...");

        setInterval(async () => {
          const current = await getFaceDescriptor(videoRef.current);
          if (!current) return;

          const distance = faceapi.euclideanDistance(reference, current);
          if (distance > 0.6) diffCount++;
          else diffCount = 0;

          if (diffCount >= 5) {
            const ts = new Date().toLocaleTimeString();
            setAlert(`⚠️ Person changed at ${ts}`);
            console.log("Person changed! Distance:", distance);
            diffCount = 0;
            reference = current; // reset reference to new person
          }
        }, 600);
      } catch (err: any) {
        console.error(err);
        setStatus("Error: " + err.message);
      }
    };

    run();
  }, []);

  const getFaceDescriptor = async (video: any) => {
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection ? detection.descriptor : null;
  };

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h1>Face Change Detection Demo</h1>
      <video
        ref={videoRef}
        width="640"
        height="480"
        autoPlay
        muted
        style={{
          borderRadius: 12,
          border: "3px solid #555",
          marginBottom: 10,
        }}
      />
      <p>{status}</p>
      {alert && <p style={{ color: "red", fontWeight: "bold" }}>{alert}</p>}
      <p>
        Press <strong>Ctrl + C</strong> in console or refresh to stop.
      </p>
    </div>
  );
}
