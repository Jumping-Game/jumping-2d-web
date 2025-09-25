# Doodle Jump Clone

This is a production-ready web client for a Doodle-Jump–style vertical jumper, built with Phaser 3, TypeScript, and Vite.

## Features

*   Endless upward scrolling with procedurally generated platforms.
*   Deterministic simulation loop with a fixed timestep.
*   Keyboard and touch controls.
*   Camera follow, parallax background, and score HUD.
*   Object pooling for platforms and power-ups to minimize garbage collection.
*   CI-ready repository with ESLint, Prettier, Vitest, and Playwright.

## Project Structure

The project is organized into the following directories:

*   `src/assets`: Game assets (images, sounds, etc.).
*   `src/core`: Core utilities like the game clock, RNG, and math functions.
*   `src/sim`: The deterministic simulation layer, including the world, player, platforms, and collision detection.
*   `src/render`: The rendering layer, which uses Phaser to display the simulation.
*   `src/input`: Input handling for keyboard and touch.
*   `src/net`: Networking stubs for future real-time integration.
*   `src/ui`: React components for the UI overlays.
*   `src/config`: Game configuration constants.
*   `src/tests`: Unit and end-to-end tests.

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [pnpm](https://pnpm.io/)

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Install the dependencies:
    ```bash
    pnpm install
    ```

### Running the Game

To start the development server, run:

```bash
pnpm dev
```

The game will be available at `http://localhost:8080`.

### Building for Production

To build the game for production, run:

```bash
pnpm build
```

The production-ready files will be located in the `dist` directory.

### Running Tests

To run the unit tests, run:

```bash
pnpm test
```

To run the end-to-end tests, run:

```bash
pnpm test:e2e
```

## Architecture

The game is built around a deterministic simulation core that is completely decoupled from the rendering layer.

*   **Simulation (`/src/sim`)**: The simulation is responsible for all game logic, including physics, collision detection, and procedural generation. It runs at a fixed timestep (60 TPS) to ensure that the game is deterministic.
*   **Rendering (`/src/render`)**: The rendering layer is responsible for displaying the simulation state to the user. It uses Phaser 3 to render the game objects and the UI.

This separation of concerns makes the game easier to test and debug, and it also makes it possible to run the simulation on a server for multiplayer gameplay.

## Next: Realtime Integration

The current implementation includes networking stubs that are ready to be integrated with a real-time networking solution. The following steps will be required to add multiplayer support:

1.  **Implement a WebSocket client**: The `NetClientStub` will need to be replaced with a real WebSocket client that can connect to a server.
2.  **Send input to the server**: The client will need to send the player's input to the server at a regular interval.
3.  **Receive snapshots from the server**: The client will need to receive world snapshots from the server and update the local simulation accordingly.
4.  **Implement client-side prediction and reconciliation**: To reduce the effects of latency, the client will need to predict the player's movement and then reconcile it with the server's authoritative state.

The networking protocol is defined in `/src/net/Protocol.ts`.