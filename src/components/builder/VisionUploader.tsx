import * as React from "react";
import { UploadCloud, ImageIcon, Loader2 } from "lucide-react";
import { useTiltEffect } from "@/hooks/useTiltEffect";
import { useHaptic } from "@/hooks/useHaptic";

interface VisionUploaderProps {
  onImageProcess: (base64: string) => void;
  isProcessing: boolean;
}

export function VisionUploader({ onImageProcess, isProcessing }: VisionUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const tiltRef = useTiltEffect<HTMLDivElement>({ max: 5, scale: 1.02, speed: 400 });
  
  // Use our premium AMOLED PWA hooks
  const { triggerClick, triggerSuccess, triggerError } = useHaptic();

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) {
      setIsDragging(true);
      triggerClick();
    }
  }, [isDragging, triggerClick]);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = React.useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      triggerError();
      return;
    }
    
    // We got an image, vibrate success and process
    triggerSuccess();
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onImageProcess(result);
      }
    };
    reader.readAsDataURL(file);
  }, [onImageProcess, triggerError, triggerSuccess]);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleFileInput = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  }, [processFile]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div 
        ref={tiltRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative overflow-hidden rounded-3xl border-2 border-dashed
          transition-all duration-300 ease-out flex flex-col items-center justify-center
          min-h-[300px] p-8 text-center cursor-pointer
          ${isDragging 
            ? "border-accent-primary bg-accent-primary/10 glow-accent scale-[1.02]" 
            : "border-border-subtle bg-surface hover:border-accent-primary/50"
          }
          ${isProcessing ? "opacity-70 pointer-events-none" : ""}
        `}
      >
        {/* Glow effect matching AMOLED theme */}
        <div className="absolute inset-0 bg-mesh-glow opacity-30 pointer-events-none" />

        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          aria-label="Upload screenshot"
          disabled={isProcessing}
        />

        <div className="relative z-20 flex flex-col items-center gap-4">
          <div className={`p-4 rounded-full glass transition-transform duration-500 ${isDragging ? "scale-110" : ""}`}>
            {isProcessing ? (
              <Loader2 className="w-10 h-10 text-accent-primary animate-spin" />
            ) : isDragging ? (
              <UploadCloud className="w-10 h-10 text-accent-primary animate-bounce" />
            ) : (
              <ImageIcon className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">
              {isProcessing ? "Analyzing pixels..." : "Drag & Drop a screenshot"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
              {isProcessing 
                ? "Our Semantic Intent Engine is detecting interactive elements."
                : "Or click to select. We'll turn your design into interactive React components."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
