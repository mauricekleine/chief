import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const VERIFICATION_FILE = "verification.txt";

/**
 * Ensure the .chief directory exists.
 */
export async function ensureChiefDir(gitRoot: string): Promise<string> {
  const chiefDir = join(gitRoot, ".chief");
  if (!existsSync(chiefDir)) {
    await mkdir(chiefDir, { recursive: true });
  }
  return chiefDir;
}

/**
 * Ensure the .chief/plans directory exists.
 */
export async function ensurePlansDir(chiefDir: string): Promise<string> {
  const plansDir = join(chiefDir, "plans");
  if (!existsSync(plansDir)) {
    await mkdir(plansDir, { recursive: true });
  }
  return plansDir;
}

/**
 * Ensure the .chief/tasks directory exists.
 */
export async function ensureTasksDir(chiefDir: string): Promise<string> {
  const tasksDir = join(chiefDir, "tasks");
  if (!existsSync(tasksDir)) {
    await mkdir(tasksDir, { recursive: true });
  }
  return tasksDir;
}

/**
 * Get the verification steps from .chief/verification.txt.
 */
export async function getVerificationSteps(
  chiefDir: string,
): Promise<string | undefined> {
  const verificationPath = join(chiefDir, VERIFICATION_FILE);

  if (!existsSync(verificationPath)) {
    return undefined;
  }

  const content = await readFile(verificationPath, "utf8");
  return content.trim() || undefined;
}

/**
 * Save the verification steps to .chief/verification.txt.
 */
export async function setVerificationSteps(
  chiefDir: string,
  steps: string,
): Promise<void> {
  const verificationPath = join(chiefDir, VERIFICATION_FILE);
  await writeFile(verificationPath, steps);
}
