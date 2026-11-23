# RetroDeck Arcade & RetroDeck OS v1.2 (Nokia 3310 Edition)

**100-in-1 60 FPS Pocket Console • Authentic Nokia 3310 Firmware OS • 9-Provider BYOK AI • Live WAP 1.1 Browser • Real-Time Piezo Ringtone Synthesizer**

Built by **[MetaFrame Labs](https://www.metaframelabs.space/)** — Zero WebViews, pure TypeScript deterministic 60 FPS engine running inside a 320×240 monochrome dot-matrix LCD screen, complete with a full **Nokia 3310 Operating System (`RetroDeck OS v1.2`)**, hot-swappable **Gamepad ↔ Communicator QWERTY Keyboard Deck**, **100 playable arcade cartridges**, **12 persistent hardware themes**, and a live in-app **Custom Game Studio** compiler.

---

## 📱 RetroDeck OS v1.2 (Nokia 3310 Desktop Environment)

Boot straight into an authentic **Nokia 3310 LCD Operating System** (`src/os/RetroDeckOS.tsx`) with a 12-app (4×3) icon grid, BIOS memory check, signal/battery status bar, operator logos (`NOKIA`, `TRKCELL`, `TELSIM`, `CYBER`, `RD-OS 1.2`), and full D-Pad + tactile QWERTY keyboard control:

| Icon | App | Description |
| :--- | :--- | :--- |
| 🎮 | **`GAMES`** | Browse and hot-boot all **100 built-in 60 FPS retro cartridges** with persistent high scores. |
| 💬 | **`CHAT`** | **9-Provider BYOK AI Client** inside the monochrome LCD (`Groq`, `OpenAI`, `Anthropic Claude`, `Google Gemini`, `DeepSeek`, `Mistral`, `xAI Grok`, `OpenRouter`, `Together AI`). |
| 🌐 | **`WAP`** | **Nokia WAP 1.1 Web Browser** — Connects to live HTTPS websites with a `Nokia3330/1.0 (RetroDeckOS WAP 1.1)` User-Agent, parses semantic HTML into 33-column monochrome WML cards, defaults to `https://www.metaframelabs.space/`, and includes quick bookmarks (`Hacker News`, `CNN Lite`, `Wikipedia Nokia 3310`, `GitHub`). |
| 🎵 | **`MUSIC`** | **Nokia 3310 Ringtone Composer & Jukebox** — Real-time square-wave piezo buzzer synthesizer supporting Nokia Composer notation (`8e2 8d2 4f#1 4g#1...`), **16 iconic ringtones**, live note composing, and one-tap **`★ RING`** assignment. |
| 📞 | **`PHONE`** | **Nokia 3310 Dialer & Secret Service Codes** — Synthesized DTMF keypad tones, Incoming Call simulator (`RING`), and authentic Nokia service codes: `*#0000#` (Firmware Version), `*#06#` (IMEI Serial), `*#92702689#` (`*#WAR0ANTY#` 5-page Serial / Made Date / Purchasing / Repaired / Live Life Timer menu), `*#7780#`, and `*#7370#`. |
| ✉️ | **`SMS`** | **Nokia 3310 Picture Messages (`Pic-SMS`) + Live AI Replies** — 12 iconic 72×20 monochrome pixel-art banners (`COFFEE`, `SMILE`, `COOL`, `WINK`, `HEART`, `SAD`, `CAT`, `ALIEN`, `SKULL`, `MUSIC`, `CAKE`, `SNAKE`). Press **`[A]`** to transmit a Picture SMS to Groq/BYOK AI and receive an AI-written 3310 SMS reply with a context-matched pixel banner and Morse `"S-M-S"` (`... -- ...`) alert tone! |
| 🔔 | **`PROFILE`** | **Nokia Profiles, Ringtones & Keyguard** — Switch between `GENERAL`, `SILENT`, `MEETING`, and `OUTDOOR` profiles, preview and assign from **16 Ringtones** and **5 SMS Alert Tones**, change Operator Logos, toggle **LCD Torch Invert**, or activate the **Keyguard (`*` to unlock)** with a floating digital clock screensaver. |
| 🧮 | **`CALC`** | **3310 Calculator & Currency Converter (`FX`)** — Full arithmetic calculator plus instant currency conversion (`USD ↔ EUR`, `USD ↔ TRY`). |
| ⏱️ | **`CLOCK`** | **Stopwatch & Countdown Timer** — Precision lap stopwatch and programmable countdown timer that triggers your active Nokia 3310 ringtone when time is up. |
| 🖌️ | **`PAINT`** | **16×10 Monochrome Pixel Art Studio** — Draw and toggle dot-matrix pixel sprites directly on the LCD. |
| 💻 | **`SHELL`** | **Interactive Unix / RetroDeck Shell (`rdsh`)** — Real CLI terminal with a pixel-art handheld console `neofetch` emblem and commands: `help`, `neofetch`, `ls`, `cd`, `pwd`, `cat`, `top`, `free`, `uname`, `whoami`, `date`, `uptime`, `open <game>`, `randgame`, `play <song>`, `ringtones`, `ringtone <name>`, `stop`, `wap <url>`, `curl <url>`, `ai <prompt>`, `stats`, `theme`, `lock`, `clear`, `reboot`. |
| ⚙️ | **`SETUP`** | Cycle hardware color palettes, CRT scanlines, audio mute, random cartridge boot, or launch the **Custom Game Studio (`DEV CART`)**. |

---

## 🔔 16 Synthesized Nokia 3310 Ringtones & 5 SMS Tones

Zero external audio files — every sound effect, keypad beep, and melody is mathematically synthesized on-the-fly into 8-bit 22,050 Hz PCM RIFF WAV buffers (`src/audio/RetroAudioEngine.ts`):

- **16 Ringtones:** `NOKIA TUNE` (*Grande Valse*), `KICK RING 3310`, `HURDY GURDY`, `ESPAGNOLE`, `BADINERIE BACH`, `VALKYRIES 3310`, `WILLIAM TELL`, `CITY BIRD 3310`, `GROOVY BLUE`, `TETRIS 3310`, `MARIO BROS`, `STAR WARS`, `AXEL F 3310`, `MISSION 3310`, `PAC-MAN`, and `CUSTOM 3310`.
- **5 SMS Alert Tones:** `SPECIAL (MORSE SMS ... -- ...)`, `STANDARD BEEP 2X`, `ASCENDING ALERT`, `COIN DROP`, `DOUBLE CHIME`.

---

## 🕹️ 100 Built-In 60 FPS Retro Arcade Cartridges

All 100 cartridges (`src/arcade/games/*.tsx` & `src/arcade/cartridges.ts`) run natively at 60 FPS with zero canvas or WebView dependencies:

1. **Nokia 3310 Snake DX** (`snake`)
2. **Nokia Bounce DX** (`bounce`)
3. **Nokia Rapid Roll** (`rapidroll`)
4. **Space Impact Cyber** (`spaceimpact`)
5. **Cyber-Breakout DX** (`breakout`)
6. **Cyber-Pong 1972** (`pong`)
7. **Tetri-Matrix DX** (`tetris`)
8. **Galactic Invaders** (`invaders`)
9. **Cyber-Hopper (Frogger)** (`frogger`)
10. **Flappy Vector** (`flappy`)
11. **Cyber-Runner 2099** (`runner`)
12. **Asteroid Sturm** (`asteroids`)
13. **2048 Logic Grid** (`grid2048`)
14. **Mine-Sweeper Matrix** (`minesweeper`)
15. **Pac-Maze Cyber** (`pacman`)
16. **Turbo Outrun 84** (`racer`)
17. **Helicopter Cave** (`heli`)
18. **Tron Lightcycles** (`tron`)
19. **Memory Matrix** (`memory`)
20. **Whack-A-Bot** (`whack`)
21. **Lunar Lander 79** (`lander`)
22. **Centipede Matrix** (`centipede`)
23. **Doodle Jump DX** (`doodle`)
24. **Missile Command** (`missile`)
25. **Simon Echo** (`simon`)
26. **Sokoban Warehouse** (`sokoban`)
27. **Connect-4 Matrix** (`connect4`)
28. **Duck Hunt Target** (`duckhunt`)
29. **Tower Stacker** (`stacker`)
30. **Lights Out Grid** (`lightsout`)
31. **Bomber-Grid DX** (`bomber`)
32. **Pinball Matrix** (`pinball`)
33. **15-Slide Puzzle** (`slide15`)
34. **Tic-Tac-Toe AI** (`tictactoe`)
35. **Space Defender** (`defender`)
36. **Gravity Guy Runner** (`gravity`)
37. **Fruit Catcher** (`catcher`)
38. **Mastermind Cipher** (`mastermind`)
39. **Penalty Shootout** (`penalty`)
40. **Rogue Dungeon** (`dungeon`)
41. **Qix Territory** (`qix`)
42. **Balloon Fight DX** (`balloon`)
43. **Elevator Action** (`elevator`)
44. **Dig Dug Deep** (`digdug`)
45. **Arkanoid Boss** (`arkboss`)
46. **Timber Chop** (`timber`)
47. **Bubble Shooter** (`bubble`)
48. **Rhythm Beat 8-Bit** (`rhythm`)
49. **Blackjack 21** (`blackjack`)
50. **Wolf3D Raycaster** (`raycast`)
51. **Galaga Swarm** (`galaga`)
52. **Q*bert Pyramid** (`qbert`)
53. **Boulder Dash** (`boulder`)
54. **Paperboy Courier** (`paperboy`)
55. **Tempest Tube** (`tempest`)
56. **Joust Knights** (`joust`)
57. **Spy Hunter Pursuit** (`spyhunter`)
58. **BurgerTime Chef** (`burgertime`)
59. **Tapper Saloon** (`tapper`)
60. **Punch-Out!! Boxing** (`punchout`)
61. **Sudoku 4×4 Matrix** (`sudoku`)
62. **Battleship Radar** (`battleship`)
63. **Reversi / Othello** (`reversi`)
64. **Checkers Draughts** (`checkers`)
65. **Hangman Terminal** (`hangman`)
66. **Video Poker Jacks+** (`videopoker`)
67. **Slot Machine 777** (`slots`)
68. **SkiFree Slalom** (`skifree`)
69. **4-Lane Air Hockey** (`airhockey`)
70. **Scorched Artillery** (`artillery`)
71. **Tower of Hanoi** (`hanoi`)
72. **Nonogram Picross** (`nonogram`)
73. **SameGame Collapse** (`samegame`)
74. **Peg Solitaire** (`pegsolitaire`)
75. **100m Sprint Track** (`trackfield`)
76. **Retro Skeet Shoot** (`skeet`)
77. **Submarine Depth Charge** (`subhunt`)
78. **Snake vs Blocks** (`snakeblocks`)
79. **2-Car Lane Switch** (`twocars`)
80. **Conway's Game of Life** (`gameoflife`)
81. **Pipe Connect Plumber** (`pipeconnect`)
82. **Sokoban Ice Puzzle** (`icepuzzle`)
83. **Wordle 5-Letter** (`wordle`)
84. **Bulls & Cows** (`bullscows`)
85. **Memory Match Pairs** (`matchpairs`)
86. **Mini Golf 9-Hole** (`minigolf`)
87. **8-Bit Bowling** (`bowling`)
88. **Retro Darts 301** (`darts`)
89. **Archery Target Wind** (`archery`)
90. **Retro Fishing Pond** (`fishing`)
91. **Pocket Chess AI** (`chess`)
92. **Backgammon Duel** (`backgammon`)
93. **Mahjong Solitaire** (`mahjong`)
94. **Klondike Solitaire** (`solitaire`)
95. **Dominoes Chain** (`dominoes`)
96. **Ludo / Pachisi** (`ludo`)
97. **Snakes & Ladders** (`snakesladders`)
98. **Yahtzee Dice Poker** (`yahtzee`)
99. ** Nim Strategy Stones** (`nim`)
100. **Mancala Kalah** (`mancala`)

---

## 🎨 12 Persistent Retro Hardware Themes

All color palettes (`src/theme/palettes.ts`) and CRT scanline settings persist automatically via `AsyncStorage` across the OS desktop and all 100 games:

1. **Nokia 3310 LCD** (`#94B07C` / `#172616`)
2. **Phosphor Green CRT** (`#00FFAA` / `#040B08`)
3. **Amber Terminal CRT** (`#FFB000` / `#100900`)
4. **Game Boy DMG-01** (`#8BAC0F` / `#0F380F`)
5. **Virtual Boy Red** (`#FF003C` / `#0D0104`)
6. **OLED Pure Mono** (`#FFFFFF` / `#000000`)
7. **Nokia 3510i Ice Blue** (`#C8ECFF` / `#081C30`)
8. **Casio Illuminator Cyan** (`#00F5D4` / `#031816`)
9. **Commodore 64 Blue** (`#A5A5FF` / `#3535C0`)
10. **IBM 5151 Paper White** (`#E6E1D6` / `#1E1D1A`)
11. **Synthwave 1984 Magenta** (`#FF55FF` / `#120424`)
12. **Solarized Dark** (`#93A1A1` / `#002B36`)

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
