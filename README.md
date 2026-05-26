# PulseGrid (Vite + React)

Interactive frontend demo with motion-first UI.

## Run locally

```powershell
cd D:\PulseGrid
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

## What’s included on the page

- Pulse composer: generate a pulse map, then click tiles to inject bursts
- Scroll reveal animations (uses `IntersectionObserver`)
- Scrub reveal gallery (uses `clip-path`)
- Testimonials carousel
- FAQ accordion
- Request modal + toast confirmation
- Theme toggle (paper / ink) with reduced-motion support

## Scripts

- `npm run dev` - start local dev server
- `npm run build` - typecheck + production build
- `npm run lint` - eslint
- `npm run preview` - preview production build

## Key files

- `src/PulseGridApp.tsx` - main page + interactivity
- `src/pulse.css` - tokens + all component styling
