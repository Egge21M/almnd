import { QueueManager } from "./queue";
import { Logger, TaskRemover, TaskRescheduler } from "./type";

export class Scheduler {
  private queue = new QueueManager();
  private readonly capacity: number;
  private tokens: number = 0;
  private readonly refillInterval: number;
  private lastRefill: number = Date.now();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private logger?: Logger;

  constructor(options?: {
    throttleTimeout?: number;
    throttleCapacity?: number;
    logger?: Logger;
  }) {
    this.refillInterval = options?.throttleTimeout ?? 3000;
    this.capacity = options?.throttleCapacity ?? 5;
    this.logger = options?.logger;
  }

  public addPriorityTask(
    task: () => void | Promise<void>,
    delay?: number,
  ): [TaskRemover, TaskRescheduler] {
    this.logger?.log("Adding priority task");
    let timer: number;
    let rm: TaskRemover;
    const reschedule = (delay: number) => {
      this.logger?.log(`Scheduling priority task with ${delay}ms delay`);
      timer = setTimeout(() => {
        rm = this.queue.enqueuePriorityTask(task);
        this.schedule();
      }, delay) as unknown as number;
    };
    reschedule(delay ?? 0);
    const remover = () => {
      this.logger?.log("Removing priority task from queue");
      if (timer) {
        clearTimeout(timer);
      }
      if (rm) {
        rm();
      }
    };
    return [remover, reschedule];
  }

  public addTask(
    task: () => void | Promise<void>,
    delay?: number,
  ): [TaskRemover, TaskRescheduler] {
    this.logger?.log("Adding task");
    let timer: number;
    let rm: TaskRemover;
    const reschedule = (delay: number) => {
      this.logger?.log(`Scheduling task with ${delay}ms delay`);
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        rm = this.queue.enqueueTask(task);
        this.schedule();
      }, delay) as unknown as number;
    };
    reschedule(delay ?? 0);
    const remover = () => {
      this.logger?.log("Removing priority task from queue");
      if (timer) {
        clearTimeout(timer);
      }
      if (rm) {
        rm();
      }
    };
    return [remover, reschedule];
  }

  private schedule(): void {
    if (!this.timer) {
      this.processQueue();
    }
  }

  private processQueue(): void {
    this.refillTokens();
    this.logger?.log(`Processing queue with ${this.tokens} left`);
    while (
      (this.queue.hasWaitingTask() || this.queue.hasWaitingPriorityTask()) &&
      this.tokens >= 1
    ) {
      const task = this.queue.dequeue(this.tokens >= 5);
      if (!task) {
        continue;
      }
      try {
        const result = task();
        if (result instanceof Promise) {
          result.catch((err) => console.error("Task error:", err));
        }
      } catch (err) {
        console.error("Task error:", err);
      }
      this.tokens -= 1;
    }

    if (this.queue.hasWaitingTask() || this.queue.hasWaitingPriorityTask()) {
      this.waitUntilNextToken();
    }
  }

  private refillTokens() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsed / this.refillInterval,
    );
    this.lastRefill = now;
  }

  private waitUntilNextToken() {
    const timeUntilNextToken = this.refillInterval * (1 - this.tokens);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.processQueue();
    }, timeUntilNextToken);
  }
}
