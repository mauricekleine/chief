import { existsSync } from "node:fs";
import { join } from "node:path";

import { getGlobalChiefDir, getProjectNameFromGitRoot } from "../lib/config";
import { detectWorktreeFromCwd, getGitRoot, isGitRepo } from "../lib/git";
import { selectWorktree } from "../lib/prompts";

export async function cdCommand(args: string[]): Promise<void> {
  // Determine which worktree to cd to
  let worktreePath: string;

  // Try to auto-detect worktree from CWD
  const detected = detectWorktreeFromCwd();

  if (detected && args.length === 0) {
    // Already in a worktree, output current path
    worktreePath = detected.worktreePath;
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
      const worktreeName = args[0] as string;
      worktreePath = join(globalChiefDir, "worktrees", worktreeName);

      if (!existsSync(worktreePath)) {
        throw new Error(
          `Worktree not found: ${worktreeName}\n\nRun \`chief worktrees\` to see available worktrees.`,
        );
      }
    } else {
      // Interactive selection
      const selected = await selectWorktree(projectName, {
        message: "Select a worktree:",
      });

      if (!selected) {
        return; // No worktrees exist, message already shown
      }

      worktreePath = selected;
    }
  }

  // Output the path - users can use this with: cd $(chief cd)
  console.log(worktreePath);
}
