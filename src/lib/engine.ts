import { fetchAboutRenderedHtml } from "./about";
import { fetchBlogIndexHtml, fetchBlogPostHtml } from "./blog";
import { COMMANDS } from "./commands";
import { renderHelpCommand, renderHelpIndex } from "./help";
import { fetchProjectReadmeHtml, fetchProjectsIndexHtml } from "./projects";

export type OutputMode = "text" | "html";

export type EngineResult = {
  output: string;
  outputMode?: OutputMode;
  clear?: boolean;
  error?: boolean;
  openUrl?: string;
  openInNewTab?: boolean;
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

  if (command === "projects") {
    const includeAll = args.includes("--all") || args.includes("-a");
    const repoArg = args.find((arg) => !arg.startsWith("-"));

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

  if (command === "blog") {
    const postArg = args.find((arg) => !arg.startsWith("-"));

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

  if (command === "whoami") {
    return {
      output:
        "Hrishikesh Vadla\nAI/ML + cybersecurity builder focused on secure intelligent systems.",
    };
  }

  if (command === "neofetch") {
    const compact = args.includes("--compact") || args.includes("-c");

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

    return {
      output: [
        "                  .',;::::;,'..                     rishi.sh",
        "             .';:cccccccccccc:;,.                   --------",
        "          .;cccccccccccccccccccccc;.                name      : Hrishikesh Vadla",
        "        .:cccccccccccccccccccccccccc:.              focus     : AI/ML + Cybersecurity",
        "      .;ccccccccccccc;.:dddl:.;ccccccc;.            stack     : Python, Rust, Go",
        "     .:ccccccccccccc;OWMKOOXMWd;ccccccc:.           tools     : FastAPI, Docker, AWS",
        "    .:ccccccccccccc;KMMc;cc;xMMc;ccccccc:.          interests : Adversarial defense,",
        "    ,cccccccccccccc;MMM.;cc;;WW:;cccccccc,                       LLM systems, DevSecOps",
        "    :cccccccccccccc;MMM.;cccccccccccccccc:          quote     : secure intelligence",
        "    :ccccccc;oxOOOo;MMM000k.;cccccccccccc:",
        "    cccccc;0MMKxdd:;MMMkddc.;cccccccccccc;",
        "    ccccc;XMO';cccc;MMM.;cccccccccccccccc'",
        "    ccccc;MMo;ccccc;MMW.;ccccccccccccccc;",
        "    ccccc;0MNc.ccc.xMMd;ccccccccccccccc;",
        "    cccccc;dNMWXXXWM0:;cccccccccccccc:,",
        "    cccccccc;.:odl:.;cccccccccccccc:,.",
        "    cccccccccccccccccccccccccccccc:'.",
        "    :ccccccccccccccccccccccc:;,..",
        "     ':cccccccccccccccc::;,.",
      ].join("\n"),
    };
  }

  if (command === "contact") {
    const openGitHub = args.includes("--github") || args.includes("-g");
    const openLinkedIn = args.includes("--linkedin") || args.includes("-l");
    const openEmail = args.includes("--email") || args.includes("-e");

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

  if (command === "resume") {
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
