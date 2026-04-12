import { fetchAboutRenderedHtml } from "./about";
import { fetchBlogIndexHtml, fetchBlogPostHtml } from "./blog";
import { COMMANDS } from "./commands";
import { renderHelpCommand, renderHelpIndex } from "./help";
import { fetchProjectReadmeHtml, fetchProjectsIndexHtml } from "./projects";

// Output formats supported by the terminal renderer.
export type OutputMode = "text" | "html";

// Normalized shape returned for every command execution.
export type EngineResult = {
  output: string;
  outputMode?: OutputMode;
  clear?: boolean;
  error?: boolean;
  openUrl?: string;
  openInNewTab?: boolean;
};

// Splits raw terminal input into command and positional argument tokens.
const parseInput = (input: string) => {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  const command = parts[0] ?? "";
  const args = parts.slice(1);
  return { command, args };
};

// Parsed argument container used after flag validation.
type ParsedArgs = {
  positionals: string[];
  flags: Set<string>;
};

// Creates a standardized command-scoped error payload.
const commandError = (commandName: string, message: string): EngineResult => ({
  output: `${commandName}: ${message}\nRun \`help ${commandName}\` for usage.`,
  error: true,
});

// Validates and normalizes command arguments into positionals and known flags.
const parseCommandArgs = (
  commandName: string,
  args: string[],
): ParsedArgs | EngineResult => {
  const definition = COMMANDS[commandName];
  if (!definition) {
    return { positionals: [...args], flags: new Set<string>() };
  }

  const aliasToLong = new Map<
    string,
    { long: string; expectsValue?: boolean }
  >();
  for (const flag of definition.flags) {
    aliasToLong.set(flag.long, {
      long: flag.long,
      expectsValue: flag.expectsValue,
    });
    if (flag.short) {
      aliasToLong.set(flag.short, {
        long: flag.long,
        expectsValue: flag.expectsValue,
      });
    }
  }

  const supportedFlags = definition.flags
    .flatMap((flag) => [flag.long, flag.short].filter(Boolean))
    .join(", ");

  const unknownFlagError = (flagToken: string) => {
    if (!supportedFlags) {
      return commandError(
        commandName,
        `Unknown flag: ${flagToken}. This command does not accept flags.`,
      );
    }

    return commandError(
      commandName,
      `Unknown flag: ${flagToken}. Supported flags: ${supportedFlags}`,
    );
  };

  const positionals: string[] = [];
  const flags = new Set<string>();

  const applyFlagToken = (
    flagToken: string,
    inlineValue: string | undefined,
    index: number,
  ): { consumeNext: boolean; error?: EngineResult } => {
    const resolved = aliasToLong.get(flagToken);
    if (!resolved) {
      return { consumeNext: false, error: unknownFlagError(flagToken) };
    }

    if (resolved.expectsValue) {
      if (inlineValue !== undefined && !inlineValue.trim()) {
        return {
          consumeNext: false,
          error: commandError(
            commandName,
            `Flag ${flagToken} requires a value.`,
          ),
        };
      }

      if (inlineValue === undefined) {
        const next = args[index + 1];
        if (next === undefined) {
          return {
            consumeNext: false,
            error: commandError(
              commandName,
              `Flag ${flagToken} requires a value.`,
            ),
          };
        }
        return { consumeNext: true };
      }

      return { consumeNext: false };
    }

    if (inlineValue !== undefined) {
      return {
        consumeNext: false,
        error: commandError(
          commandName,
          `Flag ${flagToken} does not accept a value.`,
        ),
      };
    }

    flags.add(resolved.long);
    return { consumeNext: false };
  };

  for (let i = 0; i < args.length; i++) {
    const token = args[i];

    if (token === "--") {
      positionals.push(...args.slice(i + 1));
      break;
    }

    if (!token.startsWith("-") || token === "-") {
      positionals.push(token);
      continue;
    }

    if (token.startsWith("--")) {
      const eqIndex = token.indexOf("=");
      const flagToken = eqIndex >= 0 ? token.slice(0, eqIndex) : token;
      const inlineValue = eqIndex >= 0 ? token.slice(eqIndex + 1) : undefined;
      const outcome = applyFlagToken(flagToken, inlineValue, i);
      if (outcome.error) return outcome.error;
      if (outcome.consumeNext) i++;
      continue;
    }

    if (token.length > 2) {
      const shortFlags = token.slice(1).split("");
      let consumedNext = false;

      for (let j = 0; j < shortFlags.length; j++) {
        const shortToken = `-${shortFlags[j]}`;
        const resolved = aliasToLong.get(shortToken);

        if (!resolved) {
          return unknownFlagError(shortToken);
        }

        if (resolved.expectsValue) {
          const trailingValue = token.slice(j + 2);
          const inlineValue = trailingValue.length ? trailingValue : undefined;
          const outcome = applyFlagToken(shortToken, inlineValue, i);
          if (outcome.error) return outcome.error;
          if (outcome.consumeNext) consumedNext = true;
          break;
        }

        const outcome = applyFlagToken(shortToken, undefined, i);
        if (outcome.error) return outcome.error;
      }

      if (consumedNext) i++;
      continue;
    }

    const outcome = applyFlagToken(token, undefined, i);
    if (outcome.error) return outcome.error;
    if (outcome.consumeNext) i++;
  }

  return { positionals, flags };
};

// Main command dispatcher for all terminal commands.
export const executeCommand = async (input: string): Promise<EngineResult> => {
  const trimmed = input.trim();
  if (!trimmed) return { output: "" };

  const { command: rawCommand, args } = parseInput(trimmed);
  const command = rawCommand.toLowerCase();

  // Help command: global or per-command docs.
  if (command === "help") {
    const parsed = parseCommandArgs(command, args);
    if ("error" in parsed) return parsed;

    if (!parsed.positionals.length) return { output: renderHelpIndex() };

    if (parsed.positionals.length > 1) {
      return commandError(command, "Expected at most one command name.");
    }

    return { output: renderHelpCommand(parsed.positionals[0].toLowerCase()) };
  }

  // Clear command: resets session output history.
  if (command === "cls") {
    const parsed = parseCommandArgs(command, args);
    if ("error" in parsed) return parsed;
    if (parsed.positionals.length) {
      return commandError(command, "This command does not accept arguments.");
    }
    return { output: "", clear: true };
  }

  // About command: renders GitHub profile README.
  if (command === "about") {
    const parsed = parseCommandArgs(command, args);
    if ("error" in parsed) return parsed;
    if (parsed.positionals.length) {
      return commandError(command, "This command does not accept arguments.");
    }

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

  // Projects command: list repositories or show a specific README.
  if (command === "projects") {
    const parsed = parseCommandArgs(command, args);
    if ("error" in parsed) return parsed;

    const includeAll = parsed.flags.has("--all");
    if (parsed.positionals.length > 1) {
      return commandError(
        command,
        "Expected at most one repository name argument.",
      );
    }

    const repoArg = parsed.positionals[0];

    try {
      if (!repoArg) {
        const html = await fetchProjectsIndexHtml(includeAll);
        return {
          output: html,
          outputMode: "html",
        };
      }

      const html = await fetchProjectReadmeHtml(repoArg);
      return {
        output: html,
        outputMode: "html",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { output: `projects: ${message}`, error: true };
    }
  }

  // Blog command: list posts or render a single post body.
  if (command === "blog") {
    const parsed = parseCommandArgs(command, args);
    if ("error" in parsed) return parsed;

    if (parsed.positionals.length > 1) {
      return commandError(command, "Expected at most one post id/slug.");
    }

    const postArg = parsed.positionals[0];

    try {
      if (!postArg) {
        const html = await fetchBlogIndexHtml();
        return {
          output: html,
          outputMode: "html",
        };
      }

      const html = await fetchBlogPostHtml(postArg);
      return {
        output: html,
        outputMode: "html",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { output: `blog: ${message}`, error: true };
    }
  }

  // Whoami command: renders a neofetch-style identity card.
  if (command === "whoami") {
    const parsed = parseCommandArgs(command, args);
    if ("error" in parsed) return parsed;
    if (parsed.positionals.length) {
      return commandError(command, "This command does not accept arguments.");
    }

    return {
      outputMode: "html",
      output: [
        '<div class="WhoamiNeo">',
        '  <div class="WhoamiNeoMeta">',
        '    <div class="WhoamiNeoTitle">rishi@rishi.sh</div>',
        '    <div class="WhoamiNeoRule">--------------</div>',
        '    <div class="WhoamiNeoRow"><span class="WhoamiNeoKey">name</span><span class="WhoamiNeoSep">:</span><span class="WhoamiNeoValue">Hrishikesh Vadla</span></div>',
        '    <div class="WhoamiNeoRow"><span class="WhoamiNeoKey">focus</span><span class="WhoamiNeoSep">:</span><span class="WhoamiNeoValue">AI/ML + Cybersecurity</span></div>',
        '    <div class="WhoamiNeoRow"><span class="WhoamiNeoKey">stack</span><span class="WhoamiNeoSep">:</span><span class="WhoamiNeoValue">Python, Rust, Go</span></div>',
        '    <div class="WhoamiNeoRow"><span class="WhoamiNeoKey">tools</span><span class="WhoamiNeoSep">:</span><span class="WhoamiNeoValue">FastAPI, Docker, AWS</span></div>',
        '    <div class="WhoamiNeoRow"><span class="WhoamiNeoKey">status</span><span class="WhoamiNeoSep">:</span><span class="WhoamiNeoValue">Building secure intelligent systems</span></div>',
        '    <div class="WhoamiNeoRow"><span class="WhoamiNeoKey">site</span><span class="WhoamiNeoSep">:</span><span class="WhoamiNeoValue">rishi.sh</span></div>',
        "  </div>",
        '  <img class="WhoamiAvatar" src="/image.png" alt="Portrait of myself" width="128" height="128" />',
        "</div>",
      ].join(""),
    };
  }

  // Neofetch command: full split layout or compact text mode.
  if (command === "neofetch") {
    const parsed = parseCommandArgs(command, args);
    if ("error" in parsed) return parsed;

    if (parsed.positionals.length) {
      return commandError(command, "This command does not accept arguments.");
    }

    const compact = parsed.flags.has("--compact");

    if (compact) {
      return {
        output: [
          "rishi.sh :: profile",
          "name      : Hrishikesh Vadla",
          "focus     : AI/ML, Cybersecurity, Systems",
          "stack     : Python, Rust, Go, FastAPI, Docker",
          "location  : India",
          "status    : Building secure intelligent systems",
        ].join("\n"),
      };
    }

    const neofetchLogo = [
      "                  .',;::::;,'..",
      "             .';:cccccccccccc:;,.",
      "          .;cccccccccccccccccccccc;.",
      "        .:cccccccccccccccccccccccccc:.",
      "      .;ccccccccccccc;.:dddl:.;ccccccc;.",
      "     .:ccccccccccccc;OWMKOOXMWd;ccccccc:.",
      "    .:ccccccccccccc;KMMc;cc;xMMc;ccccccc:.",
      "    ,cccccccccccccc;MMM.;cc;;WW:;cccccccc,",
      "    :cccccccccccccc;MMM.;cccccccccccccccc:",
      "    :ccccccc;oxOOOo;MMM000k.;cccccccccccc:",
      "    cccccc;0MMKxdd:;MMMkddc.;cccccccccccc;",
      "    ccccc;XMO';cccc;MMM.;cccccccccccccccc'",
      "    ccccc;MMo;ccccc;MMW.;ccccccccccccccc;",
      "    ccccc;0MNc.ccc.xMMd;ccccccccccccccc;",
      "    cccccc;dNMWXXXWM0:;cccccccccccccc:,",
      "    cccccccc;.:odl:.;cccccccccccccc:,.",
      "    cccccccccccccccccccccccccccccc:'",
      "    :ccccccccccccccccccccccc:;,..",
      "     ':cccccccccccccccc::;,.",
    ];

    const neofetchInfo = [
      "rishi.sh",
      "--------",
      "name      : Hrishikesh Vadla",
      "focus     : AI/ML + Cybersecurity",
      "stack     : Python, Rust, Go",
      "tools     : FastAPI, Docker, AWS",
      "interests : Adversarial defense,",
      "            LLM systems, DevSecOps",
      "quote     : secure intelligence",
    ];

    return {
      outputMode: "html",
      output: [
        '<div class="NeofetchSplit">',
        `  <pre class="NeofetchLogo">${neofetchLogo.join("\n")}</pre>`,
        `  <pre class="NeofetchInfo">${neofetchInfo.join("\n")}</pre>`,
        "</div>",
      ].join("\n"),
    };
  }

  // Contact command: prints links or opens one destination directly.
  if (command === "contact") {
    const parsed = parseCommandArgs(command, args);
    if ("error" in parsed) return parsed;

    if (parsed.positionals.length) {
      return commandError(command, "This command does not accept arguments.");
    }

    const openGitHub = parsed.flags.has("--github");
    const openLinkedIn = parsed.flags.has("--linkedin");
    const openEmail = parsed.flags.has("--email");

    const selectedDestinations = [openGitHub, openLinkedIn, openEmail].filter(
      Boolean,
    ).length;

    if (selectedDestinations > 1) {
      return commandError(command, "Use only one destination flag at a time.");
    }

    if (openGitHub || openLinkedIn || openEmail) {
      if (openGitHub) {
        return {
          output: "Opening GitHub profile...",
          openUrl: "https://github.com/ri5hii",
          openInNewTab: true,
        };
      }

      if (openLinkedIn) {
        return {
          output: "Opening LinkedIn profile...",
          openUrl: "https://www.linkedin.com/in/hrishikesh-vadla/",
          openInNewTab: true,
        };
      }

      return {
        output: "Opening email client...",
        openUrl: "mailto:rishi.0.4789@gmail.com",
        openInNewTab: false,
      };
    }

    return {
      outputMode: "html",
      output: [
        "<h2>Contact</h2>",
        "<p>Let\'s connect:</p>",
        "<ul>",
        '<li>Email: <a href="mailto:rishi.0.4789@gmail.com">rishi.0.4789@gmail.com</a></li>',
        '<li>LinkedIn: <a href="https://www.linkedin.com/in/hrishikesh-vadla/">hrishikesh-vadla</a></li>',
        '<li>GitHub: <a href="https://github.com/ri5hii">github.com/ri5hii</a></li>',
        "</ul>",
      ].join("\n"),
    };
  }

  // Resume command: opens the public resume asset in a new tab.
  if (command === "resume") {
    const parsed = parseCommandArgs(command, args);
    if ("error" in parsed) return parsed;
    if (parsed.positionals.length) {
      return commandError(command, "This command does not accept arguments.");
    }

    return {
      output: "Opening resume...",
      openUrl: "/resume.pdf",
      openInNewTab: true,
    };
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
