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

  Notes:
    Worktrees are stored in ~/.chief/{project-name}/worktrees/
    Commands auto-detect the worktree when run from within one.
    Use cd $(chief new) to create and cd into a new worktree.

  Examples:
    cd $(chief new)            Create worktree and cd into it
    chief new "build a REST API"  Create worktree with description
    chief tasks list           Auto-detect worktree or show picker
    chief run                  Auto-detect worktree or show picker
    chief run -s               Run single task interactively
    chief worktrees            List all worktrees for project
    chief cd                   Get path to current/selected worktree
    chief clean                Clean up current/selected worktree
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
        await newCommand(commandArgs);
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
