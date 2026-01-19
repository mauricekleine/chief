#!/usr/bin/env bun

import { Command } from "commander";
import { codeBlock } from "common-tags";

import { breakdownCommand } from "./commands/breakdown";
import { planCommand } from "./commands/plan";
import { runCommand } from "./commands/run";

const HELP_EXAMPLES = codeBlock`
Examples:
  chief plan
  chief plan Build a new feature
  chief breakdown
  chief breakdown my-feature
  chief run
  chief run -s
`;

function handleError(error: unknown): void {
  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error("An unexpected error occurred");
  }
  process.exit(1);
}

async function runSafely(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch (error) {
    handleError(error);
  }
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name("chief")
    .description("AI coding agent task runner")
    .showHelpAfterError()
    .addHelpText("after", `\n${HELP_EXAMPLES}`);

  program
    .command("plan")
    .description("Create a new plan in .chief/plans")
    .argument("[description...]", "Project description")
    .action(async (description: string[]) => {
      await runSafely(() => planCommand(description ?? []));
    });

  program
    .command("breakdown")
    .alias("bd")
    .description("Convert a plan into tasks")
    .argument("[name]", "Plan name")
    .action(async (name?: string) => {
      await runSafely(() => breakdownCommand(name));
    });

  program
    .command("run")
    .description("Run tasks (loop until done, or once with --single)")
    .argument("[name]", "Task set name")
    .option("-s, --single", "Run a single task interactively")
    .action(async (name: string | undefined, options: { single?: boolean }) => {
      await runSafely(() => runCommand({ name, single: options.single }));
    });

  if (process.argv.length <= 2) {
    program.help({ error: false });
  }

  await program.parseAsync(process.argv);
}

main();
