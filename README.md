# Chief

CLI tool for running AI coding agents in a loop using the Ralph Wiggum methodology.

Chief creates isolated git worktrees and uses Claude Code to plan and execute tasks autonomously, committing progress as it goes.

## Requirements

- [Bun](https://bun.sh/) runtime
- [Claude Code CLI](https://claude.ai/claude-code) installed and authenticated
- [GitHub CLI](https://cli.github.com/) (`gh`) for PR creation
- Git

## Installation

```bash
# Clone the repository
git clone git@github.com:mauricekleine/chief.git chief
cd chief

# Install dependencies
bun install

# Create an alias (add to your shell profile)
alias chief="bun run /path/to/chief/src/index.ts"
```

## Usage

### Create a new project

```bash
chief new
```

This will:

1. Prompt you to describe what you want to build
2. Use Claude to create a git worktree with an appropriate name in `.chief/worktrees/`
3. Start an interactive planning session with Claude
4. Generate a `plan.md` with the implementation plan
5. Convert the plan into `tasks.json` with structured tasks

### List tasks

```bash
chief tasks list
```

Shows all tasks for the current worktree with their completion status.

### Create tasks

```bash
chief tasks create
```

Creates tasks from an existing `plan.md` file in the current worktree.

### Run tasks

```bash
# Run in loop mode (autonomous)
chief run

# Run once interactively
chief run --single
```

In loop mode, Chief will:

1. Find the next incomplete task
2. Run Claude to complete it
3. Verify the work using your configured verification steps
4. Mark the task as done and commit
5. Repeat until all tasks are complete
6. Push changes and create a pull request

### Manage worktrees

```bash
# List all worktrees
chief worktrees

# Switch to a different worktree
chief use <worktree-name>

# Delete a worktree
chief clean [worktree-name]
```

## Configuration

Chief stores its configuration in `.chief/` at your repository root:

- `config.json` - Current worktree and settings
- `tasks.schema.json` - JSON schema for tasks
- `verification.txt` - Verification steps (set on first `chief run`)
- `worktrees/` - Git worktrees for each project

### Verification Steps

On first run, Chief will prompt you for verification steps. These are commands that Claude will use to verify its work:

Example:

```
- bun run lint
- bun run typecheck
- bun run test
```

## Task Schema

Tasks in `tasks.json` follow this structure:

```json
[
  {
    "category": "Feature",
    "description": "Implement user authentication",
    "passes": false,
    "steps": [
      "Create auth middleware",
      "Add login endpoint",
      "Add session management"
    ]
  }
]
```

## How It Works

Chief implements the Ralph Wiggum methodology:

1. **Plan** - Use AI to create a detailed implementation plan through conversation
2. **Break Down** - Convert the plan into discrete, verifiable tasks
3. **Execute** - Run AI in a loop to complete tasks one at a time
4. **Verify** - Use automated checks (tests, lint, typecheck) to verify work
5. **Ship** - Push changes and create a PR when done

Each task is completed in isolation, committed separately, making it easy to review and revert if needed.

## License

MIT
