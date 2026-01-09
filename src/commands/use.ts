import { existsSync } from "node:fs";
import { join } from "node:path";

import { ensureChiefDir, setCurrentWorktree } from "../lib/config";
import { getGitRoot, isGitRepo } from "../lib/git";

export async function useCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    throw new Error("Please provide a worktree name: chief use <name>");
  }

  const worktreeName = args[0];

  // Check if we're in a git repo
  if (!(await isGitRepo())) {
    throw new Error(
      "Not in a git repository. Please run from within a git repo.",
    );
  }

  const gitRoot = await getGitRoot();
  const chiefDir = await ensureChiefDir(gitRoot);

  // Check if worktree exists
  const worktreePath = join(chiefDir, "worktrees", worktreeName);

  if (!existsSync(worktreePath)) {
    throw new Error(
      `Worktree not found: ${worktreeName}\n\nRun \`chief worktrees\` to see available worktrees.`,
    );
  }

  // Set as current worktree
  await setCurrentWorktree(chiefDir, worktreePath);

  console.log(`\n✓ Switched to worktree: ${worktreeName}`);
  console.log(`  Path: ${worktreePath}`);
  console.log("\nRun `chief list` to see tasks or `chief run` to start.");
}
