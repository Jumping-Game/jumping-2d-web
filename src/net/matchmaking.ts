import { NET_CFG } from '../config/NetConfig';

export interface CreateRoomParams {
  name: string;
  region?: string;
  maxPlayers?: number;
  mode?: string;
}

export interface CreateRoomResponse {
  roomId: string;
  seed?: string;
  region?: string;
  wsUrl: string;
  wsToken: string;
}

export interface JoinRoomParams {
  name: string;
}

export interface JoinRoomResponse {
  roomId: string;
  wsUrl: string;
  wsToken: string;
  seed?: string;
}

export interface StatusRegion {
  id: string;
  pingMs?: number;
  wsUrl: string;
}

export interface StatusResponse {
  regions: StatusRegion[];
  serverPv: number;
}

interface RequestOptions {
  baseUrl?: string;
}

const ensureBaseUrl = (override?: string): string => {
  const base = override ?? NET_CFG.apiBaseUrl;
  if (!base) {
    throw new Error('Matchmaking API not configured');
  }
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

const buildUrl = (path: string, override?: string): string => {
  const base = ensureBaseUrl(override);
  return `${base}${path}`;
};

const parseError = async (response: Response): Promise<Error> => {
  let message = `${response.status} ${response.statusText}`;
  try {
    const data = await response.json();
    if (data && typeof data === 'object') {
      const code = typeof data.code === 'string' ? data.code : undefined;
      const bodyMessage =
        typeof data.message === 'string' ? data.message : undefined;
      if (code || bodyMessage) {
        message = [code, bodyMessage].filter(Boolean).join(': ');
      }
    }
  } catch {
    // Ignore JSON parse errors and fall back to generic message.
  }
  return new Error(message || 'Request failed');
};

const handleJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw await parseError(response);
  }
  return (await response.json()) as T;
};

export const createRoom = async (
  params: CreateRoomParams,
  options?: RequestOptions
): Promise<CreateRoomResponse> => {
  const payload: Record<string, unknown> = {
    name: params.name,
  };
  const region = params.region ?? NET_CFG.defaultRegion;
  if (region) {
    payload.region = region;
  }
  const maxPlayers = params.maxPlayers ?? NET_CFG.maxPlayers;
  if (typeof maxPlayers === 'number') {
    payload.maxPlayers = maxPlayers;
  }
  const preferredMode = params.mode ?? NET_CFG.defaultMode;
  const mode =
    typeof preferredMode === 'string' && preferredMode.trim().length > 0
      ? preferredMode.trim()
      : 'endless';
  payload.mode = mode;

  const response = await fetch(buildUrl('/v1/rooms', options?.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return handleJson<CreateRoomResponse>(response);
};

export const joinRoom = async (
  roomId: string,
  params: JoinRoomParams,
  options?: RequestOptions
): Promise<JoinRoomResponse> => {
  const response = await fetch(
    buildUrl(`/v1/rooms/${encodeURIComponent(roomId)}/join`, options?.baseUrl),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: params.name }),
    }
  );

  return handleJson<JoinRoomResponse>(response);
};

export const leaveRoom = async (
  roomId: string,
  options?: RequestOptions
): Promise<void> => {
  const response = await fetch(
    buildUrl(`/v1/rooms/${encodeURIComponent(roomId)}/leave`, options?.baseUrl),
    {
      method: 'POST',
    }
  );

  if (!response.ok && response.status !== 404) {
    throw await parseError(response);
  }
};

export const fetchStatus = async (
  options?: RequestOptions
): Promise<StatusResponse> => {
  const response = await fetch(buildUrl('/v1/status', options?.baseUrl));
  return handleJson<StatusResponse>(response);
};
