#!/usr/bin/env bun

import { cleanCommand } from "./commands/clean";
import { listCommand } from "./commands/list";
import { newCommand } from "./commands/new";
import { runCommand } from "./commands/run";
import { useCommand } from "./commands/use";
import { worktreesCommand } from "./commands/worktrees";

const HELP_TEXT = `
chief - AI coding agent task runner

Usage:
  chief <command> [options]

Commands:
  new                  Create a new worktree and start planning
  list                 List tasks in the current worktree
  run [--single]       Run tasks (loop until done, or once with --single)
  worktrees            List all worktrees
  use <name>           Switch to a different worktree
  clean [name]         Delete a worktree

Options:
  --help, -h           Show this help message

Examples:
  chief new                  Start a new project (prompts for description)
  chief list                 Show tasks for current worktree
  chief run                  Run tasks in a loop
  chief run --single         Run tasks once interactively
  chief worktrees            List all worktrees
  chief use my-feature-abc   Switch to worktree
  chief clean                Clean up current worktree
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  try {
    switch (command) {
      case "new": {
        await newCommand();
        break;
      }
      case "list": {
        await listCommand();
        break;
      }
      case "run": {
        await runCommand(commandArgs);
        break;
      }
      case "worktrees": {
        await worktreesCommand();
        break;
      }
      case "use": {
        await useCommand(commandArgs);
        break;
      }
      case "clean": {
        await cleanCommand(commandArgs);
        break;
      }
      default: {
        console.error(`Unknown command: ${command}`);
        console.log(HELP_TEXT);
        process.exit(1);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("An unexpected error occurred");
    }
    process.exit(1);
  }
}

main();
