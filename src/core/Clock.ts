export class Clock {
  private tps: number;
  private timeStep: number;
  private accumulator: number;
  private lastTime: number;
  private tick: number;
  private isRunning: boolean;

  public onUpdate: (tick: number, dt: number) => void;

  constructor(tps: number, onUpdate: (tick: number, dt: number) => void) {
    this.tps = tps;
    this.timeStep = 1000 / this.tps;
    this.accumulator = 0;
    this.lastTime = 0;
    this.tick = 0;
    this.isRunning = false;
    this.onUpdate = onUpdate;

    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    requestAnimationFrame(this.loop.bind(this));
  }

  stop() {
    this.isRunning = false;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private loop(time: number) {
    if (!this.isRunning) return;

    const deltaTime = time - this.lastTime;
    this.lastTime = time;
    this.accumulator += deltaTime;

    while (this.accumulator >= this.timeStep) {
      this.onUpdate(this.tick, this.timeStep / 1000);
      this.tick++;
      this.accumulator -= this.timeStep;
    }

    requestAnimationFrame(this.loop.bind(this));
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      // Pause the clock, but keep it "running"
      this.lastTime = performance.now();
    } else {
      // Resume the clock, reset lastTime to prevent a large jump
      this.lastTime = performance.now();
    }
  }
}