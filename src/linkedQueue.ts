class LinkedQueueNode<T> {
  public prev: LinkedQueueNode<T> | null = null;
  public next: LinkedQueueNode<T> | null = null;
  public data: T;

  constructor(data: T) {
    this.data = data;
  }

  resetPointers() {
    this.prev = null;
    this.next = null;
  }
}

export class LinkedQueue<T> {
  private head: LinkedQueueNode<T> | null = null;
  private tail: LinkedQueueNode<T> | null = null;
  private length: number = 0;

  enqueue(data: T) {
    const node = new LinkedQueueNode(data);
    if (!this.tail) {
      this.tail = node;
      this.head = node;
    } else {
      const oldTail = this.tail;
      this.tail = node;
      oldTail.next = node;
      node.prev = oldTail;
    }
    this.length++;
    return node;
  }

  dequeue() {
    if (!this.head) {
      return null;
    }
    if (this.head === this.tail) {
      const oldHead = this.head!;
      this.head = null;
      this.tail = null;
      return oldHead.data;
    }
    const oldHead = this.head;
    this.head.prev = null;
    this.head = oldHead.next;
    this.length--;
    return oldHead.data;
  }

  remove(node: LinkedQueueNode<T>) {
    if (node === this.head) {
      this.head = node.next;
    } else if (node === this.tail) {
      this.tail = node.prev;
    } else {
      const prev = node.prev!;
      const next = node.next!;
      prev.next = next;
      next.prev = prev;
    }
    this.length--;
    node.resetPointers();
  }

  hasQueuedNode() {
    return !!this.head;
  }
}
