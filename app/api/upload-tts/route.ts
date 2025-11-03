import { NextRequest, NextResponse } from "next/server";
import { S3Service } from "@/lib/s3Service";

export async function POST(request: NextRequest) {
  try {
    const { audioBase64, questionId, interviewId } = await request.json();

    if (!audioBase64 || !questionId || !interviewId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(audioBase64, 'base64');

    const s3Key = `interviews/technical/${interviewId}/audio/${questionId}.mp3`;
    const audioUrl = await S3Service.uploadObject(s3Key, buffer, "audio/mpeg", {
      interviewId,
      questionId,
      generatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, audioUrl });
  } catch (error: any) {
    console.error("[Upload TTS] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload audio" },
      { status: 500 }
    );
  }
}
