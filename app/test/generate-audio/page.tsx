"use client";

import { useRef, useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GenerateAudioTestPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!text.trim()) {
      setError("Please enter some text");
      return;
    }
    setLoading(true);
    try {
      const start = performance.now();
      const res = await fetch("/api/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || `Request failed (${res.status})`);
      }
      const blob = await res.blob();
      const end = performance.now();
      setLatencyMs(Math.round(end - start));
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setError(err?.message || "Failed to generate audio");
    } finally {
      setLoading(false);
    }
  }

  async function handleStream(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!text.trim()) {
      setError("Please enter some text");
      return;
    }
    setLoading(true);
    setStreaming(true);
    try {
      const start = performance.now();
      const params = new URLSearchParams({ text });
      const url = `/api/generate-audio?${params.toString()}`;
      if (audioRef.current) {
        audioRef.current.src = url;
        const onPlay = () => {
          const end = performance.now();
          setLatencyMs(Math.round(end - start));
          audioRef.current?.removeEventListener('playing', onPlay);
        };
        audioRef.current.addEventListener('playing', onPlay, { once: true } as any);
        await audioRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setError(err?.message || "Failed to stream audio");
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A18] to-[#0D0D20] py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Generate Audio (Test)</CardTitle>
              {latencyMs != null && (
                <span
                  title="Time from request start to audio received"
                  className="text-xs text-emerald-300 bg-emerald-900/40 border border-emerald-700 px-2 py-1 rounded-full"
                >
                  {latencyMs} ms
                </span>
              )}
            </div>
            <p className="text-sm text-white/60">Enter text below and generate speech using the API route.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="grid gap-3">
              <div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter text to synthesize"
                  rows={6}
                  disabled={loading}
                  className="w-full rounded-md border border-white/10 bg-black/40 text-white placeholder-white/40 outline-none p-3"
                />
                <div className="flex items-center justify-between mt-1">
                  <small className="text-white/50">{text.length} chars</small>
                  <button
                    type="button"
                    onClick={() => setText("")}
                    disabled={loading || text.length === 0}
                    className="text-xs text-white bg-white/10 hover:bg-white/20 border border-white/10 px-2 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3 py-2 rounded-md bg-white text-black border border-white/20 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Generating..." : "Generate"}
                </button>
                <button
                  type="button"
                  onClick={handleStream}
                  disabled={loading}
                  className="px-3 py-2 rounded-md bg-emerald-500 text-black border border-emerald-600 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {streaming ? "Streaming..." : "Stream"}
                </button>
                <button
                  type="button"
                  onClick={() => setLatencyMs(null)}
                  disabled={loading || latencyMs == null}
                  className="px-3 py-2 rounded-md bg-white/5 text-white border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset latency
                </button>
              </div>
            </form>

            {error && (
              <p className="text-red-300 mt-3">{error}</p>
            )}
            <audio ref={audioRef} controls className="mt-4 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

