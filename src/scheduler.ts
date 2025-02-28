import { QueueManager } from "./queue";
import { TaskRemover, TaskRescheduler } from "./type";

export class Scheduler {
  private queue = new QueueManager();
  private readonly capacity: number = 20;
  private tokens: number = 0;
  private readonly refillInterval: number = 3000;
  private lastRefill: number = Date.now();
  private timer: ReturnType<typeof setTimeout> | null = null;

  public addPriorityTask(
    task: () => void | Promise<void>,
    delay?: number,
  ): [TaskRemover, TaskRescheduler] {
    let timer: number;
    let rm: TaskRemover;
    const reschedule = (delay: number) => {
      timer = setTimeout(() => {
        rm = this.queue.enqueuePriorityTask(task);
        this.schedule();
      }, delay) as unknown as number;
    };
    reschedule(delay ?? 0);
    const remover = () => {
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
    let timer: number;
    let rm: TaskRemover;
    const reschedule = (delay: number) => {
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
    while (
      (this.queue.hasWaitingTask() || this.queue.hasWaitingPriorityTask()) &&
      this.tokens >= 1
    ) {
      const task = this.queue.dequeue(this.tokens >= 10);
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
