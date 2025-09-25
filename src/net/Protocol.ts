import { Vec2 } from '../core/Types';

export const PROTOCOL_VERSION = 1;

export interface Envelope {
  pv: number;
  // And one of the following messages:
  join?: Join;
  input_batch?: InputBatch;
  welcome?: Welcome;
  start?: Start;
  snapshot?: Snapshot;
  pong?: Pong;
  error?: Error;
  finish?: Finish;
}

export interface Join {
  name: string;
}

export interface Input {
  tick: number;
  axisX: number;
  jump: boolean;
}

export interface InputBatch {
  inputs: Input[];
}

export interface Welcome {
  clientId: string;
  tick: number;
}

export interface Start {
  serverTick: number;
  startTime: number;
}

export interface Snapshot {
  tick: number;
  // A full snapshot of the world state would go here.
  // For now, we'll just include the player state.
  player: {
    position: Vec2;
    velocity: Vec2;
  };
}

export interface Pong {
  clientTime: number;
  serverTime: number;
}

export interface Error {
  code: number;
  message: string;
}

export interface Finish {
  score: number;
}