import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import type { BarMap as BarMapType } from '../types';
import barMapData from '../assets/barMap.json';

interface BarMapProps {
  app: Application;
}

export function useBarMap(app: Application | null) {
  const containerRef = useRef<Container | null>(null);

  useEffect(() => {
    if (!app) return;

    const mapData = barMapData as BarMapType;
    const container = new Container();
    containerRef.current = container;

    // Draw floor
    const floor = new Graphics();
    floor.rect(0, 0, mapData.width, mapData.height);
    floor.fill({ color: 0x1a0a20 }); // Dark purple floor
    container.addChild(floor);

    // Draw floor pattern (subtle grid)
    const floorPattern = new Graphics();
    floorPattern.setStrokeStyle({ width: 1, color: 0x2a1a30, alpha: 0.3 });
    for (let x = 0; x < mapData.width; x += 40) {
      floorPattern.moveTo(x, 0);
      floorPattern.lineTo(x, mapData.height);
    }
    for (let y = 0; y < mapData.height; y += 40) {
      floorPattern.moveTo(0, y);
      floorPattern.lineTo(mapData.width, y);
    }
    floorPattern.stroke();
    container.addChild(floorPattern);

    // Draw furniture (decorative, no collision)
    mapData.furniture.forEach((item) => {
      const furniture = new Graphics();
      if (item.type === 'bar') {
        // Bar counter - wood color with border
        furniture.roundRect(item.x, item.y, item.width, item.height, 4);
        furniture.fill({ color: 0x4a3728 });
        furniture.setStrokeStyle({ width: 2, color: 0x6b4423 });
        furniture.stroke();
      } else if (item.type === 'table') {
        // Round tables
        const centerX = item.x + item.width / 2;
        const centerY = item.y + item.height / 2;
        const radius = Math.min(item.width, item.height) / 2;
        furniture.circle(centerX, centerY, radius);
        furniture.fill({ color: 0x3a2a20 });
        furniture.setStrokeStyle({ width: 2, color: 0x5a4a40 });
        furniture.stroke();
      }
      container.addChild(furniture);
    });

    // Draw walls
    mapData.walls.forEach((wall) => {
      const wallGraphic = new Graphics();
      wallGraphic.rect(wall.x, wall.y, wall.width, wall.height);
      wallGraphic.fill({ color: 0x2d1f3d }); // Dark purple walls
      wallGraphic.setStrokeStyle({ width: 2, color: 0x8b5cf6 }); // Neon purple border
      wallGraphic.rect(wall.x, wall.y, wall.width, wall.height);
      wallGraphic.stroke();
      container.addChild(wallGraphic);
    });

    // Add ambient lighting effect (gradient overlay)
    const ambientLight = new Graphics();
    // Top light
    ambientLight.rect(0, 0, mapData.width, 100);
    ambientLight.fill({ color: 0xec4899, alpha: 0.05 }); // Pink glow at top
    container.addChild(ambientLight);

    // Add container to stage at bottom (index 0) so other elements render on top
    app.stage.addChildAt(container, 0);

    return () => {
      if (containerRef.current) {
        app.stage.removeChild(containerRef.current);
        containerRef.current.destroy({ children: true });
        containerRef.current = null;
      }
    };
  }, [app]);

  return barMapData as BarMapType;
}

export function getMapData(): BarMapType {
  return barMapData as BarMapType;
}
