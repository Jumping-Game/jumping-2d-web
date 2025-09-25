import type { Pv } from './Protocol';

export interface NetRuntimeConfig {
  enabled: boolean;
  apiBaseUrl?: string;
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
  maxPlayers: number;
  defaultRegion?: string;
  defaultMode?: string;
  protocolPv: Pv;
}

type EnvValue = string | boolean | undefined;

type ImportMetaEnv = Record<string, EnvValue> & {
  MODE?: string;
};

const env = (import.meta.env ?? {}) as ImportMetaEnv;

const readString = (key: string): string | undefined => {
  const raw = env[key];
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof raw === 'boolean') {
    return raw ? 'true' : 'false';
  }
  return undefined;
};

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true') {
    return true;
  }
  if (normalized === '0' || normalized === 'false') {
    return false;
  }
  return fallback;
};

const pickString = (
  ...candidates: Array<string | undefined>
): string | undefined => {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate.length > 0) {
      return candidate;
    }
  }
  return undefined;
};

const parseProtocolPv = (): Pv => {
  const value = readString('VITE_PROTOCOL_PV') ?? readString('VITE_NET_PROTOCOL_PV');
  const parsed = Number(value);
  return parsed === 1 ? 1 : 1;
};

const defaultPlayerName = 'web-player';
const defaultClientVersion = 'web-dev';

const fallbackWsUrl = env.MODE === 'development' ? 'ws://localhost:8081/v1/ws' : undefined;
const fallbackApiBase =
  env.MODE === 'development' ? 'http://localhost:8080' : undefined;

const wsUrl = pickString(
  readString('VITE_WS_URL'),
  readString('VITE_NET_WS_URL'),
  fallbackWsUrl
);
const apiBaseUrl = pickString(
  readString('VITE_API_BASE'),
  readString('VITE_NET_API_BASE_URL'),
  fallbackApiBase
);
const wsToken = pickString(readString('VITE_WS_TOKEN'), readString('VITE_NET_WS_TOKEN'));

export const NET_CFG: NetRuntimeConfig = {
  enabled: Boolean(wsUrl || apiBaseUrl),
  apiBaseUrl,
  wsUrl,
  wsToken,
  playerName: readString('VITE_PLAYER_NAME') ?? readString('VITE_NET_PLAYER_NAME') ?? defaultPlayerName,
  clientVersion:
    readString('VITE_CLIENT_VERSION') ?? readString('VITE_NET_CLIENT_VERSION') ?? defaultClientVersion,
  device: readString('VITE_DEVICE') ?? readString('VITE_NET_DEVICE'),
  capabilities: {
    tilt: toBool(readString('VITE_CAP_TILT') ?? readString('VITE_NET_CAP_TILT'), false),
    vibrate: toBool(readString('VITE_CAP_VIBRATE') ?? readString('VITE_NET_CAP_VIBRATE'), true),
  },
  flushIntervalMs: Math.max(16, toNumber(readString('VITE_FLUSH_MS') ?? readString('VITE_NET_FLUSH_MS'), 50)),
  pingIntervalMs: Math.max(1000, toNumber(readString('VITE_PING_MS') ?? readString('VITE_NET_PING_MS'), 5000)),
  debug: toBool(readString('VITE_NET_DEBUG'), env.MODE === 'development'),
  maxPlayers: Math.max(1, toNumber(readString('VITE_MAX_PLAYERS') ?? readString('VITE_NET_MAX_PLAYERS'), 4)),
  defaultRegion: readString('VITE_REGION') ?? readString('VITE_NET_REGION'),
  defaultMode: readString('VITE_MODE') ?? readString('VITE_NET_MODE'),
  protocolPv: parseProtocolPv(),
};
