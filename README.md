# Sky Hopper

Sky Hopper is a deterministic Doodle Jump–style vertical platformer built with **Phaser 3**, **TypeScript**, and **Vite**. The repo provides a production-ready single-player client with networking hooks modelled on the realtime protocol defined in [`NETWORK_PROTOCOL.md`](NETWORK_PROTOCOL.md).

## Features

- ⚙️ **Deterministic simulation** running at a fixed 60 Hz with seedable world generation.
- 🪜 **Procedural platforms** (static, moving, breakable, one-shot) plus springs and jetpacks.
- 🎮 **Keyboard and touch controls** with mobile-friendly deadzones.
- 📷 **Camera follow** with parallax background, HUD, pause and game-over overlays.
- 🧠 **Object pooling & culling** to keep GC pressure low and frame pacing smooth.
- 🔊 **WebAudio SFX** (jump, spring, break) unlocked on user input.
- 🧪 **CI-ready toolchain**: ESLint, Prettier, Vitest, Playwright smoke test, GitHub Actions.
- 🔌 **Networking stubs** mirroring the pv=1 protocol (envelopes, input batching, snapshots).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 8+

### Installation

```bash
pnpm install
```

### Development Server

```bash
pnpm dev
```

The dev server listens on [http://localhost:8080](http://localhost:8080). Click **Start Game** in the overlay to spawn the player and unlock audio.

### Build

```bash
pnpm build
```

### Preview

```bash
pnpm preview
```

### Tests

```bash
pnpm lint      # ESLint + Prettier enforcement
pnpm test      # Vitest unit suite
pnpm test:e2e  # Playwright smoke run
```

## Controls

| Platform | Action                                         |
| -------- | ---------------------------------------------- |
| Desktop  | `←/A` move left, `→/D` move right, `Esc` pause |
| Touch    | Tap / hold left or right half of the screen    |

## Code Structure

```
src/
├─ assets/        # SVG + audio placeholders and manifest
├─ config/        # Tunable constants (world, difficulty, audio)
├─ core/          # Clock, RNG, math helpers, shared types
├─ sim/           # Deterministic world (player, platforms, powerups, collisions)
├─ render/        # Phaser scenes, HUD, asset loader, storage helpers
├─ input/         # Keyboard + touch manager with deadzone normalisation
├─ ui/            # React overlays (menu, pause, game-over) + UI bridge
├─ net/           # Protocol typings and NetClient stub (no I/O yet)
└─ tests/         # Vitest unit specs + Playwright smoke
```

### Simulation & Determinism

- `Clock` runs a fixed-step accumulator (60 TPS) decoupled from rendering.
- `World.step()` consumes a `PlayerInput` per tick and is pure given `(seed, tick, input)`.
- `SpawnRules` produces platforms/powerups deterministically via `Xoroshiro128**` seeded from decimal strings.
- `Determinism.hashWorld()` emits a 64-bit FNV-1a digest used in unit tests to confirm replay fidelity.

### Rendering

- `BootScene → MenuScene → GameScene → GameOverScene` pipeline.
- Parallax layers use tile sprites; sprites snap to integer pixels for crisp visuals.
- HUD renders score, high score, optional FPS counter, and pause control.
- `UIManager` mounts React overlays (menu, pause, game-over) above the canvas.

### Object Pooling & Culling

`PlatformPool` and `PowerupPool` reuse instances. Objects falling below the camera cull margin are recycled. Moving platforms compute positions analytically (`sin`) to avoid floating-point drift.

### Audio

Light-weight PCM `.wav` effects (jump, spring, break) are generated at build time and triggered from simulation events. Playback waits for the first user gesture to satisfy mobile autoplay policies.

## Realtime Integration TODOs

The stubbed networking layer mirrors [`NETWORK_PROTOCOL.md`](NETWORK_PROTOCOL.md) (`pv=1`). To enable live multiplayer:

1. **Transport** – Replace `NetClientStub` with a WebSocket client that exchanges `Envelope<T>` messages (`join`, `input_batch`, `snapshot`, etc.).
2. **Prediction & Reconciliation** – Buffer local inputs, apply snapshots from `S2C_Snapshot`, and rewind/replay authoritative ticks when deltas arrive.
3. **Tick Alignment** – Use `S2C_Start` to anchor local time, apply render delay (`interpMs = max(2×RTT, 100 ms)`), and expose extrapolated poses for remote players.
4. **State Compression** – Quantise floats to 0.1 units when serialising, pack deltas for moving platforms, and validate checksums from `C2S_Input`.
5. **Lifecycle** – Handle `S2C_PlayerPresence`, `S2C_Finish`, reconnect (`C2S_Reconnect`), and keep pings flowing every 5 s.

## Asset Pipeline

Placeholder SVG sprites live under `src/assets/images`, and PCM SFX in `src/assets/audio`. The manifest (`src/assets/manifest.ts`) centralises asset keys so Phaser loads via Vite’s module URLs. Swap files with production art/audio without touching scene code.

## License

MIT.
