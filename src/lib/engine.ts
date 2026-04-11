import { fetchAboutRenderedHtml } from "./about";
import { COMMANDS } from "./commands";
import { renderHelpCommand, renderHelpIndex } from "./help";

export type OutputMode = "text" | "html";

export type EngineResult = {
  output: string;
  outputMode?: OutputMode;
  clear?: boolean;
  error?: boolean;
};

const parseInput = (input: string) => {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  const command = parts[0] ?? "";
  const args = parts.slice(1);
  return { command, args };
};

export const executeCommand = async (input: string): Promise<EngineResult> => {
  const trimmed = input.trim();
  if (!trimmed) return { output: "" };

  const { command, args } = parseInput(trimmed);

  if (command === "help") {
    if (!args.length) return { output: renderHelpIndex() };
    return { output: renderHelpCommand(args[0].toLowerCase()) };
  }

  if (command === "cls") {
    return { output: "", clear: true };
  }

  if (command === "about") {
    try {
      const html = await fetchAboutRenderedHtml();
      return {
        output: html,
        outputMode: "html",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { output: `about: ${message}`, error: true };
    }
  }

  if (command in COMMANDS) {
    // Temporary stubs for v0.2 phase 1:
    return { output: `${command}: command implementation in progress.` };
  }

  return {
    output: `Command not found: ${command}\nRun \`help\` to list available commands.`,
    error: true,
  };
};
