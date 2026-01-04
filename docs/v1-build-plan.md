# Build Overview — Rizz Royale

## Development Phases

This document breaks down the entire build into phases, tasks, and test specifications. Follow sequentially unless dependencies allow parallelization.

---

## Technical Decisions

| Area | Decision |
|------|----------|
| **State Management** | Zustand (simple, works well with Socket.io) |
| **LLM Model** | Claude Sonnet |
| **LLM Calls** | Two separate calls (response generation, then scoring) |
| **Streaming** | No (not needed initially) |
| **Girl Visuals** | Names/cards initially (UI polish later) |
| **Hosting** | Vercel (client) + Railway (server) |
| **Message Cooldown** | 5 seconds per player (global, not per-girl) |

---

## Phase 0: Project Setup

### Task 0.1: Initialize Monorepo Structure
**Description**: Set up the project with client, server, and shared packages.

**Steps**:
1. Initialize root package.json with workspaces
2. Create Vite + React + TypeScript client
3. Create Node.js + TypeScript server
4. Create shared types package
5. Configure TailwindCSS
6. Set up ESLint + Prettier

**Tests**:
- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts both client and server
- [ ] TypeScript compilation succeeds with strict mode

**Playwright Verification**:
- Navigate to `localhost:5173`, verify React app loads
- Take screenshot of initial state

---

### Task 0.2: Configure Testing Infrastructure
**Description**: Set up Vitest for unit/integration tests and Playwright for E2E.

**Steps**:
1. Install and configure Vitest for client and server
2. Install and configure Playwright
3. Create test utilities and fixtures
4. Set up test scripts in package.json

**Tests**:
- [ ] Sample unit test passes in client
- [ ] Sample unit test passes in server
- [ ] Sample Playwright test navigates and screenshots

---

## Phase 1: Core Networking

### Task 1.1: Socket.io Server Setup
**Description**: Create the WebSocket server with room (lobby) support.

**Steps**:
1. Initialize Express + Socket.io server
2. Implement connection/disconnection handling
3. Implement room creation and joining
4. Generate unique lobby codes (6 alphanumeric characters)

**Tests**:
```typescript
// server/tests/socket.test.ts
describe('Socket Server', () => {
  it('accepts connections', async () => {
    const socket = await connectTestSocket();
    expect(socket.connected).toBe(true);
  });
  
  it('creates lobby and returns code', async () => {
    const socket = await connectTestSocket();
    const response = await emitAndWait(socket, 'create-lobby', { username: 'Player1' });
    expect(response.lobbyCode).toMatch(/^[A-Z0-9]{6}$/);
  });
  
  it('allows joining existing lobby', async () => {
    const host = await connectTestSocket();
    const { lobbyCode } = await emitAndWait(host, 'create-lobby', { username: 'Host' });
    
    const player = await connectTestSocket();
    const response = await emitAndWait(player, 'join-lobby', { 
      lobbyCode, 
      username: 'Player2' 
    });
    expect(response.success).toBe(true);
    expect(response.players).toHaveLength(2);
  });
  
  it('rejects invalid lobby code', async () => {
    const socket = await connectTestSocket();
    const response = await emitAndWait(socket, 'join-lobby', { 
      lobbyCode: 'XXXXXX', 
      username: 'Player' 
    });
    expect(response.error).toBe('Lobby not found');
  });
  
  it('enforces 6 player maximum', async () => {
    // Create lobby with 6 players, 7th should be rejected
  });
});
```

---

### Task 1.2: Client Socket Integration
**Description**: Create React hooks and state management for socket communication.

**Steps**:
1. Create `useSocket` hook for connection management
2. Create Zustand store for lobby state
3. Implement socket event listeners
4. Handle reconnection logic

**Tests**:
```typescript
// client/src/hooks/useSocket.test.ts
describe('useSocket', () => {
  it('connects to server on mount', async () => {
    const { result } = renderHook(() => useSocket());
    await waitFor(() => expect(result.current.isConnected).toBe(true));
  });
  
  it('exposes lobby creation method', async () => {
    const { result } = renderHook(() => useSocket());
    const lobby = await result.current.createLobby('TestUser');
    expect(lobby.code).toBeDefined();
  });
});
```

**Playwright Verification**:
- Open app, verify "connected" indicator (if shown)
- Create lobby, verify code displays

---

## Phase 2: Lobby System

### Task 2.1: Create Lobby UI
**Description**: Build the home screen and lobby creation flow.

**Steps**:
1. Create Home page with "Create Lobby" and "Join Lobby" options
2. Create username input modal
3. Create lobby waiting room showing players and code
4. Style with TailwindCSS (bar/nightclub aesthetic)

**Tests**:
```typescript
// Playwright E2E
test('lobby creation flow', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Create Lobby');
  await page.fill('input[name="username"]', 'TestHost');
  await page.click('text=Start');
  
  // Verify lobby code displays
  const lobbyCode = await page.textContent('[data-testid="lobby-code"]');
  expect(lobbyCode).toMatch(/^[A-Z0-9]{6}$/);
  
  // Screenshot the waiting room
  await page.screenshot({ path: 'screenshots/lobby-waiting.png' });
});
```

---

### Task 2.2: Join Lobby UI
**Description**: Build the lobby joining flow.

**Steps**:
1. Create join lobby form (code + username)
2. Display error states (invalid code, lobby full)
3. Transition to waiting room on success
4. Show all players in waiting room in real-time

**Tests**:
```typescript
// Playwright E2E - Multi-browser context
test('multiplayer lobby join', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const playerContext = await browser.newContext();
  
  const hostPage = await hostContext.newPage();
  const playerPage = await playerContext.newPage();
  
  // Host creates lobby
  await hostPage.goto('/');
  await hostPage.click('text=Create Lobby');
  await hostPage.fill('input[name="username"]', 'Host');
  await hostPage.click('text=Start');
  const lobbyCode = await hostPage.textContent('[data-testid="lobby-code"]');
  
  // Player joins
  await playerPage.goto('/');
  await playerPage.click('text=Join Lobby');
  await playerPage.fill('input[name="code"]', lobbyCode);
  await playerPage.fill('input[name="username"]', 'Player2');
  await playerPage.click('text=Join');
  
  // Verify both see each other
  await expect(hostPage.locator('text=Player2')).toBeVisible();
  await expect(playerPage.locator('text=Host')).toBeVisible();
  
  await hostPage.screenshot({ path: 'screenshots/lobby-2players-host.png' });
  await playerPage.screenshot({ path: 'screenshots/lobby-2players-guest.png' });
});
```

---

### Task 2.3: Game Start Flow
**Description**: Allow host to start the game when ready.

**Steps**:
1. Add "Start Game" button (host only, requires 2+ players)
2. Randomize archetype assignments on game start
3. Broadcast game start to all players
4. Initialize all players with +5 rep for each girl

**Tests**:
```typescript
describe('Game Start', () => {
  it('only host can start game', async () => {
    // Verify non-hosts don't see start button
  });
  
  it('requires minimum 2 players', async () => {
    // Host alone cannot start
  });
  
  it('randomizes archetypes differently each game', async () => {
    // Start multiple games, verify archetype shuffling
  });
  
  it('initializes all players with +5 rep per girl', async () => {
    // Verify initial state
  });
});
```

---

## Phase 3: Game Core

### Task 3.1: Bar Scene UI
**Description**: Create the main game interface showing the bar with 6 girls.

**Steps**:
1. Create bar background/scene
2. Display 6 clickable girl avatars/cards
3. Show girl names (randomized each game)
4. Clicking a girl opens her chat panel
5. Display player's reputation with each girl (private)

**Tests**:
```typescript
// Playwright E2E
test('bar scene displays correctly', async ({ page }) => {
  // ... setup and start game
  
  // Verify 6 girls displayed
  const girls = await page.locator('[data-testid="girl-card"]').count();
  expect(girls).toBe(6);
  
  // Verify rep indicators show +5
  const reps = await page.locator('[data-testid="rep-indicator"]').allTextContents();
  expect(reps.every(r => r === '+5')).toBe(true);
  
  await page.screenshot({ path: 'screenshots/bar-scene.png' });
});

test('clicking girl opens chat', async ({ page }) => {
  // ... setup
  await page.click('[data-testid="girl-card"]:first-child');
  await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();
});
```

---

### Task 3.2: Chat Interface
**Description**: Build the real-time chat component for talking to girls.

**Steps**:
1. Create chat panel component
2. Display message history (all players' messages visible)
3. Message input with send button
4. Show sender name on each message
5. Implement 5-second cooldown after sending
6. Display cooldown timer

**Tests**:
```typescript
// Component tests
describe('ChatPanel', () => {
  it('displays all messages from all players', () => {
    const messages = [
      { sender: 'Player1', text: 'Hey', isPlayer: true },
      { sender: 'Amber', text: 'Hi there!', isPlayer: false },
      { sender: 'Player2', text: 'What\'s up', isPlayer: true },
    ];
    render(<ChatPanel messages={messages} />);
    expect(screen.getByText('Hey')).toBeVisible();
    expect(screen.getByText('Hi there!')).toBeVisible();
    expect(screen.getByText("What's up")).toBeVisible();
  });
  
  it('disables input during cooldown', () => {
    render(<ChatPanel cooldownRemaining={3} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByText('3s')).toBeVisible();
  });
});

// Playwright E2E
test('message cooldown enforcement', async ({ page }) => {
  // ... setup
  await page.fill('[data-testid="chat-input"]', 'Hello!');
  await page.click('[data-testid="send-button"]');
  
  // Input should be disabled
  await expect(page.locator('[data-testid="chat-input"]')).toBeDisabled();
  
  // Wait for cooldown
  await page.waitForTimeout(5000);
  await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled();
});
```

---

### Task 3.3: Socket Events for Chat
**Description**: Implement real-time message broadcasting.

**Steps**:
1. `send-message` event (player → server → LLM → broadcast)
2. `new-message` event (server → all clients in lobby)
3. `rep-update` event (server → individual client, private)
4. Handle message ordering and timestamps

**Tests**:
```typescript
describe('Chat Socket Events', () => {
  it('broadcasts player messages to all in lobby', async () => {
    // Player1 sends message, Player2 receives it
  });
  
  it('sends rep update only to message author', async () => {
    // Player1 sends message, only Player1 gets rep update
    // Player2 should NOT receive Player1's rep change
  });
  
  it('includes girl response in broadcast', async () => {
    // Message broadcast includes the AI response
  });
});
```

---

## Phase 4: LLM Integration

### Task 4.1: Anthropic Client Setup
**Description**: Create the LLM service for generating girl responses.

**Steps**:
1. Initialize Anthropic client with API key (env var)
2. Create response generation function
3. Create scoring function
4. Implement response caching (optional, for cost)
5. Handle rate limiting and errors gracefully

**Tests**:
```typescript
describe('LLM Service', () => {
  it('generates response under 2 sentences', async () => {
    const response = await generateGirlResponse({
      girlName: 'Amber',
      archetype: 'CONFIDENT',
      playerName: 'TestPlayer',
      reputation: 50,
      message: 'Hey there'
    });
    
    const sentences = response.split(/[.!?]+/).filter(Boolean);
    expect(sentences.length).toBeLessThanOrEqual(2);
  });
  
  it('returns score between -5 and 5', async () => {
    const { score } = await scoreMessage({
      archetype: 'CONFIDENT',
      message: 'Um, hi, sorry to bother you...',
      response: 'Uh, okay?'
    });
    
    expect(score).toBeGreaterThanOrEqual(-5);
    expect(score).toBeLessThanOrEqual(5);
  });
  
  it('adapts response based on reputation', async () => {
    const lowRepResponse = await generateGirlResponse({
      // ... reputation: 10
    });
    const highRepResponse = await generateGirlResponse({
      // ... reputation: 90
    });
    // Qualitative check or sentiment analysis
  });
});
```

---

### Task 4.2: Design Archetype Prompt Templates
**Description**: Design and implement prompts for each of the 6 archetypes from scratch.

**Archetypes to Design**:
1. **CONFIDENT** - Responds well to directness, banter, not being put on a pedestal
2. **SOFTIE** - Responds well to gentleness, sincerity, emotional vulnerability
3. **JOKER** - Responds well to humor, wit, playfulness, not taking things seriously
4. **CHALLENGE** - Responds well to being challenged, push-pull, not being a pushover
5. **INTELLECTUAL** - Responds well to depth, interesting topics, curiosity
6. **ROMANTIC** - Responds well to charm, compliments, classic romance

**Steps**:
1. Create prompt template system with shared structure
2. Design system prompts for each archetype that define personality and preferences
3. Design scoring prompt that evaluates message alignment with archetype
4. Include reputation context in prompts (low rep = colder, high rep = warmer)
5. Test each archetype responds correctly to good/bad messages

**Tests**:
```typescript
describe('Archetype Responses', () => {
  const archetypes = ['CONFIDENT', 'SOFTIE', 'JOKER', 'CHALLENGE', 'INTELLECTUAL', 'ROMANTIC'];
  
  archetypes.forEach(archetype => {
    describe(archetype, () => {
      it('gives positive score to aligned message', async () => {
        const goodMessage = getGoodMessageForArchetype(archetype);
        const { score } = await scoreMessage({ archetype, message: goodMessage });
        expect(score).toBeGreaterThan(0);
      });
      
      it('gives negative score to misaligned message', async () => {
        const badMessage = getBadMessageForArchetype(archetype);
        const { score } = await scoreMessage({ archetype, message: badMessage });
        expect(score).toBeLessThan(0);
      });
    });
  });
});
```

---

### Task 4.3: Message Processing Pipeline
**Description**: Wire together the full message → response → score flow.

**Steps**:
1. Receive message from socket
2. Generate girl response via LLM
3. Score the interaction via LLM
4. Update player reputation (clamped to -50 to 100)
5. Broadcast message + response to all
6. Send private rep update to author
7. Check for win condition (rep >= 100)

**Tests**:
```typescript
describe('Message Pipeline', () => {
  it('completes full flow under 3 seconds', async () => {
    const start = Date.now();
    await processMessage({ /* ... */ });
    expect(Date.now() - start).toBeLessThan(3000);
  });
  
  it('clamps reputation to valid range', async () => {
    // Player at -45 gets -10 score, should clamp to -50
    // Player at 98 gets +5 score, should cap at 100 (triggers win check)
  });
  
  it('triggers win check at 100 rep', async () => {
    // Mock player reaching 100, verify win flow triggered
  });
});
```

---

## Phase 5: Win Condition

### Task 5.1: "Ask to Go Home" UI
**Description**: Add the proposal button and final interaction.

**Steps**:
1. Show "Ask to go home" button when rep >= 100
2. Button opens special proposal input
3. Send proposal to LLM for final judgment
4. Display accept/reject response

**Tests**:
```typescript
// Playwright E2E
test('proposal button appears at 100 rep', async ({ page }) => {
  // ... mock/setup player at 100 rep
  await expect(page.locator('[data-testid="propose-button"]')).toBeVisible();
});

test('successful proposal ends game', async ({ page }) => {
  // ... trigger win
  await expect(page.locator('[data-testid="victory-screen"]')).toBeVisible();
});
```

---

### Task 5.2: Game End Flow
**Description**: Handle game completion for all players.

**Steps**:
1. Broadcast game end to all players
2. Display winner announcement screen
3. Show which girl was won and by whom
4. "Return to Home" button for all players
5. Clean up lobby on server

**Tests**:
```typescript
// Playwright E2E - Multi-context
test('all players see game end screen', async ({ browser }) => {
  // Setup 3 players
  // Player1 wins
  // Verify all 3 see victory screen with Player1 as winner
});

test('lobby is cleaned up after game end', async () => {
  // Win game, then try to rejoin with same code
  // Should fail - lobby no longer exists
});
```

---

### Task 5.3: Rejection Handling
**Description**: Handle fumbled proposals.

**Steps**:
1. If proposal rejected, player stays in game
2. Reputation drops (maybe -10 for embarrassment?)
3. Player can try again or switch to another girl
4. Other players are NOT notified of failed proposal

**Tests**:
```typescript
describe('Proposal Rejection', () => {
  it('deducts reputation on rejection', async () => {
    // Player at 100 fumbles, drops to 90
  });
  
  it('keeps player in game after rejection', async () => {
    // Player can continue chatting
  });
  
  it('does not broadcast rejection to others', async () => {
    // Other players should not see the failed attempt
  });
});
```

---

## Phase 6: Polish & Edge Cases

### Task 6.1: Player Disconnect Handling
**Description**: Handle players leaving mid-game.

**Steps**:
1. Remove player from lobby on disconnect
2. Notify remaining players
3. If host leaves, assign new host or end lobby
4. If all players leave, clean up lobby

**Tests**:
```typescript
describe('Disconnect Handling', () => {
  it('removes player from lobby', async () => {});
  it('notifies remaining players', async () => {});
  it('assigns new host if host leaves', async () => {});
  it('cleans up empty lobbies', async () => {});
});
```

---

### Task 6.2: UI Polish
**Description**: Visual improvements and animations.

**Steps**:
1. Add message animations (slide in)
2. Rep change indicators (+3 / -2 floating text)
3. Girl "typing" indicator before response
4. Sound effects (optional)
5. Mobile responsiveness

**Playwright Verification**:
- Screenshot all major states
- Test on mobile viewport sizes
- Verify animations don't break functionality

---

### Task 6.3: Error Handling & Edge Cases
**Description**: Graceful error handling throughout.

**Steps**:
1. LLM API failures (retry, fallback response)
2. Socket disconnection recovery
3. Invalid game states
4. Concurrent message handling

**Tests**:
```typescript
describe('Error Handling', () => {
  it('handles LLM timeout gracefully', async () => {
    // Mock timeout, verify fallback behavior
  });
  
  it('reconnects socket automatically', async () => {
    // Disconnect, verify reconnection
  });
  
  it('handles rapid messages correctly', async () => {
    // Send 3 messages rapidly, verify cooldown enforcement
  });
});
```

---

## Test Coverage Requirements

Before considering the project complete:

- [ ] All unit tests pass
- [ ] All integration tests pass  
- [ ] All Playwright E2E tests pass
- [ ] Multi-player scenarios tested with 2, 4, and 6 players
- [ ] All 6 archetypes tested for correct positive/negative responses
- [ ] Win flow tested end-to-end
- [ ] Disconnect scenarios tested
- [ ] Mobile viewport tested

---

## Playwright MCP Test Scenarios

These are the key visual verification points for Claude Code to check using Playwright:

1. **Home Screen** - Both buttons visible, styled correctly
2. **Create Lobby Modal** - Username input, lobby code display
3. **Waiting Room** - Player list updates in real-time
4. **Bar Scene** - 6 girls displayed, rep indicators visible
5. **Chat Panel** - Messages appear, cooldown indicator works
6. **Rep Changes** - Visual feedback on score changes
7. **Proposal Flow** - Button appears at 100, submission works
8. **Victory Screen** - Winner displayed, return button works
9. **Multi-Player Sync** - All players see same messages
10. **Mobile View** - Layout works on small screens

---

## Recommended Build Order

1. Phase 0 (setup) - Get development environment running
2. Phase 1.1, 1.2 - Core networking first
3. Phase 2.1, 2.2, 2.3 - Lobby system (playable with placeholder game)
4. Phase 3.1, 3.2, 3.3 - Game UI without AI (hardcoded responses for testing)
5. Phase 4.1, 4.2, 4.3 - LLM integration (game becomes real)
6. Phase 5.1, 5.2, 5.3 - Win condition (game becomes completable)
7. Phase 6 - Polish and edge cases

This order allows for continuous testing and playability throughout development.