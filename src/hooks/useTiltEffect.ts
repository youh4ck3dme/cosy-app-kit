import { useEffect, useRef, RefObject } from "react";

interface TiltOptions {
  max?: number; // max tilt rotation (degrees)
  perspective?: number; // Transform perspective
  scale?: number; // 1 = 100%, 1.1 = 110%
  speed?: number; // Speed of the enter/exit transition
  easing?: string; // Easing on enter/exit
}

export function useTiltEffect<T extends HTMLElement>(
  options: TiltOptions = {},
): RefObject<T | null> {
  const {
    max = 5,
    perspective = 1000,
    scale = 1.02,
    speed = 300,
    easing = "cubic-bezier(.03,.98,.52,.99)",
  } = options;

  const elementRef = useRef<T>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let rafId: number;
    let isHovered = false;

    // Apply baseline hardware acceleration styles
    element.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    element.style.transformStyle = "preserve-3d";
    element.style.willChange = "transform";
    // We only transition when resetting to prevent lag during mousemove
    element.style.transition = `transform ${speed}ms ${easing}`;

    const handleMouseEnter = () => {
      isHovered = true;
      element.style.transition = `transform ${speed}ms ${easing}`;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isHovered) return;

      // Calculate rotation based on cursor position relative to the element
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left; // x position within the element.
      const y = e.clientY - rect.top; // y position within the element.

      const width = rect.width;
      const height = rect.height;

      // Calculate percentage from center (-1 to 1)
      const xPercent = (x / width - 0.5) * 2;
      const yPercent = (y / height - 0.5) * 2;

      // Calculate rotation degrees based on max tilt
      const rotateX = max * -yPercent; // Flip Y so mouse up tilts up
      const rotateY = max * xPercent;

      // Use requestAnimationFrame for 60fps/120Hz smooth updating
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        // Remove transition while moving so it tracks perfectly with the pointer (120Hz sample rate)
        element.style.transition = "none";
        element.style.transform = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`;
      });
    };

    const handleMouseLeave = () => {
      isHovered = false;
      if (rafId) cancelAnimationFrame(rafId);

      // Add back transition for the smooth exit
      element.style.transition = `transform ${speed}ms ${easing}`;
      element.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    };

    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mousemove", handleMouseMove);
    element.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mousemove", handleMouseMove);
      element.removeEventListener("mouseleave", handleMouseLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [max, perspective, scale, speed, easing]);

  return elementRef;
}
