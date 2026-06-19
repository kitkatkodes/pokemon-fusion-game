# Who's That Fusion? 🔮

> An AI-powered browser game that fuses Generation I Pokémon using **Laplacian pyramid blending**, **Sobel edge detection**, and **colour transfer** — all computed client-side with no backend.

**[▶ Play the live demo →](https://YOUR-USERNAME.github.io/pokemon-fusion-game/)**

---

## Game Modes

| Mode | Description | Difficulty |
|------|-------------|------------|
| **Pick the Parents** | See the fusion, choose 2 from 6 candidates | Medium |
| **Expert Mode** | Identify both parents from all 151 Gen I Pokémon | Hard |
| **Timed Blitz** | Multiple choice against a 60-second clock | Expert |

---

## Computer Vision Pipeline

Every fusion is generated in real-time inside the browser via a 4-stage pipeline:

```
Sprite A                   Sprite B
  │                            │
  ▼                            ▼
[1] Sobel Edge Detection   [1] Sobel Edge Detection
  │                            │
  └──────────┬─────────────────┘
             ▼
         [2] Blend Mask
     (diagonal gradient + edge
      competition + alpha masks
      → Gaussian blur σ=18 px)
             │
             ▼
         [3] Laplacian Pyramid Blend  (4 levels)
             │  • coarse shapes from dominant sprite
             │  • fine detail from both, edge-guided
             ▼
         [4] Colour Grading
             │  • extract dominant palette of each sprite
             │  • rotate hue 50% toward sprite B
             │  • boost saturation ×1.15
             │  • equalise lightness toward mean
             ▼
         Fusion PNG  (256×256, transparent bg)
```

### Key techniques

- **Sobel edge detection** — 3×3 gradient operator reveals structural boundaries (wings, tails, facial regions, body contours)
- **Gaussian pyramid / Laplacian pyramid blending** — multi-scale decomposition prevents hard seams and avoids the washed-out look of simple alpha blending
- **Edge-guided spatial mask** — regions with stronger edge signal from sprite A pull the blend weight toward A, so distinctive features (e.g., Charizard's wing spikes) survive the merge
- **Diagonal gradient base** — ensures both parents are visible in different regions of the fusion, not collapsed into a single averaged image
- **Colour transfer** — dominant hue computed via circular mean; blended to mix the palettes of both Pokémon without losing saturation

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI framework | React 18 + TypeScript |
| Styling | Tailwind CSS v3 |
| Animations | Framer Motion |
| CV / Fusion | Canvas 2D API + typed arrays (pure JS) |
| Sound | Web Audio API (synthesised tones, no audio files) |
| Build | Vite 5 |
| Deploy | GitHub Pages (static, zero backend) |

---

## Running Locally

```bash
# Clone and install
git clone https://github.com/YOUR-USERNAME/pokemon-fusion-game.git
cd pokemon-fusion-game
npm install

# Development server
npm run dev

# Production build
npm run build
npm run preview
```

---

## Deploying to GitHub Pages

1. Push the repo to GitHub
2. Go to **Settings → Pages**
3. Under *Source*, select **GitHub Actions**
4. Push to `main` — the workflow in `.github/workflows/deploy.yml` builds and deploys automatically

The `vite.config.ts` uses `base: './'` so the build works from any sub-path URL without changes.

---

## Project Structure

```
pokemon-fusion-game/
├── src/
│   ├── utils/
│   │   ├── imageProcessing.ts   # Canvas utilities, Gaussian blur, up/down-sample
│   │   ├── edgeDetection.ts     # Sobel operator, silhouette extraction, colour analysis
│   │   ├── colorAnalysis.ts     # RGB↔HSL, hue rotation, luminance transfer
│   │   └── fusionEngine.ts      # Full Laplacian pyramid fusion pipeline
│   ├── components/
│   │   ├── ModeSelector.tsx     # Landing / mode selection screen
│   │   ├── GameBoard.tsx        # Main game layout
│   │   ├── FusionDisplay.tsx    # Fusion image + loading animation
│   │   ├── PokemonCard.tsx      # Animated card with type colours + flip reveal
│   │   ├── GuessPanel.tsx       # Multiple-choice or expert search grid
│   │   ├── ScoreDisplay.tsx     # Score / streak / highscore HUD
│   │   ├── Timer.tsx            # SVG countdown ring
│   │   └── ResultModal.tsx      # Round result overlay with particles
│   ├── hooks/
│   │   ├── useGameState.ts      # useReducer-based game state machine
│   │   └── useSound.ts          # Web Audio API synthesised effects
│   └── data/
│       └── pokemon.ts           # All 151 Gen I Pokémon + sprite URL helpers
├── .github/workflows/deploy.yml # Automatic GitHub Pages deploy on push
├── index.html
└── vite.config.ts
```

---

## Scoring

| Event | Points |
|-------|--------|
| Correct guess | +100 |
| Streak bonus (streak ≥ 2) | +50 extra |
| Wrong guess | +0, streak resets |

High scores are saved to `localStorage`.

---

## Credits

- Pokémon sprites via [PokeAPI](https://pokeapi.co/) — CC0
- Pokémon © Nintendo / Game Freak — fan project, not affiliated
- Laplacian pyramid algorithm based on Burt & Adelson (1983)
