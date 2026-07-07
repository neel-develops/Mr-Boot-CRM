"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";

interface OrderItemInfo {
  id: string;
  status: string;
  price: string;
  dueDate: string;
  createdAt: string;
  customerName: string;
  itemSummary: string;
}

interface DateOrdersResponse {
  collected: OrderItemInfo[];
  deliveries: OrderItemInfo[];
}

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = "idle" | "listening" | "transcribing" | "results" | "error";

const formatDateString = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const parseRelativeDate = (query: string): string | null => {
  const text = query.toLowerCase();
  const today = new Date();

  if (text.includes("today")) {
    return formatDateString(today);
  }
  if (text.includes("tomorrow")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateString(tomorrow);
  }
  if (text.includes("yesterday")) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDateString(yesterday);
  }

  // Check months & days
  const months = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
    "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec"
  ];

  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    if (text.includes(month)) {
      // Look for number (day)
      const match = text.match(/\b\d{1,2}(st|nd|rd|th)?\b/);
      if (match) {
        const day = parseInt(match[0]);
        const monthIndex = i % 12;
        const year = today.getFullYear();
        const targetDate = new Date(year, monthIndex, day);
        return formatDateString(targetDate);
      }
    }
  }

  return null;
};

const formatDisplayDate = (dateStr: string) => {
  try {
    const parts = dateStr.split("-");
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
};

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dateResults, setDateResults] = useState<DateOrdersResponse | null>(null);
  const [queryDate, setQueryDate] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Web Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Keep track of latest transcript via ref to avoid resetting recording streams when it changes
  const transcriptRef = useRef(transcript);
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const stopAllRecordingAndSpeech = useCallback(() => {
    // Stop Speech Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      } catch (e) {
        console.error(e);
      }
      recognitionRef.current = null;
    }

    // Stop Media Recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error(e);
      }
    }
    mediaRecorderRef.current = null;

    // Stop Media Stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Cancel Web Audio animation & Context
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.error(e);
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // Fit waveform drawing canvas
  const startWaveformVisualization = useCallback((stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64; // Small fft for clean visualization blocks
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current = analyser;
      source.connect(analyser);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fit to canvas styling
      canvas.width = canvas.parentElement?.clientWidth || 320;
      canvas.height = 80;

      const draw = () => {
        if (!analyserRef.current || !canvas || !ctx) return;
        animationFrameRef.current = requestAnimationFrame(draw);
        analyserRef.current.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const spacing = 4;
        const totalBars = bufferLength - 8; // crop high-frequencies
        const barWidth = (canvas.width - spacing * totalBars) / totalBars;
        let x = spacing / 2;

        for (let i = 0; i < totalBars; i++) {
          // Normalize value
          const value = dataArray[i] / 255;
          // Apply minimal floor so bars bounce slightly even in silence
          const barHeight = Math.max(4, value * canvas.height * 0.95);

          // Chocolate brown tone (#4e342e) fading with frequency and amplitude
          ctx.fillStyle = `rgba(78, 52, 46, ${0.45 + value * 0.55})`;

          ctx.beginPath();
          const y = (canvas.height - barHeight) / 2;
          ctx.roundRect(x, y, barWidth, barHeight, 6);
          ctx.fill();

          x += barWidth + spacing;
        }
      };

      draw();
    } catch (e) {
      console.warn("Waveform visualization could not load", e);
    }
  }, []);

  const processTranscript = useCallback(async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) {
      setMode("error");
      setErrorMessage("No command recognized. Try saying 'orders today' or 'Chelsea boots'.");
      return;
    }

    // Check if user wants to create a new order/bill
    const isCreateIntent = (t: string) => {
      const lower = t.toLowerCase();
      return (
        lower.includes("create") ||
        lower.includes("new order") ||
        lower.includes("new bill") ||
        lower.includes("add order") ||
        lower.includes("make order") ||
        lower.includes("place order") ||
        lower.includes("order for") ||
        lower.includes("bill for") ||
        lower.includes("invoice for") ||
        lower.includes("intake") ||
        lower.includes("ready made") ||
        lower.includes("readymade") ||
        lower.includes("buy shoe")
      );
    };

    if (isCreateIntent(cleanText)) {
      setMode("transcribing");
      try {
        const response = await fetch("/api/orders/voice-parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: cleanText }),
        });
        if (!response.ok) throw new Error("Failed to parse voice command");
        const data = await response.json();
        
        // Determine target route based on isReadymade
        const targetPage = data.isReadymade ? "/billing/readymade" : "/orders/new";
        router.push(`${targetPage}?prefill=${encodeURIComponent(JSON.stringify(data))}`);
        onClose();
        return;
      } catch (err) {
        console.error("Voice parse error:", err);
        // Clean command words to leave just the customer name fallback
        const cleanName = cleanText
          .replace(/^(create order of|create order for|new order for|create bill for|create invoice for|add order for|make order for|place order for|order for|bill for|invoice for|intake for|create|new|bill|order|intake|of|for)\b/gi, "")
          .trim();
        router.push(`/orders/new?name=${encodeURIComponent(cleanName)}`);
        onClose();
        return;
      }
    }

    // Try relative date parsing
    const dateStr = parseRelativeDate(cleanText);
    if (dateStr) {
      setQueryDate(dateStr);
      try {
        const response = await fetch(`/api/orders/by-date?date=${dateStr}`);
        if (!response.ok) throw new Error("Failed to fetch orders for date");
        const data = await response.json();
        setDateResults(data);
        setMode("results");
      } catch (err) {
        console.error(err);
        setMode("error");
        setErrorMessage("Error retrieving orders for the specified date.");
      }
    } else {
      // General search query, redirect to orders page
      router.push(`/orders?search=${encodeURIComponent(cleanText)}`);
      onClose();
    }
  }, [router, onClose]);

  const transcribeRecordedAudio = useCallback(async () => {
    if (audioChunksRef.current.length === 0) {
      setMode("error");
      setErrorMessage("No voice recorded. Please try again.");
      return;
    }

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("file", audioBlob);

      const response = await fetch("/api/voice-transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to transcribe audio");
      }

      const result = await response.json();
      if (result.transcript && result.transcript.trim()) {
        setTranscript(result.transcript);
        processTranscript(result.transcript);
      } else {
        throw new Error("Could not understand audio");
      }
    } catch (err: any) {
      console.error(err);
      setMode("error");
      setErrorMessage(err.message || "Failed to process audio command");
    }
  }, [processTranscript]);

  const handleSpeechFinished = useCallback(() => {
    // Stop recording fallback
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    setMode("transcribing");
  }, []);

  const startVoiceListening = useCallback(async () => {
    setMode("listening");
    setTranscript("Listening...");
    setErrorMessage("");
    setDateResults(null);
    setQueryDate(null);
    audioChunksRef.current = [];

    // 1. Request microphone access for both visualizer and backup recorder
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch (err: any) {
      console.error("Microphone access denied:", err);
      setMode("error");
      setErrorMessage("Microphone access denied. Please check site permissions.");
      return;
    }

    // Start Audio Wave visualization
    startWaveformVisualization(stream);

    // 2. Try native browser Web Speech Recognition (instant client-side)
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      const rec = new SpeechRecognitionClass();
      recognitionRef.current = rec;
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-IN"; // Good default for English + Indian accents/dialects

      rec.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          setTranscript(currentText);
        }
      };

      rec.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
      };

      rec.onend = () => {
        // Speech finished, transition to processing if we captured anything
        handleSpeechFinished();
      };

      try {
        rec.start();
      } catch (e) {
        console.error("Failed to start SpeechRecognition:", e);
      }
    }

    // 3. Simultaneously initialize MediaRecorder as a server-side transcription fallback
    try {
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      recorder.onstop = async () => {
        // If client recognition failed, compile recording and upload
        const currentTranscript = transcriptRef.current;
        if (!recognitionRef.current || currentTranscript === "Listening..." || currentTranscript === "") {
          await transcribeRecordedAudio();
        }
      };
      recorder.start();
    } catch (e) {
      console.warn("MediaRecorder fallback not supported/failed:", e);
    }
  }, [startWaveformVisualization, handleSpeechFinished, transcribeRecordedAudio]);

  // Run automatically when client-side speech ends
  useEffect(() => {
    if (mode === "transcribing" && transcript && transcript !== "Listening..." && transcript !== "") {
      processTranscript(transcript);
    }
  }, [mode, transcript, processTranscript]);

  // Clean up on unmount or close
  useEffect(() => {
    return () => {
      stopAllRecordingAndSpeech();
    };
  }, [stopAllRecordingAndSpeech]);

  useEffect(() => {
    if (isOpen) {
      startVoiceListening();
    } else {
      stopAllRecordingAndSpeech();
    }
  }, [isOpen, startVoiceListening, stopAllRecordingAndSpeech]);



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md p-4">
      <GlassCard className="w-full max-w-lg shadow-[0_16px_48px_rgba(0,0,0,0.16)] flex flex-col gap-6 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#C89B3C] text-[24px]">mic</span>
            <h3 className="text-body-md font-semibold text-primary">Voice Assistant</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-black/5 text-on-surface-variant transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Dynamic Display Area */}
        <div className="flex-1 flex flex-col justify-center items-center py-6 min-h-[160px]">
          {mode === "listening" && (
            <div className="w-full flex flex-col items-center gap-4">
              <canvas ref={canvasRef} className="w-full max-w-sm rounded-lg opacity-90 h-20" />
              <p className="text-headline-lg font-semibold text-center text-primary px-4 line-clamp-2">
                {transcript === "Listening..." ? "Speak now..." : transcript}
              </p>
              <button
                onClick={handleSpeechFinished}
                className="mt-2 bg-primary text-on-primary rounded-full px-5 py-2.5 text-label-sm font-semibold hover:opacity-95 shadow-md flex items-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">stop</span>
                Done Speaking
              </button>
            </div>
          )}

          {mode === "transcribing" && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-primary/25 border-t-primary rounded-full animate-spin" />
              <p className="text-body-md font-semibold text-on-surface-variant">Processing command...</p>
              <span className="text-label-sm italic text-on-surface-variant/70">"{transcript}"</span>
            </div>
          )}

          {mode === "error" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="material-symbols-outlined text-error text-[48px]">error</span>
              <div>
                <p className="text-body-md font-bold text-error">Something went wrong</p>
                <p className="text-label-sm text-on-surface-variant mt-1 max-w-xs">{errorMessage}</p>
              </div>
              <button
                onClick={startVoiceListening}
                className="bg-primary text-on-primary rounded-full px-6 py-2 text-label-sm font-semibold hover:opacity-95 shadow-sm transition-all"
              >
                Try Again
              </button>
            </div>
          )}

          {mode === "results" && dateResults && queryDate && (
            <div className="w-full flex flex-col gap-4 overflow-y-auto max-h-[50vh] pr-1">
              <div className="text-center mb-1">
                <p className="text-label-sm text-on-surface-variant uppercase tracking-wider font-bold">Orders For</p>
                <p className="text-headline-lg font-bold text-primary">{formatDisplayDate(queryDate)}</p>
              </div>

              {/* Segment: Intakes */}
              <div>
                <h4 className="text-label-sm font-bold text-on-surface-variant mb-2 flex items-center gap-1.5 border-b border-black/5 pb-1">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">login</span>
                  Intakes ({dateResults.collected.length})
                </h4>
                {dateResults.collected.length === 0 ? (
                  <p className="text-[13px] text-on-surface-variant/70 italic py-2 pl-2">No intakes on this date.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {dateResults.collected.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => {
                          router.push(`/orders/${order.id}`);
                          onClose();
                        }}
                        className="bg-white/40 hover:bg-white/80 p-3 rounded-lg border border-black/5 transition-all cursor-pointer flex justify-between items-center group"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-sm text-primary group-hover:underline">
                            {order.customerName}
                          </span>
                          <span className="text-[12px] text-on-surface-variant/80 line-clamp-1">{order.itemSummary}</span>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/5 text-primary">
                          ₹{Number(order.price).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Segment: Deliveries */}
              <div className="mt-2">
                <h4 className="text-label-sm font-bold text-on-surface-variant mb-2 flex items-center gap-1.5 border-b border-black/5 pb-1">
                  <span className="material-symbols-outlined text-[16px] text-[#008A27]">schedule</span>
                  Deliveries ({dateResults.deliveries.length})
                </h4>
                {dateResults.deliveries.length === 0 ? (
                  <p className="text-[13px] text-on-surface-variant/70 italic py-2 pl-2">No deliveries due on this date.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {dateResults.deliveries.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => {
                          router.push(`/orders/${order.id}`);
                          onClose();
                        }}
                        className="bg-white/40 hover:bg-white/80 p-3 rounded-lg border border-black/5 transition-all cursor-pointer flex justify-between items-center group"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-sm text-primary group-hover:underline">
                            {order.customerName}
                          </span>
                          <span className="text-[12px] text-on-surface-variant/80 line-clamp-1">{order.itemSummary}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/5 text-primary">
                            ₹{Number(order.price).toLocaleString("en-IN")}
                          </span>
                          <span className={`w-2.5 h-2.5 rounded-full ${order.status === "READY" ? "bg-[#008A27]" : "bg-[#E5B53A]"}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={startVoiceListening}
                className="mt-4 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10 rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">mic</span>
                New Voice Command
              </button>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};
