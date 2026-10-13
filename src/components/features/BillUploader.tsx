"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  onImage: (dataUrl: string) => void;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function BillUploader({ onImage }: Props) {
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    setStream((prev) => {
      if (prev) prev.getTracks().forEach((t) => t.stop());
      return null;
    });
    setShowCamera(false);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const dataUrl = await readAsDataUrl(file);
      onImage(dataUrl);
    },
    [onImage]
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const startCamera = useCallback(async () => {
    setError(null);
    const canLive =
      typeof window !== "undefined" &&
      window.isSecureContext &&
      !!navigator.mediaDevices?.getUserMedia;

    if (!canLive) {
      cameraInputRef.current?.click();
      return;
    }

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
      setError("Couldn't open the camera. Use “Scan a receipt” to pick from your gallery.");
    }
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    stopCamera();
    onImage(dataUrl);
  }, [onImage, stopCamera]);

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
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => libraryRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer ${
            dragOver
              ? "border-emerald-400 bg-emerald-400/10"
              : "border-gray-700 hover:border-gray-500 bg-gray-900"
          }`}
        >
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
            <p className="text-gray-200 font-medium text-base">Scan a receipt</p>
            <p className="text-gray-500 text-sm">Choose a photo from your gallery</p>
          </div>

          <input
            ref={libraryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onChange}
          />
        </div>
      )}

      {showCamera && (
        <div className="relative rounded-2xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
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
              aria-label="Capture"
              className="w-14 h-14 bg-white rounded-full border-4 border-gray-300"
            />
          </div>
        </div>
      )}

      {!showCamera && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            startCamera();
          }}
          className="mt-3 w-full py-2.5 text-sm text-gray-300 hover:text-white border border-gray-800 rounded-xl hover:bg-gray-900 transition-colors"
        >
          Take a photo
        </button>
      )}

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
