import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { ChiefConfig } from "../types";

const CONFIG_FILE = "config.json";
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
 * Ensure the .chief/worktrees directory exists.
 */
export async function ensureWorktreesDir(chiefDir: string): Promise<string> {
  const worktreesDir = join(chiefDir, "worktrees");
  if (!existsSync(worktreesDir)) {
    await mkdir(worktreesDir, { recursive: true });
  }
  return worktreesDir;
}

/**
 * Ensure the .chief directory exists within a worktree.
 */
export async function ensureWorktreeChiefDir(
  worktreePath: string
): Promise<string> {
  const chiefDir = join(worktreePath, ".chief");
  if (!existsSync(chiefDir)) {
    await mkdir(chiefDir, { recursive: true });
  }
  return chiefDir;
}

/**
 * Get the chief configuration.
 */
export async function getConfig(chiefDir: string): Promise<ChiefConfig> {
  const configPath = join(chiefDir, CONFIG_FILE);

  if (!existsSync(configPath)) {
    return {};
  }

  const content = await readFile(configPath, "utf-8");
  return JSON.parse(content) as ChiefConfig;
}

/**
 * Save the chief configuration.
 */
export async function setConfig(
  chiefDir: string,
  config: ChiefConfig
): Promise<void> {
  const configPath = join(chiefDir, CONFIG_FILE);
  await writeFile(configPath, JSON.stringify(config, null, 2));
}

/**
 * Get the current worktree path from config.
 */
export async function getCurrentWorktree(
  chiefDir: string
): Promise<string | undefined> {
  const config = await getConfig(chiefDir);
  return config.currentWorktree;
}

/**
 * Set the current worktree in config.
 */
export async function setCurrentWorktree(
  chiefDir: string,
  worktreePath: string
): Promise<void> {
  const config = await getConfig(chiefDir);
  config.currentWorktree = worktreePath;
  await setConfig(chiefDir, config);
}

/**
 * Get the verification steps from .chief/verification.txt.
 */
export async function getVerificationSteps(
  chiefDir: string
): Promise<string | undefined> {
  const verificationPath = join(chiefDir, VERIFICATION_FILE);

  if (!existsSync(verificationPath)) {
    return undefined;
  }

  const content = await readFile(verificationPath, "utf-8");
  return content.trim() || undefined;
}

/**
 * Save the verification steps to .chief/verification.txt.
 */
export async function setVerificationSteps(
  chiefDir: string,
  steps: string
): Promise<void> {
  const verificationPath = join(chiefDir, VERIFICATION_FILE);
  await writeFile(verificationPath, steps);
}
