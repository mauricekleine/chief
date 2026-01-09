import { ensureChiefDir } from "../lib/config";
import { getGitRoot, isGitRepo, listWorktreeDirectories } from "../lib/git";
import { getTaskStats, readTasks } from "../lib/tasks";

export async function worktreesCommand(): Promise<void> {
  // Check if we're in a git repo
  if (!(await isGitRepo())) {
    throw new Error(
      "Not in a git repository. Please run from within a git repo.",
    );
  }

  const gitRoot = await getGitRoot();
  const chiefDir = await ensureChiefDir(gitRoot);

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

    console.log(wt.name);
    console.log(`  Created: ${dateStr}${progressStr}`);
    console.log(`  Path: ${wt.path}`);
    console.log();
  }

  console.log("─".repeat(80));
  console.log(`\n${worktrees.length} worktree(s) total`);
  console.log("\nUse `chief run <name>` to work on a worktree.");
}
