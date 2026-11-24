# RetroDeck OS & Arcade

**100-in-1 60 FPS Pocket Console • Authentic Nokia 3310 Firmware OS • 100 Hardware & LCD Themes • Live SomaFM Radio • 9-Provider BYOK AI**

Built by **[MetaFrame Labs](https://www.metaframelabs.space/)** — Zero WebViews, pure TypeScript deterministic 60 FPS engine running inside a 320×240 monochrome / phosphor dot-matrix LCD screen, complete with a full **Nokia 3310 Operating System (`RetroDeck OS`)**, a 3-mode hot-swappable **Gamepad (`PAD`) ↔ Nokia 3×4 Numeric (`NUM`) ↔ Communicator QWERTY (`KBD`)** deck, **100 playable 60 FPS cartridges**, **100 persistent full-hardware themes**, **live SomaFM streaming radio**, **★ Favorites** across both games and themes, and an in-app **Custom Game Studio** compiler.

---

## 📱 RetroDeck OS (Nokia 3310 Desktop Environment)

Boot straight into an authentic **Nokia 3310 LCD Operating System** (`src/os/RetroDeckOS.tsx`) with a 12-app (4×3) icon grid, BIOS memory check, signal/battery status bar, operator logos (`NOKIA`, `TRKCELL`, `TELSIM`, `CYBER`, `RD-OS 1.2`), and seamless D-Pad, 3×4 Numeric Keypad, or QWERTY keyboard control:

| Icon | App | Description |
| :--- | :--- | :--- |
| 🎮 | **`GAMES`** | Browse and hot-boot all **100 built-in 60 FPS retro cartridges** with persistent high scores and **★ Favorites**. |
| 📻 | **`RADIO`** | **Live SomaFM Streaming Radio** (`src/services/somaRadioService.ts`) — Streams **10 iconic SomaFM channels** (`Space Station`, `DEF CON Radio`, `Groove Salad`, `Vaporwaves`, `Secret Agent`, `Cliqhop IDM`, `Synphaera`, `Drone Zone`, `Lush`, `Suburbs of Goa`) with live *Now Playing* metadata, dynamic spectrum visualizer, independent volume control, and continuous background playback across the OS. |
| 💬 | **`CHAT`** | **9-Provider BYOK AI Client** inside the monochrome LCD (`Groq`, `OpenAI`, `Anthropic Claude`, `Google Gemini`, `DeepSeek`, `Mistral`, `xAI Grok`, `OpenRouter`, `Together AI`). |
| 🌐 | **`WAP`** | **Nokia WAP 1.1 Web Browser** — Connects to live HTTPS websites with a `Nokia3330/1.0 (RetroDeckOS WAP 1.1)` User-Agent, parses semantic HTML into 33-column monochrome WML cards, defaults to `https://www.metaframelabs.space/`, and includes quick bookmarks. |
| 🎵 | **`MUSIC`** | **Nokia 3310 Ringtone Composer & Jukebox** — Real-time square-wave piezo buzzer synthesizer supporting Nokia Composer notation (`8e2 8d2 4f#1 4g#1...`), **16 iconic ringtones**, live note composing, and one-tap **`★ RING`** assignment. |
| 📞 | **`PHONE`** | **Nokia 3310 Dialer & Secret Service Codes** — Live DTMF keypad tones, clean large-digit view in `NUM` mode (or 4×4 grid in `PAD` mode), Incoming Call simulator (`RING`), and authentic Nokia codes: `*#0000#`, `*#06#`, `*#92702689#` (5-page `*#WAR0ANTY#` menu), `*#7780#`, `*#7370#`. |
| ✉️ | **`SMS`** | **Nokia 3310 Picture Messages (`Pic-SMS`) + Live AI Replies** — 12 iconic 72×20 monochrome pixel-art banners (`COFFEE`, `SMILE`, `COOL`, `WINK`, `HEART`, `SAD`, `CAT`, `ALIEN`, `SKULL`, `MUSIC`, `CAKE`, `SNAKE`) + AI Pic-SMS replies with Morse `"S-M-S"` (`... -- ...`) alert tone. |
| 🔔 | **`PROFILE`** | **Nokia Profiles, Key Sounds, Master Volume & Keyguard** — Switch profiles (`GENERAL`, `SILENT`, `MEETING`, `OUTDOOR`), pick **16 Ringtones**, **5 SMS Tones**, **6 Keypad Sound Styles** (`RETRO DEFAULT`, `MECH THOCK`, `GB BLIP`, `3310 SOFT`, `SOFT POP`, `MUTE KEYS`), adjust **0–100% Master Volume**, invert LCD torch, or engage the **Keyguard (`[A]` then `[▲]` to unlock)** with floating **Analog / Digital Clock** screensaver. |
| 🧮 | **`CALC`** | **3310 Pocket Calculator** — Precision arithmetic (`+`, `-`, `×`, `÷`, `.`, `DEL`, `C`, `=`) with a touchable single-row operator bar and physical `NUM` keypad integration. |
| ⏱️ | **`CLOCK`** | **Analog & Digital Watch + Stopwatch + Timer** — 3-tab timepiece (`1.CLOCK`, `2.STOPWATCH`, `3.TIMER`) featuring a live rotating circular **Analog Clock** dial (or **Digital** watch), lap stopwatch, and countdown alarm. |
| 🖌️ | **`PAINT`** | **16×10 Monochrome Pixel Art Studio** — Draw and toggle dot-matrix pixel sprites directly on the LCD. |
| ⚙️ | **`SETUP`** | Cycle hardware palettes, toggle **CRT Scanlines**, switch **Clock Face (`ANALOG` / `DIGITAL`)**, open **Cartridge Vault**, or reboot RetroDeck OS. Built-in **`SHELL` (`rdsh`)** CLI is also accessible via desktop / OS. |

---

## 🎮 3-Mode Hardware Deck (`PAD` ↔ `NUM` ↔ `KBD`)

Switch instantly between three tactile hardware bottom decks in `App.tsx`:
1. **`PAD` (`RetroKeypad`):** Classic 360° D-pad + `A` / `B` arcade controls with crisp haptic feedback and edge-debounced menu navigation.
2. **`NUM` (`RetroNumericDeck`):** Authentic Nokia 3×4 numeric matrix (`0–9`, `*`, `#`) topped with a `[ ◀ ▲ ▼ ▶ ]` Nokia Navi-Row plus `DEL`, `BACK`, `OK`, and `KBD` — interactively dials Phone numbers with DTMF tones, enters Calculator digits, tunes SomaFM presets (`1–0`), and navigates every OS screen.
3. **`KBD` (`RetroKeyboardDeck`):** Full QWERTY communicator deck with native paste bar for AI Chat, BYOK keys, WAP URLs, and Terminal commands.

---

## 🎨 100 Hardware & LCD Themes (`Theme Studio`)

All **100 unique themes** (`src/theme/palettes.ts` & `src/components/ThemePickerModal.tsx`) theme both the dot-matrix LCD **and** the entire handheld console hardware (chassis, deck, bezel, LEDs, toolbar, tactile keys, and Custom Game Studio code editor), persisted via `AsyncStorage` alongside **★ Favorites** (`★ FAVS`):

- **Categories:** `HANDHELD`, `CRT`, `NEON`, `STUDIO`, `PAPER`, plus `★ FAVS` & `ALL`.
- **Highlights:** `ORIGINAL GB`, `NOKIA 3310`, `PLAYDATE CRANK`, `FAMICOM 1983`, `ATOMIC PURPLE`, `ANALOGUE GOLD`, `CASIO G-SHOCK`, `SEGA VMU`, `GAME & WATCH 80`, `ATARI LYNX 89`, `SEGA GAME GEAR`, `PALM PILOT 97`, `BLACKBERRY 9000`, `THINKPAD IBM`, `PICO-8 FANTASY`, `COMMODORE 64`, `AMIGA 500 1.3`, `AMSTRAD CPC 464`, `NeXT CUBE 1988`, `SHARP X68000`, `OP-1 SYNTH`, `ROLAND TR-808`, `AKAI MPC 3000`, `McINTOSH TUBE`, `NIXIE IN-18`, `COCKPIT EFIS`, `SONAR U-BOAT`, `GRUVBOX WARM`, `TOKYO NIGHT`, `CATPPUCCIN MOCHA`, `SAKURA PAPER`, `E-INK KINDLE`, `MACINTOSH 1984`, `CYANOTYPE 1842`, `POLAROID SX-70`, and more — **100 unique themes total**.

---

## 🔔 8-Bit Synthesized Audio Engine (`src/audio/RetroAudioEngine.ts`)

Zero bundled audio assets — every sound effect, keypad click, DTMF tone, and Nokia ringtone is synthesized in real time into 8-bit 22,050 Hz PCM RIFF WAV buffers with hardware-reliable logarithmic PCM amplitude scaling (`0–100%` Master Volume):

- **6 Key Sound Styles:** `RETRO DEFAULT`, `MECH THOCK`, `GB BLIP`, `3310 SOFT`, `SOFT POP`, `MUTE KEYS`
- **16 Nokia Ringtones & 5 SMS Alert Tones**

---

## 🕹️ 100 Built-In 60 FPS Retro Arcade Cartridges

All 100 cartridges (`src/arcade/games/*.tsx` & `src/arcade/cartridges.ts`) feature a unified **Cartridge Ready** launch screen, global **Game Over** (`[A] RESTART` / `[B] EXIT OS`) overlay, virtualized **Cartridge Vault (`FlatList` + `★ FAVS`)**, persistent high scores, and pixel-art sprites (including Nokia 3310 pixel-art spaceships & multi-level boss progression in **Space Impact Cyber**):

- **Nokia Classics & Retro Favorites:** `Nokia 3310 Snake DX`, `Nokia Bounce DX`, `Nokia Rapid Roll`, `Space Impact Cyber`, `Tetri-Matrix DX`, `Pac-Maze Cyber`, `Galactic Invaders`, `Breakout DX`, `Asteroids`, `Lunar Lander 79`, `Frogger`, `Flappy Vector`, `Wolf3D Raycaster`, `Tron Lightcycles`, `Rogue Dungeon`, `Pocket Chess AI`, `Nonogram Picross`, `Wordle 5-Letter`, `2048 Logic Grid`, `Mine-Sweeper Matrix`, and **80 more**!
- **Custom Game Studio (`DevCartModal`):** Write and compile custom retro cartridges live inside the app using theme-synced syntax coloring and templates.

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/neurodivergent-dev/retrodeck-arcade.git
cd retrodeck-arcade

# Install dependencies
npm install

# Run TypeScript verification
npx tsc --noEmit

# Start Expo / Metro bundler
npx expo start

# Build standalone offline debug APK for Android
npx expo export:embed --platform android --dev false --entry-file index.ts --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
cd android && ./gradlew assembleDebug
```
