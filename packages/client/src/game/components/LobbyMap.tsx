import { useEffect, useRef } from 'react';
import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js';
import type { BarMap as LobbyMapType } from '../types';
import lobbyMapData from '../assets/lobbyMap.json';

export function useLobbyMap(app: Application | null) {
  const containerRef = useRef<Container | null>(null);

  useEffect(() => {
    if (!app) return;

    const mapData = lobbyMapData as LobbyMapType;
    const container = new Container();
    containerRef.current = container;

    // Draw floor - darker space-like theme
    const floor = new Graphics();
    floor.rect(0, 0, mapData.width, mapData.height);
    floor.fill({ color: 0x0d0d1a }); // Very dark blue/purple
    container.addChild(floor);

    // Draw floor pattern (hexagonal-ish grid like Among Us)
    const floorPattern = new Graphics();
    floorPattern.setStrokeStyle({ width: 1, color: 0x1a1a2e, alpha: 0.5 });

    // Hexagonal pattern
    const hexSize = 30;
    for (let row = 0; row < mapData.height / (hexSize * 0.866); row++) {
      for (let col = 0; col < mapData.width / hexSize; col++) {
        const offsetX = row % 2 === 0 ? 0 : hexSize / 2;
        const x = col * hexSize + offsetX + hexSize / 2;
        const y = row * hexSize * 0.866 + hexSize / 2;

        // Draw hexagon
        for (let i = 0; i < 6; i++) {
          const angle = (i * 60 - 30) * Math.PI / 180;
          const nextAngle = ((i + 1) * 60 - 30) * Math.PI / 180;
          floorPattern.moveTo(x + Math.cos(angle) * hexSize / 2, y + Math.sin(angle) * hexSize / 2);
          floorPattern.lineTo(x + Math.cos(nextAngle) * hexSize / 2, y + Math.sin(nextAngle) * hexSize / 2);
        }
      }
    }
    floorPattern.stroke();
    container.addChild(floorPattern);

    // Draw furniture (decorative)
    (mapData.furniture || []).forEach((item: any) => {
      const furniture = new Graphics();

      if (item.type === 'couch') {
        // Rounded rectangle couch
        furniture.roundRect(item.x, item.y, item.width, item.height, 8);
        furniture.fill({ color: 0x2a2a4a });
        furniture.setStrokeStyle({ width: 2, color: 0x4a4a6a });
        furniture.stroke();
      } else if (item.type === 'table') {
        // Round coffee table
        const centerX = item.x + item.width / 2;
        const centerY = item.y + item.height / 2;
        const radius = Math.min(item.width, item.height) / 2;
        furniture.circle(centerX, centerY, radius);
        furniture.fill({ color: 0x3a3a5a });
        furniture.setStrokeStyle({ width: 2, color: 0x5a5a7a });
        furniture.stroke();

        // Draw a book on the table
        const bookWidth = 20;
        const bookHeight = 14;
        furniture.roundRect(centerX - bookWidth / 2, centerY - bookHeight / 2, bookWidth, bookHeight, 2);
        furniture.fill({ color: 0x6366f1 }); // Indigo book
        furniture.setStrokeStyle({ width: 1, color: 0x818cf8 });
        furniture.stroke();
        // Book spine
        furniture.moveTo(centerX, centerY - bookHeight / 2);
        furniture.lineTo(centerX, centerY + bookHeight / 2);
        furniture.setStrokeStyle({ width: 1, color: 0x4f46e5 });
        furniture.stroke();
      } else if (item.type === 'plant') {
        // Decorative plant pot
        const centerX = item.x + item.width / 2;
        const centerY = item.y + item.height / 2;
        // Pot
        furniture.roundRect(item.x + 5, item.y + item.height / 2, item.width - 10, item.height / 2, 4);
        furniture.fill({ color: 0x4a3020 });
        // Plant
        furniture.circle(centerX, centerY - 5, item.width / 2.5);
        furniture.fill({ color: 0x2a5a2a });
      }

      container.addChild(furniture);
    });

    // Add "RULES" text near the table
    const rulesStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 10,
      fill: 0x6366f1,
      letterSpacing: 1,
    });
    const rulesText = new Text({ text: 'RULES', style: rulesStyle });
    rulesText.x = 385;
    rulesText.y = 340;
    container.addChild(rulesText);

    // Draw walls with neon accent
    mapData.walls.forEach((wall) => {
      const wallGraphic = new Graphics();
      wallGraphic.rect(wall.x, wall.y, wall.width, wall.height);
      wallGraphic.fill({ color: 0x1a1a2e });
      wallGraphic.setStrokeStyle({ width: 3, color: 0x6366f1 }); // Indigo neon border
      wallGraphic.rect(wall.x, wall.y, wall.width, wall.height);
      wallGraphic.stroke();
      container.addChild(wallGraphic);
    });

    // Add "WAITING ROOM" text at top
    const titleStyle = new TextStyle({
      fontFamily: 'Arial Black, Arial',
      fontSize: 28,
      fill: 0x6366f1,
      letterSpacing: 8,
      dropShadow: {
        color: 0x6366f1,
        blur: 10,
        distance: 0,
      },
    });
    const title = new Text({ text: 'WAITING ROOM', style: titleStyle });
    title.x = mapData.width / 2 - title.width / 2;
    title.y = 40;
    container.addChild(title);

    // Add ambient lighting effects
    const ambientLight = new Graphics();
    // Corner glows
    ambientLight.circle(0, 0, 150);
    ambientLight.fill({ color: 0x6366f1, alpha: 0.05 });
    ambientLight.circle(mapData.width, 0, 150);
    ambientLight.fill({ color: 0xec4899, alpha: 0.05 });
    ambientLight.circle(0, mapData.height, 150);
    ambientLight.fill({ color: 0xec4899, alpha: 0.05 });
    ambientLight.circle(mapData.width, mapData.height, 150);
    ambientLight.fill({ color: 0x6366f1, alpha: 0.05 });
    container.addChild(ambientLight);

    // Add container to stage at bottom
    app.stage.addChildAt(container, 0);

    return () => {
      if (containerRef.current) {
        app.stage.removeChild(containerRef.current);
        containerRef.current.destroy({ children: true });
        containerRef.current = null;
      }
    };
  }, [app]);

  return lobbyMapData as LobbyMapType;
}

export function getLobbyMapData(): LobbyMapType {
  return lobbyMapData as LobbyMapType;
}
