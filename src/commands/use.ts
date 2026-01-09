import { existsSync } from "fs";
import { join, basename } from "path";
import { isGitRepo, getGitRoot } from "../lib/git";
import { ensureChiefDir, setCurrentWorktree } from "../lib/config";
import { selectWorktree } from "../lib/prompts";

export async function useCommand(args: string[]): Promise<void> {
  // Check if we're in a git repo
  if (!(await isGitRepo())) {
    throw new Error(
      "Not in a git repository. Please run from within a git repo."
    );
  }

  const gitRoot = await getGitRoot();
  const chiefDir = await ensureChiefDir(gitRoot);

  let worktreePath: string;
  let worktreeName: string;

  if (args.length === 0) {
    // Interactive selection
    const selected = await selectWorktree(chiefDir, {
      message: "Select a worktree to switch to:",
    });

    if (!selected) {
      return; // No worktrees exist, message already shown
    }

    worktreePath = selected;
    worktreeName = basename(selected);
  } else {
    // Use provided argument
    worktreeName = args[0];
    worktreePath = join(chiefDir, "worktrees", worktreeName);

    if (!existsSync(worktreePath)) {
      throw new Error(
        `Worktree not found: ${worktreeName}\n\nRun \`chief worktrees\` to see available worktrees.`
      );
    }
  }

  // Set as current worktree
  await setCurrentWorktree(chiefDir, worktreePath);

  console.log(`\n✓ Switched to worktree: ${worktreeName}`);
  console.log(`  Path: ${worktreePath}`);
  console.log("\nRun `chief tasks list` to see tasks or `chief run` to start.");
}
