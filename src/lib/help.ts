import { COMMANDS, COMMAND_NAMES, type CommandDefinition } from "./commands";

// Renders command flag metadata into a terminal-friendly text block.
const renderFlags = (flags: CommandDefinition["flags"]) => {
  if (!flags.length) return "Flags:\n- (none)";
  const rows = flags.map((f) => {
    const short = f.short ? `, ${f.short}` : "";
    const valueHint = f.expectsValue ? " <value>" : "";
    const required = f.required ? " (required)" : "";
    const def = f.defaultValue ? ` [default: ${f.defaultValue}]` : "";
    return `- ${f.long}${short}${valueHint}: ${f.description}${required}${def}`;
  });
  return ["Flags:", ...rows].join("\n");
};

// Renders all keyboard shortcut hints shown in help output.
const renderShortcuts = () =>
  [
    "Shortcuts:",
    "- Ctrl+I / Cmd+I: Focus prompt input",
    "- Alt+ArrowUp: Jump to previous command output block",
    "- Alt+ArrowDown: Jump to next command output block",
    "- ArrowUp / ArrowDown: Command history (when prompt is focused)",
    "- Tab / Shift+Tab: History autocomplete cycle (when prompt is focused)",
  ].join("\n");

// Builds the top-level command index shown for the base help command.
export const renderHelpIndex = () => {
  const lines = [
    "Available commands",
    "==================",
    "",
    ...COMMAND_NAMES.map((name) => `- ${name}: ${COMMANDS[name].description}`),
    "",
    renderShortcuts(),
    "",
    "Tip: run `help <command>` for detailed usage.",
  ];
  return lines.join("\n");
};

// Builds detailed help text for a single command name.
export const renderHelpCommand = (commandName: string) => {
  const cmd = COMMANDS[commandName];
  if (!cmd) {
    return `Command not found: ${commandName}\nRun \`help\` to list available commands.`;
  }

  const sections = [
    `Command: ${cmd.name}`,
    `${"=".repeat(9 + cmd.name.length)}`,
    `Description: ${cmd.description}`,
    "",
    "Usage:",
    ...cmd.usage.map((u) => `- ${u}`),
    "",
    renderFlags(cmd.flags),
    "",
    "Examples:",
    ...cmd.examples.map((e) => `- ${e}`),
  ];

  if (cmd.name === "help") {
    sections.push("", renderShortcuts());
  }

  return sections.join("\n");
};
