# Claude Code Configuration — Rizz Royale

> **📋 See [docs/v1-build-plan.md](./docs/v1-build-plan.md) for the original build plan.**
> **📋 See [docs/phase-2-game-world.md](./docs/phase-2-game-world.md) for the 2D game world implementation (current phase).**

## Project Overview

A multiplayer browser-based dating simulator where 2-6 players compete in a shared lobby to be the first to successfully "take home" one of 6 AI-powered girls at a virtual bar. Each girl has a randomized personality archetype that responds positively or negatively to different communication styles. Players must deduce each girl's preferences through observation and experimentation.

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express + Socket.io (real-time multiplayer)
- **LLM**: Anthropic Claude API (for girl responses and scoring)
- **Testing**: Vitest (unit/integration) + Playwright (E2E/frontend verification)
- **State Management**: Zustand (lightweight, good for real-time updates)

## Claude Code Best Practices

### 1. Test-First Development
Before implementing ANY feature:
1. Write failing tests that define expected behavior
2. Implement the minimum code to pass tests
3. Refactor if needed while keeping tests green

### 2. Commit Discipline
- **NEVER** commit without explicit human confirmation
- After completing a task, present the changes and ask: "Task complete. Ready to commit?"
- Use conventional commit messages: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`

### 3. Playwright MCP for Frontend Verification
Use the Playwright MCP server to visually verify frontend behavior:
- Take screenshots at key interaction points
- Verify UI state matches expected game state
- Test real-time updates across multiple browser contexts (simulating multiple players)

To use Playwright MCP:
```
# The MCP server allows Claude Code to:
- Navigate to URLs
- Click elements
- Fill forms
- Take screenshots
- Assert visual state
```

### 4. Task Completion Checklist
Before marking any task complete:
- [ ] All related tests pass
- [ ] No TypeScript/linting errors
- [ ] Manual verification via Playwright MCP (for UI tasks)
- [ ] Human has reviewed and approved

### 5. Code Style
- Functional components with hooks (no classes)
- Named exports for components, default exports for pages
- Colocate tests with source files (`Component.tsx` + `Component.test.tsx`)
- Use TypeScript strict mode
- Prefer explicit types over inference for function signatures

---

## Game Rules Reference

### Lobby
- 2-6 players per lobby
- Host creates lobby → gets shareable code → others join with code
- Players enter username on join
- No persistence after game ends

### Gameplay
- 6 girls at the bar, each with a randomized personality archetype
- All players see a shared chat per girl (messages + responses visible to all)
- Reputation scores are private (only you see your own rep with each girl)
- Starting reputation: +5 with all girls
- Reputation range: -50 to 100
- Points per message: -5 to +5 (based on LLM scoring)
- Message cooldown: 5 seconds per player

### Win Condition
- Reach 100 reputation with any girl
- Trigger "ask to go home" action
- Girl can still reject if the final message fumbles
- First successful "take home" ends the game for everyone

### Girl Response Rules
- Max 2 sentences per response (preferably 1)
- Playful, flirty tone
- Aware of player's current reputation (smitten at high rep, cold at low rep)
- Aware that multiple players may be chatting simultaneously

---

## The 6 Girl Archetypes

Each lobby randomizes which archetype is assigned to which girl. Players must deduce the mapping.

### 1. The Confident Queen (responds to: CONFIDENCE/COCKINESS)
- **Likes**: Bold statements, self-assured energy, players who aren't afraid to be direct
- **Dislikes**: Hesitation, self-deprecation, asking for permission
- **Personality**: She's used to attention and respects someone who can match her energy
- **Example positive**: "I don't usually talk to girls here, but you looked like you could keep up"
- **Example negative**: "Hey, um, I hope it's okay if I talk to you..."

### 2. The Softie (responds to: VULNERABILITY/EMOTIONAL OPENNESS)
- **Likes**: Genuine emotion, sharing feelings, asking about her feelings, authenticity
- **Dislikes**: Bravado, surface-level chat, deflecting with humor when things get real
- **Personality**: She's tired of guys putting on acts, wants to connect for real
- **Example positive**: "Honestly? I'm a little nervous. Bars aren't usually my scene"
- **Example negative**: "Pfft, feelings? I don't have those, I'm too cool"

### 3. The Joker (responds to: HUMOR/WIT)
- **Likes**: Clever wordplay, absurdist humor, playful banter, not taking things seriously
- **Dislikes**: Being too earnest, boring conversation, trying too hard to be funny
- **Personality**: Life's too short to be serious. Make her laugh or move on
- **Example positive**: "Is your name WiFi? Because I'm feeling a connection... to the bartender, one more drink please"
- **Example negative**: "You have beautiful eyes. Like two beautiful eye-shaped things"

### 4. The Challenge (responds to: NEGGING/PUSH-PULL)
- **Likes**: Light teasing, playful challenges, not being put on a pedestal, confidence
- **Dislikes**: Simping, excessive compliments, agreeing with everything she says
- **Personality**: She wants someone who won't just worship her, keeps things interesting
- **Example positive**: "That's a bold drink choice. Let me guess, you also think pineapple belongs on pizza"
- **Example negative**: "Wow you're so beautiful, the most beautiful person here, I'm so lucky you're talking to me"

### 5. The Intellectual (responds to: SMART CONVERSATION)
- **Likes**: Interesting observations, asking thoughtful questions, wit over looks-based comments
- **Dislikes**: Small talk, leading with appearance compliments, anti-intellectual vibes
- **Personality**: She came to the bar hoping for interesting conversation, not pickup lines
- **Example positive**: "I was just reading about how bars like this are basically modern-day Roman forums. What's your take?"
- **Example negative**: "Damn girl, you're hot. Wanna get out of here?"

### 6. The Romantic (responds to: COMPLIMENTS/ROMANCE)
- **Likes**: Genuine compliments, romantic gestures, chivalry, making her feel special
- **Dislikes**: Cynicism about love, being too casual, treating romance as a game
- **Personality**: She believes in the fairy tale and wants someone who does too
- **Example positive**: "I know this sounds forward, but I saw you from across the room and had to come say hello"
- **Example negative**: "So like, you come here often or whatever?"

---

## LLM Prompt Templates

### Girl Response Prompt
```
You are {girl_name}, a woman at a bar with the following personality:
{archetype_description}

Current reputation with this player ({player_name}): {reputation}/100
- Below 20: You're cold, dismissive, considering ignoring them
- 20-50: You're neutral, giving them a chance but guarded  
- 50-80: You're warming up, engaged, flirty
- Above 80: You're smitten, very interested, playful

Other players are also chatting with you simultaneously. You're aware of this social dynamic.

The player just said: "{message}"

Respond in 1-2 sentences MAX. Be playful. Stay in character based on your archetype.
```

### Scoring Prompt
```
You are evaluating a message sent to a girl with this personality archetype:
{archetype_description}

The player ({player_name}) with current reputation {reputation} said:
"{message}"

The girl responded:
"{response}"

Score this interaction from -5 to +5:
- +5: Perfectly aligned with what this archetype loves
- +3: Good, she liked it
- +1: Okay, slightly positive
- 0: Neutral, neither good nor bad
- -1: Slightly off, she didn't love it
- -3: Bad, goes against her preferences
- -5: Terrible, exactly what this archetype hates

Return ONLY a JSON object: {"score": <number>, "reason": "<brief explanation>"}
```

### Final Proposal Prompt
```
You are {girl_name}. A player ({player_name}) with {reputation} reputation is asking you to leave the bar with them.

Their final message: "{message}"

Your personality: {archetype_description}

If the message is reasonably charming and fits your personality, accept (you're already interested at this rep level).
If they completely fumble it (rude, off-putting, totally wrong vibe), reject.

Respond in 1-2 sentences with your decision. Be playful either way.
Return your response AND a JSON object: {"accepted": true/false}
```

---

## File Structure

```
rizz-royale/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Lobby/
│   │   │   ├── Bar/
│   │   │   ├── Chat/
│   │   │   ├── Girls/
│   │   │   └── UI/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── types/
│   │   ├── utils/
│   │   └── App.tsx
│   ├── tests/
│   │   └── e2e/
│   └── package.json
├── server/
│   ├── src/
│   │   ├── game/
│   │   ├── llm/
│   │   ├── socket/
│   │   └── index.ts
│   ├── tests/
│   └── package.json
├── shared/
│   └── types/
├── claude.md
├── overview.md
└── README.md
```