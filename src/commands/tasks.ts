import { existsSync } from "node:fs";
import { basename, join } from "node:path";

import { codeBlock } from "common-tags";

import { runPrint } from "../lib/claude";
import {
  ensureWorktreeChiefDir,
  getGlobalChiefDir,
  getProjectNameFromGitRoot,
} from "../lib/config";
import { detectWorktreeFromCwd, getGitRoot, isGitRepo } from "../lib/git";
import { selectWorktree } from "../lib/prompts";
import { getTaskStats, readTasks } from "../lib/tasks";

const TASKS_HELP = codeBlock`
  chief tasks - Manage tasks in a worktree

  Usage:
    chief tasks <subcommand> [worktree-name]

  Subcommands:
    list [name]          List tasks in a worktree
    create [name]        Create tasks for a worktree

  Notes:
    When run from inside a worktree, the worktree is auto-detected.

  Examples:
    chief tasks list              Auto-detect worktree or show picker
    chief tasks list my-feature   Show tasks for 'my-feature' worktree
    chief tasks create            Auto-detect worktree or show picker
    chief tasks create my-feature Create tasks for 'my-feature' worktree
`;

export async function tasksCommand(args: string[]): Promise<void> {
  const subcommand = args[0];
  const worktreeArg = args[1];

  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    console.log(TASKS_HELP);
    return;
  }

  switch (subcommand) {
    case "list": {
      await listSubcommand(worktreeArg);
      break;
    }
    case "create": {
      await createSubcommand(worktreeArg);
      break;
    }
    default: {
      console.error(`Unknown subcommand: ${subcommand}`);
      console.log(TASKS_HELP);
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    }
  }
}

async function listSubcommand(worktreeArg?: string): Promise<void> {
  let worktreePath: string | null;

  // Try to auto-detect worktree from CWD
  const detected = detectWorktreeFromCwd();

  if (detected && !worktreeArg) {
    // Use detected worktree
    worktreePath = detected.worktreePath;
    console.log(`Using detected worktree: ${detected.worktreeName}`);
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

    if (worktreeArg) {
      // Validate worktree exists
      worktreePath = join(globalChiefDir, "worktrees", worktreeArg);
      if (!existsSync(worktreePath)) {
        throw new Error(`Worktree not found: ${worktreeArg}`);
      }
    } else {
      // Interactive picker
      worktreePath = await selectWorktree(projectName, {
        message: "Select a worktree to list tasks:",
      });

      if (!worktreePath) {
        return;
      }
    }
  }

  const worktreeName = basename(worktreePath);

  // Read tasks
  const tasks = await readTasks(worktreePath);

  if (tasks.length === 0) {
    console.log(`\nNo tasks found in ${worktreeName}`);
    console.log(
      `Run \`chief tasks create ${worktreeName}\` to create tasks for this worktree.`,
    );
    return;
  }

  const stats = getTaskStats(tasks);

  console.log(`\nTasks for: ${worktreeName}`);
  console.log(`Progress: ${stats.completed}/${stats.total} completed\n`);
  console.log("─".repeat(80));

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks.at(i);

    if (!task) {
      continue;
    }

    const status = task.passes ? "✓" : "○";
    const statusColor = task.passes ? "\u001B[32m" : "\u001B[33m";
    const reset = "\u001B[0m";

    // Truncate description if too long
    const maxDescLen = 60;
    const desc =
      task.description.length > maxDescLen
        ? task.description.slice(0, maxDescLen - 3) + "..."
        : task.description;

    console.log(
      `${statusColor}${status}${reset} [${i + 1}] ${task.category}: ${desc}`,
    );
    console.log(`     Steps: ${task.steps.length}`);
  }

  console.log("─".repeat(80));
  console.log(`\n${stats.total - stats.completed} tasks remaining`);

  if (stats.completed < stats.total) {
    console.log(
      `\nRun \`chief run ${worktreeName}\` to start working on tasks.`,
    );
  } else {
    console.log("\nAll tasks completed! Run `chief clean` to clean up.");
  }
}

async function createSubcommand(worktreeArg?: string): Promise<void> {
  let worktreePath: string | null;

  // Try to auto-detect worktree from CWD
  const detected = detectWorktreeFromCwd();

  if (detected && !worktreeArg) {
    // Use detected worktree
    worktreePath = detected.worktreePath;
    console.log(`Using detected worktree: ${detected.worktreeName}`);
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

    if (worktreeArg) {
      // Validate worktree exists
      worktreePath = join(globalChiefDir, "worktrees", worktreeArg);
      if (!existsSync(worktreePath)) {
        throw new Error(`Worktree not found: ${worktreeArg}`);
      }
    } else {
      // Interactive picker
      worktreePath = await selectWorktree(projectName, {
        message: "Select a worktree to create tasks:",
      });

      if (!worktreePath) {
        return;
      }
    }
  }

  const worktreeName = basename(worktreePath);

  // Ensure .chief directory exists within the worktree
  const worktreeChiefDir = await ensureWorktreeChiefDir(worktreePath);
  const planPath = join(worktreeChiefDir, "plan.md");
  const tasksSchemaPath = join(worktreeChiefDir, "tasks.schema.json");
  const tasksPath = join(worktreeChiefDir, "tasks.json");

  // Check that plan.md exists
  if (!existsSync(planPath)) {
    throw new Error(
      `Plan not found at ${planPath}. Create a plan.md file first or run \`chief new\` to start a new project.`,
    );
  }

  // Check that tasks.schema.json exists in the worktree
  if (!existsSync(tasksSchemaPath)) {
    throw new Error(
      `Task schema not found at ${tasksSchemaPath}. Run \`chief new\` to set up the worktree properly.`,
    );
  }

  // Convert plan to tasks
  console.log("\nConverting plan to tasks...");
  await runPrint(
    codeBlock`
      Read the plan from "${planPath}" and convert it into a series of tasks according to the JSON schema in "${tasksSchemaPath}".
      Output the tasks to "${tasksPath}". Make sure each task has: category, description, passes (set to false), and steps array.
    `,
    { cwd: worktreePath, model: "sonnet" },
  );

  console.log("\n✓ Tasks created successfully!");
  console.log(`  Worktree: ${worktreePath}`);
  console.log("\nNext steps:");
  console.log(`  chief tasks list ${worktreeName}  - View the tasks`);
  console.log(`  chief run ${worktreeName}         - Start working on tasks`);
}
