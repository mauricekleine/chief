import { isGitRepo, getGitRoot, listWorktreeDirectories } from "../lib/git";
import { readTasks, getTaskStats } from "../lib/tasks";
import { ensureChiefDir, getCurrentWorktree } from "../lib/config";

export async function worktreesCommand(_args: string[]): Promise<void> {
  // Check if we're in a git repo
  if (!(await isGitRepo())) {
    throw new Error(
      "Not in a git repository. Please run from within a git repo."
    );
  }

  const gitRoot = await getGitRoot();
  const chiefDir = await ensureChiefDir(gitRoot);

  // Get current worktree for marking
  const currentWorktree = await getCurrentWorktree(chiefDir);

  // List all worktrees
  const worktrees = await listWorktreeDirectories(chiefDir);

  if (worktrees.length === 0) {
    console.log("\nNo worktrees found.");
    console.log("Run `chief new <name>` to create one.");
    return;
  }

  console.log("\nWorktrees:\n");
  console.log("─".repeat(80));

  for (const wt of worktrees) {
    const isCurrent = currentWorktree === wt.path;
    const marker = isCurrent ? " [current]" : "";
    const highlight = isCurrent ? "\x1b[36m" : "";
    const reset = isCurrent ? "\x1b[0m" : "";

    // Try to get task stats
    let progressStr = "";
    try {
      const tasks = await readTasks(wt.path);
      if (tasks.length > 0) {
        const stats = getTaskStats(tasks);
        progressStr = `  Tasks: ${stats.completed}/${stats.total}`;
      }
    } catch {
      // Ignore errors reading tasks
    }

    const dateStr = wt.createdAt.toLocaleDateString();

    console.log(`${highlight}${wt.name}${marker}${reset}`);
    console.log(`  Created: ${dateStr}${progressStr}`);
    console.log(`  Path: ${wt.path}`);
    console.log();
  }

  console.log("─".repeat(80));
  console.log(`\n${worktrees.length} worktree(s) total`);
  console.log("\nUse `chief use <name>` to switch worktrees.");
}
