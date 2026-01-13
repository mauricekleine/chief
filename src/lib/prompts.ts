import { select } from "@inquirer/prompts";

import { listWorktreeDirectories } from "./git";

export interface SelectWorktreeOptions {
  message?: string;
}

/**
 * Prompt user to select a worktree from an interactive list.
 * Returns the selected worktree path, or null if no worktrees exist.
 */
export async function selectWorktree(
  projectName: string,
  options?: SelectWorktreeOptions,
): Promise<string | null> {
  const worktrees = await listWorktreeDirectories(projectName);

  if (worktrees.length === 0) {
    console.log("\nNo worktrees found.");
    console.log("Run `chief new` to create one.");
    return null;
  }

  const choices = worktrees.map((wt) => ({
    name: wt.name,
    value: wt.path,
  }));

  return select({
    choices,
    message: options?.message ?? "Select a worktree:",
  });
}
