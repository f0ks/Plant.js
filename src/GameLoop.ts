import type { GameLoopOptions } from "./types";
import type { Scene } from "./Scene";

export class GameLoop {
  scene: Scene;
  interval: number;
  code: (() => void) | null = null;

  private isActive: boolean = false;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private animFrameId: number | null = null;

  constructor(options: GameLoopOptions) {
    this.scene = options.scene;
    this.interval = options.interval ?? 50;
  }

  start(): boolean {
    if (this.isActive) return false;

    this.isActive = true;

    if (this.scene.useTimer) {
      this.timerHandle = setInterval(() => this.code?.(), this.interval);
    } else {
      const loop = (): void => {
        this.code?.();
        if (this.isActive) {
          this.animFrameId = requestAnimationFrame(loop);
        }
      };
      this.animFrameId = requestAnimationFrame(loop);
    }

    return true;
  }

  stop(): boolean {
    if (!this.isActive) return false;

    this.isActive = false;

    if (this.scene.useTimer) {
      if (this.timerHandle !== null) {
        clearInterval(this.timerHandle);
        this.timerHandle = null;
      }
    } else {
      if (this.animFrameId !== null) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
    }

    return true;
  }
}
