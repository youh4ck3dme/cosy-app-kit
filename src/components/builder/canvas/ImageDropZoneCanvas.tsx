import React, { useState, useCallback } from "react";
import { Upload, Sparkles, Loader2 } from "lucide-react";
import type { RawNode } from "@/lib/builder/semantic-intent/types";
import { convertVisionImageToHTML } from "@/lib/builder/vision/visionToHTML.server";

interface ImageDropZoneCanvasProps {
  children: React.ReactNode;
  onASTNodesImported?: (nodes: RawNode[]) => void;
}

/**
 * Client-side browser image compressor to max 1024px
 */
export async function compressImageToBase64(
  file: File,
  maxDimension = 1024,
  quality = 0.85,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get 2d canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type || "image/png";
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve({ base64: dataUrl, mimeType });
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export const ImageDropZoneCanvas: React.FC<ImageDropZoneCanvasProps> = ({
  children,
  onASTNodesImported,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setErrorMsg(null);

      const files = Array.from(e.dataTransfer.files);
      const validImage = files.find((file) =>
        ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type.toLowerCase()),
      );

      if (!validImage) {
        setErrorMsg("Podporované sú len obrázky typu PNG, JPEG, JPG a WebP.");
        return;
      }

      try {
        setLoadingStep("Analýza dizajnu cez Mistral Vision...");
        const { base64, mimeType } = await compressImageToBase64(validImage);

        setLoadingStep("Generovanie HTML AST...");
        const result = await convertVisionImageToHTML({
          data: { imageBase64: base64, mimeType },
        });

        if (result.nodes && result.nodes.length > 0) {
          onASTNodesImported?.(result.nodes);
        }
      } catch (err) {
        console.error("[ImageDropZoneCanvas] Vision conversion error:", err);
        setErrorMsg(
          err instanceof Error ? err.message : "Chyba pri konverzii obrázka pomocou AI Vision.",
        );
      } finally {
        setLoadingStep(null);
      }
    },
    [onASTNodesImported],
  );

  return (
    <div
      data-testid="vision-image-dropzone"
      className="relative w-full h-full min-h-[300px]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}

      {/* Drag Over Hover Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-indigo-950/80 backdrop-blur-sm border-4 border-dashed border-indigo-400 rounded-xl flex flex-col items-center justify-center p-6 text-center transition-all animate-in fade-in zoom-in-95 duration-200">
          <Upload className="w-16 h-16 text-indigo-400 mb-4 animate-bounce" />
          <h3 className="text-2xl font-bold text-white mb-2">Drop UI Design Image Here</h3>
          <p className="text-sm text-indigo-200">
            Mistral Vision automaticky prekonvertuje obrázok na živý, upraviteľný HTML / AST kód
          </p>
        </div>
      )}

      {/* Loading Overlay */}
      {loadingStep && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-6 text-center transition-all">
          <div className="relative mb-6">
            <Sparkles className="w-12 h-12 text-indigo-400 animate-pulse" />
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin absolute -top-2 -left-2 opacity-75" />
          </div>
          <h4 className="text-xl font-semibold text-white mb-2">{loadingStep}</h4>
          <p className="text-xs text-slate-400">
            Pixtral Vision Model rozoberá farby, rozloženie a typografiu...
          </p>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="absolute bottom-4 right-4 z-50 max-w-md bg-rose-950/90 text-rose-200 border border-rose-800 p-4 rounded-xl shadow-xl flex justify-between items-center text-sm">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="ml-4 text-xs bg-rose-800 hover:bg-rose-700 text-white px-2 py-1 rounded"
          >
            Zavrieť
          </button>
        </div>
      )}
    </div>
  );
};
