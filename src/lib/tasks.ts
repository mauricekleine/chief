import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { Task } from "../types";

/**
 * Read tasks from .chief/tasks.json in the worktree.
 */
export async function readTasks(worktreePath: string): Promise<Task[]> {
  const tasksPath = join(worktreePath, ".chief", "tasks.json");

  if (!existsSync(tasksPath)) {
    return [];
  }

  const content = await readFile(tasksPath, "utf-8");
  return JSON.parse(content) as Task[];
}

/**
 * Check if there are pending tasks (any task with passes=false).
 */
export function hasPendingTasks(tasks: Task[]): boolean {
  return tasks.some((task) => !task.passes);
}

/**
 * Get task completion statistics.
 */
export function getTaskStats(tasks: Task[]): { completed: number; total: number } {
  const completed = tasks.filter((task) => task.passes).length;
  return { completed, total: tasks.length };
}

/**
 * Get the task schema JSON.
 */
export function getTaskSchema(): object {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Tasks",
    type: "array",
    items: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "The category of the task",
        },
        description: {
          type: "string",
          description: "A detailed description of the task",
        },
        passes: {
          type: "boolean",
          description: "Indicates if the task has passed or is completed",
          default: false,
        },
        steps: {
          type: "array",
          description: "A list of steps to complete the task",
          items: {
            type: "string",
          },
        },
      },
      required: ["category", "description", "passes", "steps"],
      additionalProperties: false,
    },
  };
}

/**
 * Write the task schema to .chief/tasks.schema.json.
 */
export async function writeTaskSchema(chiefDir: string): Promise<void> {
  const schemaPath = join(chiefDir, "tasks.schema.json");
  await writeFile(schemaPath, JSON.stringify(getTaskSchema(), null, 2));
}
