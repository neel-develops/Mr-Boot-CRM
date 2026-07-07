"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { GlassCard } from "@/components/ui/glass-card";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ScanStatus = "idle" | "requesting" | "scanning" | "checking" | "error";

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopCameraAndScanning();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCameraScanner();
    } else {
      stopCameraAndScanning();
    }
  }, [isOpen]);

  const stopCameraAndScanning = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCameraScanner = async () => {
    setStatus("requesting");
    setErrorMessage("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true"); // required for iOS safari
        videoRef.current.play();
        setStatus("scanning");
      }
    } catch (err: any) {
      console.warn("Camera access denied or unavailable. Falling back to file upload mode:", err);
      setStatus("error");
      setErrorMessage("Could not access camera. Please select or drag a QR code image below.");
    }
  };

  const playSynthBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // high pitch beep
      
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15); // short decay

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio Context beep failed:", e);
    }
  };

  const handleScannedCode = useCallback(async (decodedText: string) => {
    setStatus("checking");
    setErrorMessage("");

    try {
      const response = await fetch(`/api/orders/lookup?query=${encodeURIComponent(decodedText)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Order not found or lookup failed");
      }

      const data = await response.json();
      if (data.orderId) {
        router.push(`/orders/${data.orderId}`);
        onClose();
      } else {
        throw new Error("Lookup succeeded but returned no order ID");
      }
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMessage(err.message || "Failed to locate order. Make sure it's a valid Mr. Boot receipt QR code.");
    }
  }, [router, onClose]);

  // Main scanning loop
  useEffect(() => {
    if (status !== "scanning") return;

    let active = true;

    const scanFrame = () => {
      if (!active || status !== "scanning") return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      // Wait until video dimensions are loaded
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Draw video frame to hidden canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Read QR
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
            // Found QR! Stop scanning and lookup
            active = false;
            stopCameraAndScanning();
            playSynthBeep();
            handleScannedCode(code.data);
            return;
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      active = false;
    };
  }, [status, handleScannedCode]);



  // Handle local file selection / upload scanning
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setStatus("checking");
    setErrorMessage("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setStatus("error");
          setErrorMessage("Failed to create canvas context");
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          playSynthBeep();
          handleScannedCode(code.data);
        } else {
          setStatus("error");
          setErrorMessage("No QR code detected in the selected image. Please try another image.");
        }
      };
      img.onerror = () => {
        setStatus("error");
        setErrorMessage("Failed to load image file.");
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setStatus("error");
      setErrorMessage("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md p-4">
      <GlassCard className="w-full max-w-md shadow-[0_16px_48px_rgba(0,0,0,0.16)] flex flex-col gap-6 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#C89B3C] text-[24px]">qr_code_scanner</span>
            <h3 className="text-body-md font-semibold text-primary">Scan QR Code</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-black/5 text-on-surface-variant transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scanner Feed Container */}
        <div className="relative aspect-square w-full bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
          {status === "scanning" && (
            <>
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder brackets overlay */}
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-dashed border-white/40 rounded-lg relative">
                  {/* Top-Left Bracket */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#C89B3C] rounded-tl-md"></div>
                  {/* Top-Right Bracket */}
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#C89B3C] rounded-tr-md"></div>
                  {/* Bottom-Left Bracket */}
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#C89B3C] rounded-bl-md"></div>
                  {/* Bottom-Right Bracket */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#C89B3C] rounded-br-md"></div>

                  {/* Pulsing Horizontal Laser Line */}
                  <div className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#C89B3C] to-transparent animate-pulse shadow-[0_0_12px_#C89B3C] top-1/2"></div>
                </div>
              </div>
            </>
          )}

          {status === "requesting" && (
            <div className="flex flex-col items-center gap-2 text-white">
              <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
              <p className="text-sm font-medium">Starting camera...</p>
            </div>
          )}

          {status === "checking" && (
            <div className="flex flex-col items-center gap-2 text-white">
              <div className="w-8 h-8 border-4 border-white/20 border-t-[#C89B3C] rounded-full animate-spin"></div>
              <p className="text-sm font-medium">Looking up order...</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-2 p-6 text-center text-white/90">
              <span className="material-symbols-outlined text-error text-[40px] mb-1">warning</span>
              <p className="text-sm font-semibold max-w-xs">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Footer / Upload fallback */}
        <div className="flex flex-col gap-3">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
              dragOver ? "border-[#C89B3C] bg-primary/5" : "border-black/10 hover:border-black/20"
            }`}
            onClick={() => document.getElementById("qr-file-input")?.click()}
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[24px] mb-1">upload_file</span>
            <span className="text-[13px] font-semibold text-primary">Upload receipt or scan image</span>
            <span className="text-[11px] text-on-surface-variant mt-0.5">Drag & drop or browse</span>
            <input
              type="file"
              id="qr-file-input"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {status === "error" && (
            <button
              onClick={startCameraScanner}
              className="w-full bg-primary text-on-primary rounded-xl py-3 text-sm font-semibold hover:opacity-95 shadow-sm transition-all"
            >
              Retry Camera Scan
            </button>
          )}
        </div>
      </GlassCard>
    </div>
  );
};
