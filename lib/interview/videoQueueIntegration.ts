"use client";

import { VideoInputQueue, VideoLog } from "./types";

/**
 * Integration layer between video-processing.tsx and the queue system
 * This manages Queue 0 (Video Input Queue)
 */

export interface VideoState {
  violation_count: number;
  mood_state: string;
  logs: VideoLog[];
  current_violations: string[];
}

let videoState: VideoState = {
  violation_count: 0,
  mood_state: 'neutral',
  logs: [],
  current_violations: []
};

let lastMoodState = 'neutral';

// Callback for immediate log persistence (set by TechnicalInterviewClient)
let onLogCreated: ((log: VideoLog) => void) | null = null;

/**
 * Set callback to be invoked immediately when a video log is created
 * This allows real-time persistence for mood-based question generation
 */
export function setLogCallback(callback: ((log: VideoLog) => void) | null) {
  onLogCreated = callback;
}

/**
 * Update video state from video-processing component
 * Call this from the video processing component when violations or mood changes
 */
export function updateVideoState(update: {
  violations?: string[];
  mood?: string;
  gesture?: string;
  objects?: string[];
}) {
  const timestamp = new Date();
  
  // Update mood if provided
  if (update.mood && update.mood !== 'neutral') {
    videoState.mood_state = update.mood;
  }

  // Track violations
  const newViolations: string[] = [];
  
  if (update.gesture && update.gesture !== 'facing_forward') {
    newViolations.push(`gesture:${update.gesture}`);
  }
  
  if (update.objects && update.objects.length > 0) {
    // Filter out normal single person detection
    const filteredObjects = update.objects.filter(obj => 
      obj.toLowerCase() !== 'person' || update.objects!.length > 1
    );
    if (filteredObjects.length > 0) {
      newViolations.push(...filteredObjects.map(obj => `object:${obj}`));
    }
  }

  // Update violation count if there are sustained violations
  if (newViolations.length > 0) {
    videoState.violation_count += 1;
    videoState.current_violations = newViolations;
  } else {
    videoState.current_violations = [];
  }

  // Log the event
  const log: VideoLog = {
    timestamp,
    mood: update.mood,
    gesture: update.gesture,
    objects: update.objects,
    violationType: newViolations.length > 0 ? newViolations.join(', ') : undefined
  };
  
  videoState.logs.push(log);

  // Keep only last 100 logs in memory
  if (videoState.logs.length > 100) {
    videoState.logs = videoState.logs.slice(-100);
  }

  // IMMEDIATE PERSISTENCE: Invoke callback if registered
  // This ensures logs are stored in DB right away for mood-based question generation
  if (onLogCreated) {
    onLogCreated(log);
  }
}

/**
 * Get current video state for Queue 0 processing
 */
export function getVideoState(): {
  violation_count: number;
  mood_state: string;
  should_end: boolean;
  mood_changed: boolean;
} {
  const mood_changed = videoState.mood_state !== lastMoodState && videoState.mood_state !== 'neutral';
  lastMoodState = videoState.mood_state;

  return {
    violation_count: videoState.violation_count,
    mood_state: videoState.mood_state,
    should_end: videoState.violation_count >= 3,
    mood_changed
  };
}

/**
 * Get full Queue 0 data structure
 */
export function getQueue0(use_video_processing: boolean): VideoInputQueue {
  return {
    use_video_processing,
    violation_count: videoState.violation_count,
    mood_state: videoState.mood_state,
    logs: videoState.logs
  };
}

/**
 * Reset video state (call when starting new interview)
 */
export function resetVideoState() {
  videoState = {
    violation_count: 0,
    mood_state: 'neutral',
    logs: [],
    current_violations: []
  };
  lastMoodState = 'neutral';
  onLogCreated = null; // Clear callback on reset
}

/**
 * Get current violation snapshot for storing with question entries
 */
export function getViolationSnapshot() {
  return {
    violation_count: videoState.violation_count,
    current_violations: videoState.current_violations
  };
}

/**
 * Get all accumulated logs (for periodic syncing to database)
 * Returns a copy of logs and clears the internal buffer
 */
export function getAndClearLogs(): VideoLog[] {
  const logs = [...videoState.logs];
  videoState.logs = []; // Clear after retrieving
  return logs;
}
