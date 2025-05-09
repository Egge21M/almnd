import { MintQuoteResponse } from "@cashu/cashu-ts";

export type Task = () => void | Promise<void>;

export type TaskRemover = () => void;
export type TaskRescheduler = (delay: number) => void;

export type MintQuoteActions = {
  polling: null;
  response: MintQuoteResponse;
  paid: MintQuoteResponse;
  issued: MintQuoteResponse;
  expired: MintQuoteResponse;
  error: Error;
};

export type PollingEventHandler<T> = (payload: T) => void;

export interface Logger {
  log: (message: string) => void;
}
