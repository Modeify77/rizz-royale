import { useEffect, useRef } from 'react';
import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js';
import { PLAYER_COLORS, PLAYER_SIZE, type PlayerColor, type Position } from '../types';

interface PlayerSpriteProps {
  app: Application;
  position: Position;
  color: PlayerColor;
  name: string;
  isLocal?: boolean;
}

export function usePlayerSprite(
  app: Application | null,
  position: Position,
  color: PlayerColor,
  name: string,
  isLocal: boolean = false
) {
  const containerRef = useRef<Container | null>(null);
  const graphicsRef = useRef<Graphics | null>(null);

  useEffect(() => {
    if (!app) return;

    // Create container for player + name tag
    const container = new Container();
    containerRef.current = container;

    // Create player body (simple circle/character)
    const graphics = new Graphics();
    graphicsRef.current = graphics;

    // Body
    graphics.circle(0, 0, PLAYER_SIZE / 2);
    graphics.fill({ color: PLAYER_COLORS[color] });

    // Outline (stronger for local player)
    graphics.circle(0, 0, PLAYER_SIZE / 2);
    graphics.setStrokeStyle({
      width: isLocal ? 3 : 2,
      color: isLocal ? 0xffffff : 0x000000,
      alpha: isLocal ? 0.8 : 0.3,
    });
    graphics.stroke();

    // Eyes (simple dots)
    graphics.circle(-5, -3, 3);
    graphics.circle(5, -3, 3);
    graphics.fill({ color: 0xffffff });

    graphics.circle(-5, -3, 1.5);
    graphics.circle(5, -3, 1.5);
    graphics.fill({ color: 0x000000 });

    container.addChild(graphics);

    // Name tag
    const nameStyle = new TextStyle({
      fontSize: 12,
      fontFamily: 'Arial',
      fill: 0xffffff,
      fontWeight: 'bold',
      dropShadow: {
        color: 0x000000,
        blur: 2,
        distance: 1,
      },
    });

    const nameTag = new Text({ text: name, style: nameStyle });
    nameTag.anchor.set(0.5, 1);
    nameTag.position.set(0, -PLAYER_SIZE / 2 - 5);
    container.addChild(nameTag);

    // Set initial position
    container.position.set(position.x, position.y);

    app.stage.addChild(container);

    return () => {
      if (containerRef.current) {
        app.stage.removeChild(containerRef.current);
        containerRef.current.destroy({ children: true });
        containerRef.current = null;
        graphicsRef.current = null;
      }
    };
  }, [app, color, name, isLocal]);

  // Update position when it changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.position.set(position.x, position.y);
    }
  }, [position.x, position.y]);

  return containerRef.current;
}
