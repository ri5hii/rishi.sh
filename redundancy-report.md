# Redundancy Report

Date: 2026-04-12

## Scope
- src/lib/about.ts
- src/lib/blog.ts
- src/lib/projects.ts
- src/lib/engine.ts
- src/components/TerminalScreen.astro
- src/components/BootScreen.astro

## Findings

1. Duplicate HTML escaping utility
- Evidence:
  - src/lib/about.ts:34
  - src/lib/blog.ts:22
  - src/lib/projects.ts:42
- Impact: Medium maintainability cost; behavior drift risk if one copy changes.
- Recommendation: Move to shared utility (for example src/lib/html.ts) and import one canonical escape function.

2. Duplicate markdown rendering flow via GitHub API
- Evidence:
  - src/lib/about.ts:49
  - src/lib/blog.ts:33
  - src/lib/projects.ts:118
- Impact: Medium; repeated request options and fallback behavior can diverge.
- Recommendation: Extract shared renderMarkdownToHtml utility with optional context parameter.

3. Repeated command argument parse guard sequence in dispatcher
- Evidence:
  - src/lib/engine.ts:210, 224, 234, 254, 289, 320, 348, 417, 476
  - Same two-line pattern: parseCommandArgs + "error" guard.
- Impact: Medium; verbose command branches increase cognitive load.
- Recommendation: Introduce a small helper wrapper to reduce boilerplate per command branch.

4. Duplicate parse-and-set input behavior paths in prompt key handlers
- Evidence:
  - src/components/TerminalScreen.astro:571, 590, 600, 603
- Impact: Low; repeated setInputValue/update flow across Tab and Arrow handlers.
- Recommendation: Factor a small applyHistoryValue helper that updates input and preview together.

5. Repeated ASCII logo frames in BootScreen component
- Evidence:
  - src/components/BootScreen.astro:25, 33, 41, 49
- Impact: Low and mostly intentional (glitch frame effect).
- Recommendation: Optional; could generate frames from a single source if maintainability becomes a priority.

## Quick Wins (Low Risk)
- Centralize escapeHtml first.
- Centralize markdown renderer second.

## Higher-Change Refactors (Plan Later)
- Engine command-handler abstraction for parse/guard boilerplate.
- Optional data-driven banner frame generation.
