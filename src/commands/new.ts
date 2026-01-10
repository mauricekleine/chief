import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

import { codeBlock } from "common-tags";

import { runPlanMode, runPrint } from "../lib/claude";
import {
  ensureChiefDir,
  ensureWorktreeChiefDir,
  ensureWorktreesDir,
} from "../lib/config";
import {
  ensureChiefInGitignore,
  getCurrentBranch,
  getGitRoot,
  isGitRepo,
} from "../lib/git";
import { generateHash } from "../lib/hash";
import { writeTaskSchema } from "../lib/tasks";
import { promptMultiline } from "../lib/terminal";

export async function newCommand(args: string[] = []): Promise<void> {
  // Check if we're in a git repo
  if (!(await isGitRepo())) {
    throw new Error(
      "Not in a git repository. Please run from within a git repo.",
    );
  }

  const gitRoot = await getGitRoot();
  const currentBranch = await getCurrentBranch();

  // Ensure .chief is in .gitignore before creating worktree
  await ensureChiefInGitignore(gitRoot);

  // Ensure .chief directory exists
  const chiefDir = await ensureChiefDir(gitRoot);
  const worktreesDir = await ensureWorktreesDir(chiefDir);

  // Write task schema if it doesn't exist
  await writeTaskSchema(chiefDir);

  // Get description from CLI args or prompt interactively
  const cliPrompt = args.join(" ").trim();
  const description =
    cliPrompt ||
    (await promptMultiline("Describe what you want to build or accomplish:"));

  if (!description.trim()) {
    throw new Error("Project description cannot be empty.");
  }

  // Generate a hash for uniqueness
  const hash = generateHash();

  // Step 1: Ask Claude to create the worktree with an appropriate name
  console.log("\nCreating git worktree...");
  const worktreeResult = await runPrint(
    codeBlock`
      Based on this project description, create a git worktree with an appropriate short name (kebab-case, max 30 chars).

      Description: ${description}

      Create the worktree at "${worktreesDir}/<name>-${hash}" based on the current branch "${currentBranch}".
      Use "<name>-${hash}" as the branch name.

      After creating the worktree, output ONLY the full path to the worktree on a single line, nothing else.
    `,
    { cwd: gitRoot, model: "sonnet" },
  );

  // Extract the worktree path from Claude's output
  const worktreePath = worktreeResult.trim().split("\n").pop()?.trim();

  if (!worktreePath || !worktreePath.includes(worktreesDir)) {
    throw new Error("Failed to create worktree. Please try again.");
  }

  console.log(`Created worktree: ${worktreePath}`);

  // Ensure .chief is in .gitignore in the worktree (since the main repo change isn't committed yet)
  await ensureChiefInGitignore(worktreePath);

  // Copy .env files from git root to worktree
  const envFiles = readdirSync(gitRoot).filter((file) =>
    file.startsWith(".env"),
  );
  for (const envFile of envFiles) {
    const sourcePath = join(gitRoot, envFile);
    const destPath = join(worktreePath, envFile);
    copyFileSync(sourcePath, destPath);
  }
  if (envFiles.length > 0) {
    console.log(`Copied ${envFiles.length} .env file(s) to worktree`);
  }

  // Ensure .chief directory exists within the worktree for plan and tasks
  const worktreeChiefDir = await ensureWorktreeChiefDir(worktreePath);
  const planPath = join(worktreeChiefDir, "plan.md");
  const mainTasksSchemaPath = join(chiefDir, "tasks.schema.json");
  const worktreeTasksSchemaPath = join(worktreeChiefDir, "tasks.schema.json");
  const tasksPath = join(worktreeChiefDir, "tasks.json");

  // Copy tasks schema to worktree so Claude can access it
  copyFileSync(mainTasksSchemaPath, worktreeTasksSchemaPath);

  // Copy verification.txt to worktree if it exists in main .chief
  const mainVerificationPath = join(chiefDir, "verification.txt");
  const worktreeVerificationPath = join(worktreeChiefDir, "verification.txt");

  if (existsSync(mainVerificationPath)) {
    copyFileSync(mainVerificationPath, worktreeVerificationPath);
  }

  // Step 2: Run Claude in plan mode for the interactive planning session
  const planPrompt = codeBlock`
    ${description}

    Conduct a user interview before creating the plan. Ask clarifying questions to understand the requirements better.

    When you have formulated the plan, output it to ${planPath}.

    Important: you are NOT allowed to start executing the plan. Once the plan is created, you MUST exit the session.
    If you're unable to exit the session, instruct the user to press Ctrl+C twice to exit the session and continue with the plan.
  `;

  console.log("\nStarting planning session with Claude...");
  console.log("(Exit the session when you're done planning)\n");

  await runPlanMode(planPrompt, { chrome: true, cwd: worktreePath });

  // Step 3: Convert plan to tasks
  console.log("\nConverting plan to tasks...");
  await runPrint(
    codeBlock`
      Read the plan from "${planPath}" and convert it into a series of tasks according to the JSON schema in "${worktreeTasksSchemaPath}".
      Output the tasks to "${tasksPath}". Make sure each task has: category, description, passes (set to false), and steps array.
    `,
    { cwd: worktreePath, model: "sonnet" },
  );

  const worktreeName = basename(worktreePath);

  console.log("\n✓ Tasks created successfully!");
  console.log(`  Worktree: ${worktreePath}`);
  console.log("\nNext steps:");
  console.log(`  chief tasks list ${worktreeName}  - View the tasks`);
  console.log(`  chief run ${worktreeName}         - Start working on tasks`);
}
