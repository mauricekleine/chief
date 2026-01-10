import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { $ } from "bun";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { hasUnpushedCommits } from "./git";

describe("hasUnpushedCommits", () => {
  let tempDir: string;
  let localRepoPath: string;
  let remoteRepoPath: string;

  beforeAll(async () => {
    // Create temp directory for test repos
    tempDir = await mkdtemp(join(tmpdir(), "git-test-"));

    // Create a bare "remote" repo
    remoteRepoPath = join(tempDir, "remote.git");
    await $`git init --bare ${remoteRepoPath}`.quiet();

    // Create a local repo and set up remote
    localRepoPath = join(tempDir, "local");
    await $`git init ${localRepoPath}`.quiet();
    await $`git config user.email "test@test.com"`.cwd(localRepoPath).quiet();
    await $`git config user.name "Test User"`.cwd(localRepoPath).quiet();
    await $`git remote add origin ${remoteRepoPath}`.cwd(localRepoPath).quiet();
  });

  afterAll(async () => {
    // Clean up temp directory
    await rm(tempDir, { force: true, recursive: true });
  });

  test("returns true for new branch with no upstream", async () => {
    // Create a new branch with a commit but no upstream
    const branchName = `test-new-branch-${Date.now()}`;
    await $`git checkout -b ${branchName}`.cwd(localRepoPath).quiet();

    // Create a commit
    await $`touch file-${Date.now()}.txt`.cwd(localRepoPath).quiet();
    await $`git add .`.cwd(localRepoPath).quiet();
    await $`git commit -m "test commit"`.cwd(localRepoPath).quiet();

    const result = await hasUnpushedCommits(localRepoPath);
    expect(result).toBe(true);
  });

  test("returns false when branch is up to date with remote", async () => {
    // Create and push a branch
    const branchName = `test-up-to-date-${Date.now()}`;
    await $`git checkout -b ${branchName}`.cwd(localRepoPath).quiet();

    // Create a commit
    await $`touch file-${Date.now()}.txt`.cwd(localRepoPath).quiet();
    await $`git add .`.cwd(localRepoPath).quiet();
    await $`git commit -m "test commit"`.cwd(localRepoPath).quiet();

    // Push to remote
    await $`git push -u origin ${branchName}`.cwd(localRepoPath).quiet();

    const result = await hasUnpushedCommits(localRepoPath);
    expect(result).toBe(false);
  });

  test("returns true when branch has commits ahead of remote", async () => {
    // Create and push a branch
    const branchName = `test-ahead-${Date.now()}`;
    await $`git checkout -b ${branchName}`.cwd(localRepoPath).quiet();

    // Create and push first commit
    await $`touch file-${Date.now()}-1.txt`.cwd(localRepoPath).quiet();
    await $`git add .`.cwd(localRepoPath).quiet();
    await $`git commit -m "first commit"`.cwd(localRepoPath).quiet();
    await $`git push -u origin ${branchName}`.cwd(localRepoPath).quiet();

    // Create another commit without pushing
    await $`touch file-${Date.now()}-2.txt`.cwd(localRepoPath).quiet();
    await $`git add .`.cwd(localRepoPath).quiet();
    await $`git commit -m "second commit"`.cwd(localRepoPath).quiet();

    const result = await hasUnpushedCommits(localRepoPath);
    expect(result).toBe(true);
  });

  test("returns true when git command fails (non-existent directory)", async () => {
    const result = await hasUnpushedCommits("/non/existent/path");
    expect(result).toBe(true);
  });
});
