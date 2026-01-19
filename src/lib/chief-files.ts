import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";

const PLAN_FILE_PATTERN = /^\d{4}-\d{2}-\d{2}-.+\.md$/;
const TASK_FILE_PATTERN = /^\d{4}-\d{2}-\d{2}-.+\.tasks\.json$/;

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function slugifyFeatureName(input: string): string {
  const firstLine =
    input
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "feature";

  const slug = firstLine
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "")
    .slice(0, 48);

  return slug || "feature";
}

export async function listPlanFiles(plansDir: string): Promise<string[]> {
  if (!existsSync(plansDir)) {
    return [];
  }

  const entries = await readdir(plansDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && PLAN_FILE_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .toSorted((a, b) => b.localeCompare(a));

  return files;
}

export async function listTaskFiles(tasksDir: string): Promise<string[]> {
  if (!existsSync(tasksDir)) {
    return [];
  }

  const entries = await readdir(tasksDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && TASK_FILE_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .toSorted((a, b) => b.localeCompare(a));

  return files;
}

export function resolvePlanFileName(
  planFiles: string[],
  featureArg: string,
): string | null {
  const trimmed = featureArg.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.endsWith(".md")) {
    return planFiles.includes(trimmed) ? trimmed : null;
  }

  const direct = `${trimmed}.md`;
  if (planFiles.includes(direct)) {
    return direct;
  }

  const suffix = `-${trimmed}.md`;
  const matches = planFiles.filter((file) => file.endsWith(suffix));
  if (matches.length === 0) {
    return null;
  }

  return matches.toSorted((a, b) => b.localeCompare(a))[0] ?? null;
}

export function resolveTaskFileName(
  taskFiles: string[],
  featureArg: string,
): string | null {
  const trimmed = featureArg.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.endsWith(".tasks.json")) {
    return taskFiles.includes(trimmed) ? trimmed : null;
  }

  const direct = `${trimmed}.tasks.json`;
  if (taskFiles.includes(direct)) {
    return direct;
  }

  const suffix = `-${trimmed}.tasks.json`;
  const matches = taskFiles.filter((file) => file.endsWith(suffix));
  if (matches.length === 0) {
    return null;
  }

  return matches.toSorted((a, b) => b.localeCompare(a))[0] ?? null;
}

export function getPlanBaseName(planFileName: string): string {
  return planFileName.replace(/\.md$/u, "");
}

export function getTaskBaseName(taskFileName: string): string {
  return taskFileName.replace(/\.tasks\.json$/u, "");
}

export function getFeatureNameFromBase(baseName: string): string {
  const match = /^\d{4}-\d{2}-\d{2}-(.+)$/u.exec(baseName);
  return match?.[1] ?? baseName;
}
