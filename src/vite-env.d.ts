/// <reference types="vite/client" />

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.wav' {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_NET_WS_URL?: string;
  readonly VITE_NET_WS_TOKEN?: string;
  readonly VITE_NET_PLAYER_NAME?: string;
  readonly VITE_NET_CLIENT_VERSION?: string;
  readonly VITE_NET_DEVICE?: string;
  readonly VITE_NET_CAP_TILT?: string;
  readonly VITE_NET_CAP_VIBRATE?: string;
  readonly VITE_NET_FLUSH_MS?: string;
  readonly VITE_NET_PING_MS?: string;
  readonly VITE_NET_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
