import { select } from "@inquirer/prompts";
import { listWorktreeDirectories } from "./git";
import { getCurrentWorktree } from "./config";

export interface SelectWorktreeOptions {
  message?: string;
  excludeCurrent?: boolean;
}

/**
 * Prompt user to select a worktree from an interactive list.
 * Returns the selected worktree path, or null if no worktrees exist.
 */
export async function selectWorktree(
  chiefDir: string,
  options?: SelectWorktreeOptions
): Promise<string | null> {
  const worktrees = await listWorktreeDirectories(chiefDir);

  if (worktrees.length === 0) {
    console.log("\nNo worktrees found.");
    console.log("Run `chief new` to create one.");
    return null;
  }

  const currentWorktree = await getCurrentWorktree(chiefDir);

  const choices = worktrees
    .filter((wt) => !options?.excludeCurrent || wt.path !== currentWorktree)
    .map((wt) => {
      const isCurrent = wt.path === currentWorktree;
      return {
        name: isCurrent ? `${wt.name} [current]` : wt.name,
        value: wt.path,
      };
    });

  if (choices.length === 0) {
    console.log("\nNo other worktrees available.");
    console.log("Run `chief new` to create one.");
    return null;
  }

  return select({
    message: options?.message ?? "Select a worktree:",
    choices,
  });
}
