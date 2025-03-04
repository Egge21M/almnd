import { PollingEventHandler } from "./type";

export class PollingEventEmitter<T extends Record<string, any>> {
  private listeners: { [K in keyof T]?: PollingEventHandler<T[K]>[] } = {};

  on<K extends keyof T>(event: K, handler: PollingEventHandler<T[K]>) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }

  emit<K extends keyof T>(event: K, payload: T[K]) {
    this.listeners[event]?.forEach((cb) => cb(payload));
  }
}
