# RetroDeck Arcade

**Pure TypeScript Retro Gaming Console & Nokia Arcade Machine for React Native / Android**

Built by **MetaFrame Labs** — Zero webviews, pure 60 FPS deterministic game loop, authentic Nokia LCD & CRT phosphor aesthetics, hot-swappable cartridge bay, 8-bit synthesized retro audio engine, and a live in-app **Custom Game Studio** compiler!

---

## 🕹️ Featured Cartridges

1. **NOKIA 3310 SNAKE DX** — Authentic green monochrome LCD snake physics, animated bonus bugs, dynamic tail trailing, and persistent high scores.
2. **NOKIA BOUNCE DX** — Red bouncing ball platformer, golden hoop collection rings, trampolines, moving aerial hazards, 6 handcrafted master stages, and an endless deterministic procedural level generator.
3. **NOKIA RAPID ROLL** — Fast-paced descending platformer, heart collectibles, spikes, and high-altitude reflex gameplay.
4. **SPACE IMPACT CYBER** — Nokia horizontal shmup with parallax deep space starfields, cruisers, screen-wiping EMP bombs, and boss battles.
5. **CYBER-BREAKOUT DX** — Arcade brick-breaker with false physics, angle deflections, and laser powerups.

---

## 🛠️ Features & Architecture

- **60 FPS Fixed-Timestep Engine (`src/arcade/`):** Pure React Native layout-based pixel rendering with 0 canvas/webview overhead.
- **Custom Game Studio (`src/components/DevCartModal.tsx`):** Write custom JavaScript/React Native arcade games directly inside the app, compile on-the-fly via Sucrase, and hot-swap them into the console deck!
- **8-Bit Chiptune Sound Synthesizer (`src/audio/RetroAudioEngine.ts`):** Procedural frequency generation for hits, bounces, lasers, level clears, and retro game-over buzzers.
- **High Score Persistence (`src/arcade/HighScoreService.ts`):** AsyncStorage-backed local leaderboard persistence across all cartridges.
- **Authentic Nokia & Retro Palettes (`src/theme/palettes.ts`):**
  - **Nokia 3310 Green LCD** (`#94B07C` / `#172616`)
  - **Phosphor Green CRT** (`#00FFAA`)
  - **Amber CRT** (`#FFB000`)
  - **Crimson Cyberpunk**
  - **OLED Monochrome**

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/neurodivergent-dev/retrodeck-arcade.git
cd retrodeck-arcade

# Install dependencies
npm install

# Run TypeScript check
npx tsc --noEmit

# Start Metro Bundler
npx expo start
```
