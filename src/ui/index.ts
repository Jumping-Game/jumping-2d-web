import { UIManager } from './UIManager';

let instance: UIManager | null = null;

export function initUIManager(container: HTMLElement): UIManager {
  instance = new UIManager(container);
  return instance;
}

export function getUIManager(): UIManager {
  if (!instance) {
    throw new Error('UIManager has not been initialised');
  }
  return instance;
}
