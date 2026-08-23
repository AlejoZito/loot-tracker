# Advisor Overlay

An RPG-style dialogue overlay for React. A character portrait slides in from the left, words are typed one at a time, and older lines scroll upward smoothly when the box fills up. Supports emotion tags that swap the portrait frame mid-message.

## Demo

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Images

Place your sprite frames in `public/images/advisor/`:

| File | When shown |
|------|-----------|
| `advisor-closed.png` | Default / mouth closed |
| `advisor-open.png` | Speaking (random pick) |
| `advisor-open-2.png` | Speaking variant (random pick) |
| `advisor-{tag}.png` | Any custom emotion tag, e.g. `advisor-think.png` |

The portrait is rendered pixel-perfect (`image-rendering: pixelated`) — pixel art works best.

## Usage

Wrap your app with `AdvisorOverlayProvider`, then call `showAdvisorOverlay` from any child:

```tsx
import { AdvisorOverlayProvider, useAdvisorOverlay } from './components/AdvisorOverlayContext';

function App() {
  return (
    <AdvisorOverlayProvider advisorPath="/images/advisor/" speakerName="Advisor">
      <YourApp />
    </AdvisorOverlayProvider>
  );
}

function SomeComponent() {
  const { showAdvisorOverlay } = useAdvisorOverlay();

  return (
    <button onClick={() => showAdvisorOverlay('Hello! <think> How can I help?')}>
      Show advisor
    </button>
  );
}
```

If the overlay is already visible, new calls are silently dropped. Click anywhere on the overlay to dismiss it.

## Emotion tags

Embed `<tagname>` anywhere in a message string. When the typewriter reaches the tag:
1. Typing pauses
2. The portrait swaps to `advisor-{tagname}.png` for 2 seconds
3. Typing resumes with the closed-mouth frame

```
"Nice work! <surprised> Wow, that's a lot saved this month."
```

## Provider props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `advisorPath` | `string` | `'/images/advisor/'` | Base path to image folder (trailing slash required) |
| `speakerName` | `string` | `'Advisor'` | Label shown above the dialogue text |

## Tips system

`src/advisor/tips.json` holds an array of tip objects:

```json
{
  "tips": [
    {
      "text": "Your message here. <think> With emotion tags.",
      "users": "all"
    }
  ]
}
```

- `users`: `"all"` or an array of user strings for per-user tips
- `pickNextTip(user)` from `useAdvisorTips.ts` picks the next unseen tip, cycling when all have been shown (tracks state in `localStorage`)

## Tuning constants

All timing and layout constants are at the top of `AdvisorOverlay.tsx`:

| Constant | Default | Description |
|----------|---------|-------------|
| `TYPEWRITER_SPEED_MS` | 40 ms | Delay per character-length between words |
| `MOUTH_FLAP_SPEED_MS` | 150 ms | Mouth open/close interval |
| `EMOTION_PAUSE_MS` | 2000 ms | How long an emotion frame is held |
| `SLIDE_DURATION_MS` | 350 ms | Slide-in / slide-out animation |
| `LINE_HEIGHT_PX` | 20 px | Height of each dialogue line |
| `LINE_SLIDE_MS` | 160 ms | Line-scroll animation duration |
| `VISIBLE_LINES` | 3 | Lines visible in the dialogue box |

## No external dependencies

The overlay has no dependencies beyond React 18. No Tailwind, no CSS framework — all styles are inline. The cursor blink uses a single `@keyframes` rule defined in `index.css` (class `advisor-cursor`).
