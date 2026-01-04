import { useRef, useEffect } from 'react';
import { Application } from 'pixi.js';

// Game dimensions
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

interface GameCanvasProps {
  onAppReady?: (app: Application) => void;
}

export function GameCanvas({ onAppReady }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let currentApp: Application | null = null;

    const initApp = async () => {
      const app = new Application();

      await app.init({
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        backgroundColor: 0x1a0a20, // Dark purple background
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      // Check if we were cancelled during init (React StrictMode)
      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }

      containerRef.current?.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;
      currentApp = app;

      // Notify parent that app is ready
      onAppReady?.(app);
    };

    initApp().catch(console.error);

    return () => {
      cancelled = true;
      if (currentApp) {
        const canvas = currentApp.canvas as HTMLCanvasElement;
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        currentApp.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [onAppReady]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto"
      style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
      data-testid="game-canvas"
    />
  );
}
