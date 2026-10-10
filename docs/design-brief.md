# Design brief: Multiplayer Sudoku

**Live app:** https://sudoku.hrustinszki.com · **Stack:** React + Tailwind CSS v4, single-page app

## 1. What we need from you

The game is fully built and works, but its UI is functional defaults: Tailwind slate/sky colours, system font, plain cards. We want a cohesive, polished visual design for every screen and state listed below, which we will then implement in React + Tailwind.

Deliverables, in priority order:

1. **Visual direction.** Colour tokens (light and dark), type scale, spacing, radii, elevation, iconography and motion principles.
2. **The Room screen** at 360 px (phone) and 1280 px (desktop), light and dark, in co-op and race variants. This is where people spend 95% of their time.
3. **The board cell state sheet:** every cell state, alone and combined (see §5).
4. **The other screens:** Home, Race lobby and countdown, Results, Daily, Leaderboard, and the error/empty states.
5. **Motion specs** for the moments listed in §7.

Design for what exists. Section 9 lists the constraints that must hold; everything visual is open.

## 2. The product in one paragraph

An online multiplayer sudoku with no sign-up. You get a guest nickname (e.g. "Otter-4821"), create a room and share a link, and friends join instantly. **Co-op:** everyone fills one shared board in real time and sees each other's selected cell. **Race:** everyone gets the same puzzle on their own board and sees only opponents' progress, never their digits. There's also a **daily puzzle** (one medium puzzle per UTC day) and **leaderboards**. Optional GitHub/Google sign-in keeps your history across devices. It installs as a PWA.

**Audience:** casual-to-keen puzzle players playing with friends, family or colleagues, often on a phone and often over a video call.
**Tone:** calm and focused while solving, warm and celebratory at the end, lightly playful. Sudoku is concentration, so the board must stay the quietest, clearest thing on screen even with 8 people in the room.

## 3. Core rules the design must communicate

- **Difficulties:** easy, medium, hard, expert.
- **Correct digits lock** and can't be erased. **Wrong digits are rejected:** the cell flashes red, the digit disappears, and a mistake is counted.
- **Score** = finish time + 10 s per mistake + 30 s per hint. Lower is better.
- **Hint:** reveals the selected empty cell, costing 30 s.
- **Notes (pencil marks):** up to 9 small digits per empty cell. They toggle on and off, can be cleared and can be undone. In co-op notes are shared; in race they are private to the player.
- **Players:** max 8 per room, each with an automatically assigned colour (see §6).
- **Room code:** 6 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, e.g. `K7QM4R`. It's shared as a link `/r/K7QM4R`.
- **Nicknames:** 1–20 characters, any script or emoji, e.g. "Zoë", "数独プレイヤー", "🐙".

## 4. Screens and their states

### Global header (every page)
Contains: wordmark "Sudoku", nav links **Daily** and **Leaderboard**, an **Install app** button (only when the browser offers it), a **sound toggle** (🔊/🔇), and the player's nickname, truncated.
It must fit 360 px. It is currently cramped.

### Home `/`
Stacked cards, single column:

1. **Your nickname:** text field + Save. Shows a "Saved" message or a validation error ("Please pick another name", "At most 20 characters").
2. **Account** (only when sign-in is configured):
   - Signed out: "Sign in to keep your history across devices…" with **Sign in with GitHub** and **Sign in with Google** buttons.
   - Signed in: "Signed in as you@example.com" + **Sign out**.
3. **New game:**
   - Mode: **Co-op** or **Race**, with a one-line hint under the choice.
   - Difficulty: 4 options.
   - **Cloudflare Turnstile widget:** a third-party bot check, ~300×65 px. It can't be restyled beyond a light/dark theme; place it gracefully.
   - **Create room** button: disabled until Turnstile passes. States: "Creating…" and an error message.
4. **Join a room:** 6-character code field (monospace, auto-uppercase) + **Join**.
5. **Your recent games:** up to 20 rows: mode · difficulty · rank (race) · score or "abandoned" · date. Hidden when empty.

### Room `/r/:code` (the main screen)
Desktop: board column (~512 px max) plus a sidebar. Phone: everything stacked.

- **Top bar:**
  - Room code (large, monospace) and a **Copy invite link** button that changes to "✓ Copied".
  - Mode/difficulty chip, e.g. "Co-op · easy".
  - **Timer:** ⏱ 4:07; counts up and stops at the end.
  - Counters: **Mistakes: 2** (race: "Your mistakes") and **Hints: 1**, the latter shown only when non-zero.
- **Connection banner** (amber): "Connecting…", "Reconnecting…", or "This room is open in another tab. Reload to play here." The last one is terminal.
- **Error toast** (red, auto-dismisses after 3 s), e.g. "That cell is already filled", "Slow down".
- **Board** (§5).
- **Number pad:**
  - Row of 9 digit buttons. A digit is disabled once all nine of it are on the board. In notes mode the buttons toggle notes instead.
  - Row: **Notes on/off** toggle (shortcut N) and **Clear notes** (⌫).
  - Row: **Undo note** (⌘Z, disabled when nothing to undo) and **Hint (+30 s)** (H).
- **Players list:** colour dot, name, "(you)", "host" badge, online/offline, and mistakes · placed counts. Offline players stay listed, dimmed.
- **Results panel** at game end (§ Results).
- **Leave room** link.

### Race lobby (race rooms before start)
Panel in place of the board: "Race lobby", "Share the invite link. 2 players here."
- Host sees **Start race**, disabled under 2 players, with the note "At least 2 players are needed".
- Others see "Waiting for the host to start…".
- Player list beside it.

### Race countdown and play
- After Start: a full-board overlay counting **3 → 2 → 1** over 3 s. The board is visible but locked underneath.
- During play, the player list shows a **progress bar per player** (cells filled out of the cells to fill) in their colour, plus "✅ finished".
- The host also gets an **End race now** button.

### Results
Appears in the sidebar (below the board on phones).
- **Co-op:** title "🎉 Solved together!". Table: Player · Placed · Mistakes · Hints · Score.
- **Race:** title "🏁 Race over". Table: # · Player · Placed · Mistakes · Hints · Score. Unranked players show "–" and "DNF". Footnote: "Score = finish time + 10 s per mistake + 30 s per hint."
- The current player's row is highlighted.
- This is the celebration moment and deserves more than a table.

### Daily `/daily`
Title, the date (e.g. "Friday, 9 October 2026 · Medium"), and "Everyone gets the same puzzle; it changes at midnight UTC."
- **Play today's puzzle** button. It opens a personal solo room.
- **Today's best times** table: # · Player · Best · Games. Empty state: "No results yet."

### Leaderboard `/leaderboard`
- Filters: Mode (Co-op / Race) and Difficulty (4 options), as toggle groups.
- Table: # · Player · Best (m:ss) · Games, up to 50 rows. The current user is highlighted.
- Loading and empty states.

### Other states
- **Room not found:** "It may have expired after a day of inactivity." + Back home.
- **404:** "Page not found."
- **Global loading:** "Loading…".
- **Session error:** for example "Too many new sessions, try again shortly".

## 5. The board: the most important component

A 9×9 grid of square buttons with thick lines between the 3×3 boxes and thin lines between cells. It must fit 360 px wide with 16 px side margins (each cell ≈ 36 px), and grow to ~512 px on desktop.

Each cell is in a combination of these states. Please design all of them, plus the important combinations:

| State | Meaning | Today |
| --- | --- | --- |
| Given | Part of the puzzle | Bold, dark digit |
| Player digit | Placed and confirmed | Blue digit |
| Pending | Sent, waiting for the server (~50–200 ms) | Dimmed, italic |
| Empty | No digit | Blank |
| Notes | 1–9 small digits in a 3×3 mini-grid | Small grey digits |
| Selected | The player's cursor | Strong blue fill |
| Related | Same row, column or box as the selection | Faint grey fill |
| Same digit | Contains the same digit as the selected cell | Faint blue fill |
| Conflict | The digit repeats in its row, column or box (client-side check) | Red tint + red wavy underline |
| Mistake flash | A wrong digit was rejected; lasts 600 ms, then the cell clears | Red fill |
| Other players' selection (co-op) | Up to 7 others can be on any cell | 3 px inset outline in their colour + their initial(s) in the top-right corner |
| Keyboard focus | Visible focus ring | Amber outline |

Also design:
- The board **under the race countdown overlay**.
- The board **once the game is finished:** read-only, with no number pad.

**Accessibility (must keep):** every cell has a label such as "Row 3, column 5, empty, notes 2 4 7, selected by Otter-4821". **Colour is never the only signal:**
- conflicts use the underline;
- other players' selections show their initial;
- the selected cell also has a pressed state.

Contrast must reach WCAG AA in both themes, including notes.

## 6. Current visual language

You may replace any of this.

- **Brand colour:** sky-600 `#0284c7`. **Accent:** amber-400 `#fbbf24`, used for the highlighted cell in the icon and for focus rings.
- **Neutrals:** Tailwind slate. The page is slate-50 in light mode and slate-950 `#020617` in dark mode.
- **Player colours, in assignment order:** `#e11d48` `#2563eb` `#16a34a` `#d97706` `#9333ea` `#0891b2` `#db2777` `#65a30d`.
  - These are fixed in game logic. You may propose a new set of 8, but they must stay distinguishable from each other and from the board's own highlight colours, in both themes and for common colour-vision deficiencies.
- **Font:** system UI stack. Monospace for room codes and times.
- **Icon:** a white sudoku grid on a rounded blue square, with the centre box tinted and the centre cell amber.
- **Share image:** 1200×630 px, the icon plus "Multiplayer Sudoku", "Solve together or race your friends, live." and tags "Co-op · Race · Daily puzzle". Generated from HTML, so it's easy to update to the new direction.
- **Dark mode** follows the system setting (`prefers-color-scheme`); there is no manual switch today.

## 7. Moments worth designing motion for

- **Correct placement:** a subtle settle or pop. A soft tone plays (sound can be toggled).
- **Mistake:** a 600 ms red flash, then the cell clears. A low two-note tone plays.
- **A teammate's digit appearing** on the shared board (co-op).
- **Presence:** other players' outlines moving cell to cell.
- **Race countdown** 3-2-1 and "Go".
- **Race progress bars** filling; an opponent finishing.
- **Win / game over:** a three-note rising tone plays. Currently there's no visual celebration.
- **Reconnecting banner:** appearing and clearing.

Keep motion short and respect `prefers-reduced-motion`.

## 8. Input

- **Keyboard:**
  - Arrows / WASD: move
  - 1–9: place a digit (or a note in notes mode)
  - Shift+1–9: toggle one note
  - N: notes mode
  - Backspace: clear notes
  - H: hint
  - ⌘/Ctrl+Z: undo note
  - Esc: deselect
- **Touch:** tap a cell, then tap the number pad. Pad buttons need ≥ 40 px touch targets on phones.
- Consider showing shortcut hints on desktop only. Today they are small `kbd` labels on the buttons.

## 9. Constraints (must hold)

- **No horizontal scroll at 360 px** on any page. This is tested automatically.
- **Board structure:** the board stays a CSS grid of 81 real `<button>`s. Cells are square and the 3×3 box lines are visibly heavier.
- **Implementation:** Tailwind CSS v4 utility classes and CSS custom properties. No new UI framework. Web fonts are fine if lightweight.
- **Theming:** light and dark themes are both required.
- **Stable copy and terms:** room codes, nicknames, difficulty names, mode names (Co-op, Race), and the scoring wording.
- **Fixed third-party UI:** the Turnstile widget and the GitHub/Google sign-in flows (standard provider buttons are fine).
- **Dynamic text:** nicknames up to 20 characters in any script, so allow truncation; players 1–8; timers up to hours (h:mm:ss).

## 10. Known pain points to solve

1. **No onboarding.** Nothing explains the modes, notes or shortcuts to a first-time visitor.
2. **The Home screen is a stack of equal-weight forms.** "Create room" should be the obvious primary action, and "Join" the obvious second.
3. **Cramped header** on phones.
4. **The invite moment is weak.** After creating a room, the player sees an empty board and a small "Copy invite link" button. Sharing should feel central; consider the Web Share API on mobile.
5. **Multiple players on one cell** produces stacked initials in a tiny corner.
6. **The end of a game is a plain table.** It needs celebration, a clear winner or result, and "play again".
7. **Race progress is hard to read** at a glance in the list.
8. **Stat placement.** The mistakes, hints and timer row competes with the board on small screens.
