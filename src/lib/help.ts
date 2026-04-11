import { COMMANDS, COMMAND_NAMES, type CommandDefinition } from "./commands";

const pad = (value: string, width: number) =>
  value.length >= width ? value : value + " ".repeat(width - value.length);

const renderFlags = (flags: CommandDefinition["flags"]) => {
  if (!flags.length) return "Flags:\n  (none)";
  const rows = flags.map((f) => {
    const short = f.short ? `, ${f.short}` : "";
    const valueHint = f.expectsValue ? " <value>" : "";
    const required = f.required ? " (required)" : "";
    const def = f.defaultValue ? ` [default: ${f.defaultValue}]` : "";
    return `  ${f.long}${short}${valueHint}  ${f.description}${required}${def}`;
  });
  return ["Flags:", ...rows].join("\n");
};

const renderShortcuts = () =>
  ["Shortcuts:", "  Ctrl+I (Cmd+I)  Focus prompt input"].join("\n");

export const renderHelpIndex = () => {
  const nameCol = Math.max(...COMMAND_NAMES.map((n) => n.length), 7);
  const lines = [
    "Available commands:",
    "",
    `${pad("COMMAND", nameCol)}  DESCRIPTION`,
    `${"-".repeat(nameCol)}  ${"-".repeat(42)}`,
    ...COMMAND_NAMES.map(
      (name) => `${pad(name, nameCol)}  ${COMMANDS[name].description}`,
    ),
    "",
    renderShortcuts(),
    "",
    "Run `help <command>` for detailed usage.",
  ];
  return lines.join("\n");
};

export const renderHelpCommand = (commandName: string) => {
  const cmd = COMMANDS[commandName];
  if (!cmd) {
    return `Command not found: ${commandName}\nRun \`help\` to list available commands.`;
  }

  const sections = [
    `${cmd.name}`,
    `${"-".repeat(cmd.name.length)}`,
    cmd.description,
    "",
    "Usage:",
    ...cmd.usage.map((u) => `  ${u}`),
    "",
    renderFlags(cmd.flags),
    "",
    "Examples:",
    ...cmd.examples.map((e) => `  ${e}`),
  ];

  if (cmd.name === "help") {
    sections.push("", renderShortcuts());
  }

  return sections.join("\n");
};
