import { expect, test } from '@playwright/test';

const netConfig = {
  tps: 60,
  snapshotRateHz: 10,
  maxRollbackTicks: 120,
  inputLeadTicks: 2,
  world: {
    worldWidth: 1080,
    platformWidth: 120,
    platformHeight: 18,
    gapMin: 120,
    gapMax: 240,
    gravity: -2200,
    jumpVy: 1200,
    springVy: 1800,
    maxVx: 900,
    tiltAccel: 1200,
  },
  difficulty: {
    gapMinStart: 120,
    gapMinEnd: 180,
    gapMaxStart: 240,
    gapMaxEnd: 320,
    springChanceStart: 0.1,
    springChanceEnd: 0.03,
  },
};

type MockSocketWindow = Window & {
  __mockSockets?: unknown[];
  __mockSent?: unknown[];
  __mockEmit?: (index: number, message: unknown) => boolean;
  __mockResetSent?: () => void;
};

const injectMockSocket = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(() => {
    type Listener = (event: unknown) => void;

    class MockSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      static instances: MockSocket[] = [];
      static sent: unknown[] = [];
      url: string;
      readyState: number;
      private listeners: Record<string, Listener[]>;

      constructor(url: string) {
        this.url = url;
        this.readyState = MockSocket.CONNECTING;
        this.listeners = {
          open: [],
          message: [],
          close: [],
          error: [],
        };
        MockSocket.instances.push(this);
        setTimeout(() => {
          this.readyState = MockSocket.OPEN;
          this.emit('open', new Event('open'));
        }, 0);
      }

      addEventListener(type: string, handler: Listener) {
        const list = this.listeners[type];
        if (list && typeof handler === 'function') {
          list.push(handler);
        }
      }

      removeEventListener(type: string, handler: Listener) {
        const list = this.listeners[type];
        if (!list) return;
        const index = list.indexOf(handler);
        if (index >= 0) {
          list.splice(index, 1);
        }
      }

      emit(type: string, event: unknown) {
        const list = this.listeners[type];
        if (!list) return;
        for (const handler of [...list]) {
          handler(event);
        }
      }

      send(data: string) {
        try {
          MockSocket.sent.push(JSON.parse(data));
        } catch {
          MockSocket.sent.push(data);
        }
      }

      close() {
        this.readyState = MockSocket.CLOSED;
        this.emit('close', new Event('close'));
      }
    }

    (window as unknown as { WebSocket: typeof MockSocket }).WebSocket =
      MockSocket;
    (window as MockSocketWindow).__mockSockets = MockSocket.instances;
    (window as MockSocketWindow).__mockSent = MockSocket.sent;
    (window as MockSocketWindow).__mockResetSent = () => {
      MockSocket.sent.length = 0;
    };
    (window as MockSocketWindow).__mockEmit = (
      index: number,
      message: unknown
    ) => {
      const socket = MockSocket.instances[index];
      if (!socket) return false;
      const payload =
        typeof message === 'string' ? message : JSON.stringify(message);
      socket.emit('message', { data: payload });
      return true;
    };
  });
};

const waitForSocket = async (page: import('@playwright/test').Page) => {
  await page.waitForFunction(() => {
    const sockets = (window as MockSocketWindow).__mockSockets;
    return Array.isArray(sockets) && sockets.length > 0;
  });
};

const emitMessage = async (
  page: import('@playwright/test').Page,
  envelope: Record<string, unknown>
) => {
  const delivered = await page.evaluate((msg) => {
    const win = window as MockSocketWindow;
    return win.__mockEmit ? win.__mockEmit(0, msg) : false;
  }, envelope);
  expect(delivered).toBe(true);
};

const resetSent = async (page: import('@playwright/test').Page) => {
  await page.evaluate(() => {
    (window as MockSocketWindow).__mockResetSent?.();
  });
};

const expectSentMessage = async (
  page: import('@playwright/test').Page,
  predicate: (message: unknown) => boolean
) => {
  await page.waitForFunction((fn: (message: unknown) => boolean) => {
    const sent = (window as MockSocketWindow).__mockSent;
    return Array.isArray(sent) && sent.some((msg) => fn(msg));
  }, predicate);
};

test('lobby countdown flow across two clients', async ({ page, context }) => {
  await injectMockSocket(page);
  await page.goto('/');
  await page.getByLabel('Player Name').fill('Master');
  await page.getByRole('button', { name: /solo run/i }).click();
  await waitForSocket(page);

  const memberPage = await context.newPage();
  await injectMockSocket(memberPage);
  await memberPage.goto('/');
  await memberPage.getByLabel('Player Name').fill('Member');
  await memberPage.getByRole('button', { name: /solo run/i }).click();
  await waitForSocket(memberPage);

  const now = Date.now();
  const welcomeMaster = {
    type: 'welcome',
    pv: 1,
    seq: 1,
    ts: now,
    payload: {
      playerId: 'p_master',
      resumeToken: 'token_master',
      roomId: 'room-1',
      seed: 'seed-1',
      role: 'master' as const,
      roomState: 'lobby' as const,
      lobby: {
        players: [
          {
            id: 'p_master',
            name: 'Master',
            ready: false,
            role: 'master' as const,
          },
          {
            id: 'p_member',
            name: 'Member',
            ready: false,
            role: 'member' as const,
          },
        ],
        maxPlayers: 4,
      },
      cfg: netConfig,
    },
  };

  const welcomeMember = {
    ...welcomeMaster,
    payload: {
      ...welcomeMaster.payload,
      playerId: 'p_member',
      role: 'member' as const,
    },
  };

  await emitMessage(page, welcomeMaster);
  await emitMessage(memberPage, welcomeMember);

  await expect(page.getByTestId('lobby-root')).toBeVisible();
  await expect(memberPage.getByTestId('lobby-root')).toBeVisible();
  const startButton = page.getByRole('button', { name: 'Start Match' });
  await expect(startButton).toBeDisabled();

  const memberReadyButton = memberPage.getByRole('button', {
    name: /ready up/i,
  });
  await memberReadyButton.click();
  await expectSentMessage(
    memberPage,
    (msg) => msg.type === 'ready_set' && msg.payload?.ready === true
  );
  await resetSent(memberPage);

  const lobbyReady = {
    type: 'lobby_state',
    pv: 1,
    seq: 2,
    ts: now + 1,
    payload: {
      roomState: 'lobby' as const,
      players: [
        {
          id: 'p_master',
          name: 'Master',
          ready: true,
          role: 'master' as const,
        },
        {
          id: 'p_member',
          name: 'Member',
          ready: true,
          role: 'member' as const,
        },
      ],
      maxPlayers: 4,
    },
  };

  await emitMessage(page, lobbyReady);
  await emitMessage(memberPage, lobbyReady);

  await expect(startButton).toBeEnabled();
  await startButton.click();
  await expectSentMessage(page, (msg) => msg.type === 'start_request');
  await resetSent(page);

  const countdownPayload = {
    type: 'start_countdown',
    pv: 1,
    seq: 3,
    ts: now + 2,
    payload: {
      startAtMs: now + 2000,
      serverTick: 0,
      countdownSec: 2,
    },
  };

  await emitMessage(page, countdownPayload);
  await emitMessage(memberPage, countdownPayload);

  await expect(page.getByTestId('lobby-countdown')).toBeVisible();
  await expect(memberPage.getByTestId('lobby-countdown')).toBeVisible();

  const startPayload = {
    type: 'start',
    pv: 1,
    seq: 4,
    ts: now + 3,
    payload: {
      startTick: 0,
      serverTick: 0,
      serverTimeMs: now + 2000,
      tps: 60,
    },
  };

  await emitMessage(page, startPayload);
  await emitMessage(memberPage, startPayload);

  await expect(page.getByTestId('lobby-root')).toHaveCount(0);
  await expect(memberPage.getByTestId('lobby-root')).toHaveCount(0);
});
