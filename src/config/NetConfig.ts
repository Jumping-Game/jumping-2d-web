export interface NetRuntimeConfig {
  enabled: boolean;
  wsUrl?: string;
  wsToken?: string;
  playerName: string;
  clientVersion: string;
  device?: string;
  capabilities: {
    tilt: boolean;
    vibrate: boolean;
  };
  flushIntervalMs: number;
  pingIntervalMs: number;
  debug: boolean;
}

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeBool = (
  value: string | undefined,
  fallback: boolean
): boolean => {
  if (value === undefined) return fallback;
  if (value === '1' || value.toLowerCase() === 'true') return true;
  if (value === '0' || value.toLowerCase() === 'false') return false;
  return fallback;
};

const env = import.meta.env;

const wsUrl = env.VITE_NET_WS_URL?.trim();
const wsToken = env.VITE_NET_WS_TOKEN?.trim();
const playerName = env.VITE_NET_PLAYER_NAME?.trim() || 'web-player';
const clientVersion = env.VITE_NET_CLIENT_VERSION?.trim() || 'web-dev';

export const NET_CFG: NetRuntimeConfig = {
  enabled: Boolean(wsUrl),
  wsUrl,
  wsToken,
  playerName,
  clientVersion,
  device: env.VITE_NET_DEVICE?.trim(),
  capabilities: {
    tilt: normalizeBool(env.VITE_NET_CAP_TILT, false),
    vibrate: normalizeBool(env.VITE_NET_CAP_VIBRATE, true),
  },
  flushIntervalMs: Math.max(16, toNumber(env.VITE_NET_FLUSH_MS, 50)),
  pingIntervalMs: Math.max(1000, toNumber(env.VITE_NET_PING_MS, 5000)),
  debug: normalizeBool(env.VITE_NET_DEBUG, false),
};
