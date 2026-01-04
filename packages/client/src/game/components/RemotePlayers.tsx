import { useEffect, useRef } from 'react';
import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js';
import type { PlayerPosition } from '@rizz/shared';
import { PLAYER_COLORS, PLAYER_SIZE, type PlayerColor } from '../types';
import { useLobbyStore, type LobbyChatMessage } from '../../stores/lobbyStore';

const SPEECH_BUBBLE_DURATION = 4000; // 4 seconds
const MAX_BUBBLE_WIDTH = 120;

// Map shared PlayerColor type to local PLAYER_COLORS
function getColorHex(color: string): number {
  return PLAYER_COLORS[color as PlayerColor] || PLAYER_COLORS.purple;
}

interface RemotePlayerSprite {
  container: Container;
  graphics: Graphics;
  speechBubble: Container;
  speechBubbleBg: Graphics;
  speechText: Text;
  lastPosition: { x: number; y: number };
  targetPosition: { x: number; y: number };
}

export function useRemotePlayers(
  app: Application | null,
  players: PlayerPosition[]
) {
  const spritesRef = useRef<Map<string, RemotePlayerSprite>>(new Map());

  useEffect(() => {
    if (!app) return;

    const sprites = spritesRef.current;
    const currentPlayerIds = new Set(players.map((p) => p.id));

    // Remove sprites for players who left
    for (const [id, sprite] of sprites) {
      if (!currentPlayerIds.has(id)) {
        app.stage.removeChild(sprite.container);
        sprite.container.destroy({ children: true });
        sprites.delete(id);
      }
    }

    // Add or update sprites for current players
    players.forEach((player) => {
      let sprite = sprites.get(player.id);

      if (!sprite) {
        // Create new sprite for this player
        const container = new Container();
        const graphics = new Graphics();

        // Draw player body
        graphics.circle(0, 0, PLAYER_SIZE / 2);
        graphics.fill({ color: getColorHex(player.color) });

        // Outline
        graphics.circle(0, 0, PLAYER_SIZE / 2);
        graphics.setStrokeStyle({ width: 2, color: 0x000000, alpha: 0.3 });
        graphics.stroke();

        // Eyes
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

        const nameTag = new Text({ text: player.username, style: nameStyle });
        nameTag.anchor.set(0.5, 1);
        nameTag.position.set(0, -PLAYER_SIZE / 2 - 5);
        container.addChild(nameTag);

        // Speech bubble (initially hidden)
        const speechBubble = new Container();
        speechBubble.visible = false;
        speechBubble.position.set(0, -PLAYER_SIZE / 2 - 40);

        const speechBubbleBg = new Graphics();
        speechBubble.addChild(speechBubbleBg);

        const speechStyle = new TextStyle({
          fontSize: 10,
          fontFamily: 'Arial',
          fill: 0x000000,
          wordWrap: true,
          wordWrapWidth: MAX_BUBBLE_WIDTH - 12,
        });

        const speechText = new Text({ text: '', style: speechStyle });
        speechText.anchor.set(0.5, 0.5);
        speechBubble.addChild(speechText);
        container.addChild(speechBubble);

        container.position.set(player.x, player.y);
        app.stage.addChild(container);

        sprite = {
          container,
          graphics,
          speechBubble,
          speechBubbleBg,
          speechText,
          lastPosition: { x: player.x, y: player.y },
          targetPosition: { x: player.x, y: player.y },
        };
        sprites.set(player.id, sprite);
      } else {
        // Update target position for interpolation
        sprite.targetPosition = { x: player.x, y: player.y };
      }
    });

    // Interpolation update function
    const interpolate = () => {
      const lerpFactor = 0.3; // Smoothing factor

      for (const sprite of sprites.values()) {
        const dx = sprite.targetPosition.x - sprite.container.position.x;
        const dy = sprite.targetPosition.y - sprite.container.position.y;

        // Only interpolate if there's significant movement
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
          sprite.container.position.x += dx * lerpFactor;
          sprite.container.position.y += dy * lerpFactor;
        } else {
          sprite.container.position.set(
            sprite.targetPosition.x,
            sprite.targetPosition.y
          );
        }
      }
    };

    // Add to ticker for smooth interpolation
    app.ticker.add(interpolate);

    return () => {
      app.ticker.remove(interpolate);
    };
  }, [app, players]);

  // Track chat messages for speech bubbles
  const lobbyChatMessages = useLobbyStore((state) => state.lobbyChatMessages);
  const lastMessageTimesRef = useRef<Map<string, number>>(new Map());
  const bubbleTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const sprites = spritesRef.current;

    // Get the latest message for each player
    const latestMessagesByPlayer = new Map<string, LobbyChatMessage>();
    for (const msg of lobbyChatMessages) {
      const existing = latestMessagesByPlayer.get(msg.playerId);
      if (!existing || msg.timestamp > existing.timestamp) {
        latestMessagesByPlayer.set(msg.playerId, msg);
      }
    }

    // Update speech bubbles for each player
    latestMessagesByPlayer.forEach((message, playerId) => {
      const sprite = sprites.get(playerId);
      if (!sprite) return;

      const lastTime = lastMessageTimesRef.current.get(playerId);
      const isNewMessage = lastTime !== message.timestamp;

      if (isNewMessage) {
        // Update last message time
        lastMessageTimesRef.current.set(playerId, message.timestamp);

        // Clear existing timeout
        const existingTimeout = bubbleTimeoutsRef.current.get(playerId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Truncate message if too long
        let displayText = message.text;
        if (displayText.length > 50) {
          displayText = displayText.substring(0, 47) + '...';
        }

        // Update speech text
        sprite.speechText.text = displayText;

        // Redraw bubble background based on text size
        const textBounds = sprite.speechText.getBounds();
        const padding = 6;
        const bubbleWidth = Math.min(MAX_BUBBLE_WIDTH, textBounds.width + padding * 2);
        const bubbleHeight = textBounds.height + padding * 2;

        sprite.speechBubbleBg.clear();
        sprite.speechBubbleBg.roundRect(
          -bubbleWidth / 2,
          -bubbleHeight / 2,
          bubbleWidth,
          bubbleHeight,
          6
        );
        sprite.speechBubbleBg.fill({ color: 0xffffff });
        sprite.speechBubbleBg.stroke({ width: 1, color: getColorHex(message.color) });

        // Show bubble
        sprite.speechBubble.visible = true;

        // Set timeout to hide after duration
        const timeout = setTimeout(() => {
          sprite.speechBubble.visible = false;
        }, SPEECH_BUBBLE_DURATION);
        bubbleTimeoutsRef.current.set(playerId, timeout);
      }
    });
  }, [lobbyChatMessages]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      bubbleTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      bubbleTimeoutsRef.current.clear();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const sprites = spritesRef.current;
      for (const sprite of sprites.values()) {
        sprite.container.destroy({ children: true });
      }
      sprites.clear();
    };
  }, []);

  return null;
}
