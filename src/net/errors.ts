export const NET_ERROR_CODES = [
  'NOT_MASTER',
  'ROOM_STATE_INVALID',
  'ROOM_NOT_READY',
  'START_ALREADY',
  'COUNTDOWN_ACTIVE',
] as const;

export type NetErrorCode = (typeof NET_ERROR_CODES)[number];

const ERROR_CODE_SET = new Set<string>(NET_ERROR_CODES);

export const isKnownNetErrorCode = (code: string): code is NetErrorCode =>
  ERROR_CODE_SET.has(code);

export const isStartBlockedError = (code: string): boolean =>
  code === 'ROOM_NOT_READY' || code === 'COUNTDOWN_ACTIVE';
