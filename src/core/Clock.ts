import { Tick } from './Types';

const MAX_FRAME_DELTA_MS = 250; // avoid spiral of death

type StepFn = (tick: Tick) => void;
type RenderFn = (alpha: number) => void;

type VisibilityHandler = () => void;

export class Clock {
  private readonly stepMs: number;
  private accumulator = 0;
  private lastTime = 0;
  private tick: Tick = 0;
  private running = false;
  private rafId = 0;
  private paused = false;
  private readonly onStep: StepFn;
  private readonly onRender?: RenderFn;
  private readonly onVisibilityChange: VisibilityHandler;

  constructor(tps: number, onStep: StepFn, onRender?: RenderFn) {
    this.stepMs = 1000 / tps;
    this.onStep = onStep;
    this.onRender = onRender;
    this.onVisibilityChange = () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.accumulator = 0;
    this.lastTime = performance.now();
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.rafId = requestAnimationFrame((time) => this.loop(time));
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.rafId);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    if (!this.running) return;
    this.paused = false;
    this.accumulator = 0;
    this.lastTime = performance.now();
  }

  private loop(time: number): void {
    if (!this.running) return;

    const delta = Math.min(time - this.lastTime, MAX_FRAME_DELTA_MS);
    this.lastTime = time;

    if (!this.paused) {
      this.accumulator += delta;
      while (this.accumulator >= this.stepMs) {
        this.onStep(this.tick);
        this.tick += 1;
        this.accumulator -= this.stepMs;
      }
    }

    if (this.onRender) {
      const alpha = this.accumulator / this.stepMs;
      this.onRender(alpha);
    }

    this.rafId = requestAnimationFrame((next) => this.loop(next));
  }
}
