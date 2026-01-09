import { existsSync } from "node:fs";
import { basename } from "node:path";

import { ensureChiefDir, getCurrentWorktree } from "../lib/config";
import { getGitRoot, isGitRepo } from "../lib/git";
import { getTaskStats, readTasks } from "../lib/tasks";

export async function listCommand(): Promise<void> {
  // Check if we're in a git repo
  if (!(await isGitRepo())) {
    throw new Error(
      "Not in a git repository. Please run from within a git repo.",
    );
  }

  const gitRoot = await getGitRoot();
  const chiefDir = await ensureChiefDir(gitRoot);

  // Get current worktree
  const worktreePath = await getCurrentWorktree(chiefDir);

  if (!worktreePath) {
    throw new Error(
      "No current worktree. Run `chief new <name>` or `chief use <name>` first.",
    );
  }

  if (!existsSync(worktreePath)) {
    throw new Error(`Worktree not found: ${worktreePath}`);
  }

  // Read tasks
  const tasks = await readTasks(worktreePath);

  if (tasks.length === 0) {
    console.log(`\nNo tasks found in ${basename(worktreePath)}`);
    console.log("Run `chief new` to create a new project with tasks.");
    return;
  }

  const stats = getTaskStats(tasks);

  console.log(`\nTasks for: ${basename(worktreePath)}`);
  console.log(`Progress: ${stats.completed}/${stats.total} completed\n`);
  console.log("─".repeat(80));

  for (const [i, task] of tasks.entries()) {
    const status = task.passes ? "✓" : "○";
    const statusColor = task.passes ? "\u001B[32m" : "\u001B[33m";
    const reset = "\u001B[0m";

    // Truncate description if too long
    const maxDescLen = 60;
    const desc =
      task.description.length > maxDescLen
        ? task.description.slice(0, maxDescLen - 3) + "..."
        : task.description;

    console.log(
      `${statusColor}${status}${reset} [${i + 1}] ${task.category}: ${desc}`,
    );
    console.log(`     Steps: ${task.steps.length}`);
  }

  console.log("─".repeat(80));
  console.log(`\n${stats.total - stats.completed} tasks remaining`);

  if (stats.completed < stats.total) {
    console.log("\nRun `chief run` to start working on tasks.");
  } else {
    console.log("\nAll tasks completed! Run `chief clean` to clean up.");
  }
}
