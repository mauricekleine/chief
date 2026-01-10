#!/usr/bin/env bun

import { codeBlock } from "common-tags";

import { cdCommand } from "./commands/cd";
import { cleanCommand } from "./commands/clean";
import { newCommand } from "./commands/new";
import { runCommand } from "./commands/run";
import { tasksCommand } from "./commands/tasks";
import { worktreesCommand } from "./commands/worktrees";

const HELP_TEXT = codeBlock`
  chief - AI coding agent task runner

  Usage:
    chief <command> [options]

  Commands:
    new [prompt]         Create a new worktree and start planning
    tasks list [name]    List tasks for a worktree
    tasks create [name]  Create tasks for a worktree
    run [name] [--single] Run tasks (loop until done, or once with --single)
    worktrees            List all worktrees
    cd [name]            Print worktree path (use with: cd $(chief cd))
    clean [name]         Delete a worktree

  Options:
    --help, -h           Show this help message

  Examples:
    chief new                  Start a new project (prompts for description)
    chief new "build a REST API"  Start with prompt directly
    chief tasks list           Show interactive picker for worktree tasks
    chief tasks list my-feat   Show tasks for specific worktree
    chief run                  Show interactive picker, then run tasks
    chief run my-feature       Run tasks for specific worktree
    chief run my-feature -s    Run tasks once interactively
    chief worktrees            List all worktrees
    chief cd                   Get path to worktree (interactive picker)
    chief cd my-feature        Get path to specific worktree
    chief clean                Clean up a worktree
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
      case "tasks": {
        await tasksCommand(commandArgs);
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
      case "cd": {
        await cdCommand(commandArgs);
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
