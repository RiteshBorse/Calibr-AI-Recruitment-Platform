"use client";

import { getVideoState } from "./videoQueueIntegration";

/**
 * Client-side video adapter for Queue 0
 * Use this instead of the server action when running on client
 */
export function checkVideoViolationsClient() {
  return Promise.resolve(getVideoState());
}
