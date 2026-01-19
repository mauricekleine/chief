import { codeBlock } from "common-tags";

import { formatDate } from "../lib/chief-files";
import { runPlanMode } from "../lib/claude";
import { getGitRoot, isGitRepo } from "../lib/git";
import { promptMultiline } from "../lib/terminal";

export async function planCommand(
  descriptionParts: string[] = [],
): Promise<void> {
  if (!(await isGitRepo())) {
    throw new Error(
      "Not in a git repository. Please run from within a git repo.",
    );
  }

  const gitRoot = await getGitRoot();

  const cliPrompt = descriptionParts.join(" ").trim();
  const description = await promptMultiline(
    "Describe what you want to build or accomplish:",
    cliPrompt,
  );

  if (!description.trim()) {
    throw new Error("Project description cannot be empty.");
  }

  const dateStamp = formatDate(new Date());

  const planPrompt = codeBlock`
    ${description}

    Conduct a user interview before creating the plan and ask me clarifying questions to understand the requirements better.

    Make the plan extremely concise. Sacrifice grammar for the sake of concision.
    At the end of each plan, give me a list of unresolved questions to answer, if any.

    When you have formulated the plan, output it to a file named "${dateStamp}-<feature-name>.md" in the .chief/plans directory.
    
    Important: you are NOT allowed to start executing the plan. Once the plan is created, you MUST exit the session.
    If you're unable to exit the session, instruct the user to press <Cmd+C> twice to exit the session and continue with the plan.
  `;

  console.error("\nStarting planning session with Claude...");
  console.error("(Exit the session when you're done planning)\n");

  await runPlanMode(planPrompt, { chrome: true, cwd: gitRoot });
}
