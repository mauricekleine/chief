import { spawn } from "bun";

export interface ClaudeOptions {
  chrome?: boolean;
  cwd?: string;
  model?: "opus" | "sonnet";
}

/**
 * Run Claude in plan mode (interactive).
 */
export async function runPlanMode(
  prompt: string,
  options: ClaudeOptions = {},
): Promise<void> {
  const args = ["--allowed-tools", "Edit, Write", "--permission-mode", "plan"];

  if (options.chrome) {
    args.push("--chrome");
  }

  args.push(prompt);

  const proc = spawn(["claude", ...args], {
    cwd: options.cwd,
    stderr: "inherit",
    stdin: "inherit",
    stdout: "inherit",
  });

  await proc.exited;
}

/**
 * Run Claude in print mode (non-interactive).
 */
export async function runPrint(
  prompt: string,
  options: ClaudeOptions = {},
): Promise<string> {
  const args = ["--permission-mode", "acceptEdits", "-p"];

  if (options.chrome) {
    args.push("--chrome");
  }

  args.push(prompt);

  const proc = spawn(["claude", ...args], {
    cwd: options.cwd,
    stderr: "inherit",
    stdout: "pipe",
  });

  const output = await new Response(proc.stdout).text();
  await proc.exited;

  return output;
}

/**
 * Run Claude with acceptEdits permission in interactive mode.
 */
export async function runInteractive(
  prompt: string,
  options: ClaudeOptions = {},
): Promise<void> {
  const args = ["--permission-mode", "acceptEdits"];

  if (options.chrome) {
    args.push("--chrome");
  }

  args.push(prompt);

  const proc = spawn(["claude", ...args], {
    cwd: options.cwd,
    stderr: "inherit",
    stdin: "inherit",
    stdout: "inherit",
  });

  await proc.exited;
}
