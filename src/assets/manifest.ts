import playerUrl from './images/player.svg';
import platformUrl from './images/platform.svg';
import springUrl from './images/spring.svg';
import jetpackUrl from './images/jetpack.svg';
import bgFarUrl from './images/bg-layer-far.svg';
import bgMidUrl from './images/bg-layer-mid.svg';
import bgNearUrl from './images/bg-layer-near.svg';
import jumpSfxUrl from './audio/jump.wav';
import springSfxUrl from './audio/spring.wav';
import breakSfxUrl from './audio/break.wav';

export const assetManifest = {
  images: {
    player: playerUrl,
    platform: platformUrl,
    spring: springUrl,
    jetpack: jetpackUrl,
    bgFar: bgFarUrl,
    bgMid: bgMidUrl,
    bgNear: bgNearUrl,
  },
  audio: {
    jump: jumpSfxUrl,
    spring: springSfxUrl,
    break: breakSfxUrl,
  },
};

export type AssetKey = keyof typeof assetManifest.images;
