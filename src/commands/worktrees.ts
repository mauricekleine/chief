import { getProjectNameFromGitRoot } from "../lib/config";
import {
  detectWorktreeFromCwd,
  getGitRoot,
  isGitRepo,
  listWorktreeDirectories,
} from "../lib/git";
import { getTaskStats, readTasks } from "../lib/tasks";

export async function worktreesCommand(): Promise<void> {
  let projectName: string;

  // Try to auto-detect from CWD if inside a worktree
  const detected = detectWorktreeFromCwd();

  if (detected) {
    projectName = detected.projectName;
  } else {
    // Fall back to git repo
    if (!(await isGitRepo())) {
      throw new Error(
        "Not in a git repository or chief worktree. Please run from within a git repo or worktree.",
      );
    }

    const gitRoot = await getGitRoot();
    projectName = getProjectNameFromGitRoot(gitRoot);
  }

  // List all worktrees
  const worktrees = await listWorktreeDirectories(projectName);

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
