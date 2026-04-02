# rishi.sh

A terminal-driven portfolio that presents my work, thinking, and identity through a command-line interface.

---

## Overview

**rishi.sh** is an interactive, terminal-style portfolio built with a focus on systems thinking, minimalism, and user-driven exploration.

Instead of traditional navigation (pages, menus, buttons), the entire experience is modeled as a **command-line interface (CLI)**. Users interact with the portfolio by typing commands, simulating a real terminal session.

The goal is to create a portfolio that is:

* **Interactive** — users actively explore rather than passively scroll
* **Expressive** — reflects my approach to systems, tooling, and engineering
* **Focused** — delivers information quickly and intentionally
* **Memorable** — stands out from conventional portfolio websites

---

## Core Concept

The application behaves like a **single-session terminal environment**:

```
rishi@rishi.sh:~$ help
```

Users issue commands to:

* discover information (`help`, `projects`, `blog`)
* explore deeper (`projects machina`, `blog 1`)
* take actions (`contact`, `mail`, `github`)

All interactions occur within a **persistent terminal history**, without page reloads or traditional routing.

---

## Key Features

### Terminal Interface

* Single-page terminal UI
* Persistent command + output history
* Prompt-driven interaction model
* Keyboard-first experience

--- 

### Navigation via Commands

#### Discovery

* `help` — list available commands
* `projects` — list projects
* `blog` — list blog posts

#### Exploration

* `projects <name>` — project details
* `blog <id>` — full blog content

#### Identity

* `about` — background and focus
* `whoami` — quick identity snapshot
* `neofetch` — system-style summary

#### Actions

* `contact` — links and communication
* `mail` — open email client
* `github <project>` — open repository

#### Utility

* `cls` — clear terminal
* command history (↑ / ↓)
* autocomplete (TAB)

---

### Project Integration

* Dynamic fetching of project data via GitHub API
* Highlights:

  * description
  * technologies
  * repository access

---

### Blog System

* Markdown/MDX-based blog posts
* Timeline-based listing
* Rendered inside terminal output

---

### Autocomplete

* TAB-based command completion
* Prefix matching for faster navigation

---

### Command History

* Navigate previous commands using arrow keys
* Improves usability and realism

---

## Tech Stack

### Frontend

* Astro (static-first architecture)
* Tailwind CSS (styling)
* Vanilla JavaScript / minimal client-side logic

### Deployment

* Vercel (static hosting + edge delivery)

---

## Design Principles

### 1. Interaction over visuals

The experience is driven by **behavior**, not decoration.

---

### 2. Minimalism

Only essential commands and outputs are implemented.

---

### 3. Systems Thinking

The portfolio is structured like a **command interpreter**, not a webpage.

---

### 4. Progressive Disclosure

Information is revealed in layers:

```
projects → projects machina → github machina
```

---

### 5. Performance

* Static delivery where possible
* Client-side execution for instant feedback
* Minimal network dependency

---

## Scope

### Included

* Terminal UI with persistent history
* Command parser and execution system
* Core commands (`help`, `projects`, `about`, `blog`, `contact`)
* Argument-based navigation
* GitHub integration
* Blog rendering
* Autocomplete and command history
* Deployment-ready build

---

### Not Included (by design)

* Full shell emulation (pipes, processes, etc.)
* Complex filesystem simulation
* Heavy frontend frameworks or abstractions
* Overly animated or decorative UI

---

## Philosophy

This project treats a portfolio not as a page to browse, but as a system to interact with.

The user doesn’t scroll — they **query**.
The interface doesn’t guide — it **responds**.

---
