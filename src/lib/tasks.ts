import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

import type { Task } from "../types";

/**
 * Read tasks from a tasks file path.
 */
export async function readTasks(tasksPath: string): Promise<Task[]> {
  if (!existsSync(tasksPath)) {
    return [];
  }

  const content = await readFile(tasksPath, "utf8");
  return JSON.parse(content) as Task[];
}

/**
 * Check if there are pending tasks (any task with passes=false).
 */
export function hasPendingTasks(tasks: Task[]): boolean {
  return tasks.some((task) => !task.passes);
}
