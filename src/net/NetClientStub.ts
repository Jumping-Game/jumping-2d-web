import { Input, Snapshot } from './Protocol';

export class NetClientStub {
  private onSnapshotCallback?: (snapshot: Snapshot) => void;

  prepareJoin(name: string) {
    console.log(`[NetClientStub] Preparing to join as ${name}`);
    // In a real implementation, this would initiate a connection.
  }

  bufferInput(tick: number, axisX: number, jump: boolean) {
    const input: Input = { tick, axisX, jump };
    // In a real implementation, this would buffer the input.
    // console.log(`[NetClientStub] Buffering input:`, input);
  }

  flushInputBatch() {
    // In a real implementation, this would send the buffered input to the server.
    // console.log(`[NetClientStub] Flushing input batch`);
  }

  onSnapshot(cb: (snapshot: Snapshot) => void) {
    this.onSnapshotCallback = cb;
  }

  // This method is for local simulation of receiving a snapshot.
  simulateSnapshot(snapshot: Snapshot) {
    if (this.onSnapshotCallback) {
      this.onSnapshotCallback(snapshot);
    }
  }
}