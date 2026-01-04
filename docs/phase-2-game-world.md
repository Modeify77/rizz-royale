# Phase 2: Game World - 2D Multiplayer Bar

## Overview

Transform Rizz Royale from a card-based UI into a real-time 2D multiplayer game (Among Us style) where players walk around a bar, interact with AI girls, and see other players' movements and conversations.

---

## Decisions Summary

| Area | Decision |
|------|----------|
| **Movement** | WASD, 8-directional, fast/snappy |
| **Mobile** | Not supported initially |
| **Girl behavior** | Roaming (walk around the bar) |
| **Visual style** | Vector/cartoon (Among Us aesthetic) |
| **Map complexity** | Simple (one room, bar counter, few tables) |
| **Rendering** | PixiJS + React hybrid |
| **Position sync** | Socket.io, ~20 ticks/sec with client interpolation |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Game canvas** | PixiJS with @pixi/react |
| **UI overlays** | React (existing) |
| **State** | Zustand (existing) |
| **Networking** | Socket.io (existing) |
| **Map data** | JSON tilemap |
| **Collision** | Simple AABB for walls only |

---

## Player System

### Movement
- **WASD** controls
- **8-directional** movement with smooth interpolation
- **Fast/snappy** speed (Among Us feel)
- Cannot move while chat input is focused

### Appearance
- **6 color options** (player picks on join)
- Simple vector character sprite
- **Name tag** always visible above head
- **Chat bubble** shows message preview (3 seconds)

### Network Sync
- Client sends position updates to server
- Server broadcasts all player positions ~20 times/sec
- Client interpolates between updates for smooth rendering

---

## Girl NPCs

### Behavior
- **Roaming** - girls walk around the bar autonomously
- Simple pathfinding or random wandering
- 6 girls with hidden archetypes (unchanged from v1)

### Visuals
- Vector/cartoon sprites (consistent with player style)
- **Name tag** above head
- **Reputation display** visible when player is nearby
- **Typing indicator** (dots) above head when responding
- **Chat bubble** shows response preview (3 seconds)

### Interaction
- Walk within **medium proximity** (~3-4 character widths)
- Press **E** to open chat input
- Press **Enter** to send message
- **Click on girl** (when nearby) to view full chat history

---

## Chat System (Revised)

### Batched Response Flow

```
T+0.0s  Player A sends message to Girl → collected
T+1.5s  Player B sends message to Girl → collected
T+5.0s  Girl responds to ALL collected messages in one response
        (may address all players or choose to focus on one)
```

### Rules
- **5-second fixed window** from first message received
- Girl **collates all messages** in that window
- Girl responds in **one message** addressing whoever she chooses
- All players in proximity **see the response**
- Each player's message **scored individually** for rep
- Messages sent while girl is "typing" → **queued for next batch**

### Proximity Broadcasting
- Message sent to **all girls within range**
- Strategic positioning matters (talk to multiple girls at once)

### Chat Bubbles
- **Preview only** (~20 chars + "...")
- Visible for **3 seconds**
- Appears above player/girl who spoke

### Chat History
- Click on nearby girl to view **full conversation log**
- Shows all messages from all players + her responses

---

## Map Design

### Layout (Simple v1)
- **Square room** with visible walls on edges
- **Bar counter** (no collision)
- **Few tables** scattered (no collision)
- **Girl spawn points** (6 locations)
- **Player spawn area** (where players appear on game start)

### Collision
- **Walls only** - visible edges of the map
- Furniture has **no collision** (walk through tables)

### Data Format
```json
{
  "width": 800,
  "height": 600,
  "walls": [...],
  "furniture": [...],
  "girlSpawns": [...],
  "playerSpawnArea": { "x": 400, "y": 500, "radius": 50 }
}
```

---

## Game Flow

### Lobby → Game Transition
1. Host clicks "Start Game"
2. All players **teleport into the bar** at spawn area
3. Girls spawn at their positions and begin roaming
4. Game is live

### During Game
- Players walk around with WASD
- Press E near girl → chat input opens
- Enter message → broadcasts to nearby girls
- Girls batch responses every 5 seconds
- Rep updates are private (same as v1)
- See other players' chat bubbles
- Click girls to view chat history

### Victory
- Reach **100 rep** with any girl → **Q button** appears
- Press Q → **instant win** (no proposal message needed for now)
- **Declaration**: "[Player X] won!" displayed to all
- **10 seconds** countdown
- All players **teleport back to lobby**

---

## Socket Events (New/Modified)

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `player-move` | `{ x, y, direction }` | Position update |
| `send-message` | `{ text }` | Message to nearby girls (server determines targets) |
| `request-history` | `{ girlId }` | Request chat history for a girl |
| `propose` | `{ girlId }` | Attempt to win with a girl |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `game-state` | `{ players, girls }` | Full state on join/sync |
| `players-update` | `[{ id, x, y, dir }]` | Position updates (20/sec) |
| `girls-update` | `[{ id, x, y }]` | Girl positions |
| `chat-bubble` | `{ entityId, text, type }` | Show bubble above player/girl |
| `girl-typing` | `{ girlId }` | Girl is preparing response |
| `girl-response` | `{ girlId, text, scores }` | Girl's batched response |
| `rep-update` | `{ girlId, score, total }` | Private rep update |
| `chat-history` | `{ girlId, messages }` | Full history for a girl |
| `game-won` | `{ playerId, playerName }` | Someone won |

---

## UI Components

### Game Canvas (PixiJS)
- Bar background/floor
- Wall sprites
- Furniture sprites (decorative)
- Player sprites (with color, name tag, chat bubble)
- Girl sprites (with name tag, rep indicator, typing dots, chat bubble)

### React Overlays
- **Chat input** (appears when E pressed near girl)
- **Chat history panel** (appears when clicking girl)
- **Victory modal** (appears on win)
- **HUD** (maybe minimap later?)

---

## Detailed Task Breakdown

---

### Phase 2.1: Core Rendering & Local Movement

#### Task 2.1.1: PixiJS Setup
**Description**: Integrate PixiJS with existing React app

**Steps**:
1. Install `pixi.js` and `@pixi/react`
2. Create `GameCanvas` component with PixiJS Stage
3. Set up game loop with `useTick` hook
4. Configure canvas sizing (800x600 initial)

**Tests**:
```typescript
describe('GameCanvas', () => {
  it('renders PixiJS canvas element', () => {
    render(<GameCanvas />);
    expect(document.querySelector('canvas')).toBeInTheDocument();
  });

  it('has correct dimensions', () => {
    render(<GameCanvas />);
    const canvas = document.querySelector('canvas');
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
  });
});
```

---

#### Task 2.1.2: Map Rendering
**Description**: Render the bar background and walls

**Steps**:
1. Create JSON map file with dimensions and wall boundaries
2. Create `BarMap` PixiJS component
3. Render floor/background sprite
4. Render wall sprites at boundaries
5. Add placeholder furniture sprites (decorative)

**Tests**:
```typescript
describe('BarMap', () => {
  it('loads map data from JSON', () => {
    const map = loadMap();
    expect(map.width).toBe(800);
    expect(map.height).toBe(600);
    expect(map.walls).toBeDefined();
  });

  it('renders background sprite', () => {
    // Visual test via Playwright screenshot
  });
});
```

**Playwright**:
- Screenshot empty bar map
- Verify walls are visible at edges

---

#### Task 2.1.3: Player Sprite Rendering
**Description**: Render the local player with color and name tag

**Steps**:
1. Create `PlayerSprite` PixiJS component
2. Render character graphic with color tint
3. Add name tag text above sprite
4. Support 6 color variants
5. Add to lobby store: `playerColor` selection

**Tests**:
```typescript
describe('PlayerSprite', () => {
  it('renders with correct color tint', () => {
    const sprite = new PlayerSprite({ color: 'red', name: 'TestPlayer' });
    expect(sprite.tint).toBe(0xff0000);
  });

  it('displays name tag', () => {
    const sprite = new PlayerSprite({ color: 'red', name: 'TestPlayer' });
    expect(sprite.nameTag.text).toBe('TestPlayer');
  });

  it('supports all 6 colors', () => {
    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
    colors.forEach(color => {
      const sprite = new PlayerSprite({ color, name: 'Test' });
      expect(sprite.tint).toBeDefined();
    });
  });
});
```

---

#### Task 2.1.4: Local Player Movement
**Description**: WASD movement for local player (client-side only)

**Steps**:
1. Create `useKeyboard` hook for WASD input
2. Track pressed keys state
3. Create `usePlayerMovement` hook
4. Update player position based on keys each frame
5. Implement 8-directional movement
6. Set movement speed constant

**Tests**:
```typescript
describe('useKeyboard', () => {
  it('detects W key press', () => {
    const { result } = renderHook(() => useKeyboard());
    fireEvent.keyDown(document, { key: 'w' });
    expect(result.current.keys.w).toBe(true);
  });

  it('detects key release', () => {
    const { result } = renderHook(() => useKeyboard());
    fireEvent.keyDown(document, { key: 'w' });
    fireEvent.keyUp(document, { key: 'w' });
    expect(result.current.keys.w).toBe(false);
  });
});

describe('usePlayerMovement', () => {
  it('moves up when W pressed', () => {
    const position = { x: 100, y: 100 };
    const newPos = applyMovement(position, { w: true }, deltaTime);
    expect(newPos.y).toBeLessThan(100);
  });

  it('moves diagonally with W+D', () => {
    const position = { x: 100, y: 100 };
    const newPos = applyMovement(position, { w: true, d: true }, deltaTime);
    expect(newPos.y).toBeLessThan(100);
    expect(newPos.x).toBeGreaterThan(100);
  });

  it('normalizes diagonal speed', () => {
    const straightDist = calculateDistance({ w: true }, deltaTime);
    const diagDist = calculateDistance({ w: true, d: true }, deltaTime);
    expect(diagDist).toBeCloseTo(straightDist, 1);
  });
});
```

**Playwright**:
- Player moves smoothly with WASD
- Diagonal movement works
- Screenshot player at different positions

---

#### Task 2.1.5: Wall Collision
**Description**: Prevent player from walking through walls

**Steps**:
1. Create collision detection utility
2. Check player bounds against wall bounds
3. Prevent movement into walls
4. Allow sliding along walls

**Tests**:
```typescript
describe('collision', () => {
  it('detects collision with wall', () => {
    const player = { x: 10, y: 10, width: 32, height: 32 };
    const wall = { x: 0, y: 0, width: 20, height: 600 };
    expect(checkCollision(player, wall)).toBe(true);
  });

  it('allows movement away from wall', () => {
    const player = { x: 25, y: 100 };
    const walls = [{ x: 0, y: 0, width: 20, height: 600 }];
    const newPos = applyMovementWithCollision(player, { d: true }, walls);
    expect(newPos.x).toBeGreaterThan(25); // Can move right (away from wall)
  });

  it('prevents movement into wall', () => {
    const player = { x: 25, y: 100 };
    const walls = [{ x: 0, y: 0, width: 20, height: 600 }];
    const newPos = applyMovementWithCollision(player, { a: true }, walls);
    expect(newPos.x).toBe(25); // Cannot move left (into wall)
  });
});
```

---

### Phase 2.2: Multiplayer Movement

#### Task 2.2.1: Position Sync - Client Send
**Description**: Client sends position updates to server

**Steps**:
1. Create `player-move` socket event
2. Send position at fixed interval (~50ms)
3. Include x, y, direction in payload
4. Only send when position changes

**Tests**:
```typescript
describe('Position Sync - Client', () => {
  it('emits player-move event on movement', async () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => usePlayerMovement(socket));

    // Simulate movement
    act(() => result.current.move({ x: 100, y: 100 }));

    await waitFor(() => {
      expect(socket.emit).toHaveBeenCalledWith('player-move', {
        x: 100, y: 100, direction: expect.any(String)
      });
    });
  });

  it('throttles position updates to 50ms', async () => {
    const socket = createMockSocket();
    // Move rapidly, verify emit count is throttled
  });
});
```

---

#### Task 2.2.2: Position Sync - Server Broadcast
**Description**: Server receives and broadcasts all player positions

**Steps**:
1. Handle `player-move` event on server
2. Store player positions in game state
3. Broadcast `players-update` to all clients in lobby
4. Run broadcast loop at 20 ticks/sec

**Tests**:
```typescript
describe('Position Sync - Server', () => {
  it('updates player position on player-move', async () => {
    const { server, socket } = await setupTestServer();
    socket.emit('player-move', { x: 100, y: 200, direction: 'right' });

    await waitFor(() => {
      const player = server.getPlayer(socket.id);
      expect(player.x).toBe(100);
      expect(player.y).toBe(200);
    });
  });

  it('broadcasts positions to all players in lobby', async () => {
    const { socket1, socket2 } = await setupTwoPlayerLobby();

    socket1.emit('player-move', { x: 100, y: 100, direction: 'up' });

    await waitFor(() => {
      expect(socket2.received('players-update')).toContainEqual(
        expect.objectContaining({ id: socket1.id, x: 100, y: 100 })
      );
    });
  });

  it('broadcasts at ~20 ticks per second', async () => {
    // Measure broadcast frequency over 1 second
  });
});
```

---

#### Task 2.2.3: Remote Player Rendering
**Description**: Render other players and interpolate their movement

**Steps**:
1. Create game store for remote player positions
2. Render `PlayerSprite` for each remote player
3. Implement position interpolation between updates
4. Show player name tags and colors

**Tests**:
```typescript
describe('Remote Players', () => {
  it('renders all players in game state', () => {
    const players = [
      { id: '1', name: 'Player1', x: 100, y: 100, color: 'red' },
      { id: '2', name: 'Player2', x: 200, y: 200, color: 'blue' },
    ];
    render(<GameCanvas players={players} />);
    // Verify both sprites rendered
  });

  it('interpolates position smoothly', () => {
    const interpolator = new PositionInterpolator();
    interpolator.addUpdate({ x: 0, y: 0, timestamp: 0 });
    interpolator.addUpdate({ x: 100, y: 0, timestamp: 100 });

    const pos = interpolator.getPosition(50);
    expect(pos.x).toBeCloseTo(50);
  });

  it('handles late/out-of-order updates', () => {
    // Test interpolator handles network jitter
  });
});
```

**Playwright**:
- Open two browsers
- Move player in one, verify movement in other
- Screenshot both views

---

### Phase 2.3: Girl NPCs

#### Task 2.3.1: Girl Sprite Rendering
**Description**: Render the 6 girl NPCs with names

**Steps**:
1. Create `GirlSprite` PixiJS component
2. Render character sprite (placeholder initially)
3. Add name tag above sprite
4. Position girls at spawn points from map data

**Tests**:
```typescript
describe('GirlSprite', () => {
  it('renders with name tag', () => {
    const sprite = new GirlSprite({ name: 'Amber', x: 100, y: 100 });
    expect(sprite.nameTag.text).toBe('Amber');
  });

  it('renders all 6 girls from game state', () => {
    const girls = generateGirls(); // 6 girls
    render(<GameCanvas girls={girls} />);
    // Verify 6 girl sprites rendered
  });
});
```

---

#### Task 2.3.2: Girl Roaming AI
**Description**: Girls walk around the bar autonomously

**Steps**:
1. Create simple state machine (idle, walking)
2. Pick random destination within map bounds
3. Walk toward destination
4. Pause at destination, pick new one
5. Avoid walls (basic pathfinding)
6. Sync girl positions to clients

**Tests**:
```typescript
describe('Girl AI', () => {
  it('picks destination within map bounds', () => {
    const ai = new GirlAI({ mapWidth: 800, mapHeight: 600 });
    const dest = ai.pickDestination();
    expect(dest.x).toBeGreaterThan(0);
    expect(dest.x).toBeLessThan(800);
  });

  it('moves toward destination', () => {
    const girl = { x: 100, y: 100 };
    const destination = { x: 200, y: 100 };
    const newPos = moveToward(girl, destination, speed);
    expect(newPos.x).toBeGreaterThan(100);
  });

  it('stops at destination and idles', () => {
    const ai = new GirlAI();
    ai.setDestination({ x: 100, y: 100 });
    ai.position = { x: 100, y: 100 };
    ai.update();
    expect(ai.state).toBe('idle');
  });

  it('avoids walking through walls', () => {
    // Test pathfinding around obstacles
  });
});
```

---

#### Task 2.3.3: Proximity Detection
**Description**: Detect when player is near a girl

**Steps**:
1. Create proximity check utility
2. Calculate distance between player and each girl
3. Mark girls as "in range" when within threshold
4. Expose `nearbyGirls` in game store

**Tests**:
```typescript
describe('Proximity', () => {
  it('detects player within range', () => {
    const player = { x: 100, y: 100 };
    const girl = { x: 120, y: 100 };
    const range = 50;
    expect(isInRange(player, girl, range)).toBe(true);
  });

  it('detects player out of range', () => {
    const player = { x: 100, y: 100 };
    const girl = { x: 300, y: 100 };
    const range = 50;
    expect(isInRange(player, girl, range)).toBe(false);
  });

  it('returns all nearby girls', () => {
    const player = { x: 100, y: 100 };
    const girls = [
      { id: '1', x: 120, y: 100 }, // In range
      { id: '2', x: 300, y: 100 }, // Out of range
      { id: '3', x: 100, y: 130 }, // In range
    ];
    const nearby = getNearbyGirls(player, girls, 50);
    expect(nearby.map(g => g.id)).toEqual(['1', '3']);
  });
});
```

---

#### Task 2.3.4: Reputation Display
**Description**: Show player's rep with girl when nearby

**Steps**:
1. Add reputation text below girl name tag
2. Only show when player is in proximity
3. Update rep display on `rep-update` events
4. Color code: red (low), yellow (mid), green (high)

**Tests**:
```typescript
describe('Rep Display', () => {
  it('shows rep when player nearby', () => {
    const sprite = new GirlSprite({ name: 'Amber', playerRep: 25 });
    sprite.setPlayerNearby(true);
    expect(sprite.repText.visible).toBe(true);
    expect(sprite.repText.text).toBe('25');
  });

  it('hides rep when player far', () => {
    const sprite = new GirlSprite({ name: 'Amber', playerRep: 25 });
    sprite.setPlayerNearby(false);
    expect(sprite.repText.visible).toBe(false);
  });

  it('color codes reputation', () => {
    expect(getRepColor(10)).toBe('red');
    expect(getRepColor(50)).toBe('yellow');
    expect(getRepColor(90)).toBe('green');
  });
});
```

---

### Phase 2.4: New Chat System

#### Task 2.4.1: Chat Input Activation
**Description**: Press E near girl to open chat input

**Steps**:
1. Listen for E key press
2. Check if any girl is in proximity
3. Open chat input overlay (React component)
4. Focus input field
5. Disable player movement while input open
6. Press Escape or click outside to close

**Tests**:
```typescript
describe('Chat Input Activation', () => {
  it('opens input when E pressed near girl', () => {
    render(<Game nearbyGirls={[{ id: '1' }]} />);
    fireEvent.keyDown(document, { key: 'e' });
    expect(screen.getByTestId('chat-input')).toBeVisible();
  });

  it('does not open when no girl nearby', () => {
    render(<Game nearbyGirls={[]} />);
    fireEvent.keyDown(document, { key: 'e' });
    expect(screen.queryByTestId('chat-input')).not.toBeInTheDocument();
  });

  it('disables movement while input open', () => {
    const { result } = renderHook(() => usePlayerMovement());
    act(() => result.current.openChat());
    expect(result.current.movementEnabled).toBe(false);
  });

  it('closes on Escape', () => {
    render(<Game nearbyGirls={[{ id: '1' }]} />);
    fireEvent.keyDown(document, { key: 'e' });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('chat-input')).not.toBeInTheDocument();
  });
});
```

---

#### Task 2.4.2: Message Batching (Server)
**Description**: Server collects messages in 5-second windows

**Steps**:
1. Create message queue per girl
2. On first message, start 5-second timer
3. Collect all messages during window
4. After 5s, process batch and clear queue
5. Messages during processing go to next batch

**Tests**:
```typescript
describe('Message Batching', () => {
  it('collects messages in 5s window', async () => {
    const batcher = new MessageBatcher();

    batcher.addMessage({ girlId: '1', playerId: 'a', text: 'Hi' });
    batcher.addMessage({ girlId: '1', playerId: 'b', text: 'Hello' });

    const batch = await batcher.waitForBatch('1');
    expect(batch.messages).toHaveLength(2);
  });

  it('starts timer on first message', () => {
    const batcher = new MessageBatcher();
    expect(batcher.isTimerRunning('1')).toBe(false);

    batcher.addMessage({ girlId: '1', playerId: 'a', text: 'Hi' });
    expect(batcher.isTimerRunning('1')).toBe(true);
  });

  it('queues messages during processing', async () => {
    const batcher = new MessageBatcher();
    batcher.addMessage({ girlId: '1', playerId: 'a', text: 'First' });

    // Simulate processing started
    batcher.startProcessing('1');
    batcher.addMessage({ girlId: '1', playerId: 'b', text: 'Second' });

    expect(batcher.getQueuedMessages('1')).toHaveLength(1);
  });
});
```

---

#### Task 2.4.3: Batched LLM Response
**Description**: Generate single response addressing all messages

**Steps**:
1. Update LLM prompt to include all player messages
2. Girl responds in one message, may address multiple players
3. Return individual scores for each player's message
4. Handle case where girl ignores some players

**Tests**:
```typescript
describe('Batched LLM Response', () => {
  it('includes all messages in prompt', async () => {
    const messages = [
      { playerName: 'Alice', text: 'Hey beautiful' },
      { playerName: 'Bob', text: 'Nice place huh' },
    ];

    const prompt = buildBatchedPrompt(messages, girlContext);
    expect(prompt).toContain('Alice');
    expect(prompt).toContain('Bob');
    expect(prompt).toContain('Hey beautiful');
  });

  it('returns individual scores per player', async () => {
    const result = await generateBatchedResponse(messages, girlContext);
    expect(result.scores).toHaveProperty('Alice');
    expect(result.scores).toHaveProperty('Bob');
    expect(result.scores.Alice).toBeGreaterThanOrEqual(-5);
    expect(result.scores.Alice).toBeLessThanOrEqual(5);
  });

  it('generates single response text', async () => {
    const result = await generateBatchedResponse(messages, girlContext);
    expect(typeof result.response).toBe('string');
    expect(result.response.length).toBeGreaterThan(0);
  });
});
```

---

#### Task 2.4.4: Proximity-Based Targeting
**Description**: Server determines which girls receive message

**Steps**:
1. Client sends message with player position
2. Server checks which girls are in range
3. Message added to queue for ALL nearby girls
4. Each girl processes independently

**Tests**:
```typescript
describe('Proximity Targeting', () => {
  it('sends message to all girls in range', async () => {
    const server = await setupTestServer();
    const girls = [
      { id: '1', x: 100, y: 100 }, // Player at 120,100 - in range
      { id: '2', x: 300, y: 100 }, // Out of range
    ];
    server.setGirls(girls);

    const socket = await connectPlayer({ x: 120, y: 100 });
    socket.emit('send-message', { text: 'Hello' });

    await waitFor(() => {
      expect(server.getMessageQueue('1')).toHaveLength(1);
      expect(server.getMessageQueue('2')).toHaveLength(0);
    });
  });
});
```

---

#### Task 2.4.5: Chat Bubbles
**Description**: Show message preview above entities

**Steps**:
1. Create `ChatBubble` PixiJS component
2. Show truncated text (~20 chars)
3. Position above sprite
4. Auto-hide after 3 seconds
5. Animate fade in/out

**Tests**:
```typescript
describe('Chat Bubbles', () => {
  it('truncates long messages', () => {
    const bubble = new ChatBubble('This is a very long message that should be truncated');
    expect(bubble.text.length).toBeLessThanOrEqual(23); // 20 + "..."
  });

  it('shows full short messages', () => {
    const bubble = new ChatBubble('Hi there');
    expect(bubble.text).toBe('Hi there');
  });

  it('auto-hides after 3 seconds', async () => {
    const bubble = new ChatBubble('Hello');
    expect(bubble.visible).toBe(true);

    await wait(3000);
    expect(bubble.visible).toBe(false);
  });
});
```

---

#### Task 2.4.6: Chat History Panel
**Description**: Click girl to view full conversation

**Steps**:
1. Detect click on girl sprite (when nearby)
2. Request history from server (`request-history`)
3. Open React overlay with message list
4. Show all messages from all players + responses
5. Close on click outside or Escape

**Tests**:
```typescript
describe('Chat History', () => {
  it('opens on girl click when nearby', () => {
    render(<Game nearbyGirls={[{ id: '1', name: 'Amber' }]} />);
    fireEvent.click(screen.getByTestId('girl-1'));
    expect(screen.getByTestId('history-panel')).toBeVisible();
  });

  it('does not open when far from girl', () => {
    render(<Game nearbyGirls={[]} />);
    // Click on girl sprite that's far away
    expect(screen.queryByTestId('history-panel')).not.toBeInTheDocument();
  });

  it('displays all messages in order', () => {
    const history = [
      { sender: 'Alice', text: 'Hi', isPlayer: true },
      { sender: 'Amber', text: 'Hey!', isPlayer: false },
      { sender: 'Bob', text: 'Hello', isPlayer: true },
    ];
    render(<HistoryPanel messages={history} />);

    const messages = screen.getAllByTestId('history-message');
    expect(messages).toHaveLength(3);
  });
});
```

---

### Phase 2.5: Victory & Polish

#### Task 2.5.1: Win Button
**Description**: Show Q button when rep reaches 100

**Steps**:
1. Track rep per girl in game store
2. When any girl rep >= 100, show Q prompt
3. Position near that girl or as UI overlay
4. Press Q to trigger `propose` event

**Tests**:
```typescript
describe('Win Button', () => {
  it('appears when rep >= 100', () => {
    render(<Game reputation={{ girl1: 100 }} />);
    expect(screen.getByTestId('win-button')).toBeVisible();
  });

  it('hidden when rep < 100', () => {
    render(<Game reputation={{ girl1: 99 }} />);
    expect(screen.queryByTestId('win-button')).not.toBeInTheDocument();
  });

  it('triggers propose on Q press', () => {
    const onPropose = jest.fn();
    render(<Game reputation={{ girl1: 100 }} onPropose={onPropose} />);
    fireEvent.keyDown(document, { key: 'q' });
    expect(onPropose).toHaveBeenCalledWith('girl1');
  });
});
```

---

#### Task 2.5.2: Victory Declaration
**Description**: Show winner announcement to all players

**Steps**:
1. Server emits `game-won` on successful propose
2. All clients show victory modal
3. Display winner name
4. Start 10-second countdown

**Tests**:
```typescript
describe('Victory Declaration', () => {
  it('shows winner to all players', async () => {
    const { socket1, socket2 } = await setupTwoPlayerGame();

    // Player 1 wins
    socket1.emit('propose', { girlId: '1' });

    await waitFor(() => {
      expect(socket1.received('game-won')).toBeDefined();
      expect(socket2.received('game-won')).toBeDefined();
    });
  });

  it('displays winner name in modal', () => {
    render(<VictoryModal winner={{ name: 'Alice' }} />);
    expect(screen.getByText(/Alice won/i)).toBeVisible();
  });

  it('shows countdown timer', async () => {
    render(<VictoryModal winner={{ name: 'Alice' }} countdown={10} />);
    expect(screen.getByText('10')).toBeVisible();
  });
});
```

---

#### Task 2.5.3: Return to Lobby
**Description**: After countdown, teleport players back

**Steps**:
1. After 10 seconds, emit `return-to-lobby`
2. Reset game state
3. Navigate players to lobby screen
4. Keep lobby intact for another round

**Tests**:
```typescript
describe('Return to Lobby', () => {
  it('navigates to lobby after countdown', async () => {
    const { socket } = await setupWonGame();

    await wait(10000);

    expect(socket.received('return-to-lobby')).toBeDefined();
  });

  it('resets game state', async () => {
    const store = useGameStore.getState();
    store.returnToLobby();

    expect(store.players).toEqual([]);
    expect(store.girls).toEqual([]);
    expect(store.isGameActive).toBe(false);
  });

  it('preserves lobby for rematch', async () => {
    const { socket } = await setupWonGame();
    await wait(10000);

    const lobbyState = socket.received('return-to-lobby').lobby;
    expect(lobbyState.players.length).toBeGreaterThan(0);
  });
});
```

---

#### Task 2.5.4: Color Selection UI
**Description**: Let players pick their color in lobby

**Steps**:
1. Add color picker to lobby screen
2. Show 6 color options
3. Disable colors already taken by other players
4. Sync color selection to server
5. Display player colors in lobby player list

**Tests**:
```typescript
describe('Color Selection', () => {
  it('shows 6 color options', () => {
    render(<ColorPicker />);
    expect(screen.getAllByTestId('color-option')).toHaveLength(6);
  });

  it('disables taken colors', () => {
    const takenColors = ['red', 'blue'];
    render(<ColorPicker takenColors={takenColors} />);

    expect(screen.getByTestId('color-red')).toBeDisabled();
    expect(screen.getByTestId('color-blue')).toBeDisabled();
    expect(screen.getByTestId('color-green')).not.toBeDisabled();
  });

  it('syncs selection to server', async () => {
    const socket = createMockSocket();
    render(<ColorPicker socket={socket} />);

    fireEvent.click(screen.getByTestId('color-green'));

    expect(socket.emit).toHaveBeenCalledWith('select-color', 'green');
  });
});
```

---

### Phase 2.6: Integration Testing

#### Task 2.6.1: Full Game E2E Test
**Description**: Playwright test for complete game flow

**Tests**:
```typescript
// Playwright E2E
test('full game flow', async ({ browser }) => {
  const ctx1 = await browser.newContext();
  const ctx2 = await browser.newContext();
  const player1 = await ctx1.newPage();
  const player2 = await ctx2.newPage();

  // Create and join lobby
  await player1.goto('/');
  await player1.click('text=Create Lobby');
  await player1.fill('[name="username"]', 'Alice');
  await player1.click('text=Start');

  const code = await player1.textContent('[data-testid="lobby-code"]');

  await player2.goto('/');
  await player2.click('text=Join Lobby');
  await player2.fill('[name="code"]', code);
  await player2.fill('[name="username"]', 'Bob');
  await player2.click('text=Join');

  // Start game
  await player1.click('text=Start Game');

  // Verify both in game
  await expect(player1.locator('canvas')).toBeVisible();
  await expect(player2.locator('canvas')).toBeVisible();

  // Test movement sync
  await player1.keyboard.press('KeyD');
  await player1.waitForTimeout(500);
  // Verify player1 moved on player2's screen

  // Test chat
  await player1.keyboard.press('KeyE');
  await player1.fill('[data-testid="chat-input"]', 'Hello!');
  await player1.keyboard.press('Enter');

  // Verify chat bubble appears
  await expect(player1.locator('[data-testid="chat-bubble"]')).toBeVisible();
  await expect(player2.locator('[data-testid="chat-bubble"]')).toBeVisible();

  // Screenshots
  await player1.screenshot({ path: 'screenshots/game-player1.png' });
  await player2.screenshot({ path: 'screenshots/game-player2.png' });
});
```

---

## Asset Requirements

| Asset | Description | Priority |
|-------|-------------|----------|
| Bar background | Floor texture, ~800x600 | High |
| Wall tiles | Edge of map | High |
| Player sprite | Simple character, 6 color variants | High |
| Girl sprites | 6 unique characters | High |
| Furniture | Bar counter, tables (decorative) | Medium |
| Chat bubble | Speech bubble graphic | Medium |
| Typing indicator | Animated dots | Low |

---

## Open Questions / Future Enhancements

- Mobile support (virtual joystick)
- Emotes/reactions
- Girl mood indicators on sprite
- Background music/ambient sounds
- More complex map layouts
- Spectator mode
