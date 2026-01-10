import { existsSync } from "node:fs";
import { join } from "node:path";

import { ensureChiefDir } from "../lib/config";
import { getGitRoot, isGitRepo } from "../lib/git";
import { selectWorktree } from "../lib/prompts";

export async function cdCommand(args: string[]): Promise<void> {
  // Check if we're in a git repo
  if (!(await isGitRepo())) {
    throw new Error(
      "Not in a git repository. Please run from within a git repo.",
    );
  }

  const gitRoot = await getGitRoot();
  const chiefDir = await ensureChiefDir(gitRoot);

  // Determine which worktree to cd to
  let worktreePath: string;

  if (args.length > 0) {
    // Use specified worktree
    const worktreeName = args[0] as string;
    worktreePath = join(chiefDir, "worktrees", worktreeName);

    if (!existsSync(worktreePath)) {
      throw new Error(
        `Worktree not found: ${worktreeName}\n\nRun \`chief worktrees\` to see available worktrees.`,
      );
    }
  } else {
    // Interactive selection
    const selected = await selectWorktree(chiefDir, {
      message: "Select a worktree:",
    });

    if (!selected) {
      return; // No worktrees exist, message already shown
    }

    worktreePath = selected;
  }

  // Output the path - users can use this with: cd $(chief cd)
  console.log(worktreePath);
}
