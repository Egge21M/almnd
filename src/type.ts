export type Task = () => void | Promise<void>;

export type TaskRemover = () => void;
export type TaskRescheduler = (delay: number) => void;
