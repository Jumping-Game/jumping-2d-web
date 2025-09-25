import { NetInputPayload, S2CSnapshot } from './Protocol';

export class NetClientStub {
  private onSnapshotCallback?: (snapshot: S2CSnapshot) => void;
  private inputBuffer: NetInputPayload[] = [];

  prepareJoin(name: string) {
    console.info(`[NetClientStub] prepareJoin(${name})`);
  }

  bufferInput(tick: number, axisX: number, jump: boolean) {
    this.inputBuffer.push({ tick, axisX, jump });
  }

  flushInputBatch(): NetInputPayload[] {
    const batch = [...this.inputBuffer];
    this.inputBuffer.length = 0;
    return batch;
  }

  onSnapshot(cb: (snapshot: S2CSnapshot) => void) {
    this.onSnapshotCallback = cb;
  }

  simulateSnapshot(snapshot: S2CSnapshot) {
    this.onSnapshotCallback?.(snapshot);
  }
}
