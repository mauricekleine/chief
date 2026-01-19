import { existsSync } from "node:fs";
import { join } from "node:path";

import { codeBlock } from "common-tags";

import {
  getPlanBaseName,
  listPlanFiles,
  resolvePlanFileName,
} from "../lib/chief-files";
import { runPrint } from "../lib/claude";
import { ensureChiefDir, ensurePlansDir, ensureTasksDir } from "../lib/config";
import { getGitRoot, isGitRepo } from "../lib/git";
import tasksSchema from "../lib/tasks.schema.json" assert { type: "json" };
import { selectPlanFile } from "../lib/terminal";

export async function breakdownCommand(featureName?: string): Promise<void> {
  if (!(await isGitRepo())) {
    throw new Error(
      "Not in a git repository. Please run from within a git repo.",
    );
  }

  const gitRoot = await getGitRoot();
  const chiefDir = await ensureChiefDir(gitRoot);
  const plansDir = await ensurePlansDir(chiefDir);
  const tasksDir = await ensureTasksDir(chiefDir);

  const featureArg = featureName?.trim();
  let planFileName: string | null;

  if (featureArg) {
    const planFiles = await listPlanFiles(plansDir);
    planFileName = resolvePlanFileName(planFiles, featureArg);
    if (!planFileName) {
      throw new Error(`Plan not found for: ${featureArg}`);
    }
  } else {
    planFileName = await selectPlanFile(plansDir, {
      message: "Select a plan to break down:",
    });
    if (!planFileName) {
      return;
    }
  }

  const planPath = join(plansDir, planFileName);
  if (!existsSync(planPath)) {
    throw new Error(`Plan file not found: ${planPath}`);
  }

  const baseName = getPlanBaseName(planFileName);
  const tasksPath = join(tasksDir, `${baseName}.tasks.json`);

  console.log("\nConverting plan to tasks...");
  await runPrint(
    codeBlock`
      Read the plan from "${planPath}" and convert it into a series of tasks according to the following JSON schema:
      ${JSON.stringify(tasksSchema, null, 2)}
      Output the tasks to "${tasksPath}". Make sure each task has: category, description, passes (set to false), and steps array.
    `,
    { cwd: gitRoot, model: "sonnet" },
  );

  console.log("\n✓ Tasks created successfully!");
  console.log(`Tasks file: ${tasksPath}`);
}
