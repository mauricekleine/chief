import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { $ } from "bun";

import { getGlobalChiefDir } from "./config";

/**
 * Check if the current directory is a git repository.
 */
export async function isGitRepo(): Promise<boolean> {
  try {
    await $`git rev-parse --is-inside-work-tree`.quiet();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current branch name.
 */
export async function getCurrentBranch(): Promise<string> {
  const result = await $`git branch --show-current`.text();
  return result.trim();
}

/**
 * Create a new git worktree.
 */
export async function createWorktree(
  worktreePath: string,
  branchName: string,
): Promise<void> {
  await $`git worktree add ${worktreePath} -b ${branchName}`;
}

/**
 * Remove a git worktree.
 */
export async function removeWorktree(worktreePath: string): Promise<void> {
  await $`git worktree remove ${worktreePath} --force`;
}

/**
 * List all worktrees in ~/.chief/{project-name}/worktrees/
 */
export async function listWorktreeDirectories(
  projectName: string,
): Promise<{ createdAt: Date; name: string; path: string }[]> {
  const globalChiefDir = getGlobalChiefDir(projectName);
  const worktreesDir = join(globalChiefDir, "worktrees");

  if (!existsSync(worktreesDir)) {
    return [];
  }

  const entries = await readdir(worktreesDir, { withFileTypes: true });
  const worktrees: { createdAt: Date; name: string; path: string }[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = join(worktreesDir, entry.name);
      const stats = await stat(fullPath);
      worktrees.push({
        createdAt: stats.birthtime,
        name: entry.name,
        path: fullPath,
      });
    }
  }

  return worktrees.toSorted(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

/**
 * Detect if CWD is inside a chief-managed worktree.
 * Returns worktree info if found, null otherwise.
 */
export function detectWorktreeFromCwd(): {
  projectName: string;
  worktreeName: string;
  worktreePath: string;
} | null {
  const cwd = process.cwd();
  const chiefBaseDir = join(homedir(), ".chief");

  if (cwd.startsWith(chiefBaseDir)) {
    const relativePath = cwd.slice(chiefBaseDir.length + 1);
    const parts = relativePath.split("/");

    // Expected: {project-name}/worktrees/{worktree-name}/...
    const projectName = parts[0];
    const worktreeName = parts[2];

    if (
      parts.length >= 3 &&
      parts[1] === "worktrees" &&
      projectName &&
      worktreeName
    ) {
      const worktreePath = join(
        chiefBaseDir,
        projectName,
        "worktrees",
        worktreeName,
      );

      if (existsSync(worktreePath)) {
        return { projectName, worktreeName, worktreePath };
      }
    }
  }

  return null;
}

/**
 * Push changes to the remote repository.
 */
export async function pushChanges(cwd: string): Promise<void> {
  await $`git push -u origin HEAD`.cwd(cwd);
}

/**
 * Check if there are unpushed commits on the current branch.
 * Returns true if branch has no upstream (new branch) or has commits ahead of upstream.
 */
export async function hasUnpushedCommits(cwd: string): Promise<boolean> {
  // Check if upstream exists
  try {
    await $`git rev-parse --verify @{u}`.cwd(cwd).quiet();
  } catch {
    // No upstream = new branch, treat as having unpushed commits
    return true;
  }

  // Count commits ahead of upstream
  try {
    const result = await $`git rev-list @{u}..HEAD --count`.cwd(cwd).text();
    const count = Number.parseInt(result.trim(), 10);
    return count > 0;
  } catch {
    // On error, default to true (safer to attempt push)
    return true;
  }
}

/**
 * Get the root directory of the git repository.
 */
export async function getGitRoot(): Promise<string> {
  const result = await $`git rev-parse --show-toplevel`.text();
  return result.trim();
}

/**
 * Check if .chief is in the .gitignore file.
 */
export async function isChiefIgnored(gitRoot: string): Promise<boolean> {
  const gitignorePath = join(gitRoot, ".gitignore");

  if (!existsSync(gitignorePath)) {
    return false;
  }

  const { readFile } = await import("node:fs/promises");
  const content = await readFile(gitignorePath, "utf8");
  const lines = content.split("\n").map((line) => line.trim());

  return lines.some((line) => line === ".chief" || line === ".chief/");
}

/**
 * Add .chief to .gitignore if not already present.
 */
export async function ensureChiefInGitignore(gitRoot: string): Promise<void> {
  if (await isChiefIgnored(gitRoot)) {
    return;
  }

  const gitignorePath = join(gitRoot, ".gitignore");
  const { readFile, writeFile } = await import("node:fs/promises");

  let content = "";
  if (existsSync(gitignorePath)) {
    content = await readFile(gitignorePath, "utf8");
    if (!content.endsWith("\n")) {
      content += "\n";
    }
  }

  content += "\n# Chief\n.chief/\n";
  await writeFile(gitignorePath, content);
}
