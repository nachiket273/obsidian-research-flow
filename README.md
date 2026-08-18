# ResearchFlow

[![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22research-flow%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json)](https://community.obsidian.md/plugins/research-flow)

[**Install ResearchFlow from the Community Plugins**](https://community.obsidian.md/plugins/research-flow)

> A Markdown-first research and project operating system connecting ideas, projects, tasks, daily work, reading, and career opportunities.

**ResearchFlow** is a Markdown-first research and project operating
system for [Obsidian](https://obsidian.md/).

It connects:

-   Research ideas
-   ML and Quantum work
-   Projects
-   Tasks
-   Daily work
-   Reading
-   Career opportunities
-   Blockers
-   Attention items
-   Decisions
-   Results and artifacts

The central idea is simple:

> **Connect what you think about, what you build, what you read, what
> you work on, and where you want to go next.**

------------------------------------------------------------------------

## Current Status

**Version: `0.9.1`**

ResearchFlow is an actively developed alpha. The current implementation
combines the original foundation with the v0.2--v1.0 roadmap features.

The plugin is intentionally **local and Markdown-first**. Your vault
remains usable as normal Obsidian Markdown even without the plugin.

------------------------------------------------------------------------

# What ResearchFlow Does

ResearchFlow treats your research workflow as a connected graph rather
than a collection of unrelated folders.

``` text
                    ResearchFlow
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
      Ideas           Projects           Career
       │                 │                 │
       │               Tasks               │
       │                 │                 │
       └────────────── Daily ───────────────┘
                         │
                  Reading / Results
```

A typical workflow can look like:

``` text
Reading
   ↓
Research Idea
   ↓
Project
   ↓
Task
   ↓
Daily Work
   ↓
Result / Artifact
   ↓
Career Opportunity
```

The relationships are represented using normal Markdown, YAML
frontmatter, and Obsidian wikilinks.

------------------------------------------------------------------------

# Core Features

## 1. Central Dashboard

The ResearchFlow home view provides a single landing page for your work.

It currently shows:

-   Active projects
-   Project progress
-   Project priority
-   Project deadlines
-   Project health
-   Blockers
-   Attention flags
-   Stale projects
-   Today's incomplete tasks
-   Upcoming career opportunities
-   Reading queue
-   Research ideas
-   Project timeline / health information
-   Overall counts and status statistics

The dashboard is intended to answer:

> **What is happening, what is blocked, and what needs my attention?**

------------------------------------------------------------------------

# 2. Projects

Projects are the primary unit of active work.

A project stores:

-   Domain
-   Project type
-   Status
-   Priority
-   Progress
-   Start date
-   Deadline
-   Next action
-   Blocker
-   Attention flag
-   Last activity
-   Milestones
-   Tasks
-   Decisions
-   Artifacts
-   Related reading
-   Related ideas
-   Related career opportunities
-   Daily work

Example:

``` yaml
---
type: project
domain: ML
status: active
priority: high
progress: 45
start: 2026-08-01
deadline: 2026-09-15
blocker:
attention: false
next_action: Run the baseline experiment
last_activity: 2026-08-18T20:30:00
project_kind: research
---
```

### Project progress

Project progress is derived from task completion.

``` text
Completed tasks
---------------- × 100
All project tasks
```

The task state is therefore the source of truth rather than manually
maintaining a percentage.

------------------------------------------------------------------------

# 3. Tasks

Tasks can be simple work items while still having their own Markdown
page.

A task can contain:

-   Objective
-   Architecture
-   Code links
-   Tests
-   Artifacts
-   Issues
-   Decisions
-   Results
-   Daily work

Example:

``` yaml
---
type: task
status: todo
priority: medium
project: "[[Astronomy Agent]]"
created: 2026-08-18
work_date: 2026-08-18
due:
---
```

### Project relationship

Every task can belong to a project.

When a task is created:

``` text
Task
 ├──► Project
 └──► Daily Note
```

The project task list is maintained automatically.

------------------------------------------------------------------------

# 4. Daily Work

Daily notes are the common record of what actually happened during the
day.

A single day can contain work on multiple projects:

``` text
2026-08-18

OpportunityAgent
Astronomy Agent
Ising Research
```

The daily note contains:

-   Today's Focus
-   Tasks
-   Work Log
-   Decisions
-   Blockers
-   Ideas
-   Reading
-   Career

Tasks scheduled for a date are automatically represented in the
corresponding daily note.

------------------------------------------------------------------------

## Daily ↔ Task Synchronization

Task completion is synchronized across views.

``` text
             ┌──────────────┐
             │     TASK     │
             │  status=todo │
             └──────┬───────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
     Landing      Daily       Project
        │           │           │
        └───────────┴───────────┘
                    │
                    ▼
              status = done
```

Changing a task in the daily workflow updates the underlying task object
and consequently updates project progress and dashboard state.

Completed tasks are removed from the dashboard's active daily task list.

------------------------------------------------------------------------

# 5. Research Ideas

Ideas are captured before they become projects.

ResearchFlow distinguishes between:

-   Research ideas
-   Project ideas

and supports domains such as:

-   ML
-   Quantum
-   General

An idea can contain:

-   Hypothesis
-   Motivation
-   Related work
-   Possible experiments
-   Open questions
-   Next action
-   Related projects
-   Related reading
-   Notes

Example:

``` yaml
---
type: idea
domain: Quantum
kind: research
status: seed
priority: medium
created: 2026-08-18
project:
---
```

------------------------------------------------------------------------

# 6. Reading

Reading items are structured objects rather than an unstructured
bookmark dump.

A reading item tracks:

-   Title
-   URL
-   Type
-   Status
-   Date added
-   Date read
-   Notes
-   Takeaways
-   Related project
-   Related ideas
-   Why it was saved

Example:

``` yaml
---
type: reading
reading_type: paper
status: unread
added: 2026-08-18
read:
url: https://example.com/paper
project: "[[Astronomy Agent]]"
---
```

The dashboard provides a reading queue.

------------------------------------------------------------------------

# 7. Career

Career opportunities are stored as Markdown objects and surfaced in the
ResearchFlow dashboard.

A career opportunity can track:

-   Company
-   Role
-   Deadline
-   Match percentage
-   Status
-   Application date
-   Feedback
-   Documents
-   Related project
-   Source URL
-   Daily work

Example:

``` yaml
---
type: career
company: Example AI
role: ML Researcher
deadline: 2026-09-01
match: 87
status: saved
applied:
feedback:
documents:
project: "[[LLM Research]]"
source: https://example.com/job
---
```

Career opportunities are sorted by deadline in the dashboard.

------------------------------------------------------------------------

## OpportunityAgent Integration

ResearchFlow supports importing career opportunities from a CSV export.

The intended workflow is:

``` text
OpportunityAgent
       │
       ▼
    CSV export
       │
       ▼
ResearchFlow Career objects
       │
       ▼
Career dashboard
```

CSV import is deliberately used as the initial integration boundary
rather than requiring a direct dependency between the two projects.

------------------------------------------------------------------------

# 8. Project Health

ResearchFlow tracks project health using available project metadata and
activity.

Health takes into account factors such as:

-   Project progress
-   Priority
-   Blockers
-   Attention flags
-   Deadlines
-   Recent activity
-   Staleness

Projects without recent activity are surfaced as stale.

The current default stale threshold is **14 days**.

------------------------------------------------------------------------

# 9. Blockers and Attention

Projects can explicitly declare blockers:

``` yaml
blocker: Waiting for dataset access
```

and attention:

``` yaml
attention: true
```

The dashboard separates these into:

``` text
🔴 BLOCKERS

🟠 ATTENTION

⚠ STALE PROJECTS
```

This makes unresolved work visible without requiring manual searching
through project notes.

------------------------------------------------------------------------

# 10. Weekly Research Summary

ResearchFlow can generate a weekly Markdown summary.

The summary provides a place for:

-   Weekly activity
-   Wins
-   Blockers
-   Decisions
-   Next-week planning

The generated summary remains a normal Markdown file inside the vault.

------------------------------------------------------------------------

# 11. Vault Validation

ResearchFlow includes a relationship validation command.

It checks for issues such as:

-   Tasks pointing to missing projects
-   Tasks missing `work_date`
-   Invalid project relationships

Use:

**Command Palette → ResearchFlow: Validate ResearchFlow Relationships**

------------------------------------------------------------------------

# Commands

ResearchFlow currently provides commands for:

  -----------------------------------------------------------------------
  Command                             Purpose
  ----------------------------------- -----------------------------------
  Open Home                           Open the ResearchFlow dashboard

  New Project                         Create a project

  New Research Idea                   Create an idea

  New Task                            Create a task

  Open Today's Daily Note             Open/synchronize today's daily note

  New Reading                         Create a reading item

  New Career Opportunity              Create a career opportunity

  Import Career CSV                   Import OpportunityAgent-style
                                      career data

  Generate Weekly Research Summary    Generate a weekly research summary

  Validate ResearchFlow Relationships Check relationship consistency
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# Folder Structure

The default structure is:

``` text
02_Projects/
03_Ideas/
04_Tasks/
05_Career/
06_Reading/
07_Daily/
```

These folders can be changed from the ResearchFlow settings tab.

ResearchFlow creates the folders automatically if they do not exist.

------------------------------------------------------------------------

# Data Model

ResearchFlow uses Markdown files with YAML frontmatter.

``` text
Project
  │
  ├── Tasks
  │     └── work_date → Daily
  │
  ├── Reading
  │
  ├── Ideas
  │
  └── Career

Daily
  ├── Tasks
  ├── Work Log
  ├── Decisions
  ├── Blockers
  ├── Ideas
  ├── Reading
  └── Career
```

The important design principle is:

> **Objects are stored once; relationships are represented through links
> and metadata.**

------------------------------------------------------------------------

# Design Principles

## Markdown First

ResearchFlow does not require a proprietary database.

Your information remains in:

-   Markdown files
-   YAML frontmatter
-   Obsidian wikilinks

If ResearchFlow disappears tomorrow, your vault remains usable.

------------------------------------------------------------------------

## Links Over Duplication

ResearchFlow prefers relationships over duplicated information.

For example:

``` yaml
project: "[[Astronomy Agent]]"
```

allows the same task to appear conceptually in:

-   the task file
-   the project
-   the daily note
-   the dashboard

without creating separate copies of the task.

------------------------------------------------------------------------

## Task State as Source of Truth

For task completion:

``` text
Task file
   │
   ├──► Daily view
   ├──► Project progress
   └──► Dashboard
```

The task's status is authoritative.

Project progress is derived from project tasks rather than being an
independent manually maintained number.

------------------------------------------------------------------------

## Local First

The core plugin does not require:

-   A server
-   An account
-   A database
-   A cloud service
-   An API key

All core data lives in your Obsidian vault.

------------------------------------------------------------------------

# Roadmap

The version roadmap describes the evolution of ResearchFlow.

## v0.1 --- Foundation

-   [x] Obsidian plugin foundation
-   [x] Configurable vault folders
-   [x] Project templates
-   [x] Research idea templates
-   [x] Task templates
-   [x] Reading templates
-   [x] Career templates
-   [x] Daily work templates
-   [x] Central dashboard
-   [x] Project progress
-   [x] Blocker tracking
-   [x] Attention tracking
-   [x] Command palette commands

## v0.2 --- Synchronization

-   [x] Task → Project relationship
-   [x] Task → Daily relationship
-   [x] Daily → Task synchronization
-   [x] Task → Daily synchronization
-   [x] Automatic project task lists
-   [x] Automatic project progress updates
-   [x] Idempotent daily notes
-   [x] Project selector
-   [x] Cross-view refresh

## v0.3 --- Research Context

-   [x] ML / Quantum / General categorization
-   [x] Research / Project idea types
-   [x] Idea → Project relationship
-   [x] Reading → Project relationship
-   [x] Career → Project relationship
-   [x] Project milestones
-   [x] Project activity tracking
-   [x] Project timeline information

## v0.4 --- Career

-   [x] Career dashboard
-   [x] Deadline sorting
-   [x] Application status
-   [x] Document tracking
-   [x] Feedback tracking
-   [x] Career ↔ Project relationships
-   [x] OpportunityAgent-style CSV import

## v0.5 --- Intelligence

-   [x] Stale project detection
-   [x] Project health indicators
-   [x] Blocker detection
-   [x] Attention detection
-   [x] Deadline-aware project information
-   [x] Weekly research summary
-   [x] Relationship validation

## v1.0 --- Integrated Research Operating System

-   [x] Unified dashboard
-   [x] Projects
-   [x] Ideas
-   [x] Tasks
-   [x] Daily work
-   [x] Reading
-   [x] Career
-   [x] Cross-linked objects
-   [x] Project health
-   [x] Timeline information
-   [x] Weekly summaries
-   [x] Markdown-first storage

### Future beyond v1.0

Potential future capabilities include:

-   Knowledge graph visualization
-   Research/project analytics
-   LLM-assisted linking
-   Automatic daily summaries
-   Project retrospectives
-   Career/project feedback analysis
-   Research idea discovery
-   Deeper OpportunityAgent integration
-   XLSX import
-   More advanced workload planning

------------------------------------------------------------------------

# Development

ResearchFlow is built using:

-   TypeScript
-   Obsidian Plugin API
-   npm
-   TypeScript compiler
-   esbuild

Install dependencies:

``` bash
npm install
```

Development build:

``` bash
npm run dev
```

Production build:

``` bash
npm run build
```

The production build generates:

``` text
main.js
```

inside the plugin directory.

For development, use a separate Obsidian test vault rather than your
primary vault.

------------------------------------------------------------------------

# Project Structure

``` text
obsidian-research-flow/
│
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── README.md
├── LICENSE
│
└── src/
    └── main.ts
```

------------------------------------------------------------------------

# Installation for Development

1.  Clone the repository.
2.  Run:

``` bash
npm install
```

3.  Build:

``` bash
npm run build
```

4.  Copy the plugin directory into:

``` text
<Vault>/.obsidian/plugins/obsidian-research-flow/
```

5.  Make sure the directory contains:

``` text
manifest.json
main.js
styles.css
```

6.  Enable **ResearchFlow** from Obsidian's Community Plugins settings.

------------------------------------------------------------------------

# Current Limitations

ResearchFlow is still an alpha release.

Known limitations include:

-   CSV is the current career import format; direct XLSX import is not
    included.
-   The plugin does not currently depend on an external database.
-   Some advanced analytics and graph views remain future work.
-   The exact appearance of the dashboard depends on the accompanying
    `styles.css`.
-   Career and reading workflows are functional but intentionally
    lightweight compared with a dedicated database application.
-   Automatic intelligence features are rule-based rather than
    LLM-driven.

------------------------------------------------------------------------

# Philosophy

ResearchFlow is not intended to become another generic task manager.

The goal is to make the following loop easy:

``` text
Think
  ↓
Capture an idea
  ↓
Explore / read
  ↓
Turn it into a project
  ↓
Break it into tasks
  ↓
Work on it daily
  ↓
Record decisions and results
  ↓
Connect the outcome to future work
```

The system should help answer four questions quickly:

1.  **What am I working on?**
2.  **What needs attention?**
3.  **What did I actually accomplish?**
4.  **What should I work on next?**

------------------------------------------------------------------------

# License

Apache License 2.0.
