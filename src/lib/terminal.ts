import { createInterface } from "node:readline";

const FOCUS_REPORTING_DISABLE = "\u001B[?1004l";
const FOCUS_REPORTING_ENABLE = "\u001B[?1004h";

function disableFocusReporting(): void {
  process.stdout.write(FOCUS_REPORTING_DISABLE);
}

function enableFocusReporting(): void {
  process.stdout.write(FOCUS_REPORTING_ENABLE);
}

export function prompt(question: string): Promise<string> {
  disableFocusReporting();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      enableFocusReporting();
      resolve(answer);
    });
  });
}

export function promptMultiline(question: string): Promise<string> {
  disableFocusReporting();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(question);
  console.log("(Enter an empty line to finish)\n");

  return new Promise((resolve) => {
    const lines: string[] = [];

    rl.on("line", (line) => {
      if (line === "") {
        rl.close();
        enableFocusReporting();
        resolve(lines.join("\n"));
      } else {
        lines.push(line);
      }
    });
  });
}
