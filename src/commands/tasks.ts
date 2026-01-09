import { existsSync } from "node:fs";
import { basename, join } from "node:path";

import { codeBlock } from "common-tags";

import { runPrint } from "../lib/claude";
import {
  ensureChiefDir,
  ensureWorktreeChiefDir,
  getCurrentWorktree,
} from "../lib/config";
import { getGitRoot, isGitRepo } from "../lib/git";
import { getTaskStats, readTasks } from "../lib/tasks";

const TASKS_HELP = codeBlock`
  chief tasks - Manage tasks in the current worktree

  Usage:
    chief tasks <subcommand>

  Subcommands:
    list                 List tasks in the current worktree
    create               Create tasks for the current worktree

  Examples:
    chief tasks list     Show tasks for current worktree
    chief tasks create   Start planning and create tasks
`;

export async function tasksCommand(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    console.log(TASKS_HELP);
    return;
  }

  switch (subcommand) {
    case "list": {
      await listSubcommand();
      break;
    }
    case "create": {
      await createSubcommand();
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

async function listSubcommand(): Promise<void> {
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

  // Read tasks
  const tasks = await readTasks(worktreePath);

  if (tasks.length === 0) {
    console.log(`\nNo tasks found in ${basename(worktreePath)}`);
    console.log("Run `chief tasks create` to create tasks for this worktree.");
    return;
  }

  const stats = getTaskStats(tasks);

  console.log(`\nTasks for: ${basename(worktreePath)}`);
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
    console.log("\nRun `chief run` to start working on tasks.");
  } else {
    console.log("\nAll tasks completed! Run `chief clean` to clean up.");
  }
}

async function createSubcommand(): Promise<void> {
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
      "No current worktree. Run `chief new` or `chief use <name>` first.",
    );
  }

  if (!existsSync(worktreePath)) {
    throw new Error(`Worktree not found: ${worktreePath}`);
  }

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
  console.log("  chief tasks list  - View the tasks");
  console.log("  chief run         - Start working on tasks");
}
