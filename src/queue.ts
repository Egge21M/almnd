import { LinkedQueue } from "./linkedQueue";
import { Task, TaskRemover } from "./type";

export class QueueManager {
  private priorityQueue = new LinkedQueue<Task>();
  private regularQueue = new LinkedQueue<Task>();
  private priorityManager = new PriorityManager();

  enqueuePriorityTask(t: Task): TaskRemover {
    const node = this.priorityQueue.enqueue(t);
    return () => {
      this.priorityQueue.remove(node);
    };
  }
  enqueueTask(t: Task): TaskRemover {
    const node = this.regularQueue.enqueue(t);
    return () => {
      this.regularQueue.remove(node);
    };
  }
  hasWaitingTask() {
    return this.regularQueue.hasQueuedNode();
  }
  hasWaitingPriorityTask() {
    return this.priorityQueue.hasQueuedNode();
  }
  dequeue(allowAllTasksOnPriorityTick: boolean): Task | undefined {
    const isPriority = this.priorityManager.isPriority();
    if (isPriority && this.hasWaitingPriorityTask()) {
      return this.priorityQueue.dequeue()!;
    } else if (
      isPriority &&
      this.hasWaitingTask() &&
      allowAllTasksOnPriorityTick
    ) {
      return this.regularQueue.dequeue()!;
    } else if (!isPriority && this.hasWaitingTask()) {
      return this.regularQueue.dequeue()!;
    }
  }
}

class PriorityManager {
  counter: 0 | 1 | 2 | 3 = 0;

  isPriority() {
    const oldCounter = this.counter;
    if (this.counter === 3) {
      this.counter = 0;
    } else {
      this.counter++;
    }
    return oldCounter < 3;
  }
}
