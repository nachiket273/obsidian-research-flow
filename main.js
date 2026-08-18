var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ResearchFlowPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var VIEW_TYPE_RESEARCH_FLOW = "research-flow-home";
var RF_VERSION = "0.9.0";
var STALE_DAYS = 14;
var DEFAULT_SETTINGS = {
  projectsFolder: "02_Projects",
  ideasFolder: "03_Ideas",
  tasksFolder: "04_Tasks",
  careerFolder: "05_Career",
  readingFolder: "06_Reading",
  dailyFolder: "07_Daily"
};
var ResearchFlowPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.syncing = false;
    this.refreshTimer = null;
  }
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW_TYPE_RESEARCH_FLOW, (leaf) => new ResearchFlowHomeView(leaf, this));
    this.addRibbonIcon("layout-dashboard", "Open ResearchFlow", () => void this.activateView());
    this.addCommand({ id: "open-home", name: "Open Home", callback: () => void this.activateView() });
    this.addCommand({ id: "new-project", name: "New Project", callback: () => void this.createProject() });
    this.addCommand({ id: "new-research-idea", name: "New Research Idea", callback: () => void this.createResearchIdea() });
    this.addCommand({ id: "new-task", name: "New Task", callback: () => void this.createTask() });
    this.addCommand({ id: "open-today", name: "Open Today's Daily Note", callback: () => void this.openDailyNote() });
    this.addCommand({ id: "new-reading", name: "New Reading", callback: () => void this.createReading() });
    this.addCommand({ id: "new-career-opportunity", name: "New Career Opportunity", callback: () => void this.createCareerOpportunity() });
    this.addCommand({ id: "import-career-csv", name: "Import Career CSV", callback: () => void this.importCareerCSV() });
    this.addCommand({ id: "weekly-summary", name: "Generate Weekly Research Summary", callback: () => void this.generateWeeklySummary() });
    this.addCommand({ id: "validate-vault", name: "Validate ResearchFlow Relationships", callback: () => void this.validateVault() });
    this.addSettingTab(new ResearchFlowSettingTab(this.app, this));
    await this.ensureFolders();
    this.registerEvent(this.app.metadataCache.on("changed", (file) => {
      if (file instanceof import_obsidian.TFile) void this.handleFileChange(file);
    }));
    this.registerEvent(this.app.vault.on("modify", (file) => {
      if (file instanceof import_obsidian.TFile) void this.handleFileChange(file);
    }));
    this.registerEvent(this.app.vault.on("create", (file) => {
      if (file instanceof import_obsidian.TFile) void this.handleFileChange(file);
    }));
    this.registerEvent(this.app.vault.on("delete", () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on("rename", () => this.scheduleRefresh()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.scheduleRefresh()));
  }
  onunload() {
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async ensureFolders() {
    for (const folder of [
      this.settings.projectsFolder,
      this.settings.ideasFolder,
      this.settings.tasksFolder,
      this.settings.careerFolder,
      this.settings.readingFolder,
      this.settings.dailyFolder
    ]) {
      const normalized = (0, import_obsidian.normalizePath)(folder);
      if (!this.app.vault.getAbstractFileByPath(normalized)) await this.app.vault.createFolder(normalized);
    }
  }
  async activateView() {
    const { workspace } = this.app;
    let leaf = null;
    const existing = workspace.getLeavesOfType(VIEW_TYPE_RESEARCH_FLOW);
    if (existing.length > 0) leaf = existing[0];
    else leaf = workspace.getLeaf(true);
    if (!leaf) return;
    await leaf.setViewState({ type: VIEW_TYPE_RESEARCH_FLOW, active: true });
    workspace.revealLeaf(leaf);
  }
  scheduleRefresh() {
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.refreshHomeViews();
    }, 150);
  }
  async refreshHomeViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_RESEARCH_FLOW)) {
      if (leaf.view instanceof ResearchFlowHomeView) await leaf.view.render();
    }
  }
  async handleFileChange(file) {
    var _a, _b, _c;
    if (this.syncing) {
      this.scheduleRefresh();
      return;
    }
    const cache = this.app.metadataCache.getFileCache(file);
    const type = String((_b = (_a = cache == null ? void 0 : cache.frontmatter) == null ? void 0 : _a.type) != null ? _b : "");
    const isDaily = this.isInFolder(file, this.settings.dailyFolder);
    if (isDaily) {
      await this.syncTaskStatusesFromDailyNote(file);
    } else if (type === "task") {
      const project = frontmatterString((_c = cache == null ? void 0 : cache.frontmatter) == null ? void 0 : _c.project);
      if (project) {
        await this.syncProject(project);
      }
    }
    this.scheduleRefresh();
  }
  isInFolder(file, folder) {
    const prefix = (0, import_obsidian.normalizePath)(folder).replace(/\/$/, "") + "/";
    return file.path.startsWith(prefix);
  }
  getManagedMarkdownFiles() {
    const files = [];
    const seen = /* @__PURE__ */ new Set();
    const folders = [
      this.settings.projectsFolder,
      this.settings.ideasFolder,
      this.settings.tasksFolder,
      this.settings.careerFolder,
      this.settings.readingFolder,
      this.settings.dailyFolder
    ];
    const visit = (folder) => {
      for (const child of folder.children) {
        if (child instanceof import_obsidian.TFile && child.extension === "md") {
          if (!seen.has(child.path)) {
            seen.add(child.path);
            files.push(child);
          }
        } else if (child instanceof import_obsidian.TFolder) {
          visit(child);
        }
      }
    };
    for (const folderPath of folders) {
      const folder = this.app.vault.getAbstractFileByPath((0, import_obsidian.normalizePath)(folderPath));
      if (folder instanceof import_obsidian.TFolder) visit(folder);
    }
    return files;
  }
  getManagedFilesInFolder(folderPath) {
    const root = this.app.vault.getAbstractFileByPath((0, import_obsidian.normalizePath)(folderPath));
    if (!(root instanceof import_obsidian.TFolder)) return [];
    const files = [];
    const visit = (folder) => {
      for (const child of folder.children) {
        if (child instanceof import_obsidian.TFile && child.extension === "md") files.push(child);
        else if (child instanceof import_obsidian.TFolder) visit(child);
      }
    };
    visit(root);
    return files;
  }
  async getData() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q;
    const files = this.getManagedMarkdownFiles();
    const projects = [];
    const tasks = [];
    const readings = [];
    const career = [];
    const ideas = [];
    for (const file of files) {
      const fm = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
      if (!fm) continue;
      const type = String((_b = fm.type) != null ? _b : "");
      if (type === "project") {
        const progress = numberValue(fm.progress, 0);
        const blocker = frontmatterString(fm.blocker);
        const attention = booleanValue(fm.attention);
        const lastActivity = this.projectLastActivity(file, files, fm);
        const stale = this.projectIsStale(fm.status, lastActivity);
        projects.push({
          file,
          name: file.basename,
          domain: (_c = frontmatterString(fm.domain)) != null ? _c : "",
          status: (_d = frontmatterString(fm.status)) != null ? _d : "active",
          priority: (_e = frontmatterString(fm.priority)) != null ? _e : "medium",
          progress: Math.max(0, Math.min(100, progress)),
          blocker,
          attention,
          deadline: frontmatterString(fm.deadline),
          start: frontmatterString(fm.start),
          nextAction: frontmatterString(fm.next_action),
          lastActivity,
          stale,
          health: this.calculateProjectHealth(fm, stale, lastActivity, progress)
        });
      } else if (type === "task") {
        tasks.push({
          file,
          name: file.basename,
          status: (_f = frontmatterString(fm.status)) != null ? _f : "todo",
          priority: (_g = frontmatterString(fm.priority)) != null ? _g : "medium",
          project: normalizeProjectName(frontmatterString(fm.project)),
          workDate: frontmatterString(fm.work_date),
          due: frontmatterString(fm.due)
        });
      } else if (type === "reading") {
        readings.push({
          file,
          name: file.basename,
          url: frontmatterString(fm.url),
          type: (_i = (_h = frontmatterString(fm.reading_type)) != null ? _h : frontmatterString(fm.type_name)) != null ? _i : "article",
          status: (_j = frontmatterString(fm.status)) != null ? _j : "unread",
          added: frontmatterString(fm.added),
          read: frontmatterString(fm.read),
          project: normalizeProjectName(frontmatterString(fm.project))
        });
      } else if (type === "career") {
        career.push({
          file,
          company: (_k = frontmatterString(fm.company)) != null ? _k : "",
          role: (_l = frontmatterString(fm.role)) != null ? _l : file.basename,
          deadline: frontmatterString(fm.deadline),
          match: numberValue(fm.match, 0),
          status: (_m = frontmatterString(fm.status)) != null ? _m : "saved",
          applied: frontmatterString(fm.applied),
          feedback: frontmatterString(fm.feedback),
          documents: frontmatterString(fm.documents),
          project: normalizeProjectName(frontmatterString(fm.project))
        });
      } else if (type === "idea") {
        ideas.push({
          file,
          name: file.basename,
          domain: (_n = frontmatterString(fm.domain)) != null ? _n : "",
          kind: (_o = frontmatterString(fm.kind)) != null ? _o : "research",
          status: (_p = frontmatterString(fm.status)) != null ? _p : "seed",
          priority: (_q = frontmatterString(fm.priority)) != null ? _q : "medium",
          project: normalizeProjectName(frontmatterString(fm.project))
        });
      }
    }
    const todayDate = today();
    const todayTasks = tasks.filter((t) => t.workDate === todayDate && !isDone(t.status));
    return {
      projects,
      tasks,
      todayTasks,
      blockers: projects.filter((p) => p.blocker && p.blocker.toLowerCase() !== "none"),
      attention: projects.filter((p) => p.attention),
      staleProjects: projects.filter((p) => p.stale && !isTerminalProject(p.status)),
      readings,
      career: career.sort((a, b) => dateSort(a.deadline, b.deadline)),
      ideas
    };
  }
  projectLastActivity(projectFile, files, fm) {
    var _a, _b;
    let latest = projectFile.stat.mtime;
    for (const file of files) {
      const cache = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
      if (String((_b = cache == null ? void 0 : cache.type) != null ? _b : "") !== "task") continue;
      if (normalizeProjectName(frontmatterString(cache == null ? void 0 : cache.project)) !== projectFile.basename) continue;
      latest = Math.max(latest, file.stat.mtime);
    }
    const explicit = frontmatterString(fm.last_activity);
    if (explicit) {
      const timestamp = Date.parse(explicit);
      if (Number.isFinite(timestamp)) latest = Math.max(latest, timestamp);
    }
    return latest;
  }
  projectIsStale(status, lastActivity) {
    if (isTerminalProject(status)) return false;
    return Date.now() - lastActivity > STALE_DAYS * 864e5;
  }
  calculateProjectHealth(fm, stale, lastActivity, progress) {
    var _a;
    let score = 100;
    if (frontmatterString(fm.blocker) && ((_a = frontmatterString(fm.blocker)) == null ? void 0 : _a.toLowerCase()) !== "none") score -= 30;
    if (booleanValue(fm.attention)) score -= 15;
    if (stale) score -= 25;
    const deadline = frontmatterString(fm.deadline);
    if (deadline) {
      const days = daysUntil(deadline);
      if (days < 0) score -= 25;
      else if (days <= 7 && progress < 80) score -= 15;
    }
    if (Date.now() - lastActivity > 30 * 864e5) score -= 10;
    return Math.max(0, Math.min(100, score));
  }
  async createProject() {
    new CreateProjectModal(this.app, async (name, domain, kind, priority, deadline) => {
      const safeName = sanitizeFileName(name);
      if (!safeName) {
        new import_obsidian.Notice("Project name cannot be empty.");
        return;
      }
      const path = (0, import_obsidian.normalizePath)(`${this.settings.projectsFolder}/${safeName}.md`);
      if (this.app.vault.getAbstractFileByPath(path)) {
        new import_obsidian.Notice("A project with this name already exists.");
        return;
      }
      const content = `---
type: project
domain: ${domain}
status: active
priority: ${priority}
progress: 0
start: ${today()}
deadline: ${deadline}
blocker:
attention: false
next_action:
last_activity: ${(/* @__PURE__ */ new Date()).toISOString()}
project_kind: ${kind}
---

# ${name}

## Objective

Describe what this project is trying to achieve.

## Current State

## Milestones

- [ ] First milestone

## Next Actions

- [ ] Define first milestone

## Blockers

None.

## Attention

None.

## Tasks

<!-- RESEARCHFLOW:PROJECT:TASKS:START -->
_No tasks yet._
<!-- RESEARCHFLOW:PROJECT:TASKS:END -->

## Decisions

## Artifacts

## Related Reading

## Related Ideas

## Related Career Opportunities

## Daily Work
`;
      const file = await this.app.vault.create(path, content);
      new import_obsidian.Notice(`Created project: ${name}`);
      await this.syncProject(name);
      await this.app.workspace.getLeaf(true).openFile(file);
    });
  }
  async createResearchIdea() {
    new CreateIdeaModal(this.app, async (name, domain, kind, priority) => {
      const safeName = sanitizeFileName(name);
      if (!safeName) {
        new import_obsidian.Notice("Idea name cannot be empty.");
        return;
      }
      const path = (0, import_obsidian.normalizePath)(`${this.settings.ideasFolder}/${safeName}.md`);
      if (this.app.vault.getAbstractFileByPath(path)) {
        new import_obsidian.Notice("An idea with this name already exists.");
        return;
      }
      const content = `---
type: idea
domain: ${domain}
kind: ${kind}
status: seed
priority: ${priority}
created: ${today()}
project:
---

# ${name}

## Hypothesis

## Why is this interesting?

## Related Work

## Possible Experiments

## Open Questions

## Next Action

- [ ] 

## Related Projects

## Related Reading

## Notes
`;
      const file = await this.app.vault.create(path, content);
      new import_obsidian.Notice(`Created research idea: ${name}`);
      await this.app.workspace.getLeaf(true).openFile(file);
    });
  }
  async createTask() {
    const projects = (await this.getData()).projects.map((p) => p.name).sort((a, b) => a.localeCompare(b));
    new CreateTaskModal(this.app, projects, async (name, project, workDate, dueDate, priority) => {
      const safeName = sanitizeFileName(name);
      if (!safeName) {
        new import_obsidian.Notice("Task name cannot be empty.");
        return;
      }
      const path = (0, import_obsidian.normalizePath)(`${this.settings.tasksFolder}/${safeName}.md`);
      if (this.app.vault.getAbstractFileByPath(path)) {
        new import_obsidian.Notice("A task with this name already exists.");
        return;
      }
      const projectValue = project ? `"[[${project}]]"` : "";
      const content = `---
type: task
status: todo
priority: ${priority}
project: ${projectValue}
created: ${today()}
work_date: ${workDate}
due: ${dueDate}
---

# ${name}

## Objective

## Architecture

## Code

## Tests

## Artifacts

## Issues

## Decisions

## Result

## Daily Work

- [[${workDate}]]
`;
      const file = await this.app.vault.create(path, content);
      await this.ensureDailyNote(workDate);
      if (project) await this.syncProject(project);
      await this.syncDailyNote(workDate);
      new import_obsidian.Notice(`Created task: ${name}`);
      await this.app.workspace.getLeaf(true).openFile(file);
    });
  }
  async createReading() {
    const projects = (await this.getData()).projects.map((p) => p.name).sort();
    new CreateReadingModal(this.app, projects, async (name, url, type, project) => {
      const safeName = sanitizeFileName(name);
      if (!safeName) {
        new import_obsidian.Notice("Reading title cannot be empty.");
        return;
      }
      const path = (0, import_obsidian.normalizePath)(`${this.settings.readingFolder}/${safeName}.md`);
      if (this.app.vault.getAbstractFileByPath(path)) {
        new import_obsidian.Notice("A reading item with this name already exists.");
        return;
      }
      const content = `---
type: reading
reading_type: ${type}
status: unread
added: ${today()}
read:
url: ${url}
project: ${project ? `"[[${project}]]"` : ""}
---

# ${name}

## Why I Saved This

## Notes

## Takeaways

## Related Projects

## Related Ideas
`;
      const file = await this.app.vault.create(path, content);
      new import_obsidian.Notice(`Added reading: ${name}`);
      await this.app.workspace.getLeaf(true).openFile(file);
    });
  }
  async createCareerOpportunity() {
    const projects = (await this.getData()).projects.map((p) => p.name).sort();
    new CreateCareerModal(this.app, projects, async (company, role, deadline, match, project) => {
      const name = sanitizeFileName(`${company} - ${role}`);
      if (!name) {
        new import_obsidian.Notice("Company and role are required.");
        return;
      }
      const path = (0, import_obsidian.normalizePath)(`${this.settings.careerFolder}/${name}.md`);
      if (this.app.vault.getAbstractFileByPath(path)) {
        new import_obsidian.Notice("That career opportunity already exists.");
        return;
      }
      const content = `---
type: career
company: ${company}
role: ${role}
deadline: ${deadline}
match: ${match}
status: saved
applied:
feedback:
documents:
project: ${project ? `"[[${project}]]"` : ""}
---

# ${role} \u2014 ${company}

## Opportunity

## Documents

## Application

## Feedback

## Related Projects

## Daily Work
`;
      const file = await this.app.vault.create(path, content);
      new import_obsidian.Notice(`Added opportunity: ${company} \u2014 ${role}`);
      await this.app.workspace.getLeaf(true).openFile(file);
    });
  }
  async openDailyNote(date = today()) {
    const file = await this.ensureDailyNote(date);
    await this.syncDailyNote(date);
    await this.app.workspace.getLeaf(true).openFile(file);
  }
  async ensureDailyNote(date) {
    const path = (0, import_obsidian.normalizePath)(`${this.settings.dailyFolder}/${date}.md`);
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof import_obsidian.TFile) return existing;
    const file = await this.app.vault.create(path, this.createDailyNoteContent(date));
    new import_obsidian.Notice(`Created daily note: ${date}`);
    return file;
  }
  createDailyNoteContent(date) {
    return `---
type: daily
date: ${date}
---

# ${date}

## Today's Focus

## Tasks

<!-- RESEARCHFLOW:TASKS:START -->
_No tasks scheduled._
<!-- RESEARCHFLOW:TASKS:END -->

## Work Log

## Decisions

## Blockers

## Ideas

## Reading

## Career
`;
  }
  async syncDailyNote(date) {
    var _a, _b;
    const daily = await this.ensureDailyNote(date);
    const files = this.getManagedFilesInFolder(this.settings.tasksFolder);
    const rows = [];
    for (const file of files) {
      const fm = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
      if (String((_b = fm == null ? void 0 : fm.type) != null ? _b : "") !== "task") continue;
      if (frontmatterString(fm == null ? void 0 : fm.work_date) !== date) continue;
      rows.push(`- ${isDone(frontmatterString(fm == null ? void 0 : fm.status)) ? "[x]" : "[ ]"} [[${file.basename}]]`);
    }
    rows.sort((a, b) => a.localeCompare(b));
    const section = rows.length ? rows.join("\n") : "_No tasks scheduled._";
    await replaceBetweenMarkers(daily, "<!-- RESEARCHFLOW:TASKS:START -->", "<!-- RESEARCHFLOW:TASKS:END -->", section, this.app);
  }
  async syncTaskStatusesFromDailyNote(dailyFile) {
    var _a, _b, _c, _d;
    if (this.syncing) return;
    const content = await this.app.vault.read(dailyFile);
    const start = content.indexOf("<!-- RESEARCHFLOW:TASKS:START -->");
    const end = content.indexOf("<!-- RESEARCHFLOW:TASKS:END -->");
    if (start < 0 || end < start) return;
    const section = content.slice(start, end);
    const regex = /^- \[([ xX])\] \[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/gm;
    const updates = [];
    let match;
    while ((match = regex.exec(section)) !== null) {
      const taskFile = this.app.metadataCache.getFirstLinkpathDest(match[2].trim(), dailyFile.path);
      if (!(taskFile instanceof import_obsidian.TFile)) continue;
      const fm = (_a = this.app.metadataCache.getFileCache(taskFile)) == null ? void 0 : _a.frontmatter;
      if (String((_b = fm == null ? void 0 : fm.type) != null ? _b : "") !== "task") continue;
      updates.push({ file: taskFile, status: match[1].toLowerCase() === "x" ? "done" : "todo" });
    }
    if (!updates.length) return;
    this.syncing = true;
    try {
      const projects = /* @__PURE__ */ new Set();
      for (const update of updates) {
        const old = await this.app.vault.read(update.file);
        const next = replaceFrontmatterValue(old, "status", update.status);
        if (next !== old) await this.app.vault.modify(update.file, next);
        const project = normalizeProjectName(frontmatterString((_d = (_c = this.app.metadataCache.getFileCache(update.file)) == null ? void 0 : _c.frontmatter) == null ? void 0 : _d.project));
        if (project) projects.add(project);
      }
      await sleep(100);
      for (const project of projects) await this.syncProject(project);
    } finally {
      this.syncing = false;
    }
    this.scheduleRefresh();
  }
  async syncProject(projectName) {
    const clean = normalizeProjectName(projectName);
    if (!clean) return;
    const projectFile = this.app.metadataCache.getFirstLinkpathDest(clean, "");
    if (!(projectFile instanceof import_obsidian.TFile)) return;
    const tasks = this.getManagedFilesInFolder(this.settings.tasksFolder).filter((file) => {
      var _a, _b;
      const fm = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
      return String((_b = fm == null ? void 0 : fm.type) != null ? _b : "") === "task" && normalizeProjectName(frontmatterString(fm == null ? void 0 : fm.project)) === clean;
    });
    const completed = tasks.filter((file) => {
      var _a, _b;
      return isDone(frontmatterString((_b = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter) == null ? void 0 : _b.status));
    }).length;
    const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
    const projectContent = await this.app.vault.read(projectFile);
    const withProgress = replaceFrontmatterValue(projectContent, "progress", String(progress));
    const withActivity = replaceFrontmatterValue(withProgress, "last_activity", (/* @__PURE__ */ new Date()).toISOString());
    const taskLines = tasks.sort((a, b) => a.basename.localeCompare(b.basename)).map((file) => {
      var _a, _b;
      const status = frontmatterString((_b = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter) == null ? void 0 : _b.status);
      return `- ${isDone(status) ? "[x]" : "[ ]"} [[${file.basename}]]`;
    });
    const section = taskLines.length ? taskLines.join("\n") : "_No tasks yet._";
    let content = withActivity;
    if (!content.includes("<!-- RESEARCHFLOW:PROJECT:TASKS:START -->")) {
      const heading = "## Tasks";
      const index = content.indexOf(heading);
      if (index >= 0) {
        const insertion = `

<!-- RESEARCHFLOW:PROJECT:TASKS:START -->
${section}
<!-- RESEARCHFLOW:PROJECT:TASKS:END -->`;
        content = content.slice(0, index + heading.length) + insertion + content.slice(index + heading.length);
      }
    } else {
      content = replaceBetweenMarkersText(content, "<!-- RESEARCHFLOW:PROJECT:TASKS:START -->", "<!-- RESEARCHFLOW:PROJECT:TASKS:END -->", section);
    }
    if (content !== projectContent) await this.app.vault.modify(projectFile, content);
  }
  async updateProjectProgress(projectName) {
    await this.syncProject(projectName);
  }
  async importCareerCSV() {
    const input = this.app.workspace.containerEl.createEl("input", {
      type: "file",
      cls: "research-flow-file-input"
    });
    input.accept = ".csv,text/csv";
    input.hide();
    input.addEventListener("change", () => {
      var _a;
      const file = (_a = input.files) == null ? void 0 : _a.item(0);
      if (!file) {
        input.remove();
        return;
      }
      void this.processCareerCSV(file).finally(() => input.remove());
    });
    input.click();
  }
  async processCareerCSV(file) {
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) {
      new import_obsidian.Notice("CSV contains no opportunity rows.");
      return;
    }
    const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    let count = 0;
    for (const row of rows.slice(1)) {
      const record = {};
      headers.forEach((h, i) => {
        var _a;
        record[h] = (_a = row[i]) != null ? _a : "";
      });
      const company = record.company || record.organization || "Unknown Company";
      const role = record.role || record.title || "Opportunity";
      const safeName = sanitizeFileName(`${company} - ${role}`);
      const path = (0, import_obsidian.normalizePath)(`${this.settings.careerFolder}/${safeName}.md`);
      if (this.app.vault.getAbstractFileByPath(path)) continue;
      const content = `---
type: career
company: ${yamlValue(company)}
role: ${yamlValue(role)}
deadline: ${yamlValue(record.deadline || record.last_date)}
match: ${record.match || 0}
status: ${yamlValue(record.status || "saved")}
applied: ${yamlValue(record.applied)}
feedback: ${yamlValue(record.feedback)}
documents: ${yamlValue(record.documents || record.document_links)}
project: ${yamlValue(record.project)}
source: ${yamlValue(record.link || record.url)}
---

# ${role} \u2014 ${company}

## Opportunity

Source: ${record.link || record.url || ""}

## Documents

${record.documents || record.document_links || ""}

## Application

## Feedback

## Related Projects

## Daily Work
`;
      await this.app.vault.create(path, content);
      count++;
    }
    new import_obsidian.Notice(`Imported ${count} career opportunities.`);
    this.scheduleRefresh();
  }
  async generateWeeklySummary() {
    const end = /* @__PURE__ */ new Date();
    const start = new Date(end.getTime() - 6 * 864e5);
    const files = this.getManagedFilesInFolder(this.settings.dailyFolder);
    const relevant = [];
    for (const file of files) {
      const d = parseDate(file.basename);
      if (!d || d < start || d > end) continue;
      const text = await this.app.vault.read(file);
      relevant.push(`## ${file.basename}
${extractDailySummary(text)}`);
    }
    const path = (0, import_obsidian.normalizePath)(`${this.settings.dailyFolder}/Weekly Summary ${formatDateKey(end)}.md`);
    const content = `---
type: weekly_summary
week_ending: ${formatDateKey(end)}
---

# ResearchFlow Weekly Summary

${relevant.join("\n\n") || "No daily notes found."}

## Retrospective

### Wins

### Blockers

### Decisions

### Next Week
`;
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof import_obsidian.TFile) await this.app.vault.modify(existing, content);
    else await this.app.vault.create(path, content);
    new import_obsidian.Notice("Weekly summary generated.");
  }
  async validateVault() {
    const data = await this.getData();
    const problems = [];
    const projectNames = new Set(data.projects.map((p) => p.name));
    for (const task of data.tasks) {
      if (task.project && !projectNames.has(task.project)) problems.push(`Task ${task.name}: missing project ${task.project}`);
      if (!task.workDate) problems.push(`Task ${task.name}: missing work_date`);
    }
    for (const project of data.projects) {
      if (!project.file.path) problems.push(`Project ${project.name}: invalid path`);
    }
    if (!problems.length) new import_obsidian.Notice("ResearchFlow validation passed.");
    else {
      new import_obsidian.Notice(`${problems.length} relationship issue(s) found. Check the affected notes.`);
    }
  }
};
var ResearchFlowHomeView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_RESEARCH_FLOW;
  }
  getDisplayText() {
    return "ResearchFlow";
  }
  getIcon() {
    return "layout-dashboard";
  }
  async onOpen() {
    await this.render();
  }
  async onClose() {
    this.contentEl.empty();
  }
  async render() {
    const data = await this.plugin.getData();
    const root = this.contentEl;
    root.empty();
    root.addClass("research-flow-home");
    const header = root.createDiv({ cls: "research-flow-header" });
    header.createEl("h1", { text: "ResearchFlow" });
    header.createEl("p", { text: `Research operating system \xB7 v${RF_VERSION}`, cls: "research-flow-subtitle" });
    const actions = header.createDiv({ cls: "research-flow-actions" });
    this.button(actions, "New Project", "plus", () => void this.plugin.createProject());
    this.button(actions, "New Task", "check-square", () => void this.plugin.createTask());
    this.button(actions, "New Idea", "lightbulb", () => void this.plugin.createResearchIdea());
    this.button(actions, "Today", "calendar", () => void this.plugin.openDailyNote());
    this.button(actions, "Reading", "book-open", () => void this.plugin.createReading());
    this.button(actions, "Career", "briefcase", () => void this.plugin.createCareerOpportunity());
    this.button(actions, "Refresh", "refresh-cw", () => void this.render());
    this.stats(root, data);
    this.section(root, "Active Projects", "folder-kanban");
    const active = data.projects.filter((p) => !isTerminalProject(p.status));
    if (!active.length) this.empty(root, "No active projects.");
    for (const project of active.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))) this.projectCard(root, project);
    this.section(root, "\u{1F534} Blockers", "alert-circle");
    if (!data.blockers.length) this.empty(root, "No blockers.");
    for (const p of data.blockers) this.alert(root, p, "blocker");
    this.section(root, "\u{1F7E0} Attention", "alert-triangle");
    if (!data.attention.length) this.empty(root, "Nothing flagged for attention.");
    for (const p of data.attention) this.alert(root, p, "attention");
    this.section(root, "\u26A0 Stale Projects", "clock");
    if (!data.staleProjects.length) this.empty(root, "No stale active projects.");
    for (const p of data.staleProjects) this.alert(root, p, "stale");
    this.section(root, "Today's Tasks", "check-square");
    if (!data.todayTasks.length) this.empty(root, "No incomplete tasks for today.");
    for (const task of data.todayTasks) this.taskRow(root, task);
    this.section(root, "Career \u2014 Upcoming", "briefcase");
    const upcoming = data.career.filter((c) => c.deadline && !isCareerClosed(c.status)).slice(0, 8);
    if (!upcoming.length) this.empty(root, "No upcoming career opportunities.");
    for (const c of upcoming) this.careerRow(root, c);
    this.section(root, "Reading Queue", "book-open");
    const reading = data.readings.filter((r) => !isRead(r.status)).slice(0, 8);
    if (!reading.length) this.empty(root, "Reading queue is empty.");
    for (const r of reading) this.readingRow(root, r);
    this.section(root, "Research Ideas", "lightbulb");
    const ideas = data.ideas.filter((i) => i.status.toLowerCase() !== "archived").slice(0, 8);
    if (!ideas.length) this.empty(root, "No active research ideas.");
    for (const idea of ideas) this.ideaRow(root, idea);
    this.section(root, "Project Health & Timeline", "activity");
    for (const p of data.projects.filter((p2) => !isTerminalProject(p2.status)).sort((a, b) => dateSort(a.deadline, b.deadline)).slice(0, 12)) this.healthRow(root, p);
    this.section(root, "ResearchFlow", "network");
    const graph = root.createDiv({ cls: "research-flow-info" });
    graph.createEl("p", { text: "Markdown-first: Projects \u2194 Tasks \u2194 Daily Work \u2194 Reading \u2194 Ideas \u2194 Career." });
    graph.createEl("p", { text: "Task files are the source of truth for completion; project progress is derived from tasks." });
  }
  button(parent, text, icon, callback) {
    const b = parent.createEl("button", { cls: "research-flow-action-button" });
    const iconEl = b.createSpan({ cls: "research-flow-action-icon" });
    (0, import_obsidian.setIcon)(iconEl, icon);
    b.createSpan({ text });
    b.addEventListener("click", callback);
  }
  section(root, title, icon) {
    const heading = root.createDiv({ cls: "research-flow-section-header" });
    const iconEl = heading.createSpan({ cls: "research-flow-section-icon" });
    (0, import_obsidian.setIcon)(iconEl, icon);
    heading.createEl("h2", { text: title, cls: "research-flow-section-title" });
  }
  empty(root, text) {
    root.createDiv({ text, cls: "research-flow-empty" });
  }
  stats(root, data) {
    const box = root.createDiv({ cls: "research-flow-stats" });
    const items = [
      ["Active Projects", String(data.projects.filter((p) => !isTerminalProject(p.status)).length)],
      ["Open Tasks", String(data.tasks.filter((t) => !isDone(t.status)).length)],
      ["Today", String(data.todayTasks.length)],
      ["Blocked", String(data.blockers.length)],
      ["Attention", String(data.attention.length)],
      ["Stale", String(data.staleProjects.length)],
      ["Reading Queue", String(data.readings.filter((r) => !isRead(r.status)).length)],
      ["Career", String(data.career.filter((c) => !isCareerClosed(c.status)).length)]
    ];
    for (const [label, value] of items) {
      const card = box.createDiv({ cls: "research-flow-stat" });
      card.createDiv({ text: value, cls: "research-flow-stat-value" });
      card.createDiv({ text: label, cls: "research-flow-stat-label" });
    }
  }
  projectCard(root, p) {
    const card = root.createDiv({ cls: "research-flow-project-card" });
    const title = card.createEl("a", { text: p.name });
    title.addEventListener("click", (e) => {
      e.preventDefault();
      void this.app.workspace.getLeaf(true).openFile(p.file);
    });
    card.createDiv({ text: `${p.domain || "General"} \xB7 ${p.priority} \xB7 ${p.progress}%`, cls: "research-flow-project-meta" });
    const bar = card.createDiv({ cls: "research-flow-progress" });
    const fill = bar.createDiv({ cls: "research-flow-progress-fill" });
    fill.setCssProps({ "--research-flow-progress": `${p.progress}%` });
    if (p.nextAction) card.createDiv({ text: `Next: ${p.nextAction}`, cls: "research-flow-muted" });
    if (p.deadline) card.createDiv({ text: `Deadline: ${formatDateForDisplay(p.deadline)}`, cls: "research-flow-muted" });
    card.createDiv({ text: `Health: ${p.health}/100${p.stale ? " \xB7 stale" : ""}`, cls: p.health < 50 ? "research-flow-danger" : "research-flow-muted" });
  }
  alert(root, p, kind) {
    const box = root.createDiv({ cls: "research-flow-alert-section" });
    const a = box.createEl("a", { text: p.name });
    a.addEventListener("click", (e) => {
      e.preventDefault();
      void this.app.workspace.getLeaf(true).openFile(p.file);
    });
    box.createDiv({ text: kind === "blocker" ? p.blocker || "Blocked" : kind === "stale" ? `No recent activity for ${STALE_DAYS}+ days.` : "Project flagged for attention." });
  }
  taskRow(root, task) {
    const row = root.createDiv({ cls: "research-flow-task-row" });
    const checkbox = row.createEl("input", { type: "checkbox" });
    checkbox.checked = false;
    checkbox.addEventListener("change", () => void this.completeTask(task));
    const a = row.createEl("a", { text: task.name });
    a.addEventListener("click", (e) => {
      e.preventDefault();
      void this.app.workspace.getLeaf(true).openFile(task.file);
    });
    if (task.project) row.createSpan({ text: ` \xB7 ${task.project}`, cls: "research-flow-muted" });
  }
  careerRow(root, c) {
    const row = root.createDiv({ cls: "research-flow-list-row" });
    const a = row.createEl("a", { text: `${c.role} \u2014 ${c.company}` });
    a.addEventListener("click", (e) => {
      e.preventDefault();
      void this.app.workspace.getLeaf(true).openFile(c.file);
    });
    row.createSpan({ text: ` \xB7 ${c.deadline ? formatDateForDisplay(c.deadline) : "no deadline"} \xB7 ${c.status}`, cls: "research-flow-muted" });
  }
  readingRow(root, r) {
    const row = root.createDiv({ cls: "research-flow-list-row" });
    const a = row.createEl("a", { text: r.name });
    a.addEventListener("click", (e) => {
      e.preventDefault();
      void this.app.workspace.getLeaf(true).openFile(r.file);
    });
    row.createSpan({ text: ` \xB7 ${r.status}${r.project ? ` \xB7 ${r.project}` : ""}`, cls: "research-flow-muted" });
  }
  ideaRow(root, i) {
    const row = root.createDiv({ cls: "research-flow-list-row" });
    const a = row.createEl("a", { text: i.name });
    a.addEventListener("click", (e) => {
      e.preventDefault();
      void this.app.workspace.getLeaf(true).openFile(i.file);
    });
    row.createSpan({ text: ` \xB7 ${i.domain || "General"} \xB7 ${i.kind}`, cls: "research-flow-muted" });
  }
  healthRow(root, p) {
    const row = root.createDiv({ cls: "research-flow-list-row" });
    row.createSpan({ text: p.name });
    row.createSpan({ text: ` \xB7 ${p.progress}% \xB7 health ${p.health}/100 \xB7 ${p.deadline ? formatDateForDisplay(p.deadline) : "no deadline"}`, cls: "research-flow-muted" });
  }
  async completeTask(task) {
    const old = await this.app.vault.read(task.file);
    const next = replaceFrontmatterValue(old, "status", "done");
    if (next === old) return;
    await this.app.vault.modify(task.file, next);
    await sleep(100);
    if (task.project) await this.plugin.syncProject(task.project);
    if (task.workDate) await this.plugin.syncDailyNote(task.workDate);
    this.plugin.scheduleRefresh();
  }
};
var CreateProjectModal = class extends import_obsidian.Modal {
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }
  onOpen() {
    this.contentEl.empty();
    new import_obsidian.Setting(this.contentEl).setName("New Project").setHeading();
    const name = inputField(this.contentEl, "Project name", "Astronomy Agent");
    const domain = selectField(this.contentEl, "Domain", ["ML", "Quantum", "General"]);
    const kind = selectField(this.contentEl, "Project type", ["Research", "Project"]);
    const priority = selectField(this.contentEl, "Priority", ["high", "medium", "low"]);
    const deadline = inputField(this.contentEl, "Deadline", "", "date");
    modalButtons(this, this.contentEl, async () => {
      if (!name.value.trim()) {
        new import_obsidian.Notice("Project name cannot be empty.");
        return;
      }
      await this.onSubmit(name.value.trim(), domain.value, kind.value, priority.value, deadline.value);
      this.close();
    });
    name.focus();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var CreateIdeaModal = class extends import_obsidian.Modal {
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }
  onOpen() {
    this.contentEl.empty();
    new import_obsidian.Setting(this.contentEl).setName("New Research Idea").setHeading();
    const name = inputField(this.contentEl, "Idea name", "Exclusive attention experiment");
    const domain = selectField(this.contentEl, "Domain", ["ML", "Quantum", "General"]);
    const kind = selectField(this.contentEl, "Idea type", ["Research", "Project"]);
    const priority = selectField(this.contentEl, "Priority", ["high", "medium", "low"]);
    modalButtons(this, this.contentEl, async () => {
      if (!name.value.trim()) {
        new import_obsidian.Notice("Idea name cannot be empty.");
        return;
      }
      await this.onSubmit(name.value.trim(), domain.value, kind.value, priority.value);
      this.close();
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var CreateTaskModal = class extends import_obsidian.Modal {
  constructor(app, projects, onSubmit) {
    super(app);
    this.projects = projects;
    this.onSubmit = onSubmit;
  }
  onOpen() {
    this.contentEl.empty();
    new import_obsidian.Setting(this.contentEl).setName("New Task").setHeading();
    const name = inputField(this.contentEl, "Task name", "Run baseline experiment");
    const project = selectField(this.contentEl, "Project", ["", ...this.projects]);
    const workDate = inputField(this.contentEl, "Work date", today(), "date");
    const due = inputField(this.contentEl, "Due date", "", "date");
    const priority = selectField(this.contentEl, "Priority", ["high", "medium", "low"]);
    modalButtons(this, this.contentEl, async () => {
      if (!name.value.trim()) {
        new import_obsidian.Notice("Task name cannot be empty.");
        return;
      }
      await this.onSubmit(name.value.trim(), project.value, workDate.value || today(), due.value, priority.value);
      this.close();
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var CreateReadingModal = class extends import_obsidian.Modal {
  constructor(app, projects, onSubmit) {
    super(app);
    this.projects = projects;
    this.onSubmit = onSubmit;
  }
  onOpen() {
    this.contentEl.empty();
    new import_obsidian.Setting(this.contentEl).setName("New Reading").setHeading();
    const name = inputField(this.contentEl, "Title", "Paper / article title");
    const url = inputField(this.contentEl, "URL", "https://");
    const type = selectField(this.contentEl, "Type", ["paper", "article", "book", "documentation", "video", "other"]);
    const project = selectField(this.contentEl, "Related project", ["", ...this.projects]);
    modalButtons(this, this.contentEl, async () => {
      if (!name.value.trim()) {
        new import_obsidian.Notice("Reading title cannot be empty.");
        return;
      }
      await this.onSubmit(name.value.trim(), url.value, type.value, project.value);
      this.close();
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var CreateCareerModal = class extends import_obsidian.Modal {
  constructor(app, projects, onSubmit) {
    super(app);
    this.projects = projects;
    this.onSubmit = onSubmit;
  }
  onOpen() {
    this.contentEl.empty();
    new import_obsidian.Setting(this.contentEl).setName("New Career Opportunity").setHeading();
    const company = inputField(this.contentEl, "Company", "Company");
    const role = inputField(this.contentEl, "Role", "ML Researcher");
    const deadline = inputField(this.contentEl, "Deadline", "", "date");
    const match = inputField(this.contentEl, "Match %", "0", "number");
    const project = selectField(this.contentEl, "Related project", ["", ...this.projects]);
    modalButtons(this, this.contentEl, async () => {
      if (!company.value.trim() || !role.value.trim()) {
        new import_obsidian.Notice("Company and role are required.");
        return;
      }
      await this.onSubmit(company.value.trim(), role.value.trim(), deadline.value, match.value || "0", project.value);
      this.close();
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var ResearchFlowSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  getSettingDefinitions() {
    return [
      {
        name: "Projects folder",
        desc: "Folder used for project pages.",
        control: {
          type: "text",
          key: "projectsFolder"
        }
      },
      {
        name: "Ideas folder",
        desc: "Folder used for research ideas.",
        control: {
          type: "text",
          key: "ideasFolder"
        }
      },
      {
        name: "Tasks folder",
        desc: "Folder used for detailed task pages.",
        control: {
          type: "text",
          key: "tasksFolder"
        }
      },
      {
        name: "Career folder",
        desc: "Folder used for career opportunities.",
        control: {
          type: "text",
          key: "careerFolder"
        }
      },
      {
        name: "Reading folder",
        desc: "Folder used for reading items.",
        control: {
          type: "text",
          key: "readingFolder"
        }
      },
      {
        name: "Daily folder",
        desc: "Folder used for daily work notes.",
        control: {
          type: "text",
          key: "dailyFolder"
        }
      }
    ];
  }
};
function inputField(parent, label, placeholder, type = "text") {
  const field = parent.createDiv({ cls: "research-flow-form-field" });
  field.createEl("label", { text: label, cls: "research-flow-form-label" });
  return field.createEl("input", {
    type,
    placeholder,
    cls: "research-flow-form-control"
  });
}
function selectField(parent, label, values) {
  const field = parent.createDiv({ cls: "research-flow-form-field" });
  field.createEl("label", { text: label, cls: "research-flow-form-label" });
  const select = field.createEl("select", { cls: "research-flow-form-control" });
  for (const value of values) {
    select.createEl("option", { value, text: value || "None" });
  }
  return select;
}
function modalButtons(modal, parent, submit) {
  const row = parent.createDiv({ cls: "research-flow-modal-buttons" });
  row.createEl("button", { text: "Cancel" }).addEventListener("click", () => modal.close());
  row.createEl("button", { text: "Create", cls: "mod-cta" }).addEventListener("click", () => void submit());
}
function frontmatterString(value) {
  if (value === void 0 || value === null) return void 0;
  const text = String(value).trim();
  return text && text !== "null" ? text : void 0;
}
function numberValue(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function booleanValue(value) {
  return value === true || String(value).toLowerCase() === "true";
}
function normalizeProjectName(value) {
  if (!value) return void 0;
  return value.replace(/^\[\[/, "").replace(/\]\]$/, "").trim();
}
function isDone(status) {
  const s = (status != null ? status : "").toLowerCase();
  return s === "done" || s === "completed";
}
function isTerminalProject(status) {
  const s = (status != null ? status : "").toLowerCase();
  return s === "completed" || s === "archived" || s === "cancelled";
}
function isRead(status) {
  return ["read", "completed", "done"].includes(status.toLowerCase());
}
function isCareerClosed(status) {
  return ["rejected", "withdrawn", "closed", "accepted", "archived"].includes(status.toLowerCase());
}
function priorityRank(priority) {
  return priority.toLowerCase() === "high" ? 0 : priority.toLowerCase() === "medium" ? 1 : 2;
}
function dateSort(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}
function daysUntil(date) {
  const d = parseDate(date);
  if (!d) return 99999;
  return Math.ceil((d.getTime() - new Date(today()).getTime()) / 864e5);
}
function parseDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function today() {
  return formatDateKey(/* @__PURE__ */ new Date());
}
function formatDateForDisplay(date) {
  const parsed = parseDate(date);
  if (!parsed) return date;
  return parsed.toLocaleDateString(void 0, { day: "numeric", month: "short", year: "numeric" });
}
function sanitizeFileName(name) {
  return name.trim().replace(/[\\/:*?"<>|#^]/g, "-").replace(/\s+/g, " ").replace(/-+/g, "-").trim();
}
function yamlValue(value) {
  return value ? `"${value.replace(/"/g, '\\"')}"` : "";
}
async function sleep(ms) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}
function replaceFrontmatterValue(content, key, value) {
  const regex = new RegExp(`(^${escapeRegExp(key)}:\\s*)(.*)$`, "m");
  if (regex.test(content)) return content.replace(regex, `$1${value}`);
  if (!content.startsWith("---")) return content;
  const close = content.indexOf("---", 3);
  if (close < 0) return content;
  return content.slice(0, close) + `${key}: ${value}
` + content.slice(close);
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function replaceBetweenMarkersText(content, startMarker, endMarker, replacement) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start < 0 || end < start) return content;
  return content.slice(0, start + startMarker.length) + `
${replacement}
` + content.slice(end);
}
async function replaceBetweenMarkers(file, startMarker, endMarker, replacement, app) {
  const old = await app.vault.read(file);
  const next = replaceBetweenMarkersText(old, startMarker, endMarker, replacement);
  if (next !== old) await app.vault.modify(file, next);
}
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((v) => v.trim())) rows.push(row);
  }
  return rows;
}
function extractDailySummary(content) {
  const lines = content.split("\n");
  const keep = [];
  let inTasks = false;
  for (const line of lines) {
    if (line.includes("RESEARCHFLOW:TASKS:START")) {
      inTasks = true;
      continue;
    }
    if (line.includes("RESEARCHFLOW:TASKS:END")) {
      inTasks = false;
      continue;
    }
    if (inTasks) continue;
    if (/^## (Work Log|Decisions|Blockers|Ideas|Career|Reading)/.test(line) || /^- /.test(line)) keep.push(line);
  }
  return keep.slice(0, 40).join("\n");
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7XG5cdEFwcCxcblx0SXRlbVZpZXcsXG5cdE1vZGFsLFxuXHROb3RpY2UsXG5cdFBsdWdpbixcblx0UGx1Z2luU2V0dGluZ1RhYixcblx0U2V0dGluZyxcblx0VEZpbGUsXG5cdFRGb2xkZXIsXG5cdFdvcmtzcGFjZUxlYWYsXG5cdG5vcm1hbGl6ZVBhdGgsXG5cdHNldEljb24sXG59IGZyb20gXCJvYnNpZGlhblwiO1xuXG5pbXBvcnQgdHlwZSB7IFNldHRpbmdEZWZpbml0aW9uSXRlbSB9IGZyb20gXCJvYnNpZGlhblwiO1xuXG5jb25zdCBWSUVXX1RZUEVfUkVTRUFSQ0hfRkxPVyA9IFwicmVzZWFyY2gtZmxvdy1ob21lXCI7XG5jb25zdCBSRl9WRVJTSU9OID0gXCIwLjkuMFwiO1xuY29uc3QgU1RBTEVfREFZUyA9IDE0O1xuXG5pbnRlcmZhY2UgUmVzZWFyY2hGbG93U2V0dGluZ3Mge1xuXHRwcm9qZWN0c0ZvbGRlcjogc3RyaW5nO1xuXHRpZGVhc0ZvbGRlcjogc3RyaW5nO1xuXHR0YXNrc0ZvbGRlcjogc3RyaW5nO1xuXHRjYXJlZXJGb2xkZXI6IHN0cmluZztcblx0cmVhZGluZ0ZvbGRlcjogc3RyaW5nO1xuXHRkYWlseUZvbGRlcjogc3RyaW5nO1xufVxuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBSZXNlYXJjaEZsb3dTZXR0aW5ncyA9IHtcblx0cHJvamVjdHNGb2xkZXI6IFwiMDJfUHJvamVjdHNcIixcblx0aWRlYXNGb2xkZXI6IFwiMDNfSWRlYXNcIixcblx0dGFza3NGb2xkZXI6IFwiMDRfVGFza3NcIixcblx0Y2FyZWVyRm9sZGVyOiBcIjA1X0NhcmVlclwiLFxuXHRyZWFkaW5nRm9sZGVyOiBcIjA2X1JlYWRpbmdcIixcblx0ZGFpbHlGb2xkZXI6IFwiMDdfRGFpbHlcIixcbn07XG5cbmludGVyZmFjZSBQcm9qZWN0IHtcblx0ZmlsZTogVEZpbGU7XG5cdG5hbWU6IHN0cmluZztcblx0ZG9tYWluOiBzdHJpbmc7XG5cdHN0YXR1czogc3RyaW5nO1xuXHRwcmlvcml0eTogc3RyaW5nO1xuXHRwcm9ncmVzczogbnVtYmVyO1xuXHRibG9ja2VyPzogc3RyaW5nO1xuXHRhdHRlbnRpb246IGJvb2xlYW47XG5cdGRlYWRsaW5lPzogc3RyaW5nO1xuXHRzdGFydD86IHN0cmluZztcblx0bmV4dEFjdGlvbj86IHN0cmluZztcblx0bGFzdEFjdGl2aXR5OiBudW1iZXI7XG5cdHN0YWxlOiBib29sZWFuO1xuXHRoZWFsdGg6IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIFRhc2sge1xuXHRmaWxlOiBURmlsZTtcblx0bmFtZTogc3RyaW5nO1xuXHRzdGF0dXM6IHN0cmluZztcblx0cHJpb3JpdHk6IHN0cmluZztcblx0cHJvamVjdD86IHN0cmluZztcblx0d29ya0RhdGU/OiBzdHJpbmc7XG5cdGR1ZT86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFJlYWRpbmdJdGVtIHtcblx0ZmlsZTogVEZpbGU7XG5cdG5hbWU6IHN0cmluZztcblx0dXJsPzogc3RyaW5nO1xuXHR0eXBlOiBzdHJpbmc7XG5cdHN0YXR1czogc3RyaW5nO1xuXHRhZGRlZD86IHN0cmluZztcblx0cmVhZD86IHN0cmluZztcblx0cHJvamVjdD86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIENhcmVlck9wcG9ydHVuaXR5IHtcblx0ZmlsZTogVEZpbGU7XG5cdGNvbXBhbnk6IHN0cmluZztcblx0cm9sZTogc3RyaW5nO1xuXHRkZWFkbGluZT86IHN0cmluZztcblx0bWF0Y2g/OiBudW1iZXI7XG5cdHN0YXR1czogc3RyaW5nO1xuXHRhcHBsaWVkPzogc3RyaW5nO1xuXHRmZWVkYmFjaz86IHN0cmluZztcblx0ZG9jdW1lbnRzPzogc3RyaW5nO1xuXHRwcm9qZWN0Pzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgUmVzZWFyY2hJZGVhIHtcblx0ZmlsZTogVEZpbGU7XG5cdG5hbWU6IHN0cmluZztcblx0ZG9tYWluOiBzdHJpbmc7XG5cdGtpbmQ6IHN0cmluZztcblx0c3RhdHVzOiBzdHJpbmc7XG5cdHByaW9yaXR5OiBzdHJpbmc7XG5cdHByb2plY3Q/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBSZXNlYXJjaEZsb3dEYXRhIHtcblx0cHJvamVjdHM6IFByb2plY3RbXTtcblx0dGFza3M6IFRhc2tbXTtcblx0dG9kYXlUYXNrczogVGFza1tdO1xuXHRibG9ja2VyczogUHJvamVjdFtdO1xuXHRhdHRlbnRpb246IFByb2plY3RbXTtcblx0c3RhbGVQcm9qZWN0czogUHJvamVjdFtdO1xuXHRyZWFkaW5nczogUmVhZGluZ0l0ZW1bXTtcblx0Y2FyZWVyOiBDYXJlZXJPcHBvcnR1bml0eVtdO1xuXHRpZGVhczogUmVzZWFyY2hJZGVhW107XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlc2VhcmNoRmxvd1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG5cdHNldHRpbmdzITogUmVzZWFyY2hGbG93U2V0dGluZ3M7XG5cdHByaXZhdGUgc3luY2luZyA9IGZhbHNlO1xuXHRwcml2YXRlIHJlZnJlc2hUaW1lcjogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG5cblx0YXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuXHRcdGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG5cdFx0dGhpcy5yZWdpc3RlclZpZXcoVklFV19UWVBFX1JFU0VBUkNIX0ZMT1csIChsZWFmKSA9PiBuZXcgUmVzZWFyY2hGbG93SG9tZVZpZXcobGVhZiwgdGhpcykpO1xuXG5cdFx0dGhpcy5hZGRSaWJib25JY29uKFwibGF5b3V0LWRhc2hib2FyZFwiLCBcIk9wZW4gUmVzZWFyY2hGbG93XCIsICgpID0+IHZvaWQgdGhpcy5hY3RpdmF0ZVZpZXcoKSk7XG5cdFx0dGhpcy5hZGRDb21tYW5kKHsgaWQ6IFwib3Blbi1ob21lXCIsIG5hbWU6IFwiT3BlbiBIb21lXCIsIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMuYWN0aXZhdGVWaWV3KCkgfSk7XG5cdFx0dGhpcy5hZGRDb21tYW5kKHsgaWQ6IFwibmV3LXByb2plY3RcIiwgbmFtZTogXCJOZXcgUHJvamVjdFwiLCBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLmNyZWF0ZVByb2plY3QoKSB9KTtcblx0XHR0aGlzLmFkZENvbW1hbmQoeyBpZDogXCJuZXctcmVzZWFyY2gtaWRlYVwiLCBuYW1lOiBcIk5ldyBSZXNlYXJjaCBJZGVhXCIsIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMuY3JlYXRlUmVzZWFyY2hJZGVhKCkgfSk7XG5cdFx0dGhpcy5hZGRDb21tYW5kKHsgaWQ6IFwibmV3LXRhc2tcIiwgbmFtZTogXCJOZXcgVGFza1wiLCBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLmNyZWF0ZVRhc2soKSB9KTtcblx0XHR0aGlzLmFkZENvbW1hbmQoeyBpZDogXCJvcGVuLXRvZGF5XCIsIG5hbWU6IFwiT3BlbiBUb2RheSdzIERhaWx5IE5vdGVcIiwgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5vcGVuRGFpbHlOb3RlKCkgfSk7XG5cdFx0dGhpcy5hZGRDb21tYW5kKHsgaWQ6IFwibmV3LXJlYWRpbmdcIiwgbmFtZTogXCJOZXcgUmVhZGluZ1wiLCBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLmNyZWF0ZVJlYWRpbmcoKSB9KTtcblx0XHR0aGlzLmFkZENvbW1hbmQoeyBpZDogXCJuZXctY2FyZWVyLW9wcG9ydHVuaXR5XCIsIG5hbWU6IFwiTmV3IENhcmVlciBPcHBvcnR1bml0eVwiLCBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLmNyZWF0ZUNhcmVlck9wcG9ydHVuaXR5KCkgfSk7XG5cdFx0dGhpcy5hZGRDb21tYW5kKHsgaWQ6IFwiaW1wb3J0LWNhcmVlci1jc3ZcIiwgbmFtZTogXCJJbXBvcnQgQ2FyZWVyIENTVlwiLCBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLmltcG9ydENhcmVlckNTVigpIH0pO1xuXHRcdHRoaXMuYWRkQ29tbWFuZCh7IGlkOiBcIndlZWtseS1zdW1tYXJ5XCIsIG5hbWU6IFwiR2VuZXJhdGUgV2Vla2x5IFJlc2VhcmNoIFN1bW1hcnlcIiwgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5nZW5lcmF0ZVdlZWtseVN1bW1hcnkoKSB9KTtcblx0XHR0aGlzLmFkZENvbW1hbmQoeyBpZDogXCJ2YWxpZGF0ZS12YXVsdFwiLCBuYW1lOiBcIlZhbGlkYXRlIFJlc2VhcmNoRmxvdyBSZWxhdGlvbnNoaXBzXCIsIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMudmFsaWRhdGVWYXVsdCgpIH0pO1xuXG5cdFx0dGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBSZXNlYXJjaEZsb3dTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG5cdFx0YXdhaXQgdGhpcy5lbnN1cmVGb2xkZXJzKCk7XG5cblx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAubWV0YWRhdGFDYWNoZS5vbihcImNoYW5nZWRcIiwgKGZpbGUpID0+IHtcblx0XHRcdGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHZvaWQgdGhpcy5oYW5kbGVGaWxlQ2hhbmdlKGZpbGUpO1xuXHRcdH0pKTtcblx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAudmF1bHQub24oXCJtb2RpZnlcIiwgKGZpbGUpID0+IHtcblx0XHRcdGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHZvaWQgdGhpcy5oYW5kbGVGaWxlQ2hhbmdlKGZpbGUpO1xuXHRcdH0pKTtcblx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAudmF1bHQub24oXCJjcmVhdGVcIiwgKGZpbGUpID0+IHtcblx0XHRcdGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHZvaWQgdGhpcy5oYW5kbGVGaWxlQ2hhbmdlKGZpbGUpO1xuXHRcdH0pKTtcblx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAudmF1bHQub24oXCJkZWxldGVcIiwgKCkgPT4gdGhpcy5zY2hlZHVsZVJlZnJlc2goKSkpO1xuXHRcdHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC52YXVsdC5vbihcInJlbmFtZVwiLCAoKSA9PiB0aGlzLnNjaGVkdWxlUmVmcmVzaCgpKSk7XG5cdFx0dGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLndvcmtzcGFjZS5vbihcImFjdGl2ZS1sZWFmLWNoYW5nZVwiLCAoKSA9PiB0aGlzLnNjaGVkdWxlUmVmcmVzaCgpKSk7XG5cblx0fVxuXG5cdG9udW5sb2FkKCk6IHZvaWQge1xuXHRcdGlmICh0aGlzLnJlZnJlc2hUaW1lciAhPT0gbnVsbCkgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLnJlZnJlc2hUaW1lcik7XG5cdH1cblxuXHRhc3luYyBsb2FkU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0dGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGF3YWl0IHRoaXMubG9hZERhdGEoKSk7XG5cdH1cblxuXHRhc3luYyBzYXZlU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0YXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcblx0fVxuXG5cdGFzeW5jIGVuc3VyZUZvbGRlcnMoKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0Zm9yIChjb25zdCBmb2xkZXIgb2YgW1xuXHRcdFx0dGhpcy5zZXR0aW5ncy5wcm9qZWN0c0ZvbGRlcixcblx0XHRcdHRoaXMuc2V0dGluZ3MuaWRlYXNGb2xkZXIsXG5cdFx0XHR0aGlzLnNldHRpbmdzLnRhc2tzRm9sZGVyLFxuXHRcdFx0dGhpcy5zZXR0aW5ncy5jYXJlZXJGb2xkZXIsXG5cdFx0XHR0aGlzLnNldHRpbmdzLnJlYWRpbmdGb2xkZXIsXG5cdFx0XHR0aGlzLnNldHRpbmdzLmRhaWx5Rm9sZGVyLFxuXHRcdF0pIHtcblx0XHRcdGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVQYXRoKGZvbGRlcik7XG5cdFx0XHRpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChub3JtYWxpemVkKSkgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKG5vcm1hbGl6ZWQpO1xuXHRcdH1cblx0fVxuXG5cdGFzeW5jIGFjdGl2YXRlVmlldygpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHRjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XG5cdFx0bGV0IGxlYWY6IFdvcmtzcGFjZUxlYWYgfCBudWxsID0gbnVsbDtcblx0XHRjb25zdCBleGlzdGluZyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFX1JFU0VBUkNIX0ZMT1cpO1xuXHRcdGlmIChleGlzdGluZy5sZW5ndGggPiAwKSBsZWFmID0gZXhpc3RpbmdbMF07XG5cdFx0ZWxzZSBsZWFmID0gd29ya3NwYWNlLmdldExlYWYodHJ1ZSk7XG5cdFx0aWYgKCFsZWFmKSByZXR1cm47XG5cdFx0YXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBWSUVXX1RZUEVfUkVTRUFSQ0hfRkxPVywgYWN0aXZlOiB0cnVlIH0pO1xuXHRcdHdvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xuXHR9XG5cblx0c2NoZWR1bGVSZWZyZXNoKCk6IHZvaWQge1xuXHRcdGlmICh0aGlzLnJlZnJlc2hUaW1lciAhPT0gbnVsbCkgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLnJlZnJlc2hUaW1lcik7XG5cdFx0dGhpcy5yZWZyZXNoVGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHR0aGlzLnJlZnJlc2hUaW1lciA9IG51bGw7XG5cdFx0XHR2b2lkIHRoaXMucmVmcmVzaEhvbWVWaWV3cygpO1xuXHRcdH0sIDE1MCk7XG5cdH1cblxuXHRhc3luYyByZWZyZXNoSG9tZVZpZXdzKCk6IFByb21pc2U8dm9pZD4ge1xuXHRcdGZvciAoY29uc3QgbGVhZiBvZiB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFZJRVdfVFlQRV9SRVNFQVJDSF9GTE9XKSkge1xuXHRcdFx0aWYgKGxlYWYudmlldyBpbnN0YW5jZW9mIFJlc2VhcmNoRmxvd0hvbWVWaWV3KSBhd2FpdCBsZWFmLnZpZXcucmVuZGVyKCk7XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgaGFuZGxlRmlsZUNoYW5nZShmaWxlOiBURmlsZSk6IFByb21pc2U8dm9pZD4ge1xuXHRcdGlmICh0aGlzLnN5bmNpbmcpIHtcblx0XHRcdHRoaXMuc2NoZWR1bGVSZWZyZXNoKCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XG5cdFx0Y29uc3QgdHlwZSA9IFN0cmluZyhjYWNoZT8uZnJvbnRtYXR0ZXI/LnR5cGUgPz8gXCJcIik7XG5cdFx0Y29uc3QgaXNEYWlseSA9IHRoaXMuaXNJbkZvbGRlcihmaWxlLCB0aGlzLnNldHRpbmdzLmRhaWx5Rm9sZGVyKTtcblx0XHRpZiAoaXNEYWlseSkge1xuXHRcdFx0YXdhaXQgdGhpcy5zeW5jVGFza1N0YXR1c2VzRnJvbURhaWx5Tm90ZShmaWxlKTtcblx0XHR9IGVsc2UgaWYgKHR5cGUgPT09IFwidGFza1wiKSB7XG5cdFx0XHRjb25zdCBwcm9qZWN0ID0gZnJvbnRtYXR0ZXJTdHJpbmcoY2FjaGU/LmZyb250bWF0dGVyPy5wcm9qZWN0KTtcblx0XHRcdGlmIChwcm9qZWN0KSB7XG5cdFx0XHRcdGF3YWl0IHRoaXMuc3luY1Byb2plY3QocHJvamVjdCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMuc2NoZWR1bGVSZWZyZXNoKCk7XG5cdH1cblxuXHRpc0luRm9sZGVyKGZpbGU6IFRGaWxlLCBmb2xkZXI6IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRcdGNvbnN0IHByZWZpeCA9IG5vcm1hbGl6ZVBhdGgoZm9sZGVyKS5yZXBsYWNlKC9cXC8kLywgXCJcIikgKyBcIi9cIjtcblx0XHRyZXR1cm4gZmlsZS5wYXRoLnN0YXJ0c1dpdGgocHJlZml4KTtcblx0fVxuXG5cdGdldE1hbmFnZWRNYXJrZG93bkZpbGVzKCk6IFRGaWxlW10ge1xuXHRcdGNvbnN0IGZpbGVzOiBURmlsZVtdID0gW107XG5cdFx0Y29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXHRcdGNvbnN0IGZvbGRlcnMgPSBbXG5cdFx0XHR0aGlzLnNldHRpbmdzLnByb2plY3RzRm9sZGVyLFxuXHRcdFx0dGhpcy5zZXR0aW5ncy5pZGVhc0ZvbGRlcixcblx0XHRcdHRoaXMuc2V0dGluZ3MudGFza3NGb2xkZXIsXG5cdFx0XHR0aGlzLnNldHRpbmdzLmNhcmVlckZvbGRlcixcblx0XHRcdHRoaXMuc2V0dGluZ3MucmVhZGluZ0ZvbGRlcixcblx0XHRcdHRoaXMuc2V0dGluZ3MuZGFpbHlGb2xkZXIsXG5cdFx0XTtcblxuXHRcdGNvbnN0IHZpc2l0ID0gKGZvbGRlcjogVEZvbGRlcik6IHZvaWQgPT4ge1xuXHRcdFx0Zm9yIChjb25zdCBjaGlsZCBvZiBmb2xkZXIuY2hpbGRyZW4pIHtcblx0XHRcdFx0aWYgKGNoaWxkIGluc3RhbmNlb2YgVEZpbGUgJiYgY2hpbGQuZXh0ZW5zaW9uID09PSBcIm1kXCIpIHtcblx0XHRcdFx0XHRpZiAoIXNlZW4uaGFzKGNoaWxkLnBhdGgpKSB7XG5cdFx0XHRcdFx0XHRzZWVuLmFkZChjaGlsZC5wYXRoKTtcblx0XHRcdFx0XHRcdGZpbGVzLnB1c2goY2hpbGQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmIChjaGlsZCBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcblx0XHRcdFx0XHR2aXNpdChjaGlsZCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Zm9yIChjb25zdCBmb2xkZXJQYXRoIG9mIGZvbGRlcnMpIHtcblx0XHRcdGNvbnN0IGZvbGRlciA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChub3JtYWxpemVQYXRoKGZvbGRlclBhdGgpKTtcblx0XHRcdGlmIChmb2xkZXIgaW5zdGFuY2VvZiBURm9sZGVyKSB2aXNpdChmb2xkZXIpO1xuXHRcdH1cblxuXHRcdHJldHVybiBmaWxlcztcblx0fVxuXG5cdGdldE1hbmFnZWRGaWxlc0luRm9sZGVyKGZvbGRlclBhdGg6IHN0cmluZyk6IFRGaWxlW10ge1xuXHRcdGNvbnN0IHJvb3QgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgobm9ybWFsaXplUGF0aChmb2xkZXJQYXRoKSk7XG5cdFx0aWYgKCEocm9vdCBpbnN0YW5jZW9mIFRGb2xkZXIpKSByZXR1cm4gW107XG5cblx0XHRjb25zdCBmaWxlczogVEZpbGVbXSA9IFtdO1xuXHRcdGNvbnN0IHZpc2l0ID0gKGZvbGRlcjogVEZvbGRlcik6IHZvaWQgPT4ge1xuXHRcdFx0Zm9yIChjb25zdCBjaGlsZCBvZiBmb2xkZXIuY2hpbGRyZW4pIHtcblx0XHRcdFx0aWYgKGNoaWxkIGluc3RhbmNlb2YgVEZpbGUgJiYgY2hpbGQuZXh0ZW5zaW9uID09PSBcIm1kXCIpIGZpbGVzLnB1c2goY2hpbGQpO1xuXHRcdFx0XHRlbHNlIGlmIChjaGlsZCBpbnN0YW5jZW9mIFRGb2xkZXIpIHZpc2l0KGNoaWxkKTtcblx0XHRcdH1cblx0XHR9O1xuXHRcdHZpc2l0KHJvb3QpO1xuXHRcdHJldHVybiBmaWxlcztcblx0fVxuXG5cdGFzeW5jIGdldERhdGEoKTogUHJvbWlzZTxSZXNlYXJjaEZsb3dEYXRhPiB7XG5cdFx0Y29uc3QgZmlsZXMgPSB0aGlzLmdldE1hbmFnZWRNYXJrZG93bkZpbGVzKCk7XG5cdFx0Y29uc3QgcHJvamVjdHM6IFByb2plY3RbXSA9IFtdO1xuXHRcdGNvbnN0IHRhc2tzOiBUYXNrW10gPSBbXTtcblx0XHRjb25zdCByZWFkaW5nczogUmVhZGluZ0l0ZW1bXSA9IFtdO1xuXHRcdGNvbnN0IGNhcmVlcjogQ2FyZWVyT3Bwb3J0dW5pdHlbXSA9IFtdO1xuXHRcdGNvbnN0IGlkZWFzOiBSZXNlYXJjaElkZWFbXSA9IFtdO1xuXG5cdFx0Zm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG5cdFx0XHRjb25zdCBmbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcblx0XHRcdGlmICghZm0pIGNvbnRpbnVlO1xuXHRcdFx0Y29uc3QgdHlwZSA9IFN0cmluZyhmbS50eXBlID8/IFwiXCIpO1xuXHRcdFx0aWYgKHR5cGUgPT09IFwicHJvamVjdFwiKSB7XG5cdFx0XHRcdGNvbnN0IHByb2dyZXNzID0gbnVtYmVyVmFsdWUoZm0ucHJvZ3Jlc3MsIDApO1xuXHRcdFx0XHRjb25zdCBibG9ja2VyID0gZnJvbnRtYXR0ZXJTdHJpbmcoZm0uYmxvY2tlcik7XG5cdFx0XHRcdGNvbnN0IGF0dGVudGlvbiA9IGJvb2xlYW5WYWx1ZShmbS5hdHRlbnRpb24pO1xuXHRcdFx0XHRjb25zdCBsYXN0QWN0aXZpdHkgPSB0aGlzLnByb2plY3RMYXN0QWN0aXZpdHkoZmlsZSwgZmlsZXMsIGZtKTtcblx0XHRcdFx0Y29uc3Qgc3RhbGUgPSB0aGlzLnByb2plY3RJc1N0YWxlKGZtLnN0YXR1cywgbGFzdEFjdGl2aXR5KTtcblx0XHRcdFx0cHJvamVjdHMucHVzaCh7XG5cdFx0XHRcdFx0ZmlsZSxcblx0XHRcdFx0XHRuYW1lOiBmaWxlLmJhc2VuYW1lLFxuXHRcdFx0XHRcdGRvbWFpbjogZnJvbnRtYXR0ZXJTdHJpbmcoZm0uZG9tYWluKSA/PyBcIlwiLFxuXHRcdFx0XHRcdHN0YXR1czogZnJvbnRtYXR0ZXJTdHJpbmcoZm0uc3RhdHVzKSA/PyBcImFjdGl2ZVwiLFxuXHRcdFx0XHRcdHByaW9yaXR5OiBmcm9udG1hdHRlclN0cmluZyhmbS5wcmlvcml0eSkgPz8gXCJtZWRpdW1cIixcblx0XHRcdFx0XHRwcm9ncmVzczogTWF0aC5tYXgoMCwgTWF0aC5taW4oMTAwLCBwcm9ncmVzcykpLFxuXHRcdFx0XHRcdGJsb2NrZXIsXG5cdFx0XHRcdFx0YXR0ZW50aW9uLFxuXHRcdFx0XHRcdGRlYWRsaW5lOiBmcm9udG1hdHRlclN0cmluZyhmbS5kZWFkbGluZSksXG5cdFx0XHRcdFx0c3RhcnQ6IGZyb250bWF0dGVyU3RyaW5nKGZtLnN0YXJ0KSxcblx0XHRcdFx0XHRuZXh0QWN0aW9uOiBmcm9udG1hdHRlclN0cmluZyhmbS5uZXh0X2FjdGlvbiksXG5cdFx0XHRcdFx0bGFzdEFjdGl2aXR5LFxuXHRcdFx0XHRcdHN0YWxlLFxuXHRcdFx0XHRcdGhlYWx0aDogdGhpcy5jYWxjdWxhdGVQcm9qZWN0SGVhbHRoKGZtLCBzdGFsZSwgbGFzdEFjdGl2aXR5LCBwcm9ncmVzcyksXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIGlmICh0eXBlID09PSBcInRhc2tcIikge1xuXHRcdFx0XHR0YXNrcy5wdXNoKHtcblx0XHRcdFx0XHRmaWxlLFxuXHRcdFx0XHRcdG5hbWU6IGZpbGUuYmFzZW5hbWUsXG5cdFx0XHRcdFx0c3RhdHVzOiBmcm9udG1hdHRlclN0cmluZyhmbS5zdGF0dXMpID8/IFwidG9kb1wiLFxuXHRcdFx0XHRcdHByaW9yaXR5OiBmcm9udG1hdHRlclN0cmluZyhmbS5wcmlvcml0eSkgPz8gXCJtZWRpdW1cIixcblx0XHRcdFx0XHRwcm9qZWN0OiBub3JtYWxpemVQcm9qZWN0TmFtZShmcm9udG1hdHRlclN0cmluZyhmbS5wcm9qZWN0KSksXG5cdFx0XHRcdFx0d29ya0RhdGU6IGZyb250bWF0dGVyU3RyaW5nKGZtLndvcmtfZGF0ZSksXG5cdFx0XHRcdFx0ZHVlOiBmcm9udG1hdHRlclN0cmluZyhmbS5kdWUpLFxuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gXCJyZWFkaW5nXCIpIHtcblx0XHRcdFx0cmVhZGluZ3MucHVzaCh7XG5cdFx0XHRcdFx0ZmlsZSxcblx0XHRcdFx0XHRuYW1lOiBmaWxlLmJhc2VuYW1lLFxuXHRcdFx0XHRcdHVybDogZnJvbnRtYXR0ZXJTdHJpbmcoZm0udXJsKSxcblx0XHRcdFx0XHR0eXBlOiBmcm9udG1hdHRlclN0cmluZyhmbS5yZWFkaW5nX3R5cGUpID8/IGZyb250bWF0dGVyU3RyaW5nKGZtLnR5cGVfbmFtZSkgPz8gXCJhcnRpY2xlXCIsXG5cdFx0XHRcdFx0c3RhdHVzOiBmcm9udG1hdHRlclN0cmluZyhmbS5zdGF0dXMpID8/IFwidW5yZWFkXCIsXG5cdFx0XHRcdFx0YWRkZWQ6IGZyb250bWF0dGVyU3RyaW5nKGZtLmFkZGVkKSxcblx0XHRcdFx0XHRyZWFkOiBmcm9udG1hdHRlclN0cmluZyhmbS5yZWFkKSxcblx0XHRcdFx0XHRwcm9qZWN0OiBub3JtYWxpemVQcm9qZWN0TmFtZShmcm9udG1hdHRlclN0cmluZyhmbS5wcm9qZWN0KSksXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIGlmICh0eXBlID09PSBcImNhcmVlclwiKSB7XG5cdFx0XHRcdGNhcmVlci5wdXNoKHtcblx0XHRcdFx0XHRmaWxlLFxuXHRcdFx0XHRcdGNvbXBhbnk6IGZyb250bWF0dGVyU3RyaW5nKGZtLmNvbXBhbnkpID8/IFwiXCIsXG5cdFx0XHRcdFx0cm9sZTogZnJvbnRtYXR0ZXJTdHJpbmcoZm0ucm9sZSkgPz8gZmlsZS5iYXNlbmFtZSxcblx0XHRcdFx0XHRkZWFkbGluZTogZnJvbnRtYXR0ZXJTdHJpbmcoZm0uZGVhZGxpbmUpLFxuXHRcdFx0XHRcdG1hdGNoOiBudW1iZXJWYWx1ZShmbS5tYXRjaCwgMCksXG5cdFx0XHRcdFx0c3RhdHVzOiBmcm9udG1hdHRlclN0cmluZyhmbS5zdGF0dXMpID8/IFwic2F2ZWRcIixcblx0XHRcdFx0XHRhcHBsaWVkOiBmcm9udG1hdHRlclN0cmluZyhmbS5hcHBsaWVkKSxcblx0XHRcdFx0XHRmZWVkYmFjazogZnJvbnRtYXR0ZXJTdHJpbmcoZm0uZmVlZGJhY2spLFxuXHRcdFx0XHRcdGRvY3VtZW50czogZnJvbnRtYXR0ZXJTdHJpbmcoZm0uZG9jdW1lbnRzKSxcblx0XHRcdFx0XHRwcm9qZWN0OiBub3JtYWxpemVQcm9qZWN0TmFtZShmcm9udG1hdHRlclN0cmluZyhmbS5wcm9qZWN0KSksXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIGlmICh0eXBlID09PSBcImlkZWFcIikge1xuXHRcdFx0XHRpZGVhcy5wdXNoKHtcblx0XHRcdFx0XHRmaWxlLFxuXHRcdFx0XHRcdG5hbWU6IGZpbGUuYmFzZW5hbWUsXG5cdFx0XHRcdFx0ZG9tYWluOiBmcm9udG1hdHRlclN0cmluZyhmbS5kb21haW4pID8/IFwiXCIsXG5cdFx0XHRcdFx0a2luZDogZnJvbnRtYXR0ZXJTdHJpbmcoZm0ua2luZCkgPz8gXCJyZXNlYXJjaFwiLFxuXHRcdFx0XHRcdHN0YXR1czogZnJvbnRtYXR0ZXJTdHJpbmcoZm0uc3RhdHVzKSA/PyBcInNlZWRcIixcblx0XHRcdFx0XHRwcmlvcml0eTogZnJvbnRtYXR0ZXJTdHJpbmcoZm0ucHJpb3JpdHkpID8/IFwibWVkaXVtXCIsXG5cdFx0XHRcdFx0cHJvamVjdDogbm9ybWFsaXplUHJvamVjdE5hbWUoZnJvbnRtYXR0ZXJTdHJpbmcoZm0ucHJvamVjdCkpLFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRjb25zdCB0b2RheURhdGUgPSB0b2RheSgpO1xuXHRcdGNvbnN0IHRvZGF5VGFza3MgPSB0YXNrcy5maWx0ZXIoKHQpID0+IHQud29ya0RhdGUgPT09IHRvZGF5RGF0ZSAmJiAhaXNEb25lKHQuc3RhdHVzKSk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHByb2plY3RzLFxuXHRcdFx0dGFza3MsXG5cdFx0XHR0b2RheVRhc2tzLFxuXHRcdFx0YmxvY2tlcnM6IHByb2plY3RzLmZpbHRlcigocCkgPT4gcC5ibG9ja2VyICYmIHAuYmxvY2tlci50b0xvd2VyQ2FzZSgpICE9PSBcIm5vbmVcIiksXG5cdFx0XHRhdHRlbnRpb246IHByb2plY3RzLmZpbHRlcigocCkgPT4gcC5hdHRlbnRpb24pLFxuXHRcdFx0c3RhbGVQcm9qZWN0czogcHJvamVjdHMuZmlsdGVyKChwKSA9PiBwLnN0YWxlICYmICFpc1Rlcm1pbmFsUHJvamVjdChwLnN0YXR1cykpLFxuXHRcdFx0cmVhZGluZ3MsXG5cdFx0XHRjYXJlZXI6IGNhcmVlci5zb3J0KChhLCBiKSA9PiBkYXRlU29ydChhLmRlYWRsaW5lLCBiLmRlYWRsaW5lKSksXG5cdFx0XHRpZGVhcyxcblx0XHR9O1xuXHR9XG5cblx0cHJvamVjdExhc3RBY3Rpdml0eShwcm9qZWN0RmlsZTogVEZpbGUsIGZpbGVzOiBURmlsZVtdLCBmbTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBudW1iZXIge1xuXHRcdGxldCBsYXRlc3QgPSBwcm9qZWN0RmlsZS5zdGF0Lm10aW1lO1xuXHRcdGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuXHRcdFx0Y29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG5cdFx0XHRpZiAoU3RyaW5nKGNhY2hlPy50eXBlID8/IFwiXCIpICE9PSBcInRhc2tcIikgY29udGludWU7XG5cdFx0XHRpZiAobm9ybWFsaXplUHJvamVjdE5hbWUoZnJvbnRtYXR0ZXJTdHJpbmcoY2FjaGU/LnByb2plY3QpKSAhPT0gcHJvamVjdEZpbGUuYmFzZW5hbWUpIGNvbnRpbnVlO1xuXHRcdFx0bGF0ZXN0ID0gTWF0aC5tYXgobGF0ZXN0LCBmaWxlLnN0YXQubXRpbWUpO1xuXHRcdH1cblx0XHRjb25zdCBleHBsaWNpdCA9IGZyb250bWF0dGVyU3RyaW5nKGZtLmxhc3RfYWN0aXZpdHkpO1xuXHRcdGlmIChleHBsaWNpdCkge1xuXHRcdFx0Y29uc3QgdGltZXN0YW1wID0gRGF0ZS5wYXJzZShleHBsaWNpdCk7XG5cdFx0XHRpZiAoTnVtYmVyLmlzRmluaXRlKHRpbWVzdGFtcCkpIGxhdGVzdCA9IE1hdGgubWF4KGxhdGVzdCwgdGltZXN0YW1wKTtcblx0XHR9XG5cdFx0cmV0dXJuIGxhdGVzdDtcblx0fVxuXG5cdHByb2plY3RJc1N0YWxlKHN0YXR1czogc3RyaW5nIHwgdW5kZWZpbmVkLCBsYXN0QWN0aXZpdHk6IG51bWJlcik6IGJvb2xlYW4ge1xuXHRcdGlmIChpc1Rlcm1pbmFsUHJvamVjdChzdGF0dXMpKSByZXR1cm4gZmFsc2U7XG5cdFx0cmV0dXJuIERhdGUubm93KCkgLSBsYXN0QWN0aXZpdHkgPiBTVEFMRV9EQVlTICogODY0MDAwMDA7XG5cdH1cblxuXHRjYWxjdWxhdGVQcm9qZWN0SGVhbHRoKFxuXHRcdGZtOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcblx0XHRzdGFsZTogYm9vbGVhbixcblx0XHRsYXN0QWN0aXZpdHk6IG51bWJlcixcblx0XHRwcm9ncmVzczogbnVtYmVyLFxuXHQpOiBudW1iZXIge1xuXHRcdGxldCBzY29yZSA9IDEwMDtcblx0XHRpZiAoZnJvbnRtYXR0ZXJTdHJpbmcoZm0uYmxvY2tlcikgJiYgZnJvbnRtYXR0ZXJTdHJpbmcoZm0uYmxvY2tlcik/LnRvTG93ZXJDYXNlKCkgIT09IFwibm9uZVwiKSBzY29yZSAtPSAzMDtcblx0XHRpZiAoYm9vbGVhblZhbHVlKGZtLmF0dGVudGlvbikpIHNjb3JlIC09IDE1O1xuXHRcdGlmIChzdGFsZSkgc2NvcmUgLT0gMjU7XG5cdFx0Y29uc3QgZGVhZGxpbmUgPSBmcm9udG1hdHRlclN0cmluZyhmbS5kZWFkbGluZSk7XG5cdFx0aWYgKGRlYWRsaW5lKSB7XG5cdFx0XHRjb25zdCBkYXlzID0gZGF5c1VudGlsKGRlYWRsaW5lKTtcblx0XHRcdGlmIChkYXlzIDwgMCkgc2NvcmUgLT0gMjU7XG5cdFx0XHRlbHNlIGlmIChkYXlzIDw9IDcgJiYgcHJvZ3Jlc3MgPCA4MCkgc2NvcmUgLT0gMTU7XG5cdFx0fVxuXHRcdGlmIChEYXRlLm5vdygpIC0gbGFzdEFjdGl2aXR5ID4gMzAgKiA4NjQwMDAwMCkgc2NvcmUgLT0gMTA7XG5cdFx0cmV0dXJuIE1hdGgubWF4KDAsIE1hdGgubWluKDEwMCwgc2NvcmUpKTtcblx0fVxuXG5cdGFzeW5jIGNyZWF0ZVByb2plY3QoKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0bmV3IENyZWF0ZVByb2plY3RNb2RhbCh0aGlzLmFwcCwgYXN5bmMgKG5hbWUsIGRvbWFpbiwga2luZCwgcHJpb3JpdHksIGRlYWRsaW5lKSA9PiB7XG5cdFx0XHRjb25zdCBzYWZlTmFtZSA9IHNhbml0aXplRmlsZU5hbWUobmFtZSk7XG5cdFx0XHRpZiAoIXNhZmVOYW1lKSB7IG5ldyBOb3RpY2UoXCJQcm9qZWN0IG5hbWUgY2Fubm90IGJlIGVtcHR5LlwiKTsgcmV0dXJuOyB9XG5cdFx0XHRjb25zdCBwYXRoID0gbm9ybWFsaXplUGF0aChgJHt0aGlzLnNldHRpbmdzLnByb2plY3RzRm9sZGVyfS8ke3NhZmVOYW1lfS5tZGApO1xuXHRcdFx0aWYgKHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKSkgeyBuZXcgTm90aWNlKFwiQSBwcm9qZWN0IHdpdGggdGhpcyBuYW1lIGFscmVhZHkgZXhpc3RzLlwiKTsgcmV0dXJuOyB9XG5cdFx0XHRjb25zdCBjb250ZW50ID0gYC0tLVxcbnR5cGU6IHByb2plY3RcXG5kb21haW46ICR7ZG9tYWlufVxcbnN0YXR1czogYWN0aXZlXFxucHJpb3JpdHk6ICR7cHJpb3JpdHl9XFxucHJvZ3Jlc3M6IDBcXG5zdGFydDogJHt0b2RheSgpfVxcbmRlYWRsaW5lOiAke2RlYWRsaW5lfVxcbmJsb2NrZXI6XFxuYXR0ZW50aW9uOiBmYWxzZVxcbm5leHRfYWN0aW9uOlxcbmxhc3RfYWN0aXZpdHk6ICR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfVxcbnByb2plY3Rfa2luZDogJHtraW5kfVxcbi0tLVxcblxcbiMgJHtuYW1lfVxcblxcbiMjIE9iamVjdGl2ZVxcblxcbkRlc2NyaWJlIHdoYXQgdGhpcyBwcm9qZWN0IGlzIHRyeWluZyB0byBhY2hpZXZlLlxcblxcbiMjIEN1cnJlbnQgU3RhdGVcXG5cXG4jIyBNaWxlc3RvbmVzXFxuXFxuLSBbIF0gRmlyc3QgbWlsZXN0b25lXFxuXFxuIyMgTmV4dCBBY3Rpb25zXFxuXFxuLSBbIF0gRGVmaW5lIGZpcnN0IG1pbGVzdG9uZVxcblxcbiMjIEJsb2NrZXJzXFxuXFxuTm9uZS5cXG5cXG4jIyBBdHRlbnRpb25cXG5cXG5Ob25lLlxcblxcbiMjIFRhc2tzXFxuXFxuPCEtLSBSRVNFQVJDSEZMT1c6UFJPSkVDVDpUQVNLUzpTVEFSVCAtLT5cXG5fTm8gdGFza3MgeWV0Ll9cXG48IS0tIFJFU0VBUkNIRkxPVzpQUk9KRUNUOlRBU0tTOkVORCAtLT5cXG5cXG4jIyBEZWNpc2lvbnNcXG5cXG4jIyBBcnRpZmFjdHNcXG5cXG4jIyBSZWxhdGVkIFJlYWRpbmdcXG5cXG4jIyBSZWxhdGVkIElkZWFzXFxuXFxuIyMgUmVsYXRlZCBDYXJlZXIgT3Bwb3J0dW5pdGllc1xcblxcbiMjIERhaWx5IFdvcmtcXG5gO1xuXHRcdFx0Y29uc3QgZmlsZSA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShwYXRoLCBjb250ZW50KTtcblx0XHRcdG5ldyBOb3RpY2UoYENyZWF0ZWQgcHJvamVjdDogJHtuYW1lfWApO1xuXHRcdFx0YXdhaXQgdGhpcy5zeW5jUHJvamVjdChuYW1lKTtcblx0XHRcdGF3YWl0IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWFmKHRydWUpLm9wZW5GaWxlKGZpbGUpO1xuXHRcdH0pO1xuXHR9XG5cblx0YXN5bmMgY3JlYXRlUmVzZWFyY2hJZGVhKCk6IFByb21pc2U8dm9pZD4ge1xuXHRcdG5ldyBDcmVhdGVJZGVhTW9kYWwodGhpcy5hcHAsIGFzeW5jIChuYW1lLCBkb21haW4sIGtpbmQsIHByaW9yaXR5KSA9PiB7XG5cdFx0XHRjb25zdCBzYWZlTmFtZSA9IHNhbml0aXplRmlsZU5hbWUobmFtZSk7XG5cdFx0XHRpZiAoIXNhZmVOYW1lKSB7IG5ldyBOb3RpY2UoXCJJZGVhIG5hbWUgY2Fubm90IGJlIGVtcHR5LlwiKTsgcmV0dXJuOyB9XG5cdFx0XHRjb25zdCBwYXRoID0gbm9ybWFsaXplUGF0aChgJHt0aGlzLnNldHRpbmdzLmlkZWFzRm9sZGVyfS8ke3NhZmVOYW1lfS5tZGApO1xuXHRcdFx0aWYgKHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKSkgeyBuZXcgTm90aWNlKFwiQW4gaWRlYSB3aXRoIHRoaXMgbmFtZSBhbHJlYWR5IGV4aXN0cy5cIik7IHJldHVybjsgfVxuXHRcdFx0Y29uc3QgY29udGVudCA9IGAtLS1cXG50eXBlOiBpZGVhXFxuZG9tYWluOiAke2RvbWFpbn1cXG5raW5kOiAke2tpbmR9XFxuc3RhdHVzOiBzZWVkXFxucHJpb3JpdHk6ICR7cHJpb3JpdHl9XFxuY3JlYXRlZDogJHt0b2RheSgpfVxcbnByb2plY3Q6XFxuLS0tXFxuXFxuIyAke25hbWV9XFxuXFxuIyMgSHlwb3RoZXNpc1xcblxcbiMjIFdoeSBpcyB0aGlzIGludGVyZXN0aW5nP1xcblxcbiMjIFJlbGF0ZWQgV29ya1xcblxcbiMjIFBvc3NpYmxlIEV4cGVyaW1lbnRzXFxuXFxuIyMgT3BlbiBRdWVzdGlvbnNcXG5cXG4jIyBOZXh0IEFjdGlvblxcblxcbi0gWyBdIFxcblxcbiMjIFJlbGF0ZWQgUHJvamVjdHNcXG5cXG4jIyBSZWxhdGVkIFJlYWRpbmdcXG5cXG4jIyBOb3Rlc1xcbmA7XG5cdFx0XHRjb25zdCBmaWxlID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKHBhdGgsIGNvbnRlbnQpO1xuXHRcdFx0bmV3IE5vdGljZShgQ3JlYXRlZCByZXNlYXJjaCBpZGVhOiAke25hbWV9YCk7XG5cdFx0XHRhd2FpdCB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKS5vcGVuRmlsZShmaWxlKTtcblx0XHR9KTtcblx0fVxuXG5cdGFzeW5jIGNyZWF0ZVRhc2soKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0Y29uc3QgcHJvamVjdHMgPSAoYXdhaXQgdGhpcy5nZXREYXRhKCkpLnByb2plY3RzLm1hcCgocCkgPT4gcC5uYW1lKS5zb3J0KChhLCBiKSA9PiBhLmxvY2FsZUNvbXBhcmUoYikpO1xuXHRcdG5ldyBDcmVhdGVUYXNrTW9kYWwodGhpcy5hcHAsIHByb2plY3RzLCBhc3luYyAobmFtZSwgcHJvamVjdCwgd29ya0RhdGUsIGR1ZURhdGUsIHByaW9yaXR5KSA9PiB7XG5cdFx0XHRjb25zdCBzYWZlTmFtZSA9IHNhbml0aXplRmlsZU5hbWUobmFtZSk7XG5cdFx0XHRpZiAoIXNhZmVOYW1lKSB7IG5ldyBOb3RpY2UoXCJUYXNrIG5hbWUgY2Fubm90IGJlIGVtcHR5LlwiKTsgcmV0dXJuOyB9XG5cdFx0XHRjb25zdCBwYXRoID0gbm9ybWFsaXplUGF0aChgJHt0aGlzLnNldHRpbmdzLnRhc2tzRm9sZGVyfS8ke3NhZmVOYW1lfS5tZGApO1xuXHRcdFx0aWYgKHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKSkgeyBuZXcgTm90aWNlKFwiQSB0YXNrIHdpdGggdGhpcyBuYW1lIGFscmVhZHkgZXhpc3RzLlwiKTsgcmV0dXJuOyB9XG5cdFx0XHRjb25zdCBwcm9qZWN0VmFsdWUgPSBwcm9qZWN0ID8gYFwiW1ske3Byb2plY3R9XV1cImAgOiBcIlwiO1xuXHRcdFx0Y29uc3QgY29udGVudCA9IGAtLS1cXG50eXBlOiB0YXNrXFxuc3RhdHVzOiB0b2RvXFxucHJpb3JpdHk6ICR7cHJpb3JpdHl9XFxucHJvamVjdDogJHtwcm9qZWN0VmFsdWV9XFxuY3JlYXRlZDogJHt0b2RheSgpfVxcbndvcmtfZGF0ZTogJHt3b3JrRGF0ZX1cXG5kdWU6ICR7ZHVlRGF0ZX1cXG4tLS1cXG5cXG4jICR7bmFtZX1cXG5cXG4jIyBPYmplY3RpdmVcXG5cXG4jIyBBcmNoaXRlY3R1cmVcXG5cXG4jIyBDb2RlXFxuXFxuIyMgVGVzdHNcXG5cXG4jIyBBcnRpZmFjdHNcXG5cXG4jIyBJc3N1ZXNcXG5cXG4jIyBEZWNpc2lvbnNcXG5cXG4jIyBSZXN1bHRcXG5cXG4jIyBEYWlseSBXb3JrXFxuXFxuLSBbWyR7d29ya0RhdGV9XV1cXG5gO1xuXHRcdFx0Y29uc3QgZmlsZSA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShwYXRoLCBjb250ZW50KTtcblx0XHRcdGF3YWl0IHRoaXMuZW5zdXJlRGFpbHlOb3RlKHdvcmtEYXRlKTtcblx0XHRcdGlmIChwcm9qZWN0KSBhd2FpdCB0aGlzLnN5bmNQcm9qZWN0KHByb2plY3QpO1xuXHRcdFx0YXdhaXQgdGhpcy5zeW5jRGFpbHlOb3RlKHdvcmtEYXRlKTtcblx0XHRcdG5ldyBOb3RpY2UoYENyZWF0ZWQgdGFzazogJHtuYW1lfWApO1xuXHRcdFx0YXdhaXQgdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSkub3BlbkZpbGUoZmlsZSk7XG5cdFx0fSk7XG5cdH1cblxuXHRhc3luYyBjcmVhdGVSZWFkaW5nKCk6IFByb21pc2U8dm9pZD4ge1xuXHRcdGNvbnN0IHByb2plY3RzID0gKGF3YWl0IHRoaXMuZ2V0RGF0YSgpKS5wcm9qZWN0cy5tYXAoKHApID0+IHAubmFtZSkuc29ydCgpO1xuXHRcdG5ldyBDcmVhdGVSZWFkaW5nTW9kYWwodGhpcy5hcHAsIHByb2plY3RzLCBhc3luYyAobmFtZSwgdXJsLCB0eXBlLCBwcm9qZWN0KSA9PiB7XG5cdFx0XHRjb25zdCBzYWZlTmFtZSA9IHNhbml0aXplRmlsZU5hbWUobmFtZSk7XG5cdFx0XHRpZiAoIXNhZmVOYW1lKSB7IG5ldyBOb3RpY2UoXCJSZWFkaW5nIHRpdGxlIGNhbm5vdCBiZSBlbXB0eS5cIik7IHJldHVybjsgfVxuXHRcdFx0Y29uc3QgcGF0aCA9IG5vcm1hbGl6ZVBhdGgoYCR7dGhpcy5zZXR0aW5ncy5yZWFkaW5nRm9sZGVyfS8ke3NhZmVOYW1lfS5tZGApO1xuXHRcdFx0aWYgKHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKSkgeyBuZXcgTm90aWNlKFwiQSByZWFkaW5nIGl0ZW0gd2l0aCB0aGlzIG5hbWUgYWxyZWFkeSBleGlzdHMuXCIpOyByZXR1cm47IH1cblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBgLS0tXFxudHlwZTogcmVhZGluZ1xcbnJlYWRpbmdfdHlwZTogJHt0eXBlfVxcbnN0YXR1czogdW5yZWFkXFxuYWRkZWQ6ICR7dG9kYXkoKX1cXG5yZWFkOlxcbnVybDogJHt1cmx9XFxucHJvamVjdDogJHtwcm9qZWN0ID8gYFwiW1ske3Byb2plY3R9XV1cImAgOiBcIlwifVxcbi0tLVxcblxcbiMgJHtuYW1lfVxcblxcbiMjIFdoeSBJIFNhdmVkIFRoaXNcXG5cXG4jIyBOb3Rlc1xcblxcbiMjIFRha2Vhd2F5c1xcblxcbiMjIFJlbGF0ZWQgUHJvamVjdHNcXG5cXG4jIyBSZWxhdGVkIElkZWFzXFxuYDtcblx0XHRcdGNvbnN0IGZpbGUgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUocGF0aCwgY29udGVudCk7XG5cdFx0XHRuZXcgTm90aWNlKGBBZGRlZCByZWFkaW5nOiAke25hbWV9YCk7XG5cdFx0XHRhd2FpdCB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKS5vcGVuRmlsZShmaWxlKTtcblx0XHR9KTtcblx0fVxuXG5cdGFzeW5jIGNyZWF0ZUNhcmVlck9wcG9ydHVuaXR5KCk6IFByb21pc2U8dm9pZD4ge1xuXHRcdGNvbnN0IHByb2plY3RzID0gKGF3YWl0IHRoaXMuZ2V0RGF0YSgpKS5wcm9qZWN0cy5tYXAoKHApID0+IHAubmFtZSkuc29ydCgpO1xuXHRcdG5ldyBDcmVhdGVDYXJlZXJNb2RhbCh0aGlzLmFwcCwgcHJvamVjdHMsIGFzeW5jIChjb21wYW55LCByb2xlLCBkZWFkbGluZSwgbWF0Y2gsIHByb2plY3QpID0+IHtcblx0XHRcdGNvbnN0IG5hbWUgPSBzYW5pdGl6ZUZpbGVOYW1lKGAke2NvbXBhbnl9IC0gJHtyb2xlfWApO1xuXHRcdFx0aWYgKCFuYW1lKSB7IG5ldyBOb3RpY2UoXCJDb21wYW55IGFuZCByb2xlIGFyZSByZXF1aXJlZC5cIik7IHJldHVybjsgfVxuXHRcdFx0Y29uc3QgcGF0aCA9IG5vcm1hbGl6ZVBhdGgoYCR7dGhpcy5zZXR0aW5ncy5jYXJlZXJGb2xkZXJ9LyR7bmFtZX0ubWRgKTtcblx0XHRcdGlmICh0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocGF0aCkpIHsgbmV3IE5vdGljZShcIlRoYXQgY2FyZWVyIG9wcG9ydHVuaXR5IGFscmVhZHkgZXhpc3RzLlwiKTsgcmV0dXJuOyB9XG5cdFx0XHRjb25zdCBjb250ZW50ID0gYC0tLVxcbnR5cGU6IGNhcmVlclxcbmNvbXBhbnk6ICR7Y29tcGFueX1cXG5yb2xlOiAke3JvbGV9XFxuZGVhZGxpbmU6ICR7ZGVhZGxpbmV9XFxubWF0Y2g6ICR7bWF0Y2h9XFxuc3RhdHVzOiBzYXZlZFxcbmFwcGxpZWQ6XFxuZmVlZGJhY2s6XFxuZG9jdW1lbnRzOlxcbnByb2plY3Q6ICR7cHJvamVjdCA/IGBcIltbJHtwcm9qZWN0fV1dXCJgIDogXCJcIn1cXG4tLS1cXG5cXG4jICR7cm9sZX0gXHUyMDE0ICR7Y29tcGFueX1cXG5cXG4jIyBPcHBvcnR1bml0eVxcblxcbiMjIERvY3VtZW50c1xcblxcbiMjIEFwcGxpY2F0aW9uXFxuXFxuIyMgRmVlZGJhY2tcXG5cXG4jIyBSZWxhdGVkIFByb2plY3RzXFxuXFxuIyMgRGFpbHkgV29ya1xcbmA7XG5cdFx0XHRjb25zdCBmaWxlID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKHBhdGgsIGNvbnRlbnQpO1xuXHRcdFx0bmV3IE5vdGljZShgQWRkZWQgb3Bwb3J0dW5pdHk6ICR7Y29tcGFueX0gXHUyMDE0ICR7cm9sZX1gKTtcblx0XHRcdGF3YWl0IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWFmKHRydWUpLm9wZW5GaWxlKGZpbGUpO1xuXHRcdH0pO1xuXHR9XG5cblx0YXN5bmMgb3BlbkRhaWx5Tm90ZShkYXRlOiBzdHJpbmcgPSB0b2RheSgpKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0Y29uc3QgZmlsZSA9IGF3YWl0IHRoaXMuZW5zdXJlRGFpbHlOb3RlKGRhdGUpO1xuXHRcdGF3YWl0IHRoaXMuc3luY0RhaWx5Tm90ZShkYXRlKTtcblx0XHRhd2FpdCB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKS5vcGVuRmlsZShmaWxlKTtcblx0fVxuXG5cdGFzeW5jIGVuc3VyZURhaWx5Tm90ZShkYXRlOiBzdHJpbmcpOiBQcm9taXNlPFRGaWxlPiB7XG5cdFx0Y29uc3QgcGF0aCA9IG5vcm1hbGl6ZVBhdGgoYCR7dGhpcy5zZXR0aW5ncy5kYWlseUZvbGRlcn0vJHtkYXRlfS5tZGApO1xuXHRcdGNvbnN0IGV4aXN0aW5nID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHBhdGgpO1xuXHRcdGlmIChleGlzdGluZyBpbnN0YW5jZW9mIFRGaWxlKSByZXR1cm4gZXhpc3Rpbmc7XG5cdFx0Y29uc3QgZmlsZSA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShwYXRoLCB0aGlzLmNyZWF0ZURhaWx5Tm90ZUNvbnRlbnQoZGF0ZSkpO1xuXHRcdG5ldyBOb3RpY2UoYENyZWF0ZWQgZGFpbHkgbm90ZTogJHtkYXRlfWApO1xuXHRcdHJldHVybiBmaWxlO1xuXHR9XG5cblx0Y3JlYXRlRGFpbHlOb3RlQ29udGVudChkYXRlOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRcdHJldHVybiBgLS0tXFxudHlwZTogZGFpbHlcXG5kYXRlOiAke2RhdGV9XFxuLS0tXFxuXFxuIyAke2RhdGV9XFxuXFxuIyMgVG9kYXkncyBGb2N1c1xcblxcbiMjIFRhc2tzXFxuXFxuPCEtLSBSRVNFQVJDSEZMT1c6VEFTS1M6U1RBUlQgLS0+XFxuX05vIHRhc2tzIHNjaGVkdWxlZC5fXFxuPCEtLSBSRVNFQVJDSEZMT1c6VEFTS1M6RU5EIC0tPlxcblxcbiMjIFdvcmsgTG9nXFxuXFxuIyMgRGVjaXNpb25zXFxuXFxuIyMgQmxvY2tlcnNcXG5cXG4jIyBJZGVhc1xcblxcbiMjIFJlYWRpbmdcXG5cXG4jIyBDYXJlZXJcXG5gO1xuXHR9XG5cblx0YXN5bmMgc3luY0RhaWx5Tm90ZShkYXRlOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHRjb25zdCBkYWlseSA9IGF3YWl0IHRoaXMuZW5zdXJlRGFpbHlOb3RlKGRhdGUpO1xuXHRcdGNvbnN0IGZpbGVzID0gdGhpcy5nZXRNYW5hZ2VkRmlsZXNJbkZvbGRlcih0aGlzLnNldHRpbmdzLnRhc2tzRm9sZGVyKTtcblx0XHRjb25zdCByb3dzOiBzdHJpbmdbXSA9IFtdO1xuXHRcdGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuXHRcdFx0Y29uc3QgZm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG5cdFx0XHRpZiAoU3RyaW5nKGZtPy50eXBlID8/IFwiXCIpICE9PSBcInRhc2tcIikgY29udGludWU7XG5cdFx0XHRpZiAoZnJvbnRtYXR0ZXJTdHJpbmcoZm0/LndvcmtfZGF0ZSkgIT09IGRhdGUpIGNvbnRpbnVlO1xuXHRcdFx0cm93cy5wdXNoKGAtICR7aXNEb25lKGZyb250bWF0dGVyU3RyaW5nKGZtPy5zdGF0dXMpKSA/IFwiW3hdXCIgOiBcIlsgXVwifSBbWyR7ZmlsZS5iYXNlbmFtZX1dXWApO1xuXHRcdH1cblx0XHRyb3dzLnNvcnQoKGEsIGIpID0+IGEubG9jYWxlQ29tcGFyZShiKSk7XG5cdFx0Y29uc3Qgc2VjdGlvbiA9IHJvd3MubGVuZ3RoID8gcm93cy5qb2luKFwiXFxuXCIpIDogXCJfTm8gdGFza3Mgc2NoZWR1bGVkLl9cIjtcblx0XHRhd2FpdCByZXBsYWNlQmV0d2Vlbk1hcmtlcnMoZGFpbHksIFwiPCEtLSBSRVNFQVJDSEZMT1c6VEFTS1M6U1RBUlQgLS0+XCIsIFwiPCEtLSBSRVNFQVJDSEZMT1c6VEFTS1M6RU5EIC0tPlwiLCBzZWN0aW9uLCB0aGlzLmFwcCk7XG5cdH1cblxuXHRhc3luYyBzeW5jVGFza1N0YXR1c2VzRnJvbURhaWx5Tm90ZShkYWlseUZpbGU6IFRGaWxlKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0aWYgKHRoaXMuc3luY2luZykgcmV0dXJuO1xuXHRcdGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGRhaWx5RmlsZSk7XG5cdFx0Y29uc3Qgc3RhcnQgPSBjb250ZW50LmluZGV4T2YoXCI8IS0tIFJFU0VBUkNIRkxPVzpUQVNLUzpTVEFSVCAtLT5cIik7XG5cdFx0Y29uc3QgZW5kID0gY29udGVudC5pbmRleE9mKFwiPCEtLSBSRVNFQVJDSEZMT1c6VEFTS1M6RU5EIC0tPlwiKTtcblx0XHRpZiAoc3RhcnQgPCAwIHx8IGVuZCA8IHN0YXJ0KSByZXR1cm47XG5cdFx0Y29uc3Qgc2VjdGlvbiA9IGNvbnRlbnQuc2xpY2Uoc3RhcnQsIGVuZCk7XG5cdFx0Y29uc3QgcmVnZXggPSAvXi0gXFxbKFsgeFhdKVxcXSBcXFtcXFsoW15cXF18I10rKSg/OiNbXlxcXXxdKyk/KD86XFx8W15cXF1dKyk/XFxdXFxdL2dtO1xuXHRcdGNvbnN0IHVwZGF0ZXM6IEFycmF5PHsgZmlsZTogVEZpbGU7IHN0YXR1czogc3RyaW5nIH0+ID0gW107XG5cdFx0bGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xuXHRcdHdoaWxlICgobWF0Y2ggPSByZWdleC5leGVjKHNlY3Rpb24pKSAhPT0gbnVsbCkge1xuXHRcdFx0Y29uc3QgdGFza0ZpbGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpcnN0TGlua3BhdGhEZXN0KG1hdGNoWzJdLnRyaW0oKSwgZGFpbHlGaWxlLnBhdGgpO1xuXHRcdFx0aWYgKCEodGFza0ZpbGUgaW5zdGFuY2VvZiBURmlsZSkpIGNvbnRpbnVlO1xuXHRcdFx0Y29uc3QgZm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZSh0YXNrRmlsZSk/LmZyb250bWF0dGVyO1xuXHRcdFx0aWYgKFN0cmluZyhmbT8udHlwZSA/PyBcIlwiKSAhPT0gXCJ0YXNrXCIpIGNvbnRpbnVlO1xuXHRcdFx0dXBkYXRlcy5wdXNoKHsgZmlsZTogdGFza0ZpbGUsIHN0YXR1czogbWF0Y2hbMV0udG9Mb3dlckNhc2UoKSA9PT0gXCJ4XCIgPyBcImRvbmVcIiA6IFwidG9kb1wiIH0pO1xuXHRcdH1cblx0XHRpZiAoIXVwZGF0ZXMubGVuZ3RoKSByZXR1cm47XG5cdFx0dGhpcy5zeW5jaW5nID0gdHJ1ZTtcblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgcHJvamVjdHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblx0XHRcdGZvciAoY29uc3QgdXBkYXRlIG9mIHVwZGF0ZXMpIHtcblx0XHRcdFx0Y29uc3Qgb2xkID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZCh1cGRhdGUuZmlsZSk7XG5cdFx0XHRcdGNvbnN0IG5leHQgPSByZXBsYWNlRnJvbnRtYXR0ZXJWYWx1ZShvbGQsIFwic3RhdHVzXCIsIHVwZGF0ZS5zdGF0dXMpO1xuXHRcdFx0XHRpZiAobmV4dCAhPT0gb2xkKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5tb2RpZnkodXBkYXRlLmZpbGUsIG5leHQpO1xuXHRcdFx0XHRjb25zdCBwcm9qZWN0ID0gbm9ybWFsaXplUHJvamVjdE5hbWUoZnJvbnRtYXR0ZXJTdHJpbmcodGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUodXBkYXRlLmZpbGUpPy5mcm9udG1hdHRlcj8ucHJvamVjdCkpO1xuXHRcdFx0XHRpZiAocHJvamVjdCkgcHJvamVjdHMuYWRkKHByb2plY3QpO1xuXHRcdFx0fVxuXHRcdFx0YXdhaXQgc2xlZXAoMTAwKTtcblx0XHRcdGZvciAoY29uc3QgcHJvamVjdCBvZiBwcm9qZWN0cykgYXdhaXQgdGhpcy5zeW5jUHJvamVjdChwcm9qZWN0KTtcblx0XHR9IGZpbmFsbHkge1xuXHRcdFx0dGhpcy5zeW5jaW5nID0gZmFsc2U7XG5cdFx0fVxuXHRcdHRoaXMuc2NoZWR1bGVSZWZyZXNoKCk7XG5cdH1cblxuXHRhc3luYyBzeW5jUHJvamVjdChwcm9qZWN0TmFtZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0Y29uc3QgY2xlYW4gPSBub3JtYWxpemVQcm9qZWN0TmFtZShwcm9qZWN0TmFtZSk7XG5cdFx0aWYgKCFjbGVhbikgcmV0dXJuO1xuXHRcdGNvbnN0IHByb2plY3RGaWxlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaXJzdExpbmtwYXRoRGVzdChjbGVhbiwgXCJcIik7XG5cdFx0aWYgKCEocHJvamVjdEZpbGUgaW5zdGFuY2VvZiBURmlsZSkpIHJldHVybjtcblx0XHRjb25zdCB0YXNrcyA9IHRoaXMuZ2V0TWFuYWdlZEZpbGVzSW5Gb2xkZXIodGhpcy5zZXR0aW5ncy50YXNrc0ZvbGRlcikuZmlsdGVyKChmaWxlKSA9PiB7XG5cdFx0XHRjb25zdCBmbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcblx0XHRcdHJldHVybiBTdHJpbmcoZm0/LnR5cGUgPz8gXCJcIikgPT09IFwidGFza1wiICYmIG5vcm1hbGl6ZVByb2plY3ROYW1lKGZyb250bWF0dGVyU3RyaW5nKGZtPy5wcm9qZWN0KSkgPT09IGNsZWFuO1xuXHRcdH0pO1xuXHRcdGNvbnN0IGNvbXBsZXRlZCA9IHRhc2tzLmZpbHRlcigoZmlsZSkgPT4gaXNEb25lKGZyb250bWF0dGVyU3RyaW5nKHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcj8uc3RhdHVzKSkpLmxlbmd0aDtcblx0XHRjb25zdCBwcm9ncmVzcyA9IHRhc2tzLmxlbmd0aCA/IE1hdGgucm91bmQoKGNvbXBsZXRlZCAvIHRhc2tzLmxlbmd0aCkgKiAxMDApIDogMDtcblx0XHRjb25zdCBwcm9qZWN0Q29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQocHJvamVjdEZpbGUpO1xuXHRcdGNvbnN0IHdpdGhQcm9ncmVzcyA9IHJlcGxhY2VGcm9udG1hdHRlclZhbHVlKHByb2plY3RDb250ZW50LCBcInByb2dyZXNzXCIsIFN0cmluZyhwcm9ncmVzcykpO1xuXHRcdGNvbnN0IHdpdGhBY3Rpdml0eSA9IHJlcGxhY2VGcm9udG1hdHRlclZhbHVlKHdpdGhQcm9ncmVzcywgXCJsYXN0X2FjdGl2aXR5XCIsIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSk7XG5cdFx0Y29uc3QgdGFza0xpbmVzID0gdGFza3Muc29ydCgoYSwgYikgPT4gYS5iYXNlbmFtZS5sb2NhbGVDb21wYXJlKGIuYmFzZW5hbWUpKS5tYXAoKGZpbGUpID0+IHtcblx0XHRcdGNvbnN0IHN0YXR1cyA9IGZyb250bWF0dGVyU3RyaW5nKHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcj8uc3RhdHVzKTtcblx0XHRcdHJldHVybiBgLSAke2lzRG9uZShzdGF0dXMpID8gXCJbeF1cIiA6IFwiWyBdXCJ9IFtbJHtmaWxlLmJhc2VuYW1lfV1dYDtcblx0XHR9KTtcblx0XHRjb25zdCBzZWN0aW9uID0gdGFza0xpbmVzLmxlbmd0aCA/IHRhc2tMaW5lcy5qb2luKFwiXFxuXCIpIDogXCJfTm8gdGFza3MgeWV0Ll9cIjtcblx0XHRsZXQgY29udGVudCA9IHdpdGhBY3Rpdml0eTtcblx0XHRpZiAoIWNvbnRlbnQuaW5jbHVkZXMoXCI8IS0tIFJFU0VBUkNIRkxPVzpQUk9KRUNUOlRBU0tTOlNUQVJUIC0tPlwiKSkge1xuXHRcdFx0Y29uc3QgaGVhZGluZyA9IFwiIyMgVGFza3NcIjtcblx0XHRcdGNvbnN0IGluZGV4ID0gY29udGVudC5pbmRleE9mKGhlYWRpbmcpO1xuXHRcdFx0aWYgKGluZGV4ID49IDApIHtcblx0XHRcdFx0Y29uc3QgaW5zZXJ0aW9uID0gYFxcblxcbjwhLS0gUkVTRUFSQ0hGTE9XOlBST0pFQ1Q6VEFTS1M6U1RBUlQgLS0+XFxuJHtzZWN0aW9ufVxcbjwhLS0gUkVTRUFSQ0hGTE9XOlBST0pFQ1Q6VEFTS1M6RU5EIC0tPmA7XG5cdFx0XHRcdGNvbnRlbnQgPSBjb250ZW50LnNsaWNlKDAsIGluZGV4ICsgaGVhZGluZy5sZW5ndGgpICsgaW5zZXJ0aW9uICsgY29udGVudC5zbGljZShpbmRleCArIGhlYWRpbmcubGVuZ3RoKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29udGVudCA9IHJlcGxhY2VCZXR3ZWVuTWFya2Vyc1RleHQoY29udGVudCwgXCI8IS0tIFJFU0VBUkNIRkxPVzpQUk9KRUNUOlRBU0tTOlNUQVJUIC0tPlwiLCBcIjwhLS0gUkVTRUFSQ0hGTE9XOlBST0pFQ1Q6VEFTS1M6RU5EIC0tPlwiLCBzZWN0aW9uKTtcblx0XHR9XG5cdFx0aWYgKGNvbnRlbnQgIT09IHByb2plY3RDb250ZW50KSBhd2FpdCB0aGlzLmFwcC52YXVsdC5tb2RpZnkocHJvamVjdEZpbGUsIGNvbnRlbnQpO1xuXHR9XG5cblx0YXN5bmMgdXBkYXRlUHJvamVjdFByb2dyZXNzKHByb2plY3ROYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHRhd2FpdCB0aGlzLnN5bmNQcm9qZWN0KHByb2plY3ROYW1lKTtcblx0fVxuXG5cdGFzeW5jIGltcG9ydENhcmVlckNTVigpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHRjb25zdCBpbnB1dCA9IHRoaXMuYXBwLndvcmtzcGFjZS5jb250YWluZXJFbC5jcmVhdGVFbChcImlucHV0XCIsIHtcblx0XHRcdHR5cGU6IFwiZmlsZVwiLFxuXHRcdFx0Y2xzOiBcInJlc2VhcmNoLWZsb3ctZmlsZS1pbnB1dFwiLFxuXHRcdH0pO1xuXHRcdGlucHV0LmFjY2VwdCA9IFwiLmNzdix0ZXh0L2NzdlwiO1xuXHRcdGlucHV0LmhpZGUoKTtcblxuXHRcdGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4ge1xuXHRcdFx0Y29uc3QgZmlsZSA9IGlucHV0LmZpbGVzPy5pdGVtKDApO1xuXHRcdFx0aWYgKCFmaWxlKSB7XG5cdFx0XHRcdGlucHV0LnJlbW92ZSgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHR2b2lkIHRoaXMucHJvY2Vzc0NhcmVlckNTVihmaWxlKS5maW5hbGx5KCgpID0+IGlucHV0LnJlbW92ZSgpKTtcblx0XHR9KTtcblxuXHRcdGlucHV0LmNsaWNrKCk7XG5cdH1cblxuXHRhc3luYyBwcm9jZXNzQ2FyZWVyQ1NWKGZpbGU6IEZpbGUpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHRjb25zdCB0ZXh0ID0gYXdhaXQgZmlsZS50ZXh0KCk7XG5cdFx0Y29uc3Qgcm93cyA9IHBhcnNlQ1NWKHRleHQpO1xuXHRcdGlmIChyb3dzLmxlbmd0aCA8IDIpIHsgbmV3IE5vdGljZShcIkNTViBjb250YWlucyBubyBvcHBvcnR1bml0eSByb3dzLlwiKTsgcmV0dXJuOyB9XG5cdFx0Y29uc3QgaGVhZGVycyA9IHJvd3NbMF0ubWFwKChoKSA9PiBoLnRyaW0oKS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1xccysvZywgXCJfXCIpKTtcblx0XHRsZXQgY291bnQgPSAwO1xuXHRcdGZvciAoY29uc3Qgcm93IG9mIHJvd3Muc2xpY2UoMSkpIHtcblx0XHRcdGNvbnN0IHJlY29yZDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuXHRcdFx0aGVhZGVycy5mb3JFYWNoKChoLCBpKSA9PiB7IHJlY29yZFtoXSA9IHJvd1tpXSA/PyBcIlwiOyB9KTtcblx0XHRcdGNvbnN0IGNvbXBhbnkgPSByZWNvcmQuY29tcGFueSB8fCByZWNvcmQub3JnYW5pemF0aW9uIHx8IFwiVW5rbm93biBDb21wYW55XCI7XG5cdFx0XHRjb25zdCByb2xlID0gcmVjb3JkLnJvbGUgfHwgcmVjb3JkLnRpdGxlIHx8IFwiT3Bwb3J0dW5pdHlcIjtcblx0XHRcdGNvbnN0IHNhZmVOYW1lID0gc2FuaXRpemVGaWxlTmFtZShgJHtjb21wYW55fSAtICR7cm9sZX1gKTtcblx0XHRcdGNvbnN0IHBhdGggPSBub3JtYWxpemVQYXRoKGAke3RoaXMuc2V0dGluZ3MuY2FyZWVyRm9sZGVyfS8ke3NhZmVOYW1lfS5tZGApO1xuXHRcdFx0aWYgKHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKSkgY29udGludWU7XG5cdFx0XHRjb25zdCBjb250ZW50ID0gYC0tLVxcbnR5cGU6IGNhcmVlclxcbmNvbXBhbnk6ICR7eWFtbFZhbHVlKGNvbXBhbnkpfVxcbnJvbGU6ICR7eWFtbFZhbHVlKHJvbGUpfVxcbmRlYWRsaW5lOiAke3lhbWxWYWx1ZShyZWNvcmQuZGVhZGxpbmUgfHwgcmVjb3JkLmxhc3RfZGF0ZSl9XFxubWF0Y2g6ICR7cmVjb3JkLm1hdGNoIHx8IDB9XFxuc3RhdHVzOiAke3lhbWxWYWx1ZShyZWNvcmQuc3RhdHVzIHx8IFwic2F2ZWRcIil9XFxuYXBwbGllZDogJHt5YW1sVmFsdWUocmVjb3JkLmFwcGxpZWQpfVxcbmZlZWRiYWNrOiAke3lhbWxWYWx1ZShyZWNvcmQuZmVlZGJhY2spfVxcbmRvY3VtZW50czogJHt5YW1sVmFsdWUocmVjb3JkLmRvY3VtZW50cyB8fCByZWNvcmQuZG9jdW1lbnRfbGlua3MpfVxcbnByb2plY3Q6ICR7eWFtbFZhbHVlKHJlY29yZC5wcm9qZWN0KX1cXG5zb3VyY2U6ICR7eWFtbFZhbHVlKHJlY29yZC5saW5rIHx8IHJlY29yZC51cmwpfVxcbi0tLVxcblxcbiMgJHtyb2xlfSBcdTIwMTQgJHtjb21wYW55fVxcblxcbiMjIE9wcG9ydHVuaXR5XFxuXFxuU291cmNlOiAke3JlY29yZC5saW5rIHx8IHJlY29yZC51cmwgfHwgXCJcIn1cXG5cXG4jIyBEb2N1bWVudHNcXG5cXG4ke3JlY29yZC5kb2N1bWVudHMgfHwgcmVjb3JkLmRvY3VtZW50X2xpbmtzIHx8IFwiXCJ9XFxuXFxuIyMgQXBwbGljYXRpb25cXG5cXG4jIyBGZWVkYmFja1xcblxcbiMjIFJlbGF0ZWQgUHJvamVjdHNcXG5cXG4jIyBEYWlseSBXb3JrXFxuYDtcblx0XHRcdGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShwYXRoLCBjb250ZW50KTtcblx0XHRcdGNvdW50Kys7XG5cdFx0fVxuXHRcdG5ldyBOb3RpY2UoYEltcG9ydGVkICR7Y291bnR9IGNhcmVlciBvcHBvcnR1bml0aWVzLmApO1xuXHRcdHRoaXMuc2NoZWR1bGVSZWZyZXNoKCk7XG5cdH1cblxuXHRhc3luYyBnZW5lcmF0ZVdlZWtseVN1bW1hcnkoKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0Y29uc3QgZW5kID0gbmV3IERhdGUoKTtcblx0XHRjb25zdCBzdGFydCA9IG5ldyBEYXRlKGVuZC5nZXRUaW1lKCkgLSA2ICogODY0MDAwMDApO1xuXHRcdGNvbnN0IGZpbGVzID0gdGhpcy5nZXRNYW5hZ2VkRmlsZXNJbkZvbGRlcih0aGlzLnNldHRpbmdzLmRhaWx5Rm9sZGVyKTtcblx0XHRjb25zdCByZWxldmFudDogc3RyaW5nW10gPSBbXTtcblx0XHRmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcblx0XHRcdGNvbnN0IGQgPSBwYXJzZURhdGUoZmlsZS5iYXNlbmFtZSk7XG5cdFx0XHRpZiAoIWQgfHwgZCA8IHN0YXJ0IHx8IGQgPiBlbmQpIGNvbnRpbnVlO1xuXHRcdFx0Y29uc3QgdGV4dCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG5cdFx0XHRyZWxldmFudC5wdXNoKGAjIyAke2ZpbGUuYmFzZW5hbWV9XFxuJHtleHRyYWN0RGFpbHlTdW1tYXJ5KHRleHQpfWApO1xuXHRcdH1cblx0XHRjb25zdCBwYXRoID0gbm9ybWFsaXplUGF0aChgJHt0aGlzLnNldHRpbmdzLmRhaWx5Rm9sZGVyfS9XZWVrbHkgU3VtbWFyeSAke2Zvcm1hdERhdGVLZXkoZW5kKX0ubWRgKTtcblx0XHRjb25zdCBjb250ZW50ID0gYC0tLVxcbnR5cGU6IHdlZWtseV9zdW1tYXJ5XFxud2Vla19lbmRpbmc6ICR7Zm9ybWF0RGF0ZUtleShlbmQpfVxcbi0tLVxcblxcbiMgUmVzZWFyY2hGbG93IFdlZWtseSBTdW1tYXJ5XFxuXFxuJHtyZWxldmFudC5qb2luKFwiXFxuXFxuXCIpIHx8IFwiTm8gZGFpbHkgbm90ZXMgZm91bmQuXCJ9XFxuXFxuIyMgUmV0cm9zcGVjdGl2ZVxcblxcbiMjIyBXaW5zXFxuXFxuIyMjIEJsb2NrZXJzXFxuXFxuIyMjIERlY2lzaW9uc1xcblxcbiMjIyBOZXh0IFdlZWtcXG5gO1xuXHRcdGNvbnN0IGV4aXN0aW5nID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHBhdGgpO1xuXHRcdGlmIChleGlzdGluZyBpbnN0YW5jZW9mIFRGaWxlKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5tb2RpZnkoZXhpc3RpbmcsIGNvbnRlbnQpO1xuXHRcdGVsc2UgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKHBhdGgsIGNvbnRlbnQpO1xuXHRcdG5ldyBOb3RpY2UoXCJXZWVrbHkgc3VtbWFyeSBnZW5lcmF0ZWQuXCIpO1xuXHR9XG5cblx0YXN5bmMgdmFsaWRhdGVWYXVsdCgpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHRjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5nZXREYXRhKCk7XG5cdFx0Y29uc3QgcHJvYmxlbXM6IHN0cmluZ1tdID0gW107XG5cdFx0Y29uc3QgcHJvamVjdE5hbWVzID0gbmV3IFNldChkYXRhLnByb2plY3RzLm1hcCgocCkgPT4gcC5uYW1lKSk7XG5cdFx0Zm9yIChjb25zdCB0YXNrIG9mIGRhdGEudGFza3MpIHtcblx0XHRcdGlmICh0YXNrLnByb2plY3QgJiYgIXByb2plY3ROYW1lcy5oYXModGFzay5wcm9qZWN0KSkgcHJvYmxlbXMucHVzaChgVGFzayAke3Rhc2submFtZX06IG1pc3NpbmcgcHJvamVjdCAke3Rhc2sucHJvamVjdH1gKTtcblx0XHRcdGlmICghdGFzay53b3JrRGF0ZSkgcHJvYmxlbXMucHVzaChgVGFzayAke3Rhc2submFtZX06IG1pc3Npbmcgd29ya19kYXRlYCk7XG5cdFx0fVxuXHRcdGZvciAoY29uc3QgcHJvamVjdCBvZiBkYXRhLnByb2plY3RzKSB7XG5cdFx0XHRpZiAoIXByb2plY3QuZmlsZS5wYXRoKSBwcm9ibGVtcy5wdXNoKGBQcm9qZWN0ICR7cHJvamVjdC5uYW1lfTogaW52YWxpZCBwYXRoYCk7XG5cdFx0fVxuXHRcdGlmICghcHJvYmxlbXMubGVuZ3RoKSBuZXcgTm90aWNlKFwiUmVzZWFyY2hGbG93IHZhbGlkYXRpb24gcGFzc2VkLlwiKTtcblx0XHRlbHNlIHtcblx0XHRcdG5ldyBOb3RpY2UoYCR7cHJvYmxlbXMubGVuZ3RofSByZWxhdGlvbnNoaXAgaXNzdWUocykgZm91bmQuIENoZWNrIHRoZSBhZmZlY3RlZCBub3Rlcy5gKTtcblx0XHR9XG5cdH1cbn1cblxuY2xhc3MgUmVzZWFyY2hGbG93SG9tZVZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XG5cdHBsdWdpbjogUmVzZWFyY2hGbG93UGx1Z2luO1xuXHRjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmLCBwbHVnaW46IFJlc2VhcmNoRmxvd1BsdWdpbikgeyBzdXBlcihsZWFmKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH1cblx0Z2V0Vmlld1R5cGUoKTogc3RyaW5nIHsgcmV0dXJuIFZJRVdfVFlQRV9SRVNFQVJDSF9GTE9XOyB9XG5cdGdldERpc3BsYXlUZXh0KCk6IHN0cmluZyB7IHJldHVybiBcIlJlc2VhcmNoRmxvd1wiOyB9XG5cdGdldEljb24oKTogc3RyaW5nIHsgcmV0dXJuIFwibGF5b3V0LWRhc2hib2FyZFwiOyB9XG5cdGFzeW5jIG9uT3BlbigpOiBQcm9taXNlPHZvaWQ+IHsgYXdhaXQgdGhpcy5yZW5kZXIoKTsgfVxuXHRhc3luYyBvbkNsb3NlKCk6IFByb21pc2U8dm9pZD4geyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9XG5cblx0YXN5bmMgcmVuZGVyKCk6IFByb21pc2U8dm9pZD4ge1xuXHRcdGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLnBsdWdpbi5nZXREYXRhKCk7XG5cdFx0Y29uc3Qgcm9vdCA9IHRoaXMuY29udGVudEVsO1xuXHRcdHJvb3QuZW1wdHkoKTtcblx0XHRyb290LmFkZENsYXNzKFwicmVzZWFyY2gtZmxvdy1ob21lXCIpO1xuXHRcdGNvbnN0IGhlYWRlciA9IHJvb3QuY3JlYXRlRGl2KHsgY2xzOiBcInJlc2VhcmNoLWZsb3ctaGVhZGVyXCIgfSk7XG5cdFx0aGVhZGVyLmNyZWF0ZUVsKFwiaDFcIiwgeyB0ZXh0OiBcIlJlc2VhcmNoRmxvd1wiIH0pO1xuXHRcdGhlYWRlci5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUmVzZWFyY2ggb3BlcmF0aW5nIHN5c3RlbSBcdTAwQjcgdiR7UkZfVkVSU0lPTn1gLCBjbHM6IFwicmVzZWFyY2gtZmxvdy1zdWJ0aXRsZVwiIH0pO1xuXHRcdGNvbnN0IGFjdGlvbnMgPSBoZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiBcInJlc2VhcmNoLWZsb3ctYWN0aW9uc1wiIH0pO1xuXHRcdHRoaXMuYnV0dG9uKGFjdGlvbnMsIFwiTmV3IFByb2plY3RcIiwgXCJwbHVzXCIsICgpID0+IHZvaWQgdGhpcy5wbHVnaW4uY3JlYXRlUHJvamVjdCgpKTtcblx0XHR0aGlzLmJ1dHRvbihhY3Rpb25zLCBcIk5ldyBUYXNrXCIsIFwiY2hlY2stc3F1YXJlXCIsICgpID0+IHZvaWQgdGhpcy5wbHVnaW4uY3JlYXRlVGFzaygpKTtcblx0XHR0aGlzLmJ1dHRvbihhY3Rpb25zLCBcIk5ldyBJZGVhXCIsIFwibGlnaHRidWxiXCIsICgpID0+IHZvaWQgdGhpcy5wbHVnaW4uY3JlYXRlUmVzZWFyY2hJZGVhKCkpO1xuXHRcdHRoaXMuYnV0dG9uKGFjdGlvbnMsIFwiVG9kYXlcIiwgXCJjYWxlbmRhclwiLCAoKSA9PiB2b2lkIHRoaXMucGx1Z2luLm9wZW5EYWlseU5vdGUoKSk7XG5cdFx0dGhpcy5idXR0b24oYWN0aW9ucywgXCJSZWFkaW5nXCIsIFwiYm9vay1vcGVuXCIsICgpID0+IHZvaWQgdGhpcy5wbHVnaW4uY3JlYXRlUmVhZGluZygpKTtcblx0XHR0aGlzLmJ1dHRvbihhY3Rpb25zLCBcIkNhcmVlclwiLCBcImJyaWVmY2FzZVwiLCAoKSA9PiB2b2lkIHRoaXMucGx1Z2luLmNyZWF0ZUNhcmVlck9wcG9ydHVuaXR5KCkpO1xuXHRcdHRoaXMuYnV0dG9uKGFjdGlvbnMsIFwiUmVmcmVzaFwiLCBcInJlZnJlc2gtY3dcIiwgKCkgPT4gdm9pZCB0aGlzLnJlbmRlcigpKTtcblxuXHRcdHRoaXMuc3RhdHMocm9vdCwgZGF0YSk7XG5cdFx0dGhpcy5zZWN0aW9uKHJvb3QsIFwiQWN0aXZlIFByb2plY3RzXCIsIFwiZm9sZGVyLWthbmJhblwiKTtcblx0XHRjb25zdCBhY3RpdmUgPSBkYXRhLnByb2plY3RzLmZpbHRlcigocCkgPT4gIWlzVGVybWluYWxQcm9qZWN0KHAuc3RhdHVzKSk7XG5cdFx0aWYgKCFhY3RpdmUubGVuZ3RoKSB0aGlzLmVtcHR5KHJvb3QsIFwiTm8gYWN0aXZlIHByb2plY3RzLlwiKTtcblx0XHRmb3IgKGNvbnN0IHByb2plY3Qgb2YgYWN0aXZlLnNvcnQoKGEsIGIpID0+IHByaW9yaXR5UmFuayhhLnByaW9yaXR5KSAtIHByaW9yaXR5UmFuayhiLnByaW9yaXR5KSkpIHRoaXMucHJvamVjdENhcmQocm9vdCwgcHJvamVjdCk7XG5cblx0XHR0aGlzLnNlY3Rpb24ocm9vdCwgXCJcdUQ4M0RcdUREMzQgQmxvY2tlcnNcIiwgXCJhbGVydC1jaXJjbGVcIik7XG5cdFx0aWYgKCFkYXRhLmJsb2NrZXJzLmxlbmd0aCkgdGhpcy5lbXB0eShyb290LCBcIk5vIGJsb2NrZXJzLlwiKTtcblx0XHRmb3IgKGNvbnN0IHAgb2YgZGF0YS5ibG9ja2VycykgdGhpcy5hbGVydChyb290LCBwLCBcImJsb2NrZXJcIik7XG5cblx0XHR0aGlzLnNlY3Rpb24ocm9vdCwgXCJcdUQ4M0RcdURGRTAgQXR0ZW50aW9uXCIsIFwiYWxlcnQtdHJpYW5nbGVcIik7XG5cdFx0aWYgKCFkYXRhLmF0dGVudGlvbi5sZW5ndGgpIHRoaXMuZW1wdHkocm9vdCwgXCJOb3RoaW5nIGZsYWdnZWQgZm9yIGF0dGVudGlvbi5cIik7XG5cdFx0Zm9yIChjb25zdCBwIG9mIGRhdGEuYXR0ZW50aW9uKSB0aGlzLmFsZXJ0KHJvb3QsIHAsIFwiYXR0ZW50aW9uXCIpO1xuXG5cdFx0dGhpcy5zZWN0aW9uKHJvb3QsIFwiXHUyNkEwIFN0YWxlIFByb2plY3RzXCIsIFwiY2xvY2tcIik7XG5cdFx0aWYgKCFkYXRhLnN0YWxlUHJvamVjdHMubGVuZ3RoKSB0aGlzLmVtcHR5KHJvb3QsIFwiTm8gc3RhbGUgYWN0aXZlIHByb2plY3RzLlwiKTtcblx0XHRmb3IgKGNvbnN0IHAgb2YgZGF0YS5zdGFsZVByb2plY3RzKSB0aGlzLmFsZXJ0KHJvb3QsIHAsIFwic3RhbGVcIik7XG5cblx0XHR0aGlzLnNlY3Rpb24ocm9vdCwgXCJUb2RheSdzIFRhc2tzXCIsIFwiY2hlY2stc3F1YXJlXCIpO1xuXHRcdGlmICghZGF0YS50b2RheVRhc2tzLmxlbmd0aCkgdGhpcy5lbXB0eShyb290LCBcIk5vIGluY29tcGxldGUgdGFza3MgZm9yIHRvZGF5LlwiKTtcblx0XHRmb3IgKGNvbnN0IHRhc2sgb2YgZGF0YS50b2RheVRhc2tzKSB0aGlzLnRhc2tSb3cocm9vdCwgdGFzayk7XG5cblx0XHR0aGlzLnNlY3Rpb24ocm9vdCwgXCJDYXJlZXIgXHUyMDE0IFVwY29taW5nXCIsIFwiYnJpZWZjYXNlXCIpO1xuXHRcdGNvbnN0IHVwY29taW5nID0gZGF0YS5jYXJlZXIuZmlsdGVyKChjKSA9PiBjLmRlYWRsaW5lICYmICFpc0NhcmVlckNsb3NlZChjLnN0YXR1cykpLnNsaWNlKDAsIDgpO1xuXHRcdGlmICghdXBjb21pbmcubGVuZ3RoKSB0aGlzLmVtcHR5KHJvb3QsIFwiTm8gdXBjb21pbmcgY2FyZWVyIG9wcG9ydHVuaXRpZXMuXCIpO1xuXHRcdGZvciAoY29uc3QgYyBvZiB1cGNvbWluZykgdGhpcy5jYXJlZXJSb3cocm9vdCwgYyk7XG5cblx0XHR0aGlzLnNlY3Rpb24ocm9vdCwgXCJSZWFkaW5nIFF1ZXVlXCIsIFwiYm9vay1vcGVuXCIpO1xuXHRcdGNvbnN0IHJlYWRpbmcgPSBkYXRhLnJlYWRpbmdzLmZpbHRlcigocikgPT4gIWlzUmVhZChyLnN0YXR1cykpLnNsaWNlKDAsIDgpO1xuXHRcdGlmICghcmVhZGluZy5sZW5ndGgpIHRoaXMuZW1wdHkocm9vdCwgXCJSZWFkaW5nIHF1ZXVlIGlzIGVtcHR5LlwiKTtcblx0XHRmb3IgKGNvbnN0IHIgb2YgcmVhZGluZykgdGhpcy5yZWFkaW5nUm93KHJvb3QsIHIpO1xuXG5cdFx0dGhpcy5zZWN0aW9uKHJvb3QsIFwiUmVzZWFyY2ggSWRlYXNcIiwgXCJsaWdodGJ1bGJcIik7XG5cdFx0Y29uc3QgaWRlYXMgPSBkYXRhLmlkZWFzLmZpbHRlcigoaSkgPT4gaS5zdGF0dXMudG9Mb3dlckNhc2UoKSAhPT0gXCJhcmNoaXZlZFwiKS5zbGljZSgwLCA4KTtcblx0XHRpZiAoIWlkZWFzLmxlbmd0aCkgdGhpcy5lbXB0eShyb290LCBcIk5vIGFjdGl2ZSByZXNlYXJjaCBpZGVhcy5cIik7XG5cdFx0Zm9yIChjb25zdCBpZGVhIG9mIGlkZWFzKSB0aGlzLmlkZWFSb3cocm9vdCwgaWRlYSk7XG5cblx0XHR0aGlzLnNlY3Rpb24ocm9vdCwgXCJQcm9qZWN0IEhlYWx0aCAmIFRpbWVsaW5lXCIsIFwiYWN0aXZpdHlcIik7XG5cdFx0Zm9yIChjb25zdCBwIG9mIGRhdGEucHJvamVjdHMuZmlsdGVyKChwKSA9PiAhaXNUZXJtaW5hbFByb2plY3QocC5zdGF0dXMpKS5zb3J0KChhLCBiKSA9PiBkYXRlU29ydChhLmRlYWRsaW5lLCBiLmRlYWRsaW5lKSkuc2xpY2UoMCwgMTIpKSB0aGlzLmhlYWx0aFJvdyhyb290LCBwKTtcblxuXHRcdHRoaXMuc2VjdGlvbihyb290LCBcIlJlc2VhcmNoRmxvd1wiLCBcIm5ldHdvcmtcIik7XG5cdFx0Y29uc3QgZ3JhcGggPSByb290LmNyZWF0ZURpdih7IGNsczogXCJyZXNlYXJjaC1mbG93LWluZm9cIiB9KTtcblx0XHRncmFwaC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk1hcmtkb3duLWZpcnN0OiBQcm9qZWN0cyBcdTIxOTQgVGFza3MgXHUyMTk0IERhaWx5IFdvcmsgXHUyMTk0IFJlYWRpbmcgXHUyMTk0IElkZWFzIFx1MjE5NCBDYXJlZXIuXCIgfSk7XG5cdFx0Z3JhcGguY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJUYXNrIGZpbGVzIGFyZSB0aGUgc291cmNlIG9mIHRydXRoIGZvciBjb21wbGV0aW9uOyBwcm9qZWN0IHByb2dyZXNzIGlzIGRlcml2ZWQgZnJvbSB0YXNrcy5cIiB9KTtcblx0fVxuXG5cdGJ1dHRvbihwYXJlbnQ6IEhUTUxFbGVtZW50LCB0ZXh0OiBzdHJpbmcsIGljb246IHN0cmluZywgY2FsbGJhY2s6ICgpID0+IHZvaWQpOiB2b2lkIHtcblx0XHRjb25zdCBiID0gcGFyZW50LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInJlc2VhcmNoLWZsb3ctYWN0aW9uLWJ1dHRvblwiIH0pO1xuXHRcdGNvbnN0IGljb25FbCA9IGIuY3JlYXRlU3Bhbih7IGNsczogXCJyZXNlYXJjaC1mbG93LWFjdGlvbi1pY29uXCIgfSk7XG5cdFx0c2V0SWNvbihpY29uRWwsIGljb24pO1xuXHRcdGIuY3JlYXRlU3Bhbih7IHRleHQgfSk7XG5cdFx0Yi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgY2FsbGJhY2spO1xuXHR9XG5cblx0c2VjdGlvbihyb290OiBIVE1MRWxlbWVudCwgdGl0bGU6IHN0cmluZywgaWNvbjogc3RyaW5nKTogdm9pZCB7XG5cdFx0Y29uc3QgaGVhZGluZyA9IHJvb3QuY3JlYXRlRGl2KHsgY2xzOiBcInJlc2VhcmNoLWZsb3ctc2VjdGlvbi1oZWFkZXJcIiB9KTtcblx0XHRjb25zdCBpY29uRWwgPSBoZWFkaW5nLmNyZWF0ZVNwYW4oeyBjbHM6IFwicmVzZWFyY2gtZmxvdy1zZWN0aW9uLWljb25cIiB9KTtcblx0XHRzZXRJY29uKGljb25FbCwgaWNvbik7XG5cdFx0aGVhZGluZy5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogdGl0bGUsIGNsczogXCJyZXNlYXJjaC1mbG93LXNlY3Rpb24tdGl0bGVcIiB9KTtcblx0fVxuXHRlbXB0eShyb290OiBIVE1MRWxlbWVudCwgdGV4dDogc3RyaW5nKTogdm9pZCB7IHJvb3QuY3JlYXRlRGl2KHsgdGV4dCwgY2xzOiBcInJlc2VhcmNoLWZsb3ctZW1wdHlcIiB9KTsgfVxuXG5cdHN0YXRzKHJvb3Q6IEhUTUxFbGVtZW50LCBkYXRhOiBSZXNlYXJjaEZsb3dEYXRhKTogdm9pZCB7XG5cdFx0Y29uc3QgYm94ID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6IFwicmVzZWFyY2gtZmxvdy1zdGF0c1wiIH0pO1xuXHRcdGNvbnN0IGl0ZW1zOiBBcnJheTxbc3RyaW5nLCBzdHJpbmddPiA9IFtcblx0XHRcdFtcIkFjdGl2ZSBQcm9qZWN0c1wiLCBTdHJpbmcoZGF0YS5wcm9qZWN0cy5maWx0ZXIoKHApID0+ICFpc1Rlcm1pbmFsUHJvamVjdChwLnN0YXR1cykpLmxlbmd0aCldLFxuXHRcdFx0W1wiT3BlbiBUYXNrc1wiLCBTdHJpbmcoZGF0YS50YXNrcy5maWx0ZXIoKHQpID0+ICFpc0RvbmUodC5zdGF0dXMpKS5sZW5ndGgpXSxcblx0XHRcdFtcIlRvZGF5XCIsIFN0cmluZyhkYXRhLnRvZGF5VGFza3MubGVuZ3RoKV0sXG5cdFx0XHRbXCJCbG9ja2VkXCIsIFN0cmluZyhkYXRhLmJsb2NrZXJzLmxlbmd0aCldLFxuXHRcdFx0W1wiQXR0ZW50aW9uXCIsIFN0cmluZyhkYXRhLmF0dGVudGlvbi5sZW5ndGgpXSxcblx0XHRcdFtcIlN0YWxlXCIsIFN0cmluZyhkYXRhLnN0YWxlUHJvamVjdHMubGVuZ3RoKV0sXG5cdFx0XHRbXCJSZWFkaW5nIFF1ZXVlXCIsIFN0cmluZyhkYXRhLnJlYWRpbmdzLmZpbHRlcigocikgPT4gIWlzUmVhZChyLnN0YXR1cykpLmxlbmd0aCldLFxuXHRcdFx0W1wiQ2FyZWVyXCIsIFN0cmluZyhkYXRhLmNhcmVlci5maWx0ZXIoKGMpID0+ICFpc0NhcmVlckNsb3NlZChjLnN0YXR1cykpLmxlbmd0aCldLFxuXHRcdF07XG5cdFx0Zm9yIChjb25zdCBbbGFiZWwsIHZhbHVlXSBvZiBpdGVtcykge1xuXHRcdFx0Y29uc3QgY2FyZCA9IGJveC5jcmVhdGVEaXYoeyBjbHM6IFwicmVzZWFyY2gtZmxvdy1zdGF0XCIgfSk7XG5cdFx0XHRjYXJkLmNyZWF0ZURpdih7IHRleHQ6IHZhbHVlLCBjbHM6IFwicmVzZWFyY2gtZmxvdy1zdGF0LXZhbHVlXCIgfSk7XG5cdFx0XHRjYXJkLmNyZWF0ZURpdih7IHRleHQ6IGxhYmVsLCBjbHM6IFwicmVzZWFyY2gtZmxvdy1zdGF0LWxhYmVsXCIgfSk7XG5cdFx0fVxuXHR9XG5cblx0cHJvamVjdENhcmQocm9vdDogSFRNTEVsZW1lbnQsIHA6IFByb2plY3QpOiB2b2lkIHtcblx0XHRjb25zdCBjYXJkID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6IFwicmVzZWFyY2gtZmxvdy1wcm9qZWN0LWNhcmRcIiB9KTtcblx0XHRjb25zdCB0aXRsZSA9IGNhcmQuY3JlYXRlRWwoXCJhXCIsIHsgdGV4dDogcC5uYW1lIH0pO1xuXHRcdHRpdGxlLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZSkgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IHZvaWQgdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSkub3BlbkZpbGUocC5maWxlKTsgfSk7XG5cdFx0Y2FyZC5jcmVhdGVEaXYoeyB0ZXh0OiBgJHtwLmRvbWFpbiB8fCBcIkdlbmVyYWxcIn0gXHUwMEI3ICR7cC5wcmlvcml0eX0gXHUwMEI3ICR7cC5wcm9ncmVzc30lYCwgY2xzOiBcInJlc2VhcmNoLWZsb3ctcHJvamVjdC1tZXRhXCIgfSk7XG5cdFx0Y29uc3QgYmFyID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwicmVzZWFyY2gtZmxvdy1wcm9ncmVzc1wiIH0pO1xuXHRcdGNvbnN0IGZpbGwgPSBiYXIuY3JlYXRlRGl2KHsgY2xzOiBcInJlc2VhcmNoLWZsb3ctcHJvZ3Jlc3MtZmlsbFwiIH0pO1xuXHRcdGZpbGwuc2V0Q3NzUHJvcHMoeyBcIi0tcmVzZWFyY2gtZmxvdy1wcm9ncmVzc1wiOiBgJHtwLnByb2dyZXNzfSVgIH0pO1xuXHRcdGlmIChwLm5leHRBY3Rpb24pIGNhcmQuY3JlYXRlRGl2KHsgdGV4dDogYE5leHQ6ICR7cC5uZXh0QWN0aW9ufWAsIGNsczogXCJyZXNlYXJjaC1mbG93LW11dGVkXCIgfSk7XG5cdFx0aWYgKHAuZGVhZGxpbmUpIGNhcmQuY3JlYXRlRGl2KHsgdGV4dDogYERlYWRsaW5lOiAke2Zvcm1hdERhdGVGb3JEaXNwbGF5KHAuZGVhZGxpbmUpfWAsIGNsczogXCJyZXNlYXJjaC1mbG93LW11dGVkXCIgfSk7XG5cdFx0Y2FyZC5jcmVhdGVEaXYoeyB0ZXh0OiBgSGVhbHRoOiAke3AuaGVhbHRofS8xMDAke3Auc3RhbGUgPyBcIiBcdTAwQjcgc3RhbGVcIiA6IFwiXCJ9YCwgY2xzOiBwLmhlYWx0aCA8IDUwID8gXCJyZXNlYXJjaC1mbG93LWRhbmdlclwiIDogXCJyZXNlYXJjaC1mbG93LW11dGVkXCIgfSk7XG5cdH1cblxuXHRhbGVydChyb290OiBIVE1MRWxlbWVudCwgcDogUHJvamVjdCwga2luZDogc3RyaW5nKTogdm9pZCB7XG5cdFx0Y29uc3QgYm94ID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6IFwicmVzZWFyY2gtZmxvdy1hbGVydC1zZWN0aW9uXCIgfSk7XG5cdFx0Y29uc3QgYSA9IGJveC5jcmVhdGVFbChcImFcIiwgeyB0ZXh0OiBwLm5hbWUgfSk7XG5cdFx0YS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB2b2lkIHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWFmKHRydWUpLm9wZW5GaWxlKHAuZmlsZSk7IH0pO1xuXHRcdGJveC5jcmVhdGVEaXYoeyB0ZXh0OiBraW5kID09PSBcImJsb2NrZXJcIiA/IHAuYmxvY2tlciB8fCBcIkJsb2NrZWRcIiA6IGtpbmQgPT09IFwic3RhbGVcIiA/IGBObyByZWNlbnQgYWN0aXZpdHkgZm9yICR7U1RBTEVfREFZU30rIGRheXMuYCA6IFwiUHJvamVjdCBmbGFnZ2VkIGZvciBhdHRlbnRpb24uXCIgfSk7XG5cdH1cblxuXHR0YXNrUm93KHJvb3Q6IEhUTUxFbGVtZW50LCB0YXNrOiBUYXNrKTogdm9pZCB7XG5cdFx0Y29uc3Qgcm93ID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6IFwicmVzZWFyY2gtZmxvdy10YXNrLXJvd1wiIH0pO1xuXHRcdGNvbnN0IGNoZWNrYm94ID0gcm93LmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyB0eXBlOiBcImNoZWNrYm94XCIgfSk7XG5cdFx0Y2hlY2tib3guY2hlY2tlZCA9IGZhbHNlO1xuXHRcdGNoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4gdm9pZCB0aGlzLmNvbXBsZXRlVGFzayh0YXNrKSk7XG5cdFx0Y29uc3QgYSA9IHJvdy5jcmVhdGVFbChcImFcIiwgeyB0ZXh0OiB0YXNrLm5hbWUgfSk7XG5cdFx0YS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB2b2lkIHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWFmKHRydWUpLm9wZW5GaWxlKHRhc2suZmlsZSk7IH0pO1xuXHRcdGlmICh0YXNrLnByb2plY3QpIHJvdy5jcmVhdGVTcGFuKHsgdGV4dDogYCBcdTAwQjcgJHt0YXNrLnByb2plY3R9YCwgY2xzOiBcInJlc2VhcmNoLWZsb3ctbXV0ZWRcIiB9KTtcblx0fVxuXG5cdGNhcmVlclJvdyhyb290OiBIVE1MRWxlbWVudCwgYzogQ2FyZWVyT3Bwb3J0dW5pdHkpOiB2b2lkIHtcblx0XHRjb25zdCByb3cgPSByb290LmNyZWF0ZURpdih7IGNsczogXCJyZXNlYXJjaC1mbG93LWxpc3Qtcm93XCIgfSk7XG5cdFx0Y29uc3QgYSA9IHJvdy5jcmVhdGVFbChcImFcIiwgeyB0ZXh0OiBgJHtjLnJvbGV9IFx1MjAxNCAke2MuY29tcGFueX1gIH0pO1xuXHRcdGEuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgdm9pZCB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKS5vcGVuRmlsZShjLmZpbGUpOyB9KTtcblx0XHRyb3cuY3JlYXRlU3Bhbih7IHRleHQ6IGAgXHUwMEI3ICR7Yy5kZWFkbGluZSA/IGZvcm1hdERhdGVGb3JEaXNwbGF5KGMuZGVhZGxpbmUpIDogXCJubyBkZWFkbGluZVwifSBcdTAwQjcgJHtjLnN0YXR1c31gLCBjbHM6IFwicmVzZWFyY2gtZmxvdy1tdXRlZFwiIH0pO1xuXHR9XG5cblx0cmVhZGluZ1Jvdyhyb290OiBIVE1MRWxlbWVudCwgcjogUmVhZGluZ0l0ZW0pOiB2b2lkIHtcblx0XHRjb25zdCByb3cgPSByb290LmNyZWF0ZURpdih7IGNsczogXCJyZXNlYXJjaC1mbG93LWxpc3Qtcm93XCIgfSk7XG5cdFx0Y29uc3QgYSA9IHJvdy5jcmVhdGVFbChcImFcIiwgeyB0ZXh0OiByLm5hbWUgfSk7XG5cdFx0YS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB2b2lkIHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWFmKHRydWUpLm9wZW5GaWxlKHIuZmlsZSk7IH0pO1xuXHRcdHJvdy5jcmVhdGVTcGFuKHsgdGV4dDogYCBcdTAwQjcgJHtyLnN0YXR1c30ke3IucHJvamVjdCA/IGAgXHUwMEI3ICR7ci5wcm9qZWN0fWAgOiBcIlwifWAsIGNsczogXCJyZXNlYXJjaC1mbG93LW11dGVkXCIgfSk7XG5cdH1cblxuXHRpZGVhUm93KHJvb3Q6IEhUTUxFbGVtZW50LCBpOiBSZXNlYXJjaElkZWEpOiB2b2lkIHtcblx0XHRjb25zdCByb3cgPSByb290LmNyZWF0ZURpdih7IGNsczogXCJyZXNlYXJjaC1mbG93LWxpc3Qtcm93XCIgfSk7XG5cdFx0Y29uc3QgYSA9IHJvdy5jcmVhdGVFbChcImFcIiwgeyB0ZXh0OiBpLm5hbWUgfSk7XG5cdFx0YS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB2b2lkIHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWFmKHRydWUpLm9wZW5GaWxlKGkuZmlsZSk7IH0pO1xuXHRcdHJvdy5jcmVhdGVTcGFuKHsgdGV4dDogYCBcdTAwQjcgJHtpLmRvbWFpbiB8fCBcIkdlbmVyYWxcIn0gXHUwMEI3ICR7aS5raW5kfWAsIGNsczogXCJyZXNlYXJjaC1mbG93LW11dGVkXCIgfSk7XG5cdH1cblxuXHRoZWFsdGhSb3cocm9vdDogSFRNTEVsZW1lbnQsIHA6IFByb2plY3QpOiB2b2lkIHtcblx0XHRjb25zdCByb3cgPSByb290LmNyZWF0ZURpdih7IGNsczogXCJyZXNlYXJjaC1mbG93LWxpc3Qtcm93XCIgfSk7XG5cdFx0cm93LmNyZWF0ZVNwYW4oeyB0ZXh0OiBwLm5hbWUgfSk7XG5cdFx0cm93LmNyZWF0ZVNwYW4oeyB0ZXh0OiBgIFx1MDBCNyAke3AucHJvZ3Jlc3N9JSBcdTAwQjcgaGVhbHRoICR7cC5oZWFsdGh9LzEwMCBcdTAwQjcgJHtwLmRlYWRsaW5lID8gZm9ybWF0RGF0ZUZvckRpc3BsYXkocC5kZWFkbGluZSkgOiBcIm5vIGRlYWRsaW5lXCJ9YCwgY2xzOiBcInJlc2VhcmNoLWZsb3ctbXV0ZWRcIiB9KTtcblx0fVxuXG5cdGFzeW5jIGNvbXBsZXRlVGFzayh0YXNrOiBUYXNrKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0Y29uc3Qgb2xkID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZCh0YXNrLmZpbGUpO1xuXHRcdGNvbnN0IG5leHQgPSByZXBsYWNlRnJvbnRtYXR0ZXJWYWx1ZShvbGQsIFwic3RhdHVzXCIsIFwiZG9uZVwiKTtcblx0XHRpZiAobmV4dCA9PT0gb2xkKSByZXR1cm47XG5cdFx0YXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KHRhc2suZmlsZSwgbmV4dCk7XG5cdFx0YXdhaXQgc2xlZXAoMTAwKTtcblx0XHRpZiAodGFzay5wcm9qZWN0KSBhd2FpdCB0aGlzLnBsdWdpbi5zeW5jUHJvamVjdCh0YXNrLnByb2plY3QpO1xuXHRcdGlmICh0YXNrLndvcmtEYXRlKSBhd2FpdCB0aGlzLnBsdWdpbi5zeW5jRGFpbHlOb3RlKHRhc2sud29ya0RhdGUpO1xuXHRcdHRoaXMucGx1Z2luLnNjaGVkdWxlUmVmcmVzaCgpO1xuXHR9XG59XG5cbmNsYXNzIENyZWF0ZVByb2plY3RNb2RhbCBleHRlbmRzIE1vZGFsIHtcblx0b25TdWJtaXQ6IChuYW1lOiBzdHJpbmcsIGRvbWFpbjogc3RyaW5nLCBraW5kOiBzdHJpbmcsIHByaW9yaXR5OiBzdHJpbmcsIGRlYWRsaW5lOiBzdHJpbmcpID0+IFByb21pc2U8dm9pZD47XG5cdGNvbnN0cnVjdG9yKGFwcDogQXBwLCBvblN1Ym1pdDogKG5hbWU6IHN0cmluZywgZG9tYWluOiBzdHJpbmcsIGtpbmQ6IHN0cmluZywgcHJpb3JpdHk6IHN0cmluZywgZGVhZGxpbmU6IHN0cmluZykgPT4gUHJvbWlzZTx2b2lkPikgeyBzdXBlcihhcHApOyB0aGlzLm9uU3VibWl0ID0gb25TdWJtaXQ7IH1cblx0b25PcGVuKCk6IHZvaWQge1xuXHRcdHRoaXMuY29udGVudEVsLmVtcHR5KCk7IG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKS5zZXROYW1lKFwiTmV3IFByb2plY3RcIikuc2V0SGVhZGluZygpO1xuXHRcdGNvbnN0IG5hbWUgPSBpbnB1dEZpZWxkKHRoaXMuY29udGVudEVsLCBcIlByb2plY3QgbmFtZVwiLCBcIkFzdHJvbm9teSBBZ2VudFwiKTtcblx0XHRjb25zdCBkb21haW4gPSBzZWxlY3RGaWVsZCh0aGlzLmNvbnRlbnRFbCwgXCJEb21haW5cIiwgW1wiTUxcIiwgXCJRdWFudHVtXCIsIFwiR2VuZXJhbFwiXSk7XG5cdFx0Y29uc3Qga2luZCA9IHNlbGVjdEZpZWxkKHRoaXMuY29udGVudEVsLCBcIlByb2plY3QgdHlwZVwiLCBbXCJSZXNlYXJjaFwiLCBcIlByb2plY3RcIl0pO1xuXHRcdGNvbnN0IHByaW9yaXR5ID0gc2VsZWN0RmllbGQodGhpcy5jb250ZW50RWwsIFwiUHJpb3JpdHlcIiwgW1wiaGlnaFwiLCBcIm1lZGl1bVwiLCBcImxvd1wiXSk7XG5cdFx0Y29uc3QgZGVhZGxpbmUgPSBpbnB1dEZpZWxkKHRoaXMuY29udGVudEVsLCBcIkRlYWRsaW5lXCIsIFwiXCIsIFwiZGF0ZVwiKTtcblx0XHRtb2RhbEJ1dHRvbnModGhpcywgdGhpcy5jb250ZW50RWwsIGFzeW5jICgpID0+IHsgaWYgKCFuYW1lLnZhbHVlLnRyaW0oKSkgeyBuZXcgTm90aWNlKFwiUHJvamVjdCBuYW1lIGNhbm5vdCBiZSBlbXB0eS5cIik7IHJldHVybjsgfSBhd2FpdCB0aGlzLm9uU3VibWl0KG5hbWUudmFsdWUudHJpbSgpLCBkb21haW4udmFsdWUsIGtpbmQudmFsdWUsIHByaW9yaXR5LnZhbHVlLCBkZWFkbGluZS52YWx1ZSk7IHRoaXMuY2xvc2UoKTsgfSk7XG5cdFx0bmFtZS5mb2N1cygpO1xuXHR9XG5cdG9uQ2xvc2UoKTogdm9pZCB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH1cbn1cblxuY2xhc3MgQ3JlYXRlSWRlYU1vZGFsIGV4dGVuZHMgTW9kYWwge1xuXHRvblN1Ym1pdDogKG5hbWU6IHN0cmluZywgZG9tYWluOiBzdHJpbmcsIGtpbmQ6IHN0cmluZywgcHJpb3JpdHk6IHN0cmluZykgPT4gUHJvbWlzZTx2b2lkPjtcblx0Y29uc3RydWN0b3IoYXBwOiBBcHAsIG9uU3VibWl0OiAobmFtZTogc3RyaW5nLCBkb21haW46IHN0cmluZywga2luZDogc3RyaW5nLCBwcmlvcml0eTogc3RyaW5nKSA9PiBQcm9taXNlPHZvaWQ+KSB7IHN1cGVyKGFwcCk7IHRoaXMub25TdWJtaXQgPSBvblN1Ym1pdDsgfVxuXHRvbk9wZW4oKTogdm9pZCB7XG5cdFx0dGhpcy5jb250ZW50RWwuZW1wdHkoKTsgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpLnNldE5hbWUoXCJOZXcgUmVzZWFyY2ggSWRlYVwiKS5zZXRIZWFkaW5nKCk7XG5cdFx0Y29uc3QgbmFtZSA9IGlucHV0RmllbGQodGhpcy5jb250ZW50RWwsIFwiSWRlYSBuYW1lXCIsIFwiRXhjbHVzaXZlIGF0dGVudGlvbiBleHBlcmltZW50XCIpO1xuXHRcdGNvbnN0IGRvbWFpbiA9IHNlbGVjdEZpZWxkKHRoaXMuY29udGVudEVsLCBcIkRvbWFpblwiLCBbXCJNTFwiLCBcIlF1YW50dW1cIiwgXCJHZW5lcmFsXCJdKTtcblx0XHRjb25zdCBraW5kID0gc2VsZWN0RmllbGQodGhpcy5jb250ZW50RWwsIFwiSWRlYSB0eXBlXCIsIFtcIlJlc2VhcmNoXCIsIFwiUHJvamVjdFwiXSk7XG5cdFx0Y29uc3QgcHJpb3JpdHkgPSBzZWxlY3RGaWVsZCh0aGlzLmNvbnRlbnRFbCwgXCJQcmlvcml0eVwiLCBbXCJoaWdoXCIsIFwibWVkaXVtXCIsIFwibG93XCJdKTtcblx0XHRtb2RhbEJ1dHRvbnModGhpcywgdGhpcy5jb250ZW50RWwsIGFzeW5jICgpID0+IHsgaWYgKCFuYW1lLnZhbHVlLnRyaW0oKSkgeyBuZXcgTm90aWNlKFwiSWRlYSBuYW1lIGNhbm5vdCBiZSBlbXB0eS5cIik7IHJldHVybjsgfSBhd2FpdCB0aGlzLm9uU3VibWl0KG5hbWUudmFsdWUudHJpbSgpLCBkb21haW4udmFsdWUsIGtpbmQudmFsdWUsIHByaW9yaXR5LnZhbHVlKTsgdGhpcy5jbG9zZSgpOyB9KTtcblx0fVxuXHRvbkNsb3NlKCk6IHZvaWQgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9XG59XG5cbmNsYXNzIENyZWF0ZVRhc2tNb2RhbCBleHRlbmRzIE1vZGFsIHtcblx0cHJvamVjdHM6IHN0cmluZ1tdO1xuXHRvblN1Ym1pdDogKG5hbWU6IHN0cmluZywgcHJvamVjdDogc3RyaW5nLCB3b3JrRGF0ZTogc3RyaW5nLCBkdWVEYXRlOiBzdHJpbmcsIHByaW9yaXR5OiBzdHJpbmcpID0+IFByb21pc2U8dm9pZD47XG5cdGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcm9qZWN0czogc3RyaW5nW10sIG9uU3VibWl0OiAobmFtZTogc3RyaW5nLCBwcm9qZWN0OiBzdHJpbmcsIHdvcmtEYXRlOiBzdHJpbmcsIGR1ZURhdGU6IHN0cmluZywgcHJpb3JpdHk6IHN0cmluZykgPT4gUHJvbWlzZTx2b2lkPikgeyBzdXBlcihhcHApOyB0aGlzLnByb2plY3RzID0gcHJvamVjdHM7IHRoaXMub25TdWJtaXQgPSBvblN1Ym1pdDsgfVxuXHRvbk9wZW4oKTogdm9pZCB7XG5cdFx0dGhpcy5jb250ZW50RWwuZW1wdHkoKTsgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpLnNldE5hbWUoXCJOZXcgVGFza1wiKS5zZXRIZWFkaW5nKCk7XG5cdFx0Y29uc3QgbmFtZSA9IGlucHV0RmllbGQodGhpcy5jb250ZW50RWwsIFwiVGFzayBuYW1lXCIsIFwiUnVuIGJhc2VsaW5lIGV4cGVyaW1lbnRcIik7XG5cdFx0Y29uc3QgcHJvamVjdCA9IHNlbGVjdEZpZWxkKHRoaXMuY29udGVudEVsLCBcIlByb2plY3RcIiwgW1wiXCIsIC4uLnRoaXMucHJvamVjdHNdKTtcblx0XHRjb25zdCB3b3JrRGF0ZSA9IGlucHV0RmllbGQodGhpcy5jb250ZW50RWwsIFwiV29yayBkYXRlXCIsIHRvZGF5KCksIFwiZGF0ZVwiKTtcblx0XHRjb25zdCBkdWUgPSBpbnB1dEZpZWxkKHRoaXMuY29udGVudEVsLCBcIkR1ZSBkYXRlXCIsIFwiXCIsIFwiZGF0ZVwiKTtcblx0XHRjb25zdCBwcmlvcml0eSA9IHNlbGVjdEZpZWxkKHRoaXMuY29udGVudEVsLCBcIlByaW9yaXR5XCIsIFtcImhpZ2hcIiwgXCJtZWRpdW1cIiwgXCJsb3dcIl0pO1xuXHRcdG1vZGFsQnV0dG9ucyh0aGlzLCB0aGlzLmNvbnRlbnRFbCwgYXN5bmMgKCkgPT4geyBpZiAoIW5hbWUudmFsdWUudHJpbSgpKSB7IG5ldyBOb3RpY2UoXCJUYXNrIG5hbWUgY2Fubm90IGJlIGVtcHR5LlwiKTsgcmV0dXJuOyB9IGF3YWl0IHRoaXMub25TdWJtaXQobmFtZS52YWx1ZS50cmltKCksIHByb2plY3QudmFsdWUsIHdvcmtEYXRlLnZhbHVlIHx8IHRvZGF5KCksIGR1ZS52YWx1ZSwgcHJpb3JpdHkudmFsdWUpOyB0aGlzLmNsb3NlKCk7IH0pO1xuXHR9XG5cdG9uQ2xvc2UoKTogdm9pZCB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH1cbn1cblxuY2xhc3MgQ3JlYXRlUmVhZGluZ01vZGFsIGV4dGVuZHMgTW9kYWwge1xuXHRwcm9qZWN0czogc3RyaW5nW107IG9uU3VibWl0OiAobmFtZTogc3RyaW5nLCB1cmw6IHN0cmluZywgdHlwZTogc3RyaW5nLCBwcm9qZWN0OiBzdHJpbmcpID0+IFByb21pc2U8dm9pZD47XG5cdGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcm9qZWN0czogc3RyaW5nW10sIG9uU3VibWl0OiAobmFtZTogc3RyaW5nLCB1cmw6IHN0cmluZywgdHlwZTogc3RyaW5nLCBwcm9qZWN0OiBzdHJpbmcpID0+IFByb21pc2U8dm9pZD4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wcm9qZWN0cyA9IHByb2plY3RzOyB0aGlzLm9uU3VibWl0ID0gb25TdWJtaXQ7IH1cblx0b25PcGVuKCk6IHZvaWQge1xuXHRcdHRoaXMuY29udGVudEVsLmVtcHR5KCk7IG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKS5zZXROYW1lKFwiTmV3IFJlYWRpbmdcIikuc2V0SGVhZGluZygpO1xuXHRcdGNvbnN0IG5hbWUgPSBpbnB1dEZpZWxkKHRoaXMuY29udGVudEVsLCBcIlRpdGxlXCIsIFwiUGFwZXIgLyBhcnRpY2xlIHRpdGxlXCIpO1xuXHRcdGNvbnN0IHVybCA9IGlucHV0RmllbGQodGhpcy5jb250ZW50RWwsIFwiVVJMXCIsIFwiaHR0cHM6Ly9cIik7XG5cdFx0Y29uc3QgdHlwZSA9IHNlbGVjdEZpZWxkKHRoaXMuY29udGVudEVsLCBcIlR5cGVcIiwgW1wicGFwZXJcIiwgXCJhcnRpY2xlXCIsIFwiYm9va1wiLCBcImRvY3VtZW50YXRpb25cIiwgXCJ2aWRlb1wiLCBcIm90aGVyXCJdKTtcblx0XHRjb25zdCBwcm9qZWN0ID0gc2VsZWN0RmllbGQodGhpcy5jb250ZW50RWwsIFwiUmVsYXRlZCBwcm9qZWN0XCIsIFtcIlwiLCAuLi50aGlzLnByb2plY3RzXSk7XG5cdFx0bW9kYWxCdXR0b25zKHRoaXMsIHRoaXMuY29udGVudEVsLCBhc3luYyAoKSA9PiB7IGlmICghbmFtZS52YWx1ZS50cmltKCkpIHsgbmV3IE5vdGljZShcIlJlYWRpbmcgdGl0bGUgY2Fubm90IGJlIGVtcHR5LlwiKTsgcmV0dXJuOyB9IGF3YWl0IHRoaXMub25TdWJtaXQobmFtZS52YWx1ZS50cmltKCksIHVybC52YWx1ZSwgdHlwZS52YWx1ZSwgcHJvamVjdC52YWx1ZSk7IHRoaXMuY2xvc2UoKTsgfSk7XG5cdH1cblx0b25DbG9zZSgpOiB2b2lkIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfVxufVxuXG5jbGFzcyBDcmVhdGVDYXJlZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcblx0cHJvamVjdHM6IHN0cmluZ1tdOyBvblN1Ym1pdDogKGNvbXBhbnk6IHN0cmluZywgcm9sZTogc3RyaW5nLCBkZWFkbGluZTogc3RyaW5nLCBtYXRjaDogc3RyaW5nLCBwcm9qZWN0OiBzdHJpbmcpID0+IFByb21pc2U8dm9pZD47XG5cdGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcm9qZWN0czogc3RyaW5nW10sIG9uU3VibWl0OiAoY29tcGFueTogc3RyaW5nLCByb2xlOiBzdHJpbmcsIGRlYWRsaW5lOiBzdHJpbmcsIG1hdGNoOiBzdHJpbmcsIHByb2plY3Q6IHN0cmluZykgPT4gUHJvbWlzZTx2b2lkPikgeyBzdXBlcihhcHApOyB0aGlzLnByb2plY3RzID0gcHJvamVjdHM7IHRoaXMub25TdWJtaXQgPSBvblN1Ym1pdDsgfVxuXHRvbk9wZW4oKTogdm9pZCB7XG5cdFx0dGhpcy5jb250ZW50RWwuZW1wdHkoKTsgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpLnNldE5hbWUoXCJOZXcgQ2FyZWVyIE9wcG9ydHVuaXR5XCIpLnNldEhlYWRpbmcoKTtcblx0XHRjb25zdCBjb21wYW55ID0gaW5wdXRGaWVsZCh0aGlzLmNvbnRlbnRFbCwgXCJDb21wYW55XCIsIFwiQ29tcGFueVwiKTtcblx0XHRjb25zdCByb2xlID0gaW5wdXRGaWVsZCh0aGlzLmNvbnRlbnRFbCwgXCJSb2xlXCIsIFwiTUwgUmVzZWFyY2hlclwiKTtcblx0XHRjb25zdCBkZWFkbGluZSA9IGlucHV0RmllbGQodGhpcy5jb250ZW50RWwsIFwiRGVhZGxpbmVcIiwgXCJcIiwgXCJkYXRlXCIpO1xuXHRcdGNvbnN0IG1hdGNoID0gaW5wdXRGaWVsZCh0aGlzLmNvbnRlbnRFbCwgXCJNYXRjaCAlXCIsIFwiMFwiLCBcIm51bWJlclwiKTtcblx0XHRjb25zdCBwcm9qZWN0ID0gc2VsZWN0RmllbGQodGhpcy5jb250ZW50RWwsIFwiUmVsYXRlZCBwcm9qZWN0XCIsIFtcIlwiLCAuLi50aGlzLnByb2plY3RzXSk7XG5cdFx0bW9kYWxCdXR0b25zKHRoaXMsIHRoaXMuY29udGVudEVsLCBhc3luYyAoKSA9PiB7IGlmICghY29tcGFueS52YWx1ZS50cmltKCkgfHwgIXJvbGUudmFsdWUudHJpbSgpKSB7IG5ldyBOb3RpY2UoXCJDb21wYW55IGFuZCByb2xlIGFyZSByZXF1aXJlZC5cIik7IHJldHVybjsgfSBhd2FpdCB0aGlzLm9uU3VibWl0KGNvbXBhbnkudmFsdWUudHJpbSgpLCByb2xlLnZhbHVlLnRyaW0oKSwgZGVhZGxpbmUudmFsdWUsIG1hdGNoLnZhbHVlIHx8IFwiMFwiLCBwcm9qZWN0LnZhbHVlKTsgdGhpcy5jbG9zZSgpOyB9KTtcblx0fVxuXHRvbkNsb3NlKCk6IHZvaWQgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9XG59XG5cbmNsYXNzIFJlc2VhcmNoRmxvd1NldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcblx0cGx1Z2luOiBSZXNlYXJjaEZsb3dQbHVnaW47XG5cblx0Y29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogUmVzZWFyY2hGbG93UGx1Z2luKSB7XG5cdFx0c3VwZXIoYXBwLCBwbHVnaW4pO1xuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xuXHR9XG5cblx0Z2V0U2V0dGluZ0RlZmluaXRpb25zKCk6IFNldHRpbmdEZWZpbml0aW9uSXRlbTxzdHJpbmc+W10ge1xuXHRcdHJldHVybiBbXG5cdFx0XHR7XG5cdFx0XHRcdG5hbWU6IFwiUHJvamVjdHMgZm9sZGVyXCIsXG5cdFx0XHRcdGRlc2M6IFwiRm9sZGVyIHVzZWQgZm9yIHByb2plY3QgcGFnZXMuXCIsXG5cdFx0XHRcdGNvbnRyb2w6IHtcblx0XHRcdFx0XHR0eXBlOiBcInRleHRcIixcblx0XHRcdFx0XHRrZXk6IFwicHJvamVjdHNGb2xkZXJcIixcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdG5hbWU6IFwiSWRlYXMgZm9sZGVyXCIsXG5cdFx0XHRcdGRlc2M6IFwiRm9sZGVyIHVzZWQgZm9yIHJlc2VhcmNoIGlkZWFzLlwiLFxuXHRcdFx0XHRjb250cm9sOiB7XG5cdFx0XHRcdFx0dHlwZTogXCJ0ZXh0XCIsXG5cdFx0XHRcdFx0a2V5OiBcImlkZWFzRm9sZGVyXCIsXG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRuYW1lOiBcIlRhc2tzIGZvbGRlclwiLFxuXHRcdFx0XHRkZXNjOiBcIkZvbGRlciB1c2VkIGZvciBkZXRhaWxlZCB0YXNrIHBhZ2VzLlwiLFxuXHRcdFx0XHRjb250cm9sOiB7XG5cdFx0XHRcdFx0dHlwZTogXCJ0ZXh0XCIsXG5cdFx0XHRcdFx0a2V5OiBcInRhc2tzRm9sZGVyXCIsXG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRuYW1lOiBcIkNhcmVlciBmb2xkZXJcIixcblx0XHRcdFx0ZGVzYzogXCJGb2xkZXIgdXNlZCBmb3IgY2FyZWVyIG9wcG9ydHVuaXRpZXMuXCIsXG5cdFx0XHRcdGNvbnRyb2w6IHtcblx0XHRcdFx0XHR0eXBlOiBcInRleHRcIixcblx0XHRcdFx0XHRrZXk6IFwiY2FyZWVyRm9sZGVyXCIsXG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRuYW1lOiBcIlJlYWRpbmcgZm9sZGVyXCIsXG5cdFx0XHRcdGRlc2M6IFwiRm9sZGVyIHVzZWQgZm9yIHJlYWRpbmcgaXRlbXMuXCIsXG5cdFx0XHRcdGNvbnRyb2w6IHtcblx0XHRcdFx0XHR0eXBlOiBcInRleHRcIixcblx0XHRcdFx0XHRrZXk6IFwicmVhZGluZ0ZvbGRlclwiLFxuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0bmFtZTogXCJEYWlseSBmb2xkZXJcIixcblx0XHRcdFx0ZGVzYzogXCJGb2xkZXIgdXNlZCBmb3IgZGFpbHkgd29yayBub3Rlcy5cIixcblx0XHRcdFx0Y29udHJvbDoge1xuXHRcdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxuXHRcdFx0XHRcdGtleTogXCJkYWlseUZvbGRlclwiLFxuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRdO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGlucHV0RmllbGQocGFyZW50OiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgcGxhY2Vob2xkZXI6IHN0cmluZywgdHlwZSA9IFwidGV4dFwiKTogSFRNTElucHV0RWxlbWVudCB7XG5cdGNvbnN0IGZpZWxkID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJyZXNlYXJjaC1mbG93LWZvcm0tZmllbGRcIiB9KTtcblx0ZmllbGQuY3JlYXRlRWwoXCJsYWJlbFwiLCB7IHRleHQ6IGxhYmVsLCBjbHM6IFwicmVzZWFyY2gtZmxvdy1mb3JtLWxhYmVsXCIgfSk7XG5cdHJldHVybiBmaWVsZC5jcmVhdGVFbChcImlucHV0XCIsIHtcblx0XHR0eXBlLFxuXHRcdHBsYWNlaG9sZGVyLFxuXHRcdGNsczogXCJyZXNlYXJjaC1mbG93LWZvcm0tY29udHJvbFwiLFxuXHR9KTtcbn1cblxuZnVuY3Rpb24gc2VsZWN0RmllbGQocGFyZW50OiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgdmFsdWVzOiBzdHJpbmdbXSk6IEhUTUxTZWxlY3RFbGVtZW50IHtcblx0Y29uc3QgZmllbGQgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInJlc2VhcmNoLWZsb3ctZm9ybS1maWVsZFwiIH0pO1xuXHRmaWVsZC5jcmVhdGVFbChcImxhYmVsXCIsIHsgdGV4dDogbGFiZWwsIGNsczogXCJyZXNlYXJjaC1mbG93LWZvcm0tbGFiZWxcIiB9KTtcblx0Y29uc3Qgc2VsZWN0ID0gZmllbGQuY3JlYXRlRWwoXCJzZWxlY3RcIiwgeyBjbHM6IFwicmVzZWFyY2gtZmxvdy1mb3JtLWNvbnRyb2xcIiB9KTtcblx0Zm9yIChjb25zdCB2YWx1ZSBvZiB2YWx1ZXMpIHtcblx0XHRzZWxlY3QuY3JlYXRlRWwoXCJvcHRpb25cIiwgeyB2YWx1ZSwgdGV4dDogdmFsdWUgfHwgXCJOb25lXCIgfSk7XG5cdH1cblx0cmV0dXJuIHNlbGVjdDtcbn1cblxuZnVuY3Rpb24gbW9kYWxCdXR0b25zKG1vZGFsOiBNb2RhbCwgcGFyZW50OiBIVE1MRWxlbWVudCwgc3VibWl0OiAoKSA9PiBQcm9taXNlPHZvaWQ+KTogdm9pZCB7XG5cdGNvbnN0IHJvdyA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwicmVzZWFyY2gtZmxvdy1tb2RhbC1idXR0b25zXCIgfSk7XG5cdHJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ2FuY2VsXCIgfSkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IG1vZGFsLmNsb3NlKCkpO1xuXHRyb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNyZWF0ZVwiLCBjbHM6IFwibW9kLWN0YVwiIH0pLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB2b2lkIHN1Ym1pdCgpKTtcbn1cblxuZnVuY3Rpb24gZnJvbnRtYXR0ZXJTdHJpbmcodmFsdWU6IHVua25vd24pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuXHRpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0Y29uc3QgdGV4dCA9IFN0cmluZyh2YWx1ZSkudHJpbSgpO1xuXHRyZXR1cm4gdGV4dCAmJiB0ZXh0ICE9PSBcIm51bGxcIiA/IHRleHQgOiB1bmRlZmluZWQ7XG59XG5mdW5jdGlvbiBudW1iZXJWYWx1ZSh2YWx1ZTogdW5rbm93biwgZmFsbGJhY2s6IG51bWJlcik6IG51bWJlciB7IGNvbnN0IG4gPSBOdW1iZXIodmFsdWUpOyByZXR1cm4gTnVtYmVyLmlzRmluaXRlKG4pID8gbiA6IGZhbGxiYWNrOyB9XG5mdW5jdGlvbiBib29sZWFuVmFsdWUodmFsdWU6IHVua25vd24pOiBib29sZWFuIHsgcmV0dXJuIHZhbHVlID09PSB0cnVlIHx8IFN0cmluZyh2YWx1ZSkudG9Mb3dlckNhc2UoKSA9PT0gXCJ0cnVlXCI7IH1cbmZ1bmN0aW9uIG5vcm1hbGl6ZVByb2plY3ROYW1lKHZhbHVlPzogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHsgaWYgKCF2YWx1ZSkgcmV0dXJuIHVuZGVmaW5lZDsgcmV0dXJuIHZhbHVlLnJlcGxhY2UoL15cXFtcXFsvLCBcIlwiKS5yZXBsYWNlKC9cXF1cXF0kLywgXCJcIikudHJpbSgpOyB9XG5mdW5jdGlvbiBpc0RvbmUoc3RhdHVzPzogc3RyaW5nKTogYm9vbGVhbiB7IGNvbnN0IHMgPSAoc3RhdHVzID8/IFwiXCIpLnRvTG93ZXJDYXNlKCk7IHJldHVybiBzID09PSBcImRvbmVcIiB8fCBzID09PSBcImNvbXBsZXRlZFwiOyB9XG5mdW5jdGlvbiBpc1Rlcm1pbmFsUHJvamVjdChzdGF0dXM/OiBzdHJpbmcpOiBib29sZWFuIHsgY29uc3QgcyA9IChzdGF0dXMgPz8gXCJcIikudG9Mb3dlckNhc2UoKTsgcmV0dXJuIHMgPT09IFwiY29tcGxldGVkXCIgfHwgcyA9PT0gXCJhcmNoaXZlZFwiIHx8IHMgPT09IFwiY2FuY2VsbGVkXCI7IH1cbmZ1bmN0aW9uIGlzUmVhZChzdGF0dXM6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gW1wicmVhZFwiLCBcImNvbXBsZXRlZFwiLCBcImRvbmVcIl0uaW5jbHVkZXMoc3RhdHVzLnRvTG93ZXJDYXNlKCkpOyB9XG5mdW5jdGlvbiBpc0NhcmVlckNsb3NlZChzdGF0dXM6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gW1wicmVqZWN0ZWRcIiwgXCJ3aXRoZHJhd25cIiwgXCJjbG9zZWRcIiwgXCJhY2NlcHRlZFwiLCBcImFyY2hpdmVkXCJdLmluY2x1ZGVzKHN0YXR1cy50b0xvd2VyQ2FzZSgpKTsgfVxuZnVuY3Rpb24gcHJpb3JpdHlSYW5rKHByaW9yaXR5OiBzdHJpbmcpOiBudW1iZXIgeyByZXR1cm4gcHJpb3JpdHkudG9Mb3dlckNhc2UoKSA9PT0gXCJoaWdoXCIgPyAwIDogcHJpb3JpdHkudG9Mb3dlckNhc2UoKSA9PT0gXCJtZWRpdW1cIiA/IDEgOiAyOyB9XG5mdW5jdGlvbiBkYXRlU29ydChhPzogc3RyaW5nLCBiPzogc3RyaW5nKTogbnVtYmVyIHsgaWYgKCFhICYmICFiKSByZXR1cm4gMDsgaWYgKCFhKSByZXR1cm4gMTsgaWYgKCFiKSByZXR1cm4gLTE7IHJldHVybiBhLmxvY2FsZUNvbXBhcmUoYik7IH1cbmZ1bmN0aW9uIGRheXNVbnRpbChkYXRlOiBzdHJpbmcpOiBudW1iZXIgeyBjb25zdCBkID0gcGFyc2VEYXRlKGRhdGUpOyBpZiAoIWQpIHJldHVybiA5OTk5OTsgcmV0dXJuIE1hdGguY2VpbCgoZC5nZXRUaW1lKCkgLSBuZXcgRGF0ZSh0b2RheSgpKS5nZXRUaW1lKCkpIC8gODY0MDAwMDApOyB9XG5mdW5jdGlvbiBwYXJzZURhdGUodmFsdWU6IHN0cmluZyk6IERhdGUgfCBudWxsIHsgY29uc3QgbSA9IC9eKFxcZHs0fSktKFxcZHsyfSktKFxcZHsyfSkkLy5leGVjKHZhbHVlKTsgaWYgKCFtKSByZXR1cm4gbnVsbDsgcmV0dXJuIG5ldyBEYXRlKE51bWJlcihtWzFdKSwgTnVtYmVyKG1bMl0pIC0gMSwgTnVtYmVyKG1bM10pKTsgfVxuZnVuY3Rpb24gZm9ybWF0RGF0ZUtleShkYXRlOiBEYXRlKTogc3RyaW5nIHsgcmV0dXJuIGAke2RhdGUuZ2V0RnVsbFllYXIoKX0tJHtTdHJpbmcoZGF0ZS5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgXCIwXCIpfS0ke1N0cmluZyhkYXRlLmdldERhdGUoKSkucGFkU3RhcnQoMiwgXCIwXCIpfWA7IH1cbmZ1bmN0aW9uIHRvZGF5KCk6IHN0cmluZyB7IHJldHVybiBmb3JtYXREYXRlS2V5KG5ldyBEYXRlKCkpOyB9XG5mdW5jdGlvbiBmb3JtYXREYXRlRm9yRGlzcGxheShkYXRlOiBzdHJpbmcpOiBzdHJpbmcgeyBjb25zdCBwYXJzZWQgPSBwYXJzZURhdGUoZGF0ZSk7IGlmICghcGFyc2VkKSByZXR1cm4gZGF0ZTsgcmV0dXJuIHBhcnNlZC50b0xvY2FsZURhdGVTdHJpbmcodW5kZWZpbmVkLCB7IGRheTogXCJudW1lcmljXCIsIG1vbnRoOiBcInNob3J0XCIsIHllYXI6IFwibnVtZXJpY1wiIH0pOyB9XG5mdW5jdGlvbiBzYW5pdGl6ZUZpbGVOYW1lKG5hbWU6IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiBuYW1lLnRyaW0oKS5yZXBsYWNlKC9bXFxcXC86Kj9cIjw+fCNeXS9nLCBcIi1cIikucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikucmVwbGFjZSgvLSsvZywgXCItXCIpLnRyaW0oKTsgfVxuZnVuY3Rpb24geWFtbFZhbHVlKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcgeyByZXR1cm4gdmFsdWUgPyBgXCIke3ZhbHVlLnJlcGxhY2UoL1wiL2csIFwiXFxcXFxcXCJcIil9XCJgIDogXCJcIjsgfVxuYXN5bmMgZnVuY3Rpb24gc2xlZXAobXM6IG51bWJlcik6IFByb21pc2U8dm9pZD4geyBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gd2luZG93LnNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTsgfVxuZnVuY3Rpb24gcmVwbGFjZUZyb250bWF0dGVyVmFsdWUoY29udGVudDogc3RyaW5nLCBrZXk6IHN0cmluZywgdmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG5cdGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChgKF4ke2VzY2FwZVJlZ0V4cChrZXkpfTpcXFxccyopKC4qKSRgLCBcIm1cIik7XG5cdGlmIChyZWdleC50ZXN0KGNvbnRlbnQpKSByZXR1cm4gY29udGVudC5yZXBsYWNlKHJlZ2V4LCBgJDEke3ZhbHVlfWApO1xuXHRpZiAoIWNvbnRlbnQuc3RhcnRzV2l0aChcIi0tLVwiKSkgcmV0dXJuIGNvbnRlbnQ7XG5cdGNvbnN0IGNsb3NlID0gY29udGVudC5pbmRleE9mKFwiLS0tXCIsIDMpOyBpZiAoY2xvc2UgPCAwKSByZXR1cm4gY29udGVudDtcblx0cmV0dXJuIGNvbnRlbnQuc2xpY2UoMCwgY2xvc2UpICsgYCR7a2V5fTogJHt2YWx1ZX1cXG5gICsgY29udGVudC5zbGljZShjbG9zZSk7XG59XG5mdW5jdGlvbiBlc2NhcGVSZWdFeHAodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiB2YWx1ZS5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7IH1cbmZ1bmN0aW9uIHJlcGxhY2VCZXR3ZWVuTWFya2Vyc1RleHQoY29udGVudDogc3RyaW5nLCBzdGFydE1hcmtlcjogc3RyaW5nLCBlbmRNYXJrZXI6IHN0cmluZywgcmVwbGFjZW1lbnQ6IHN0cmluZyk6IHN0cmluZyB7XG5cdGNvbnN0IHN0YXJ0ID0gY29udGVudC5pbmRleE9mKHN0YXJ0TWFya2VyKTsgY29uc3QgZW5kID0gY29udGVudC5pbmRleE9mKGVuZE1hcmtlcik7XG5cdGlmIChzdGFydCA8IDAgfHwgZW5kIDwgc3RhcnQpIHJldHVybiBjb250ZW50O1xuXHRyZXR1cm4gY29udGVudC5zbGljZSgwLCBzdGFydCArIHN0YXJ0TWFya2VyLmxlbmd0aCkgKyBgXFxuJHtyZXBsYWNlbWVudH1cXG5gICsgY29udGVudC5zbGljZShlbmQpO1xufVxuYXN5bmMgZnVuY3Rpb24gcmVwbGFjZUJldHdlZW5NYXJrZXJzKGZpbGU6IFRGaWxlLCBzdGFydE1hcmtlcjogc3RyaW5nLCBlbmRNYXJrZXI6IHN0cmluZywgcmVwbGFjZW1lbnQ6IHN0cmluZywgYXBwOiBBcHApOiBQcm9taXNlPHZvaWQ+IHtcblx0Y29uc3Qgb2xkID0gYXdhaXQgYXBwLnZhdWx0LnJlYWQoZmlsZSk7IGNvbnN0IG5leHQgPSByZXBsYWNlQmV0d2Vlbk1hcmtlcnNUZXh0KG9sZCwgc3RhcnRNYXJrZXIsIGVuZE1hcmtlciwgcmVwbGFjZW1lbnQpO1xuXHRpZiAobmV4dCAhPT0gb2xkKSBhd2FpdCBhcHAudmF1bHQubW9kaWZ5KGZpbGUsIG5leHQpO1xufVxuZnVuY3Rpb24gcGFyc2VDU1YodGV4dDogc3RyaW5nKTogc3RyaW5nW11bXSB7XG5cdGNvbnN0IHJvd3M6IHN0cmluZ1tdW10gPSBbXTsgbGV0IHJvdzogc3RyaW5nW10gPSBbXTsgbGV0IGZpZWxkID0gXCJcIjsgbGV0IHF1b3RlZCA9IGZhbHNlO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IHRleHQubGVuZ3RoOyBpKyspIHtcblx0XHRjb25zdCBjID0gdGV4dFtpXTtcblx0XHRpZiAoYyA9PT0gJ1wiJykgeyBpZiAocXVvdGVkICYmIHRleHRbaSArIDFdID09PSAnXCInKSB7IGZpZWxkICs9ICdcIic7IGkrKzsgfSBlbHNlIHF1b3RlZCA9ICFxdW90ZWQ7IH1cblx0XHRlbHNlIGlmIChjID09PSBcIixcIiAmJiAhcXVvdGVkKSB7IHJvdy5wdXNoKGZpZWxkKTsgZmllbGQgPSBcIlwiOyB9XG5cdFx0ZWxzZSBpZiAoKGMgPT09IFwiXFxuXCIgfHwgYyA9PT0gXCJcXHJcIikgJiYgIXF1b3RlZCkgeyBpZiAoYyA9PT0gXCJcXHJcIiAmJiB0ZXh0W2kgKyAxXSA9PT0gXCJcXG5cIikgaSsrOyByb3cucHVzaChmaWVsZCk7IGZpZWxkID0gXCJcIjsgaWYgKHJvdy5zb21lKCh2KSA9PiB2LnRyaW0oKSkpIHJvd3MucHVzaChyb3cpOyByb3cgPSBbXTsgfVxuXHRcdGVsc2UgZmllbGQgKz0gYztcblx0fVxuXHRpZiAoZmllbGQgfHwgcm93Lmxlbmd0aCkgeyByb3cucHVzaChmaWVsZCk7IGlmIChyb3cuc29tZSgodikgPT4gdi50cmltKCkpKSByb3dzLnB1c2gocm93KTsgfVxuXHRyZXR1cm4gcm93cztcbn1cbmZ1bmN0aW9uIGV4dHJhY3REYWlseVN1bW1hcnkoY29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcblx0Y29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KFwiXFxuXCIpO1xuXHRjb25zdCBrZWVwOiBzdHJpbmdbXSA9IFtdOyBsZXQgaW5UYXNrcyA9IGZhbHNlO1xuXHRmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcblx0XHRpZiAobGluZS5pbmNsdWRlcyhcIlJFU0VBUkNIRkxPVzpUQVNLUzpTVEFSVFwiKSkgeyBpblRhc2tzID0gdHJ1ZTsgY29udGludWU7IH1cblx0XHRpZiAobGluZS5pbmNsdWRlcyhcIlJFU0VBUkNIRkxPVzpUQVNLUzpFTkRcIikpIHsgaW5UYXNrcyA9IGZhbHNlOyBjb250aW51ZTsgfVxuXHRcdGlmIChpblRhc2tzKSBjb250aW51ZTtcblx0XHRpZiAoL14jIyAoV29yayBMb2d8RGVjaXNpb25zfEJsb2NrZXJzfElkZWFzfENhcmVlcnxSZWFkaW5nKS8udGVzdChsaW5lKSB8fCAvXi0gLy50ZXN0KGxpbmUpKSBrZWVwLnB1c2gobGluZSk7XG5cdH1cblx0cmV0dXJuIGtlZXAuc2xpY2UoMCwgNDApLmpvaW4oXCJcXG5cIik7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHNCQWFPO0FBSVAsSUFBTSwwQkFBMEI7QUFDaEMsSUFBTSxhQUFhO0FBQ25CLElBQU0sYUFBYTtBQVduQixJQUFNLG1CQUF5QztBQUFBLEVBQzlDLGdCQUFnQjtBQUFBLEVBQ2hCLGFBQWE7QUFBQSxFQUNiLGFBQWE7QUFBQSxFQUNiLGNBQWM7QUFBQSxFQUNkLGVBQWU7QUFBQSxFQUNmLGFBQWE7QUFDZDtBQTJFQSxJQUFxQixxQkFBckIsY0FBZ0QsdUJBQU87QUFBQSxFQUF2RDtBQUFBO0FBRUMsU0FBUSxVQUFVO0FBQ2xCLFNBQVEsZUFBOEI7QUFBQTtBQUFBLEVBRXRDLE1BQU0sU0FBd0I7QUFDN0IsVUFBTSxLQUFLLGFBQWE7QUFDeEIsU0FBSyxhQUFhLHlCQUF5QixDQUFDLFNBQVMsSUFBSSxxQkFBcUIsTUFBTSxJQUFJLENBQUM7QUFFekYsU0FBSyxjQUFjLG9CQUFvQixxQkFBcUIsTUFBTSxLQUFLLEtBQUssYUFBYSxDQUFDO0FBQzFGLFNBQUssV0FBVyxFQUFFLElBQUksYUFBYSxNQUFN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SyxhQUFhLFdBQVcsV0FBVztBQUN2SCxNQUFJLFNBQVMsSUFBSyxPQUFNLElBQUksTUFBTSxPQUFPLE1BQU0sSUFBSTtBQUNwRDtBQUNBLFNBQVMsU0FBUyxNQUEwQjtBQUMzQyxRQUFNLE9BQW1CLENBQUM7QUFBRyxNQUFJLE1BQWdCLENBQUM7QUFBRyxNQUFJLFFBQVE7QUFBSSxNQUFJLFNBQVM7QUFDbEYsV0FBUyxJQUFJLEdBQUcsSUFBSSxLQUFLLFFBQVEsS0FBSztBQUNyQyxVQUFNLElBQUksS0FBSyxDQUFDO0FBQ2hCLFFBQUksTUFBTSxLQUFLO0FBQUUsVUFBSSxVQUFVLEtBQUssSUFBSSxDQUFDLE1BQU0sS0FBSztBQUFFLGlCQUFTO0FBQUs7QUFBQSxNQUFLLE1BQU8sVUFBUyxDQUFDO0FBQUEsSUFBUSxXQUN6RixNQUFNLE9BQU8sQ0FBQyxRQUFRO0FBQUUsVUFBSSxLQUFLLEtBQUs7QUFBRyxjQUFRO0FBQUEsSUFBSSxZQUNwRCxNQUFNLFFBQVEsTUFBTSxTQUFTLENBQUMsUUFBUTtBQUFFLFVBQUksTUFBTSxRQUFRLEtBQUssSUFBSSxDQUFDLE1BQU0sS0FBTTtBQUFLLFVBQUksS0FBSyxLQUFLO0FBQUcsY0FBUTtBQUFJLFVBQUksSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFHLE1BQUssS0FBSyxHQUFHO0FBQUcsWUFBTSxDQUFDO0FBQUEsSUFBRyxNQUNoTCxVQUFTO0FBQUEsRUFDZjtBQUNBLE1BQUksU0FBUyxJQUFJLFFBQVE7QUFBRSxRQUFJLEtBQUssS0FBSztBQUFHLFFBQUksSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFHLE1BQUssS0FBSyxHQUFHO0FBQUEsRUFBRztBQUMzRixTQUFPO0FBQ1I7QUFDQSxTQUFTLG9CQUFvQixTQUF5QjtBQUNyRCxRQUFNLFFBQVEsUUFBUSxNQUFNLElBQUk7QUFDaEMsUUFBTSxPQUFpQixDQUFDO0FBQUcsTUFBSSxVQUFVO0FBQ3pDLGFBQVcsUUFBUSxPQUFPO0FBQ3pCLFFBQUksS0FBSyxTQUFTLDBCQUEwQixHQUFHO0FBQUUsZ0JBQVU7QUFBTTtBQUFBLElBQVU7QUFDM0UsUUFBSSxLQUFLLFNBQVMsd0JBQXdCLEdBQUc7QUFBRSxnQkFBVTtBQUFPO0FBQUEsSUFBVTtBQUMxRSxRQUFJLFFBQVM7QUFDYixRQUFJLHlEQUF5RCxLQUFLLElBQUksS0FBSyxNQUFNLEtBQUssSUFBSSxFQUFHLE1BQUssS0FBSyxJQUFJO0FBQUEsRUFDNUc7QUFDQSxTQUFPLEtBQUssTUFBTSxHQUFHLEVBQUUsRUFBRSxLQUFLLElBQUk7QUFDbkM7IiwKICAibmFtZXMiOiBbInAiXQp9Cg==
