import { editor, select } from "@inquirer/prompts";

import { listPlanFiles, listTaskFiles } from "./chief-files";

export async function promptMultiline(
  question: string,
  initialValue = "",
): Promise<string> {
  const response = await editor({
    default: initialValue,
    message: question,
  });

  return response.trim();
}

export interface SelectFileOptions {
  message?: string;
}

export async function selectPlanFile(
  plansDir: string,
  options?: SelectFileOptions,
): Promise<string | null> {
  const planFiles = await listPlanFiles(plansDir);

  if (planFiles.length === 0) {
    console.log("\nNo plans found in .chief/plans.");
    console.log("Run `chief plan` to create one.");
    return null;
  }

  return select({
    choices: planFiles.map((file) => ({ name: file, value: file })),
    message: options?.message ?? "Select a plan:",
  });
}

export async function selectTaskFile(
  tasksDir: string,
  options?: SelectFileOptions,
): Promise<string | null> {
  const taskFiles = await listTaskFiles(tasksDir);

  if (taskFiles.length === 0) {
    console.log("\nNo tasks found in .chief/tasks.");
    console.log("Run `chief breakdown` to create them.");
    return null;
  }

  return select({
    choices: taskFiles.map((file) => ({ name: file, value: file })),
    message: options?.message ?? "Select a task set:",
  });
}
