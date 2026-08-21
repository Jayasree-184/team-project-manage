import { beforeEach, describe, expect, it, vi } from "vitest";

const success = vi.fn();
const error = vi.fn();

vi.mock("sonner", () => ({ toast: { success, error } }));

import { notifyTaskCreateError, notifyTaskCreated, notifyTaskDeleteError, notifyTaskDeleted } from "./taskNotifications";

describe("task notification handlers", () => {
  beforeEach(() => {
    success.mockClear();
    error.mockClear();
  });

  it("reports task creation success and failure", () => {
    notifyTaskCreated();
    notifyTaskCreateError("Task title is required");
    expect(success).toHaveBeenCalledWith("Task created");
    expect(error).toHaveBeenCalledWith("Task title is required");
  });

  it("reports task deletion success and failure", () => {
    notifyTaskDeleted();
    notifyTaskDeleteError("Task not found");
    expect(success).toHaveBeenCalledWith("Task deleted");
    expect(error).toHaveBeenCalledWith("Task not found");
  });
});
