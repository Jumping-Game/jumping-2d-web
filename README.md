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
├─ net/           # Protocol typings and WebSocket NetClient implementation
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

## Multiplayer & Networking

Sky Hopper includes a realtime multiplayer client aligned with [`NETWORK_PROTOCOL.md`](NETWORK_PROTOCOL.md) (`pv=1`).

- `src/net/NetClient.ts` handles the WebSocket lifecycle (join → welcome → start), batches inputs, maintains ping/pong timers, and surfaces `snapshot`, `player_presence`, and `finish` events.
- `GameScene` renders remote competitors using authoritative snapshots while continuing the deterministic local simulation.
- The HUD shows the current round-trip time (RTT) or connection state.
- `src/net/matchmaking.ts` wraps the REST endpoints (`/v1/rooms`, `/join`, `/leave`, `/status`) defined in [`NETWORK_PROTOCOL.md`](NETWORK_PROTOCOL.md) for room creation, joining, and teardown.
- The main menu presents quick solo runs plus Create/Join flows that call the matchmaking API and automatically pass the returned `wsUrl`/`wsToken` into the realtime client.

### Configuring the client

Networking is configured via Vite env vars (e.g. `.env.local`). When no WebSocket URL is provided the game stays in offline mode.

| Env var | Purpose |
| ------- | ------- |
| `VITE_NET_API_BASE_URL` | HTTPS base for REST matchmaking, e.g. `https://api.example.com` |
| `VITE_NET_REGION` | Default region used when creating rooms |
| `VITE_NET_MODE` | Default game mode sent to `POST /v1/rooms` |
| `VITE_NET_MAX_PLAYERS` | Default lobby size for room creation (default `4`) |
| `VITE_NET_WS_URL` | WebSocket endpoint, e.g. `wss://rt.example.com/v1/ws` |
| `VITE_NET_WS_TOKEN` | Optional auth token appended as `?token=` |
| `VITE_NET_PLAYER_NAME` | Display name sent in the join payload |
| `VITE_NET_CLIENT_VERSION` | Semantic version reported to the server |
| `VITE_NET_DEVICE` | Optional device string for diagnostics |
| `VITE_NET_CAP_TILT` / `VITE_NET_CAP_VIBRATE` | Advertise client capabilities (`0/1` or `true/false`) |
| `VITE_NET_FLUSH_MS` | Input batch interval in milliseconds (default `50`) |
| `VITE_NET_PING_MS` | Ping cadence in milliseconds (default `5000`) |
| `VITE_NET_DEBUG` | Enable verbose socket logging (`1`/`true`) |

Example `.env.local`:

```ini
VITE_NET_API_BASE_URL=https://api.dev.example.com
VITE_NET_WS_URL=wss://rt.dev.example.com/v1/ws
VITE_NET_WS_TOKEN=eyJhbGc...
VITE_NET_PLAYER_NAME=dev-player
VITE_NET_REGION=ap-southeast-1
VITE_NET_CLIENT_VERSION=web-1.0.0
```

## Asset Pipeline

Placeholder SVG sprites live under `src/assets/images`, and PCM SFX in `src/assets/audio`. The manifest (`src/assets/manifest.ts`) centralises asset keys so Phaser loads via Vite’s module URLs. Swap files with production art/audio without touching scene code.

## License

MIT.
