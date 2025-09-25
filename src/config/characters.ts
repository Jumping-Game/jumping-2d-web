export type CharacterId =
  | 'aurora'
  | 'cobalt'
  | 'jade'
  | 'sunrise'
  | 'violet'
  | 'ember'
  | 'ghost';

export interface CharacterOption {
  id: CharacterId;
  name: string;
  tint: number;
  accent: string;
  accentSecondary?: string;
}

export const CHARACTER_OPTIONS: readonly CharacterOption[] = [
  { id: 'aurora', name: 'Aurora', tint: 0xff8a80, accent: '#ff8a80', accentSecondary: '#ff5252' },
  { id: 'cobalt', name: 'Cobalt', tint: 0x82b1ff, accent: '#82b1ff', accentSecondary: '#448aff' },
  { id: 'jade', name: 'Jade', tint: 0x69f0ae, accent: '#69f0ae', accentSecondary: '#00e676' },
  { id: 'sunrise', name: 'Sunrise', tint: 0xffd740, accent: '#ffd740', accentSecondary: '#ffab00' },
  { id: 'violet', name: 'Violet', tint: 0xb388ff, accent: '#b388ff', accentSecondary: '#7c4dff' },
  { id: 'ember', name: 'Ember', tint: 0xff7043, accent: '#ff7043', accentSecondary: '#ff3d00' },
  { id: 'ghost', name: 'Ghost', tint: 0xcfd8dc, accent: '#cfd8dc', accentSecondary: '#90a4ae' },
] as const;

export const DEFAULT_CHARACTER_ID: CharacterId = CHARACTER_OPTIONS[0]!.id;

export const CHARACTER_OPTION_MAP = new Map<CharacterId, CharacterOption>(
  CHARACTER_OPTIONS.map((option) => [option.id, option])
);

export function getCharacterOption(id: CharacterId | undefined): CharacterOption {
  if (!id) {
    return CHARACTER_OPTIONS[0]!;
  }
  return CHARACTER_OPTION_MAP.get(id) ?? CHARACTER_OPTIONS[0]!;
}

export function tintToHex(tint: number): string {
  return `#${tint.toString(16).padStart(6, '0')}`;
}

const HASH_SEED = 0x811c9dc5;
const HASH_PRIME = 0x01000193;

function hashString(value: string): number {
  let hash = HASH_SEED;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, HASH_PRIME);
  }
  return hash >>> 0;
}

export function pickDefaultCharacter(
  playerId: string,
  currentAssignments: Record<string, CharacterId>
): CharacterId {
  const hash = hashString(playerId);
  const options = CHARACTER_OPTIONS;
  const used = new Set(Object.values(currentAssignments));
  const offset = hash % options.length;
  for (let i = 0; i < options.length; i += 1) {
    const candidate = options[(offset + i) % options.length]!;
    if (!used.has(candidate.id)) {
      return candidate.id;
    }
  }
  return options[offset % options.length]!.id;
}
