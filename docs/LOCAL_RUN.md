# Local Run Guide

This client is configured to talk to the mock or Rust game services on
`http://localhost:8080` (REST) and `ws://localhost:8081/v1/ws` (WebSocket).

## 1. Install dependencies

```bash
pnpm install
```

## 2. Configure environment

Copy the sample env file and tweak values as needed:

```bash
cp .env.local.example .env.local
```

The defaults match the local server stack:

- `VITE_API_BASE=http://localhost:8080`
- `VITE_WS_URL=ws://localhost:8081/v1/ws`
- `VITE_PROTOCOL_PV=1`

You can also add optional values such as `VITE_PLAYER_NAME` or `VITE_NET_DEBUG=1`.

## 3. Start the client

Run the Vite dev server (served on `http://localhost:5173`):

```bash
pnpm dev
```

The lobby flow expects the game services to be running locally. If you are using
mocks, make sure they expose the REST endpoints under `/v1` and the WebSocket at
`/v1/ws`.

## 4. Useful scripts

- `pnpm test` – run unit tests (Vitest)
- `pnpm test:e2e` – run Playwright e2e tests against the dev server
- `pnpm lint` – lint the project

When running the e2e suite manually, start the dev server in a separate terminal
first or rely on Playwright's built-in `webServer` hook (used by `pnpm test:e2e`).

## 5. Protocol expectations (pv=1)

Local mocks must follow the `Final v1.2.1` protocol:

- `start` responses include the full roster from the lobby (ids, roles, readiness, character).
- The first snapshot after `start` or a reconnect is marked `full: true` and lists every alive
  player before deltas resume.
- Clients ignore `input` until the authoritative `start` arrives, so keep the lobby in
  `state: "lobby"` until the countdown completes.
