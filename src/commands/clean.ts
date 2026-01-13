import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { basename, join } from "node:path";

import { getGlobalChiefDir, getProjectNameFromGitRoot } from "../lib/config";
import {
  detectWorktreeFromCwd,
  getGitRoot,
  isGitRepo,
  removeWorktree,
} from "../lib/git";
import { selectWorktree } from "../lib/prompts";
import { prompt } from "../lib/terminal";

export async function cleanCommand(args: string[]): Promise<void> {
  // Determine which worktree to clean
  let worktreePath: string;
  let worktreeName: string;

  // Try to auto-detect worktree from CWD
  const detected = detectWorktreeFromCwd();

  if (detected && args.length === 0) {
    // Use detected worktree
    worktreePath = detected.worktreePath;
    worktreeName = detected.worktreeName;
    console.log(`Using detected worktree: ${worktreeName}`);
  } else {
    // Fall back to original logic - require git repo
    if (!(await isGitRepo())) {
      throw new Error(
        "Not in a git repository or chief worktree. Please run from within a git repo or worktree.",
      );
    }

    const gitRoot = await getGitRoot();
    const projectName = getProjectNameFromGitRoot(gitRoot);
    const globalChiefDir = getGlobalChiefDir(projectName);

    if (args.length > 0) {
      // Use specified worktree
      worktreeName = args[0] as string;
      worktreePath = join(globalChiefDir, "worktrees", worktreeName);
    } else {
      // Interactive selection
      const selected = await selectWorktree(projectName, {
        message: "Select a worktree to clean:",
      });

      if (!selected) {
        return; // No worktrees exist, message already shown
      }

      worktreePath = selected;
      worktreeName = basename(worktreePath);
    }
  }

  if (!existsSync(worktreePath)) {
    throw new Error(
      `Worktree not found: ${worktreeName}\n\nRun \`chief worktrees\` to see available worktrees.`,
    );
  }

  // Confirm with user
  const answer = await prompt(
    `\nAre you sure you want to delete worktree "${worktreeName}"? (y/N) `,
  );

  if (answer.toLowerCase() !== "y") {
    console.log("Cancelled.");
    return;
  }

  console.log(`\nDeleting worktree: ${worktreeName}`);

  try {
    // Remove git worktree
    await removeWorktree(worktreePath);
  } catch {
    // If git worktree remove fails, try to remove directory directly
    console.log("Note: Git worktree may have been removed already.");
  }

  // Remove directory if it still exists
  if (existsSync(worktreePath)) {
    await rm(worktreePath, { force: true, recursive: true });
  }

  console.log(`\n✓ Worktree "${worktreeName}" cleaned up successfully.`);
  console.log(
    "\nYou can start a new project by running `chief new <project-name>`.",
  );
}
