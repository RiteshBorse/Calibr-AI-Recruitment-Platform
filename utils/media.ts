export async function ttsToAudioUrl(text: string): Promise<string> {
  const res = await fetch("/api/generate-audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("TTS request failed");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function getMicStreamAudioOnly(): Promise<MediaStream> {
  return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}

export function revokeObjectUrl(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}


