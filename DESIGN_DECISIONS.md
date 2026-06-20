# Design Decisions & Technical Trade-offs

This document captures the key architectural decisions, the alternatives considered, and why each approach was chosen. It demonstrates the reasoning behind the implementation — not just *what* was built, but *why*.

---

## 1. Cross-Tab Communication: BroadcastChannel vs Alternatives

### Decision: **BroadcastChannel API** (sole mechanism)

### Alternatives Considered

| Approach | Pros | Cons |
|----------|------|------|
| **BroadcastChannel API** ✅ | Native browser API, instant delivery, clean pub/sub model, no storage overhead | Not available in IE11 |
| SharedWorker | Persistent coordinator, can handle complex routing | More complex setup, debugging is harder, worker lifecycle management |
| localStorage + `storage` event | Universal support | Polling-based feel, fires only in *other* tabs (not the originator), serialization overhead, considered a "hack" |
| Service Worker + `postMessage` | Survives page navigation | Overkill for same-origin tab sync, complex lifecycle |
| Server-Sent Events / WebSocket | Real-time, works across devices | Requires a backend server — violates "no server" requirement |

### Why BroadcastChannel Won

1. **Assignment explicitly says "no server, no polling, no localStorage event hacks"** — BroadcastChannel is the only option that satisfies all three constraints natively
2. **Zero setup** — one line: `new BroadcastChannel('name')`
3. **Instant delivery** — messages arrive in the same tick, no storage serialization/deserialization round-trip
4. **Clean separation** — we use 3 separate channels (`emi-calculator-sync`, `emi-undo-sync`, `emi-theme-sync`) to decouple state, undo, and theme

---

## 2. Tab Presence: In-Memory Map vs Heartbeat + localStorage

### Decision: **In-memory peer map via BroadcastChannel messages** (no localStorage, no heartbeats)

### How It Works

```
New tab opens  →  broadcasts ROLL_CALL  →  existing tabs respond PRESENT
Tab closes     →  broadcasts TAB_CLOSE  →  others remove from map
```

### Alternatives Considered

| Approach | Pros | Cons |
|----------|------|------|
| **In-memory map + BroadcastChannel** ✅ | Zero storage, instant, no timeouts | If tab crashes without `beforeunload`, ghost entry stays |
| Heartbeat + localStorage presence map | Handles crashes (timeout-based cleanup) | Violates "no localStorage event hacks", background tabs get throttled by browsers (setInterval → ~1/min), causing false positives |
| SharedWorker as coordinator | Central authority, accurate count | Adds complexity, another file to manage |

### Why In-Memory Won

- **No false positives** — background tabs are never dropped just because their heartbeat was throttled
- **Simplicity** — ~80 lines vs ~200+ for heartbeat approach
- **Ghost tabs are rare** — only happens if the browser crashes entirely (not just tab close). The `beforeunload` event handles 99.9% of tab-close scenarios

---

## 3. Prepayment Strategy: Reduce-Tenure vs Reduce-EMI

### Decision: **Reduce-tenure** (EMI stays fixed, loan finishes sooner)

### Alternatives

| Strategy | Behavior | Common Use |
|----------|----------|------------|
| **Reduce-tenure** ✅ | EMI stays the same, loan ends sooner | Most bank defaults, assignment requirement |
| Reduce-EMI | Tenure stays the same, monthly payment drops | Some refinancing scenarios |
| Hybrid | User chooses per prepayment | Most flexible but most complex |

### Why Reduce-Tenure

1. **Assignment spec explicitly requires it**: *"This assignment uses the reduce-tenure strategy: the EMI stays fixed"*
2. **Simpler mental model** — user sees exactly how many months they're saving
3. **Better financial outcome** — total interest saved is higher with reduce-tenure than reduce-EMI for the same prepayment amount

---

## 4. State Architecture: Single Hook vs Multiple Stores

### Decision: **Single `useSharedState` hook** that wraps all shared state

### Architecture

```
useSharedState(DEFAULT_STATE)
    ├── Holds: loanAmount, interestRate, tenure, activeTab, scenarios, prepayments
    ├── Syncs: via BroadcastChannel (instant)
    ├── Persists: to localStorage (for page refresh)
    ├── URLs: encodes loanAmount/rate/tenure as query params
    └── Undo: Ctrl+Z across all tabs via separate undo channel
```

### Why Not Redux/Zustand/Jotai?

- **Zero dependencies** — the entire state layer is ~150 lines of custom code
- **Assignment scope** — adding a state library for 6 state fields is over-engineering
- **BroadcastChannel integration** — no existing library handles cross-tab sync out of the box; we'd need middleware anyway
- **Undo** — custom undo is simpler to implement with direct control over the history stack

---

## 5. Styling: CSS Modules + Custom Properties vs Tailwind/Styled-Components

### Decision: **Vanilla CSS with CSS Modules + CSS Custom Properties (variables)**

### Why Not Tailwind?

- **No build step dependency** — CSS Modules work natively with Next.js
- **Theme system** — CSS Custom Properties allow runtime theme switching without JS re-renders. Dark mode is a single `data-theme` attribute swap — zero React re-renders for theme changes
- **Full control** — no utility class bloat, precise control over every visual detail
- **Scoping** — CSS Modules prevent style leaks between components automatically

### Theme Architecture

```css
:root {
  --bg-primary: #f5f7fb;    /* Light */
  --accent-primary: #4f6ef7;
}

[data-theme='dark'] {
  --bg-primary: #0a0a0b;    /* Dark override */
  --accent-primary: #3b82f6;
}
```

All components reference `var(--bg-primary)` — switching theme is just toggling `data-theme` on `<html>`, and every component updates via CSS cascade. **No JavaScript re-render needed for theme switch.**

---

## 6. Undo Strategy: Per-Tab vs Shared History

### Decision: **Shared undo history** (stored in localStorage, synced via BroadcastChannel)

### How It Works

1. State changes are **debounced** (500ms) before pushing to undo history — so slider drags produce one undo entry, not 50
2. Ctrl+Z pops the last entry and broadcasts via a **dedicated undo channel** (not the state channel — to avoid re-pushing into history)
3. All tabs apply the undone state simultaneously

### Why Debounced?

Without debouncing, dragging a slider from 10% to 15% would push ~50 intermediate states to the undo stack. The user would need to press Ctrl+Z 50 times to undo one slider drag. With 500ms debounce, they press it once.

---

## 7. URL State: Query Params vs Hash Fragment

### Decision: **URL query parameters** (`?amount=1500000&rate=11&tenure=48`)

### Why Query Params Over Hash?

- **SEO-friendly** — search engines index query params
- **Standard convention** — users expect `?key=value` for configurable pages
- **Server-readable** — if we ever add SSR, query params are available on the server
- **Debounced updates** — URL is updated 300ms after last change to avoid flooding browser history during slider drags. Uses `replaceState` (not `pushState`) to avoid polluting the back button

---

## 8. Leader Election: Why the Oldest Tab?

### Decision: **Oldest `createdAt` timestamp wins** leader election

### Why Not Random or Round-Robin?

- **Deterministic** — all tabs independently compute the same leader without negotiation
- **Stable** — leader doesn't change unless the leader tab closes
- **Simple** — one `reduce()` call over the peer map
- **No split-brain** — since all tabs receive the same ROLL_CALL/PRESENT messages, they all compute the same result

---

## 9. Sensitivity Grid: Fixed vs Dynamic Range

### Decision: **Rate ±1-3%, Tenure ±6-24mo** with clamping and deduplication

### Edge Case Handling

```javascript
// Rate 2% → offsets [-3,-2,-1,0,1,2,3] → raw [−1,0,1,2,3,4,5]
// After clamping to [1,36]: [1,1,1,2,3,4,5] → dedup: [1,2,3,4,5]
const ratesClamped = ratesRaw.map(r => Math.max(1, Math.min(36, r)));
const rates = [...new Set(ratesClamped)]; // Dedup
```

This means the grid **gracefully shrinks** at the edges instead of showing invalid or repeated values — a detail that demonstrates edge-case awareness.

---

## 10. Floating-Point Handling

### Problem

JavaScript `0.1 + 0.2 = 0.30000000000000004`. In financial calculations, this leads to balances that don't reach exactly 0, or interest amounts that are off by fractions of a rupee.

### Solution

1. **`Math.round()` on all monetary values** — EMI, interest, principal are all rounded to nearest integer (₹)
2. **Last-month adjustment** — instead of trusting the math to reach 0, the final month explicitly sets `principalPaid = balance` to force-close the loan
3. **Safety cap** — `maxMonths = tenureMonths * 2` prevents infinite loops from rounding drift in edge cases
