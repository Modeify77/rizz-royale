import type { Archetype } from '@rizz/shared';

export interface QueuedMessage {
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
  reputation: number;
}

export interface BatchedMessages {
  girlId: string;
  girlName: string;
  archetype: Archetype;
  messages: QueuedMessage[];
}

type BatchCallback = (batch: BatchedMessages) => Promise<void>;

const BATCH_WINDOW_MS = 5000; // 5 seconds

interface GirlQueue {
  messages: QueuedMessage[];
  timer: NodeJS.Timeout | null;
  isProcessing: boolean;
  girlName: string;
  archetype: Archetype;
}

class MessageBatcher {
  // Map of lobbyCode:girlId -> queue
  private queues = new Map<string, GirlQueue>();
  private callback: BatchCallback | null = null;

  setCallback(cb: BatchCallback): void {
    this.callback = cb;
  }

  private getKey(lobbyCode: string, girlId: string): string {
    return `${lobbyCode}:${girlId}`;
  }

  addMessage(
    lobbyCode: string,
    girlId: string,
    girlName: string,
    archetype: Archetype,
    message: QueuedMessage
  ): void {
    const key = this.getKey(lobbyCode, girlId);
    let queue = this.queues.get(key);

    if (!queue) {
      queue = {
        messages: [],
        timer: null,
        isProcessing: false,
        girlName,
        archetype,
      };
      this.queues.set(key, queue);
    }

    // Add message to queue
    queue.messages.push(message);

    // If currently processing, message will be handled in next batch
    if (queue.isProcessing) {
      console.log(`[Batcher] Message queued for next batch: ${message.playerName} -> ${girlName}`);
      return;
    }

    // Start timer if this is the first message
    if (!queue.timer) {
      console.log(`[Batcher] Starting ${BATCH_WINDOW_MS}ms timer for ${girlName}`);
      queue.timer = setTimeout(() => {
        this.processBatch(lobbyCode, girlId);
      }, BATCH_WINDOW_MS);
    }
  }

  private async processBatch(lobbyCode: string, girlId: string): Promise<void> {
    const key = this.getKey(lobbyCode, girlId);
    const queue = this.queues.get(key);

    if (!queue || queue.messages.length === 0) {
      return;
    }

    // Mark as processing and grab current messages
    queue.isProcessing = true;
    queue.timer = null;
    const messagesToProcess = [...queue.messages];
    queue.messages = []; // Clear for next batch

    console.log(`[Batcher] Processing batch of ${messagesToProcess.length} messages for ${queue.girlName}`);

    try {
      if (this.callback) {
        await this.callback({
          girlId,
          girlName: queue.girlName,
          archetype: queue.archetype,
          messages: messagesToProcess,
        });
      }
    } catch (error) {
      console.error('[Batcher] Error processing batch:', error);
    } finally {
      queue.isProcessing = false;

      // If new messages arrived during processing, start new timer
      if (queue.messages.length > 0) {
        console.log(`[Batcher] ${queue.messages.length} messages queued during processing, starting new timer`);
        queue.timer = setTimeout(() => {
          this.processBatch(lobbyCode, girlId);
        }, BATCH_WINDOW_MS);
      }
    }
  }

  // Check if a girl is currently collecting messages (timer running or processing)
  isCollecting(lobbyCode: string, girlId: string): boolean {
    const key = this.getKey(lobbyCode, girlId);
    const queue = this.queues.get(key);
    return queue ? (queue.timer !== null || queue.isProcessing) : false;
  }

  // Get queued message count for a girl
  getQueuedCount(lobbyCode: string, girlId: string): number {
    const key = this.getKey(lobbyCode, girlId);
    const queue = this.queues.get(key);
    return queue?.messages.length || 0;
  }

  // Clean up when lobby is deleted
  cleanup(lobbyCode: string): void {
    for (const [key, queue] of this.queues.entries()) {
      if (key.startsWith(`${lobbyCode}:`)) {
        if (queue.timer) {
          clearTimeout(queue.timer);
        }
        this.queues.delete(key);
      }
    }
  }
}

// Singleton instance
export const messageBatcher = new MessageBatcher();
