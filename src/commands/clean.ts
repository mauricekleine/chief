import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { createInterface } from "node:readline";

import {
  ensureChiefDir,
  getConfig,
  getCurrentWorktree,
  setConfig,
} from "../lib/config";
import { getGitRoot, isGitRepo, removeWorktree } from "../lib/git";

function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function cleanCommand(args: string[]): Promise<void> {
  // Check if we're in a git repo
  if (!(await isGitRepo())) {
    throw new Error(
      "Not in a git repository. Please run from within a git repo.",
    );
  }

  const gitRoot = await getGitRoot();
  const chiefDir = await ensureChiefDir(gitRoot);

  // Determine which worktree to clean
  let worktreePath: string;
  let worktreeName: string;

  if (args.length > 0) {
    // Use specified worktree
    worktreeName = args[0];
    worktreePath = join(chiefDir, "worktrees", worktreeName);
  } else {
    // Use current worktree
    const current = await getCurrentWorktree(chiefDir);
    if (!current) {
      throw new Error(
        "No current worktree. Specify a worktree name: chief clean <name>",
      );
    }
    worktreePath = current;
    worktreeName = basename(worktreePath);
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

  // Update config if this was the current worktree
  const config = await getConfig(chiefDir);
  if (config.currentWorktree === worktreePath) {
    config.currentWorktree = undefined;
    await setConfig(chiefDir, config);
  }

  console.log(`\n✓ Worktree "${worktreeName}" cleaned up successfully.`);
  console.log(
    "\nYou can start a new project by running `chief new <project-name>`.",
  );
}
