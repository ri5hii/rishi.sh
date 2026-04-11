export type CommandFlag = {
  long: string;
  short?: string;
  description: string;
  expectsValue?: boolean;
  required?: boolean;
  defaultValue?: string;
};

export type CommandDefinition = {
  name: string;
  description: string;
  usage: string[];
  examples: string[];
  flags: CommandFlag[];
};

export const COMMANDS: Record<string, CommandDefinition> = {
  help: {
    name: "help",
    description:
      "Display available commands or detailed help for a specific command.",
    usage: ["help", "help <command>"],
    examples: ["help", "help projects", "help neofetch"],
    flags: [],
  },
  about: {
    name: "about",
    description: "Show a short professional summary.",
    usage: ["about"],
    examples: ["about"],
    flags: [],
  },
  projects: {
    name: "projects",
    description: "List projects or show details for one project.",
    usage: ["projects", "projects <name>"],
    examples: ["projects", "projects rishi.sh"],
    flags: [
      {
        long: "--all",
        short: "-a",
        description: "Include archived/experimental projects.",
      },
    ],
  },
  blog: {
    name: "blog",
    description: "List blog posts or open one by id/slug.",
    usage: ["blog", "blog <id|slug>"],
    examples: ["blog", "blog 1"],
    flags: [],
  },
  contact: {
    name: "contact",
    description: "Show contact and social links.",
    usage: ["contact"],
    examples: ["contact"],
    flags: [
      {
        long: "--github",
        short: "-g",
        description: "Open the GitHub profile directly.",
      },
      {
        long: "--linkedin",
        short: "-l",
        description: "Open the LinkedIn profile directly.",
      },
      {
        long: "--email",
        short: "-e",
        description: "Open the default mail client.",
      },
    ],
  },
  whoami: {
    name: "whoami",
    description: "Print a quick identity string.",
    usage: ["whoami"],
    examples: ["whoami"],
    flags: [],
  },
  neofetch: {
    name: "neofetch",
    description: "Display a system-style profile summary.",
    usage: ["neofetch"],
    examples: ["neofetch"],
    flags: [
      {
        long: "--compact",
        short: "-c",
        description: "Use a compact one-column view.",
      },
    ],
  },
  cls: {
    name: "cls",
    description: "Clear terminal output history.",
    usage: ["cls"],
    examples: ["cls"],
    flags: [],
  },
};

export const COMMAND_NAMES = Object.keys(COMMANDS).sort();
