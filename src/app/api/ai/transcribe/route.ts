import { NextRequest, NextResponse } from "next/server";

const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY;

export async function POST(request: NextRequest) {
  if (!SILICONFLOW_API_KEY) {
    return NextResponse.json(
      { error: "SiliconFlow API key not configured" },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 },
      );
    }

    // Build FormData for SiliconFlow
    const siliconForm = new FormData();
    siliconForm.append("file", file, "audio.webm");
    siliconForm.append("model", "FunAudioLLM/SenseVoiceSmall");

    const response = await fetch(
      "https://api.siliconflow.cn/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
        },
        body: siliconForm,
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("[Transcribe] SiliconFlow error:", response.status, errorText);
      return NextResponse.json(
        { error: `ASR service error: ${response.status}` },
        { status: 502 },
      );
    }

    const data = (await response.json()) as { text?: string };
    return NextResponse.json({ text: data.text || "" });
  } catch (err) {
    console.error("[Transcribe] unexpected error:", err);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 },
    );
  }
}
