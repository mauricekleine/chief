import { $ } from "bun";

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

export async function branchExists(
  branchName: string,
  cwd: string,
): Promise<boolean> {
  try {
    await $`git show-ref --verify refs/heads/${branchName}`.cwd(cwd).quiet();
    return true;
  } catch {
    return false;
  }
}

/**
 * Checkout an existing branch or create it if missing.
 */
export async function checkoutBranch(
  branchName: string,
  cwd: string,
): Promise<void> {
  const exists = await branchExists(branchName, cwd);
  if (exists) {
    await $`git checkout ${branchName}`.cwd(cwd);
    return;
  }

  await $`git checkout -b ${branchName}`.cwd(cwd);
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
