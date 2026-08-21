import { toast } from "sonner";

export function notifyTaskCreated() {
  toast.success("Task created");
}

export function notifyTaskCreateError(message: string) {
  toast.error(message);
}

export function notifyTaskDeleted() {
  toast.success("Task deleted");
}

export function notifyTaskDeleteError(message: string) {
  toast.error(message);
}
