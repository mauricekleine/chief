import { createInterface } from "node:readline";

import { editor } from "@inquirer/prompts";

export function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function promptMultiline(question: string): Promise<string> {
  const result = await editor({
    message: question,
  });
  return result.trim();
}
