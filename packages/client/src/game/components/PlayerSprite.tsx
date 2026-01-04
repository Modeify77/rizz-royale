import { useEffect, useRef } from 'react';
import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js';
import { PLAYER_COLORS, PLAYER_SIZE, type PlayerColor, type Position } from '../types';
import { useLobbyStore } from '../../stores/lobbyStore';
import { getSocket } from '../../lib/socket';

const SPEECH_BUBBLE_DURATION = 4000;
const MAX_BUBBLE_WIDTH = 120;

export function usePlayerSprite(
  app: Application | null,
  position: Position,
  color: PlayerColor,
  name: string,
  isLocal: boolean = false
) {
  const containerRef = useRef<Container | null>(null);
  const graphicsRef = useRef<Graphics | null>(null);
  const speechBubbleRef = useRef<Container | null>(null);
  const speechBubbleBgRef = useRef<Graphics | null>(null);
  const speechTextRef = useRef<Text | null>(null);
  const lastMessageTimeRef = useRef<number>(0);
  const bubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Speech bubble (initially hidden) - only for local player
    if (isLocal) {
      const speechBubble = new Container();
      speechBubble.visible = false;
      speechBubble.position.set(0, -PLAYER_SIZE / 2 - 40);
      speechBubbleRef.current = speechBubble;

      const speechBubbleBg = new Graphics();
      speechBubble.addChild(speechBubbleBg);
      speechBubbleBgRef.current = speechBubbleBg;

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
      speechTextRef.current = speechText;
      container.addChild(speechBubble);
    }

    // Set initial position
    container.position.set(position.x, position.y);

    app.stage.addChild(container);

    return () => {
      if (bubbleTimeoutRef.current) {
        clearTimeout(bubbleTimeoutRef.current);
      }
      if (containerRef.current) {
        app.stage.removeChild(containerRef.current);
        containerRef.current.destroy({ children: true });
        containerRef.current = null;
        graphicsRef.current = null;
        speechBubbleRef.current = null;
        speechBubbleBgRef.current = null;
        speechTextRef.current = null;
      }
    };
  }, [app, color, name, isLocal]);

  // Update position when it changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.position.set(position.x, position.y);
    }
  }, [position.x, position.y]);

  // Track chat messages for local player's speech bubble
  const lobbyChatMessages = useLobbyStore((state) => state.lobbyChatMessages);

  useEffect(() => {
    if (!isLocal || !speechBubbleRef.current || !speechTextRef.current || !speechBubbleBgRef.current) {
      return;
    }

    const socket = getSocket();
    const myId = socket.id;
    if (!myId) return;

    // Find the latest message from the local player
    const myMessages = lobbyChatMessages.filter((m) => m.playerId === myId);
    const latestMessage = myMessages[myMessages.length - 1];

    if (!latestMessage) return;

    const isNewMessage = lastMessageTimeRef.current !== latestMessage.timestamp;

    if (isNewMessage) {
      lastMessageTimeRef.current = latestMessage.timestamp;

      // Clear existing timeout
      if (bubbleTimeoutRef.current) {
        clearTimeout(bubbleTimeoutRef.current);
      }

      // Truncate message if too long
      let displayText = latestMessage.text;
      if (displayText.length > 50) {
        displayText = displayText.substring(0, 47) + '...';
      }

      // Update speech text
      speechTextRef.current.text = displayText;

      // Redraw bubble background based on text size
      const textBounds = speechTextRef.current.getBounds();
      const padding = 6;
      const bubbleWidth = Math.min(MAX_BUBBLE_WIDTH, textBounds.width + padding * 2);
      const bubbleHeight = textBounds.height + padding * 2;

      speechBubbleBgRef.current.clear();
      speechBubbleBgRef.current.roundRect(
        -bubbleWidth / 2,
        -bubbleHeight / 2,
        bubbleWidth,
        bubbleHeight,
        6
      );
      speechBubbleBgRef.current.fill({ color: 0xffffff });
      speechBubbleBgRef.current.stroke({ width: 1, color: PLAYER_COLORS[color] });

      // Show bubble
      speechBubbleRef.current.visible = true;

      // Set timeout to hide after duration
      bubbleTimeoutRef.current = setTimeout(() => {
        if (speechBubbleRef.current) {
          speechBubbleRef.current.visible = false;
        }
      }, SPEECH_BUBBLE_DURATION);
    }
  }, [lobbyChatMessages, isLocal, color]);

  return containerRef.current;
}
