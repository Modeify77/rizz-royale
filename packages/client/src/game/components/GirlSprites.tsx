import { useEffect, useRef } from 'react';
import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js';
import type { GirlPosition } from '@rizz/shared';
import { useGameStore } from '../../stores/gameStore';

const GIRL_SIZE = 28;
const GIRL_COLORS = [
  0xff69b4, // Hot pink
  0xff1493, // Deep pink
  0xda70d6, // Orchid
  0xee82ee, // Violet
  0xdda0dd, // Plum
  0xff00ff, // Magenta
];

const SPEECH_BUBBLE_DURATION = 5000; // 5 seconds
const MAX_BUBBLE_WIDTH = 150;

// Strip action content like *raises an eyebrow* from speech bubbles
function stripActions(text: string): string {
  return text.replace(/\*[^*]+\*/g, '').trim();
}

interface GirlSprite {
  container: Container;
  graphics: Graphics;
  glowRing: Graphics;
  speechBubble: Container;
  speechBubbleBg: Graphics;
  speechText: Text;
  typingIndicator: Container;
  repText: Text;
  lastPosition: { x: number; y: number };
  targetPosition: { x: number; y: number };
}

export function useGirlSprites(
  app: Application | null,
  girls: GirlPosition[],
  nearbyGirlIds: Set<string> = new Set(),
  onHover?: (girlId: string | null) => void,
  onClick?: (girlId: string) => void
) {
  const spritesRef = useRef<Map<string, GirlSprite>>(new Map());
  const onHoverRef = useRef(onHover);
  const onClickRef = useRef(onClick);
  onHoverRef.current = onHover;
  onClickRef.current = onClick;

  useEffect(() => {
    if (!app) return;

    const sprites = spritesRef.current;
    const currentGirlIds = new Set(girls.map((g) => g.id));

    // Remove sprites for girls that no longer exist
    for (const [id, sprite] of sprites) {
      if (!currentGirlIds.has(id)) {
        app.stage.removeChild(sprite.container);
        sprite.container.destroy({ children: true });
        sprites.delete(id);
      }
    }

    // Add or update sprites for current girls
    girls.forEach((girl, index) => {
      let sprite = sprites.get(girl.id);

      if (!sprite) {
        // Create new sprite for this girl
        const container = new Container();
        const graphics = new Graphics();
        const glowRing = new Graphics();

        const color = GIRL_COLORS[index % GIRL_COLORS.length];

        // Draw glow ring (initially hidden)
        glowRing.circle(0, 0, GIRL_SIZE / 2 + 12);
        glowRing.fill({ color: 0x00ff88, alpha: 0.3 });
        glowRing.circle(0, 0, GIRL_SIZE / 2 + 8);
        glowRing.stroke({ width: 2, color: 0x00ff88, alpha: 0.8 });
        glowRing.visible = false;
        container.addChild(glowRing);

        // Draw girl body (heart-like shape using circles)
        // Main body
        graphics.circle(0, 0, GIRL_SIZE / 2);
        graphics.fill({ color });

        // Sparkle effect outline
        graphics.circle(0, 0, GIRL_SIZE / 2);
        graphics.setStrokeStyle({ width: 2, color: 0xffffff, alpha: 0.5 });
        graphics.stroke();

        // Inner highlight
        graphics.circle(-3, -3, GIRL_SIZE / 4);
        graphics.fill({ color: 0xffffff, alpha: 0.3 });

        // Eyes (cute anime style)
        graphics.circle(-5, -2, 4);
        graphics.circle(5, -2, 4);
        graphics.fill({ color: 0xffffff });

        // Pupils
        graphics.circle(-5, -1, 2);
        graphics.circle(5, -1, 2);
        graphics.fill({ color: 0x000000 });

        // Eye sparkles
        graphics.circle(-6, -3, 1);
        graphics.circle(4, -3, 1);
        graphics.fill({ color: 0xffffff });

        // Blush marks
        graphics.circle(-9, 3, 3);
        graphics.circle(9, 3, 3);
        graphics.fill({ color: 0xff9999, alpha: 0.5 });

        // Small smile
        graphics.moveTo(-3, 5);
        graphics.quadraticCurveTo(0, 8, 3, 5);
        graphics.setStrokeStyle({ width: 1.5, color: 0x000000 });
        graphics.stroke();

        container.addChild(graphics);

        // Name tag with hearts
        const nameStyle = new TextStyle({
          fontSize: 11,
          fontFamily: 'Arial',
          fill: 0xffb6c1, // Light pink
          fontWeight: 'bold',
          dropShadow: {
            color: 0x000000,
            blur: 3,
            distance: 1,
          },
        });

        const nameTag = new Text({ text: `♥ ${girl.name} ♥`, style: nameStyle });
        nameTag.anchor.set(0.5, 1);
        nameTag.position.set(0, -GIRL_SIZE / 2 - 8);
        container.addChild(nameTag);

        // Reputation display below the name
        const repStyle = new TextStyle({
          fontSize: 10,
          fontFamily: 'Arial',
          fill: 0x00ff88, // Green for rep
          fontWeight: 'bold',
          dropShadow: {
            color: 0x000000,
            blur: 2,
            distance: 1,
          },
        });
        const repText = new Text({ text: 'Rep: 5', style: repStyle });
        repText.anchor.set(0.5, 0);
        repText.position.set(0, GIRL_SIZE / 2 + 4);
        container.addChild(repText);

        // Speech bubble (initially hidden)
        const speechBubble = new Container();
        speechBubble.visible = false;
        speechBubble.position.set(0, -GIRL_SIZE / 2 - 45);

        const speechBubbleBg = new Graphics();
        speechBubble.addChild(speechBubbleBg);

        const speechStyle = new TextStyle({
          fontSize: 10,
          fontFamily: 'Arial',
          fill: 0x000000,
          wordWrap: true,
          wordWrapWidth: MAX_BUBBLE_WIDTH - 16,
        });

        const speechText = new Text({ text: '', style: speechStyle });
        speechText.anchor.set(0.5, 0.5);
        speechBubble.addChild(speechText);
        container.addChild(speechBubble);

        // Typing indicator (initially hidden)
        const typingIndicator = new Container();
        typingIndicator.visible = false;
        typingIndicator.position.set(0, -GIRL_SIZE / 2 - 45);

        const typingBg = new Graphics();
        typingBg.roundRect(-30, -12, 60, 24, 12);
        typingBg.fill({ color: 0xffffff });
        typingBg.stroke({ width: 1, color: 0xffb6c1 });
        typingIndicator.addChild(typingBg);

        // Three dots for typing
        const dotStyle = new TextStyle({
          fontSize: 14,
          fontFamily: 'Arial',
          fill: 0xff69b4,
          fontWeight: 'bold',
        });
        const typingDots = new Text({ text: '...', style: dotStyle });
        typingDots.anchor.set(0.5, 0.5);
        typingIndicator.addChild(typingDots);
        container.addChild(typingIndicator);

        container.position.set(girl.x, girl.y);

        // Make container interactive for hover
        container.eventMode = 'static';
        container.cursor = 'pointer';

        const girlId = girl.id;
        container.on('pointerenter', () => {
          onHoverRef.current?.(girlId);
        });
        container.on('pointerleave', () => {
          onHoverRef.current?.(null);
        });
        container.on('pointerdown', () => {
          onClickRef.current?.(girlId);
        });

        app.stage.addChild(container);

        sprite = {
          container,
          graphics,
          glowRing,
          speechBubble,
          speechBubbleBg,
          speechText,
          typingIndicator,
          repText,
          lastPosition: { x: girl.x, y: girl.y },
          targetPosition: { x: girl.x, y: girl.y },
        };
        sprites.set(girl.id, sprite);
      } else {
        // Update target position for interpolation
        sprite.targetPosition = { x: girl.x, y: girl.y };
      }

      // Update glow ring visibility based on proximity
      sprite.glowRing.visible = nearbyGirlIds.has(girl.id);
    });

    // Interpolation update function
    const interpolate = () => {
      const lerpFactor = 0.2; // Smoother movement for girls

      for (const sprite of sprites.values()) {
        const dx = sprite.targetPosition.x - sprite.container.position.x;
        const dy = sprite.targetPosition.y - sprite.container.position.y;

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

    app.ticker.add(interpolate);

    return () => {
      app.ticker.remove(interpolate);
    };
  }, [app, girls, nearbyGirlIds]);

  // Track messages and typing for speech bubbles
  const messages = useGameStore((state) => state.messages);
  const typingGirls = useGameStore((state) => state.typingGirls);
  const lastMessageTimesRef = useRef<Map<string, number>>(new Map());
  const bubbleTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const sprites = spritesRef.current;

    girls.forEach((girl) => {
      const sprite = sprites.get(girl.id);
      if (!sprite) return;

      const girlMessages = messages[girl.id] || [];
      const isTyping = typingGirls.has(girl.id);

      // Handle typing indicator
      sprite.typingIndicator.visible = isTyping;

      // If typing, hide speech bubble
      if (isTyping) {
        sprite.speechBubble.visible = false;
        return;
      }

      // Get the last message from the girl
      const lastGirlMessage = [...girlMessages].reverse().find((m) => !m.isPlayer);

      if (lastGirlMessage) {
        const lastTime = lastMessageTimesRef.current.get(girl.id);
        const isNewMessage = lastTime !== lastGirlMessage.timestamp;

        if (isNewMessage) {
          // Update last message time
          lastMessageTimesRef.current.set(girl.id, lastGirlMessage.timestamp);

          // Clear existing timeout
          const existingTimeout = bubbleTimeoutsRef.current.get(girl.id);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // Strip actions and truncate message if too long
          let displayText = stripActions(lastGirlMessage.text);
          if (!displayText) {
            // If only actions, don't show bubble
            sprite.speechBubble.visible = false;
            return;
          }
          if (displayText.length > 60) {
            displayText = displayText.substring(0, 57) + '...';
          }

          // Update speech text
          sprite.speechText.text = displayText;

          // Redraw bubble background based on text size
          const textBounds = sprite.speechText.getBounds();
          const padding = 8;
          const bubbleWidth = Math.min(MAX_BUBBLE_WIDTH, textBounds.width + padding * 2);
          const bubbleHeight = textBounds.height + padding * 2;

          sprite.speechBubbleBg.clear();
          sprite.speechBubbleBg.roundRect(
            -bubbleWidth / 2,
            -bubbleHeight / 2,
            bubbleWidth,
            bubbleHeight,
            8
          );
          sprite.speechBubbleBg.fill({ color: 0xffffff });
          sprite.speechBubbleBg.stroke({ width: 1, color: 0xffb6c1 });

          // Show bubble
          sprite.speechBubble.visible = true;

          // Set timeout to hide after duration
          const timeout = setTimeout(() => {
            sprite.speechBubble.visible = false;
          }, SPEECH_BUBBLE_DURATION);
          bubbleTimeoutsRef.current.set(girl.id, timeout);
        }
      }
    });
  }, [girls, messages, typingGirls]);

  // Update reputation display
  const reputations = useGameStore((state) => state.reputations);

  useEffect(() => {
    const sprites = spritesRef.current;

    girls.forEach((girl) => {
      const sprite = sprites.get(girl.id);
      if (!sprite) return;

      const rep = reputations[girl.id] ?? 5;
      sprite.repText.text = `Rep: ${rep}`;

      // Color based on reputation
      if (rep >= 50) {
        sprite.repText.style.fill = 0x00ff88; // Green for high rep
      } else if (rep >= 20) {
        sprite.repText.style.fill = 0xffff00; // Yellow for medium rep
      } else {
        sprite.repText.style.fill = 0xff4444; // Red for low rep
      }
    });
  }, [girls, reputations]);

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
