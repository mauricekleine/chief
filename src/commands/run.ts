import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { checkbox } from "@inquirer/prompts";
import { codeBlock } from "common-tags";

import {
  getFeatureNameFromBase,
  getTaskBaseName,
  listTaskFiles,
  resolveTaskFileName,
} from "../lib/chief-files";
import { runInteractive, runPrint } from "../lib/claude";
import {
  ensureChiefDir,
  ensurePlansDir,
  ensureTasksDir,
  getVerificationSteps,
  setVerificationSteps,
} from "../lib/config";
import {
  checkoutBranch,
  getGitRoot,
  hasUnpushedCommits,
  isGitRepo,
  pushChanges,
} from "../lib/git";
import { hasPendingTasks, readTasks } from "../lib/tasks";
import { promptMultiline, selectTaskFile } from "../lib/terminal";

const MANUAL_STEPS_OPTION = "__manual__";

function buildPrompt(
  planPath: string,
  tasksPath: string,
  verificationSteps: string,
): string {
  return codeBlock`
    @${planPath} @${tasksPath}

    1. Find the highest-priority task to work on and work only on that task. This should be the one YOU decide has the highest priority - not necessarily the first in the list.
    2. Verify your work by using the following tools:
      ${verificationSteps}
    3. When you're done with your task:
      - Update @${tasksPath} to mark the task as done by setting the 'passes' property to true.
      - Commit your changes to the repository.
    4. If you learn a critical operational detail, update CLAUDE.md.

    IMPORTANT: Only work on one task at a time. NEVER make changes to @${tasksPath} - except to mark tasks as done by setting the 'passes' property to true.
  `;
}

function detectRunner(gitRoot: string, packageJson: unknown): string {
  const packageManager =
    typeof packageJson === "object" &&
    packageJson !== null &&
    "packageManager" in packageJson &&
    typeof packageJson.packageManager === "string"
      ? packageJson.packageManager
      : "";

  if (packageManager.startsWith("pnpm")) {
    return "pnpm";
  }
  if (packageManager.startsWith("yarn")) {
    return "yarn";
  }
  if (packageManager.startsWith("bun")) {
    return "bun";
  }

  if (
    existsSync(join(gitRoot, "bun.lockb")) ||
    existsSync(join(gitRoot, "bun.lock"))
  ) {
    return "bun";
  }
  if (existsSync(join(gitRoot, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (existsSync(join(gitRoot, "yarn.lock"))) {
    return "yarn";
  }

  return "npm";
}

function buildScriptCommand(runner: string, script: string): string {
  switch (runner) {
    case "bun": {
      return `bun run ${script}`;
    }
    case "pnpm": {
      return `pnpm run ${script}`;
    }
    case "yarn": {
      return `yarn ${script}`;
    }
    default: {
      return `npm run ${script}`;
    }
  }
}

function normalizeVerificationLines(text: string): string[] {
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => (line.startsWith("-") ? line : `- ${line}`));
}

function sanitizeBranchName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replaceAll(/[^a-z0-9._/-]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");

  return cleaned || "feature";
}

async function promptVerificationSteps(gitRoot: string): Promise<string> {
  const packageJsonPath = join(gitRoot, "package.json");
  let scripts: string[] = [];
  let runner = "npm";

  if (existsSync(packageJsonPath)) {
    try {
      const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
        scripts?: Record<string, string>;
      };
      scripts = Object.keys(parsed.scripts ?? {}).toSorted((a, b) =>
        a.localeCompare(b),
      );
      runner = detectRunner(gitRoot, parsed);
    } catch {
      scripts = [];
    }
  }

  const scriptChoices = scripts.map((script) => {
    const command = buildScriptCommand(runner, script);
    return { name: `${script} (${command})`, value: command };
  });

  const choices = [
    ...scriptChoices,
    { name: "Enter custom verification steps", value: MANUAL_STEPS_OPTION },
  ];

  const selected = await checkbox({
    choices,
    message: "Select verification steps to run:",
  });

  const wantsManual = selected.includes(MANUAL_STEPS_OPTION);
  const selectedCommands = selected.filter(
    (value) => value !== MANUAL_STEPS_OPTION,
  );

  const lines = selectedCommands.map((command) => `- ${command}`);

  if (wantsManual) {
    const manual = await promptMultiline(
      "Enter additional verification steps (one per line):",
    );
    lines.push(...normalizeVerificationLines(manual));
  }

  if (lines.length === 0) {
    throw new Error("Verification steps cannot be empty.");
  }

  return lines.join("\n");
}

export interface RunOptions {
  name?: string;
  single?: boolean;
}

export async function runCommand(options: RunOptions): Promise<void> {
  const singleMode = options.single ?? false;
  const featureArg = options.name?.trim();

  if (!(await isGitRepo())) {
    throw new Error(
      "Not in a git repository. Please run from within a git repo.",
    );
  }

  const gitRoot = await getGitRoot();
  const chiefDir = await ensureChiefDir(gitRoot);
  const plansDir = await ensurePlansDir(chiefDir);
  const tasksDir = await ensureTasksDir(chiefDir);

  let taskFileName: string | null;

  if (featureArg) {
    const taskFiles = await listTaskFiles(tasksDir);
    taskFileName = resolveTaskFileName(taskFiles, featureArg);
    if (!taskFileName) {
      throw new Error(`Tasks not found for: ${featureArg}`);
    }
  } else {
    taskFileName = await selectTaskFile(tasksDir, {
      message: "Select a task set to run:",
    });
    if (!taskFileName) {
      return;
    }
  }

  const tasksPath = join(tasksDir, taskFileName);
  if (!existsSync(tasksPath)) {
    throw new Error(`Tasks file not found: ${tasksPath}`);
  }

  const baseName = getTaskBaseName(taskFileName);
  const planPath = join(plansDir, `${baseName}.md`);
  if (!existsSync(planPath)) {
    throw new Error(`Plan file not found: ${planPath}`);
  }

  const featureName = getFeatureNameFromBase(baseName);
  const branchName = `feature/${sanitizeBranchName(featureName)}`;

  console.log(`\nChecking out branch: ${branchName}`);
  await checkoutBranch(branchName, gitRoot);

  let verificationSteps = await getVerificationSteps(chiefDir);
  if (!verificationSteps) {
    console.log("\nFirst-time setup: select verification steps.");
    verificationSteps = await promptVerificationSteps(gitRoot);
    await setVerificationSteps(chiefDir, verificationSteps);
    console.log("\n✓ Verification steps saved.\n");
  }

  const runPrompt = buildPrompt(planPath, tasksPath, verificationSteps);

  if (singleMode) {
    console.log(`\nRunning single task: ${baseName}`);
    console.log("(Interactive mode - exit when done)\n");

    await runInteractive(runPrompt, { chrome: true, cwd: gitRoot });

    console.log("\n✓ Single run completed.");
    return;
  }

  console.log(`\nRunning tasks in loop mode: ${baseName}`);
  console.log("(Press Ctrl+C to stop)\n");

  let iteration = 0;

  while (true) {
    const tasks = await readTasks(tasksPath);

    if (!hasPendingTasks(tasks)) {
      console.log("\n✓ All tasks completed!");
      break;
    }

    console.log(`\n--- Iteration ${iteration + 1} ---`);

    const output = await runPrint(runPrompt, {
      chrome: true,
      cwd: gitRoot,
    });

    console.log(output);

    iteration += 1;
  }

  const hasCommitsToPush = await hasUnpushedCommits(gitRoot);

  if (!hasCommitsToPush) {
    console.log(
      "\n✓ All tasks completed. No unpushed commits, nothing to push.",
    );
    return;
  }

  console.log("\nPushing changes to remote...");
  await pushChanges(gitRoot);

  console.log("\nCreating pull request...");
  await runPrint(
    "Create a pull request for this branch using the `gh pr create` command. Use a descriptive title and body based on the changes made.",
    { cwd: gitRoot, model: "sonnet" },
  );

  console.log("\n✓ All done! Check the PR on GitHub.");
}
