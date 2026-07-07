import { NextRequest, NextResponse } from "next/server";

import Groq, { toFile } from "groq-sdk";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get("file") as Blob;
    if (!audioBlob) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
    }

    // Clean Sarvam API Key by removing any whitespace/spaces
    const rawApiKey = process.env.SARVAM_API_KEY || "";
    const cleanApiKey = rawApiKey.replace(/\s+/g, "");

    if (!cleanApiKey) {
      // Fallback to Groq Whisper if Groq API key is present
      const groqApiKey = process.env.GROQ_API_KEY || "";
      if (!groqApiKey) {
        return NextResponse.json({ error: "Neither Sarvam AI nor Groq API Key is configured in .env" }, { status: 500 });
      }

      console.log("Sarvam API key not found. Using Groq Whisper API for transcription...");
      const groq = new Groq({ apiKey: groqApiKey });
      const buffer = Buffer.from(await audioBlob.arrayBuffer());
      const audioFile = await toFile(buffer, "audio.wav", { type: "audio/wav" });

      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-large-v3",
      });

      return NextResponse.json({ transcript: transcription.text || "" });
    }

    // Build FormData payload to send to Sarvam AI STT
    const apiFormData = new FormData();
    // Wrap Blob into a File object with a standard wav name so Sarvam recognizes it
    const audioFile = new File([audioBlob], "audio.wav", { type: "audio/wav" });
    
    apiFormData.append("file", audioFile);
    apiFormData.append("model", "saaras:v3");
    apiFormData.append("mode", "transcribe");

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": cleanApiKey,
      },
      body: apiFormData,
    });

    if (!response.ok) {
      const errorResponse = await response.text();
      console.error("Sarvam STT API Error:", errorResponse);
      return NextResponse.json({ error: `Sarvam STT failed: ${response.statusText}` }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json({ transcript: result.transcript || "" });
  } catch (error: any) {
    console.error("Error transcribing voice:", error);
    return NextResponse.json({ error: error.message || "Voice transcription failed" }, { status: 500 });
  }
}
