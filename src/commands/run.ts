import { existsSync } from "node:fs";
import { basename, join } from "node:path";

import { codeBlock } from "common-tags";

import { runInteractive, runPrint } from "../lib/claude";
import {
  ensureChiefDir,
  getCurrentWorktree,
  getVerificationSteps,
  setVerificationSteps,
} from "../lib/config";
import { getGitRoot, isGitRepo, pushChanges } from "../lib/git";
import { hasPendingTasks, readTasks } from "../lib/tasks";
import { promptMultiline } from "../lib/terminal";

function buildPrompt(worktreePath: string, verificationSteps: string): string {
  const planPath = join(worktreePath, ".chief", "plan.md");
  const tasksPath = join(worktreePath, ".chief", "tasks.json");

  return codeBlock`
    @${planPath} @${tasksPath}

    1. Find the highest priority task to work on that is not marked as 'passes'. Only work on one task at a time.
    2. Verify your work by using the following tools:
    ${verificationSteps}
    3. When you're done with your task:
      - Update tasks.json when you're done with your task to mark the task as done by setting the 'passes' property to true.
      - Commit your changes to the repository.
    4. If you learn a critical operational detail, update CLAUDE.md.

    IMPORTANT: Only work on one task at a time. NEVER make changes to tasks.json (except to mark tasks as done by setting the 'passes' property to true).
  `;
}

export async function runCommand(args: string[]): Promise<void> {
  const singleMode = args.includes("--single") || args.includes("-s");

  // Check if we're in a git repo
  if (!(await isGitRepo())) {
    throw new Error(
      "Not in a git repository. Please run from within a git repo.",
    );
  }

  const gitRoot = await getGitRoot();
  const chiefDir = await ensureChiefDir(gitRoot);

  // Get current worktree
  const worktreePath = await getCurrentWorktree(chiefDir);

  if (!worktreePath) {
    throw new Error(
      "No current worktree. Run `chief new <name>` or `chief use <name>` first.",
    );
  }

  if (!existsSync(worktreePath)) {
    throw new Error(`Worktree not found: ${worktreePath}`);
  }

  // Check for verification steps, prompt if not set
  let verificationSteps = await getVerificationSteps(chiefDir);

  if (!verificationSteps) {
    console.log("\nFirst-time setup: Please provide verification steps.");
    console.log(
      "These are commands to verify the AI's work (e.g., tests, lint, build).\n",
    );
    console.log("Example:");
    console.log("  - bun run lint");
    console.log("  - bun run typecheck");
    console.log("  - bun run test\n");

    verificationSteps = await promptMultiline("Enter verification steps:");

    if (!verificationSteps.trim()) {
      throw new Error("Verification steps cannot be empty.");
    }

    await setVerificationSteps(chiefDir, verificationSteps);
    console.log("\n✓ Verification steps saved.\n");
  }

  const runPrompt = buildPrompt(worktreePath, verificationSteps);

  if (singleMode) {
    // Single interactive run
    console.log(`\nRunning single task in: ${basename(worktreePath)}`);
    console.log("(Interactive mode - exit when done)\n");

    await runInteractive(runPrompt, { chrome: true, cwd: worktreePath });

    console.log("\n✓ Single run completed.");
  } else {
    // Loop mode
    console.log(`\nRunning tasks in loop mode: ${basename(worktreePath)}`);
    console.log("(Press Ctrl+C to stop)\n");

    let iteration = 1;

    while (true) {
      const tasks = await readTasks(worktreePath);

      if (!hasPendingTasks(tasks)) {
        console.log("\n✓ All tasks completed!");
        break;
      }

      console.log(`\n--- Iteration ${iteration} ---`);

      const output = await runPrint(runPrompt, {
        chrome: true,
        cwd: worktreePath,
      });

      console.log(output);

      iteration++;
    }

    // All tasks done - push and create PR
    console.log("\nPushing changes to remote...");
    await pushChanges();

    console.log("\nCreating pull request...");
    await runPrint(
      "Create a pull request for this branch using the `gh pr create` command. Use a descriptive title and body based on the changes made.",
      { cwd: worktreePath, model: "sonnet" },
    );

    console.log("\n✓ All done! Check the PR on GitHub.");
  }
}
