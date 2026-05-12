"use client";

import { useState, useRef, useCallback } from "react";

interface Props {
  onImageReady: (imageDataUrl: string) => void;
  onOCRComplete: (text: string, imageDataUrl: string) => void;
}

export default function BillUploader({ onImageReady, onOCRComplete }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setShowCamera(false);
  }, [stream]);

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setStatusText("Loading image...");

    const imageDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    // Fire image ready immediately so parent can start AI analysis in parallel
    onImageReady(imageDataUrl);

    setProgress(10);
    setStatusText("Initializing OCR engine...");

    try {
      const Tesseract = (await import("tesseract.js")).default;
      setProgress(20);
      setStatusText("Reading receipt (this takes ~10s)...");

      const result = await Tesseract.recognize(imageDataUrl, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(20 + Math.round((m.progress || 0) * 70));
          }
        },
      });

      setProgress(100);
      setStatusText("Done!");
      onOCRComplete(result.data.text, imageDataUrl);
    } catch (err) {
      console.error("OCR failed:", err);
      setStatusText("OCR failed. Try entering items manually.");
      onOCRComplete("", imageDataUrl);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    processImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(s);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = s;
      }, 100);
    } catch {
      setShowCamera(false);
      setStatusText("Camera access denied.");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "receipt.jpg", { type: "image/jpeg" });
        stopCamera();
        processImage(file);
      }
    }, "image/jpeg");
  };

  return (
    <div className="w-full">
      <canvas ref={canvasRef} className="hidden" />

      {!showCamera && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer
            ${dragOver ? "border-emerald-400 bg-emerald-400/10" : "border-gray-700 hover:border-gray-500 bg-gray-900"}`}
          onClick={() => fileInputRef.current?.click()}
        >
          {isProcessing ? (
            <div className="space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-400">{statusText}</p>
              <div className="w-full max-w-xs mx-auto bg-gray-800 rounded-full h-2">
                <div
                  className="bg-emerald-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <svg
                className="w-12 h-12 mx-auto text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 16.5v1.5A2.5 2.5 0 005.5 20h13a2.5 2.5 0 002.5-2.5V16.5m-9-9l-3 3m0 0l3 3m-3-3H21M3 9V7.5A2.5 2.5 0 015.5 5H9"
                />
              </svg>
              <p className="text-gray-300 font-medium">
                Drop a receipt photo here or click to browse
              </p>
              <p className="text-gray-500 text-sm">PNG, JPG up to 10MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      )}

      {showCamera && (
        <div className="relative rounded-2xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full max-h-[400px] object-cover"
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <button
              onClick={stopCamera}
              className="px-4 py-2 bg-gray-800/80 text-white rounded-full text-sm"
            >
              Cancel
            </button>
            <button
              onClick={capturePhoto}
              className="w-14 h-14 bg-white rounded-full border-4 border-gray-300"
            />
          </div>
        </div>
      )}

      {!showCamera && !isProcessing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            startCamera();
          }}
          className="mt-3 w-full py-2.5 text-sm text-gray-400 hover:text-gray-200 border border-gray-800 rounded-xl hover:bg-gray-900 transition-colors"
        >
          Take a photo instead
        </button>
      )}
    </div>
  );
}
