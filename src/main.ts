import {
	App,
	ItemView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	WorkspaceLeaf,
	normalizePath,
} from "obsidian";

const VIEW_TYPE_RESEARCH_FLOW = "research-flow-home";
const RF_VERSION = "1.0.0-alpha";
const STALE_DAYS = 14;

interface ResearchFlowSettings {
	projectsFolder: string;
	ideasFolder: string;
	tasksFolder: string;
	careerFolder: string;
	readingFolder: string;
	dailyFolder: string;
}

const DEFAULT_SETTINGS: ResearchFlowSettings = {
	projectsFolder: "02_Projects",
	ideasFolder: "03_Ideas",
	tasksFolder: "04_Tasks",
	careerFolder: "05_Career",
	readingFolder: "06_Reading",
	dailyFolder: "07_Daily",
};

interface Project {
	file: TFile;
	name: string;
	domain: string;
	status: string;
	priority: string;
	progress: number;
	blocker?: string;
	attention: boolean;
	deadline?: string;
	start?: string;
	nextAction?: string;
	lastActivity: number;
	stale: boolean;
	health: number;
}

interface Task {
	file: TFile;
	name: string;
	status: string;
	priority: string;
	project?: string;
	workDate?: string;
	due?: string;
}

interface ReadingItem {
	file: TFile;
	name: string;
	url?: string;
	type: string;
	status: string;
	added?: string;
	read?: string;
	project?: string;
}

interface CareerOpportunity {
	file: TFile;
	company: string;
	role: string;
	deadline?: string;
	match?: number;
	status: string;
	applied?: string;
	feedback?: string;
	documents?: string;
	project?: string;
}

interface ResearchIdea {
	file: TFile;
	name: string;
	domain: string;
	kind: string;
	status: string;
	priority: string;
	project?: string;
}

interface ResearchFlowData {
	projects: Project[];
	tasks: Task[];
	todayTasks: Task[];
	blockers: Project[];
	attention: Project[];
	staleProjects: Project[];
	readings: ReadingItem[];
	career: CareerOpportunity[];
	ideas: ResearchIdea[];
}

export default class ResearchFlowPlugin extends Plugin {
	settings!: ResearchFlowSettings;
	private syncing = false;
	private refreshTimer: number | null = null;

	async onload(): Promise<void> {
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
			if (file instanceof TFile) void this.handleFileChange(file);
		}));
		this.registerEvent(this.app.vault.on("modify", (file) => {
			if (file instanceof TFile) void this.handleFileChange(file);
		}));
		this.registerEvent(this.app.vault.on("create", (file) => {
			if (file instanceof TFile) void this.handleFileChange(file);
		}));
		this.registerEvent(this.app.vault.on("delete", () => this.scheduleRefresh()));
		this.registerEvent(this.app.vault.on("rename", () => this.scheduleRefresh()));
		this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.scheduleRefresh()));

		console.log(`ResearchFlow ${RF_VERSION} loaded`);
	}

	onunload(): void {
		if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async ensureFolders(): Promise<void> {
		for (const folder of [
			this.settings.projectsFolder,
			this.settings.ideasFolder,
			this.settings.tasksFolder,
			this.settings.careerFolder,
			this.settings.readingFolder,
			this.settings.dailyFolder,
		]) {
			const normalized = normalizePath(folder);
			if (!this.app.vault.getAbstractFileByPath(normalized)) await this.app.vault.createFolder(normalized);
		}
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const existing = workspace.getLeavesOfType(VIEW_TYPE_RESEARCH_FLOW);
		if (existing.length > 0) leaf = existing[0];
		else leaf = workspace.getLeaf(true);
		if (!leaf) return;
		await leaf.setViewState({ type: VIEW_TYPE_RESEARCH_FLOW, active: true });
		workspace.revealLeaf(leaf);
	}

	scheduleRefresh(): void {
		if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = null;
			void this.refreshHomeViews();
		}, 150);
	}

	async refreshHomeViews(): Promise<void> {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_RESEARCH_FLOW)) {
			if (leaf.view instanceof ResearchFlowHomeView) await leaf.view.render();
		}
	}

	async handleFileChange(file: TFile): Promise<void> {
		if (this.syncing) {
			this.scheduleRefresh();
			return;
		}
		const cache = this.app.metadataCache.getFileCache(file);
		const type = String(cache?.frontmatter?.type ?? "");
		const isDaily = this.isInFolder(file, this.settings.dailyFolder);
		if (isDaily) {
			await this.syncTaskStatusesFromDailyNote(file);
		} else if (type === "task") {
			const project = frontmatterString(cache?.frontmatter?.project);
			if (project) {
				await this.syncProject(project);
			}
		}
		this.scheduleRefresh();
	}

	isInFolder(file: TFile, folder: string): boolean {
		const prefix = normalizePath(folder).replace(/\/$/, "") + "/";
		return file.path.startsWith(prefix);
	}

	async getData(): Promise<ResearchFlowData> {
		const files = this.app.vault.getMarkdownFiles();
		const projects: Project[] = [];
		const tasks: Task[] = [];
		const readings: ReadingItem[] = [];
		const career: CareerOpportunity[] = [];
		const ideas: ResearchIdea[] = [];

		for (const file of files) {
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
			if (!fm) continue;
			const type = String(fm.type ?? "");
			if (type === "project") {
				const progress = numberValue(fm.progress, 0);
				const blocker = frontmatterString(fm.blocker);
				const attention = booleanValue(fm.attention);
				const lastActivity = this.projectLastActivity(file, files, fm);
				const stale = this.projectIsStale(fm.status, lastActivity);
				projects.push({
					file,
					name: file.basename,
					domain: frontmatterString(fm.domain) ?? "",
					status: frontmatterString(fm.status) ?? "active",
					priority: frontmatterString(fm.priority) ?? "medium",
					progress: Math.max(0, Math.min(100, progress)),
					blocker,
					attention,
					deadline: frontmatterString(fm.deadline),
					start: frontmatterString(fm.start),
					nextAction: frontmatterString(fm.next_action),
					lastActivity,
					stale,
					health: this.calculateProjectHealth(fm, stale, lastActivity, progress),
				});
			} else if (type === "task") {
				tasks.push({
					file,
					name: file.basename,
					status: frontmatterString(fm.status) ?? "todo",
					priority: frontmatterString(fm.priority) ?? "medium",
					project: normalizeProjectName(frontmatterString(fm.project)),
					workDate: frontmatterString(fm.work_date),
					due: frontmatterString(fm.due),
				});
			} else if (type === "reading") {
				readings.push({
					file,
					name: file.basename,
					url: frontmatterString(fm.url),
					type: frontmatterString(fm.reading_type) ?? frontmatterString(fm.type_name) ?? "article",
					status: frontmatterString(fm.status) ?? "unread",
					added: frontmatterString(fm.added),
					read: frontmatterString(fm.read),
					project: normalizeProjectName(frontmatterString(fm.project)),
				});
			} else if (type === "career") {
				career.push({
					file,
					company: frontmatterString(fm.company) ?? "",
					role: frontmatterString(fm.role) ?? file.basename,
					deadline: frontmatterString(fm.deadline),
					match: numberValue(fm.match, 0),
					status: frontmatterString(fm.status) ?? "saved",
					applied: frontmatterString(fm.applied),
					feedback: frontmatterString(fm.feedback),
					documents: frontmatterString(fm.documents),
					project: normalizeProjectName(frontmatterString(fm.project)),
				});
			} else if (type === "idea") {
				ideas.push({
					file,
					name: file.basename,
					domain: frontmatterString(fm.domain) ?? "",
					kind: frontmatterString(fm.kind) ?? "research",
					status: frontmatterString(fm.status) ?? "seed",
					priority: frontmatterString(fm.priority) ?? "medium",
					project: normalizeProjectName(frontmatterString(fm.project)),
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
			ideas,
		};
	}

	projectLastActivity(projectFile: TFile, files: TFile[], fm: Record<string, unknown>): number {
		let latest = projectFile.stat.mtime;
		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file)?.frontmatter;
			if (String(cache?.type ?? "") !== "task") continue;
			if (normalizeProjectName(frontmatterString(cache?.project)) !== projectFile.basename) continue;
			latest = Math.max(latest, file.stat.mtime);
		}
		const explicit = frontmatterString(fm.last_activity);
		if (explicit) {
			const timestamp = Date.parse(explicit);
			if (Number.isFinite(timestamp)) latest = Math.max(latest, timestamp);
		}
		return latest;
	}

	projectIsStale(status: string | undefined, lastActivity: number): boolean {
		if (isTerminalProject(status)) return false;
		return Date.now() - lastActivity > STALE_DAYS * 86400000;
	}

	calculateProjectHealth(
		fm: Record<string, unknown>,
		stale: boolean,
		lastActivity: number,
		progress: number,
	): number {
		let score = 100;
		if (frontmatterString(fm.blocker) && frontmatterString(fm.blocker)?.toLowerCase() !== "none") score -= 30;
		if (booleanValue(fm.attention)) score -= 15;
		if (stale) score -= 25;
		const deadline = frontmatterString(fm.deadline);
		if (deadline) {
			const days = daysUntil(deadline);
			if (days < 0) score -= 25;
			else if (days <= 7 && progress < 80) score -= 15;
		}
		if (Date.now() - lastActivity > 30 * 86400000) score -= 10;
		return Math.max(0, Math.min(100, score));
	}

	async createProject(): Promise<void> {
		new CreateProjectModal(this.app, async (name, domain, kind, priority, deadline) => {
			const safeName = sanitizeFileName(name);
			if (!safeName) { new Notice("Project name cannot be empty."); return; }
			const path = normalizePath(`${this.settings.projectsFolder}/${safeName}.md`);
			if (this.app.vault.getAbstractFileByPath(path)) { new Notice("A project with this name already exists."); return; }
			const content = `---\ntype: project\ndomain: ${domain}\nstatus: active\npriority: ${priority}\nprogress: 0\nstart: ${today()}\ndeadline: ${deadline}\nblocker:\nattention: false\nnext_action:\nlast_activity: ${new Date().toISOString()}\nproject_kind: ${kind}\n---\n\n# ${name}\n\n## Objective\n\nDescribe what this project is trying to achieve.\n\n## Current State\n\n## Milestones\n\n- [ ] First milestone\n\n## Next Actions\n\n- [ ] Define first milestone\n\n## Blockers\n\nNone.\n\n## Attention\n\nNone.\n\n## Tasks\n\n<!-- RESEARCHFLOW:PROJECT:TASKS:START -->\n_No tasks yet._\n<!-- RESEARCHFLOW:PROJECT:TASKS:END -->\n\n## Decisions\n\n## Artifacts\n\n## Related Reading\n\n## Related Ideas\n\n## Related Career Opportunities\n\n## Daily Work\n`;
			const file = await this.app.vault.create(path, content);
			new Notice(`Created project: ${name}`);
			await this.syncProject(name);
			await this.app.workspace.getLeaf(true).openFile(file);
		});
	}

	async createResearchIdea(): Promise<void> {
		new CreateIdeaModal(this.app, async (name, domain, kind, priority) => {
			const safeName = sanitizeFileName(name);
			if (!safeName) { new Notice("Idea name cannot be empty."); return; }
			const path = normalizePath(`${this.settings.ideasFolder}/${safeName}.md`);
			if (this.app.vault.getAbstractFileByPath(path)) { new Notice("An idea with this name already exists."); return; }
			const content = `---\ntype: idea\ndomain: ${domain}\nkind: ${kind}\nstatus: seed\npriority: ${priority}\ncreated: ${today()}\nproject:\n---\n\n# ${name}\n\n## Hypothesis\n\n## Why is this interesting?\n\n## Related Work\n\n## Possible Experiments\n\n## Open Questions\n\n## Next Action\n\n- [ ] \n\n## Related Projects\n\n## Related Reading\n\n## Notes\n`;
			const file = await this.app.vault.create(path, content);
			new Notice(`Created research idea: ${name}`);
			await this.app.workspace.getLeaf(true).openFile(file);
		});
	}

	async createTask(): Promise<void> {
		const projects = (await this.getData()).projects.map((p) => p.name).sort((a, b) => a.localeCompare(b));
		new CreateTaskModal(this.app, projects, async (name, project, workDate, dueDate, priority) => {
			const safeName = sanitizeFileName(name);
			if (!safeName) { new Notice("Task name cannot be empty."); return; }
			const path = normalizePath(`${this.settings.tasksFolder}/${safeName}.md`);
			if (this.app.vault.getAbstractFileByPath(path)) { new Notice("A task with this name already exists."); return; }
			const projectValue = project ? `"[[${project}]]"` : "";
			const content = `---\ntype: task\nstatus: todo\npriority: ${priority}\nproject: ${projectValue}\ncreated: ${today()}\nwork_date: ${workDate}\ndue: ${dueDate}\n---\n\n# ${name}\n\n## Objective\n\n## Architecture\n\n## Code\n\n## Tests\n\n## Artifacts\n\n## Issues\n\n## Decisions\n\n## Result\n\n## Daily Work\n\n- [[${workDate}]]\n`;
			const file = await this.app.vault.create(path, content);
			await this.ensureDailyNote(workDate);
			if (project) await this.syncProject(project);
			await this.syncDailyNote(workDate);
			new Notice(`Created task: ${name}`);
			await this.app.workspace.getLeaf(true).openFile(file);
		});
	}

	async createReading(): Promise<void> {
		const projects = (await this.getData()).projects.map((p) => p.name).sort();
		new CreateReadingModal(this.app, projects, async (name, url, type, project) => {
			const safeName = sanitizeFileName(name);
			if (!safeName) { new Notice("Reading title cannot be empty."); return; }
			const path = normalizePath(`${this.settings.readingFolder}/${safeName}.md`);
			if (this.app.vault.getAbstractFileByPath(path)) { new Notice("A reading item with this name already exists."); return; }
			const content = `---\ntype: reading\nreading_type: ${type}\nstatus: unread\nadded: ${today()}\nread:\nurl: ${url}\nproject: ${project ? `"[[${project}]]"` : ""}\n---\n\n# ${name}\n\n## Why I Saved This\n\n## Notes\n\n## Takeaways\n\n## Related Projects\n\n## Related Ideas\n`;
			const file = await this.app.vault.create(path, content);
			new Notice(`Added reading: ${name}`);
			await this.app.workspace.getLeaf(true).openFile(file);
		});
	}

	async createCareerOpportunity(): Promise<void> {
		const projects = (await this.getData()).projects.map((p) => p.name).sort();
		new CreateCareerModal(this.app, projects, async (company, role, deadline, match, project) => {
			const name = sanitizeFileName(`${company} - ${role}`);
			if (!name) { new Notice("Company and role are required."); return; }
			const path = normalizePath(`${this.settings.careerFolder}/${name}.md`);
			if (this.app.vault.getAbstractFileByPath(path)) { new Notice("That career opportunity already exists."); return; }
			const content = `---\ntype: career\ncompany: ${company}\nrole: ${role}\ndeadline: ${deadline}\nmatch: ${match}\nstatus: saved\napplied:\nfeedback:\ndocuments:\nproject: ${project ? `"[[${project}]]"` : ""}\n---\n\n# ${role} — ${company}\n\n## Opportunity\n\n## Documents\n\n## Application\n\n## Feedback\n\n## Related Projects\n\n## Daily Work\n`;
			const file = await this.app.vault.create(path, content);
			new Notice(`Added opportunity: ${company} — ${role}`);
			await this.app.workspace.getLeaf(true).openFile(file);
		});
	}

	async openDailyNote(date: string = today()): Promise<void> {
		const file = await this.ensureDailyNote(date);
		await this.syncDailyNote(date);
		await this.app.workspace.getLeaf(true).openFile(file);
	}

	async ensureDailyNote(date: string): Promise<TFile> {
		const path = normalizePath(`${this.settings.dailyFolder}/${date}.md`);
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing instanceof TFile) return existing;
		const file = await this.app.vault.create(path, this.createDailyNoteContent(date));
		new Notice(`Created daily note: ${date}`);
		return file;
	}

	createDailyNoteContent(date: string): string {
		return `---\ntype: daily\ndate: ${date}\n---\n\n# ${date}\n\n## Today's Focus\n\n## Tasks\n\n<!-- RESEARCHFLOW:TASKS:START -->\n_No tasks scheduled._\n<!-- RESEARCHFLOW:TASKS:END -->\n\n## Work Log\n\n## Decisions\n\n## Blockers\n\n## Ideas\n\n## Reading\n\n## Career\n`;
	}

	async syncDailyNote(date: string): Promise<void> {
		const daily = await this.ensureDailyNote(date);
		const files = this.app.vault.getMarkdownFiles();
		const rows: string[] = [];
		for (const file of files) {
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
			if (String(fm?.type ?? "") !== "task") continue;
			if (frontmatterString(fm?.work_date) !== date) continue;
			rows.push(`- ${isDone(frontmatterString(fm?.status)) ? "[x]" : "[ ]"} [[${file.basename}]]`);
		}
		rows.sort((a, b) => a.localeCompare(b));
		const section = rows.length ? rows.join("\n") : "_No tasks scheduled._";
		await replaceBetweenMarkers(daily, "<!-- RESEARCHFLOW:TASKS:START -->", "<!-- RESEARCHFLOW:TASKS:END -->", section, this.app);
	}

	async syncTaskStatusesFromDailyNote(dailyFile: TFile): Promise<void> {
		if (this.syncing) return;
		const content = await this.app.vault.read(dailyFile);
		const start = content.indexOf("<!-- RESEARCHFLOW:TASKS:START -->");
		const end = content.indexOf("<!-- RESEARCHFLOW:TASKS:END -->");
		if (start < 0 || end < start) return;
		const section = content.slice(start, end);
		const regex = /^- \[([ xX])\] \[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/gm;
		const updates: Array<{ file: TFile; status: string }> = [];
		let match: RegExpExecArray | null;
		while ((match = regex.exec(section)) !== null) {
			const taskFile = this.app.metadataCache.getFirstLinkpathDest(match[2].trim(), dailyFile.path);
			if (!(taskFile instanceof TFile)) continue;
			const fm = this.app.metadataCache.getFileCache(taskFile)?.frontmatter;
			if (String(fm?.type ?? "") !== "task") continue;
			updates.push({ file: taskFile, status: match[1].toLowerCase() === "x" ? "done" : "todo" });
		}
		if (!updates.length) return;
		this.syncing = true;
		try {
			const projects = new Set<string>();
			for (const update of updates) {
				const old = await this.app.vault.read(update.file);
				const next = replaceFrontmatterValue(old, "status", update.status);
				if (next !== old) await this.app.vault.modify(update.file, next);
				const project = normalizeProjectName(frontmatterString(this.app.metadataCache.getFileCache(update.file)?.frontmatter?.project));
				if (project) projects.add(project);
			}
			await sleep(100);
			for (const project of projects) await this.syncProject(project);
		} finally {
			this.syncing = false;
		}
		this.scheduleRefresh();
	}

	async syncProject(projectName: string): Promise<void> {
		const clean = normalizeProjectName(projectName);
		if (!clean) return;
		const projectFile = this.app.metadataCache.getFirstLinkpathDest(clean, "");
		if (!(projectFile instanceof TFile)) return;
		const tasks = this.app.vault.getMarkdownFiles().filter((file) => {
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
			return String(fm?.type ?? "") === "task" && normalizeProjectName(frontmatterString(fm?.project)) === clean;
		});
		const completed = tasks.filter((file) => isDone(frontmatterString(this.app.metadataCache.getFileCache(file)?.frontmatter?.status))).length;
		const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
		const projectContent = await this.app.vault.read(projectFile);
		const withProgress = replaceFrontmatterValue(projectContent, "progress", String(progress));
		const withActivity = replaceFrontmatterValue(withProgress, "last_activity", new Date().toISOString());
		const taskLines = tasks.sort((a, b) => a.basename.localeCompare(b.basename)).map((file) => {
			const status = frontmatterString(this.app.metadataCache.getFileCache(file)?.frontmatter?.status);
			return `- ${isDone(status) ? "[x]" : "[ ]"} [[${file.basename}]]`;
		});
		const section = taskLines.length ? taskLines.join("\n") : "_No tasks yet._";
		let content = withActivity;
		if (!content.includes("<!-- RESEARCHFLOW:PROJECT:TASKS:START -->")) {
			const heading = "## Tasks";
			const index = content.indexOf(heading);
			if (index >= 0) {
				const insertion = `\n\n<!-- RESEARCHFLOW:PROJECT:TASKS:START -->\n${section}\n<!-- RESEARCHFLOW:PROJECT:TASKS:END -->`;
				content = content.slice(0, index + heading.length) + insertion + content.slice(index + heading.length);
			}
		} else {
			content = replaceBetweenMarkersText(content, "<!-- RESEARCHFLOW:PROJECT:TASKS:START -->", "<!-- RESEARCHFLOW:PROJECT:TASKS:END -->", section);
		}
		if (content !== projectContent) await this.app.vault.modify(projectFile, content);
	}

	async updateProjectProgress(projectName: string): Promise<void> {
		await this.syncProject(projectName);
	}

	async importCareerCSV(): Promise<void> {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".csv,text/csv";
		input.onchange = () => {
			const file = input.files?.[0];
			if (file) void this.processCareerCSV(file);
		};
		input.click();
	}

	async processCareerCSV(file: File): Promise<void> {
		const text = await file.text();
		const rows = parseCSV(text);
		if (rows.length < 2) { new Notice("CSV contains no opportunity rows."); return; }
		const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
		let count = 0;
		for (const row of rows.slice(1)) {
			const record: Record<string, string> = {};
			headers.forEach((h, i) => { record[h] = row[i] ?? ""; });
			const company = record.company || record.organization || "Unknown Company";
			const role = record.role || record.title || "Opportunity";
			const safeName = sanitizeFileName(`${company} - ${role}`);
			const path = normalizePath(`${this.settings.careerFolder}/${safeName}.md`);
			if (this.app.vault.getAbstractFileByPath(path)) continue;
			const content = `---\ntype: career\ncompany: ${yamlValue(company)}\nrole: ${yamlValue(role)}\ndeadline: ${yamlValue(record.deadline || record.last_date)}\nmatch: ${record.match || 0}\nstatus: ${yamlValue(record.status || "saved")}\napplied: ${yamlValue(record.applied)}\nfeedback: ${yamlValue(record.feedback)}\ndocuments: ${yamlValue(record.documents || record.document_links)}\nproject: ${yamlValue(record.project)}\nsource: ${yamlValue(record.link || record.url)}\n---\n\n# ${role} — ${company}\n\n## Opportunity\n\nSource: ${record.link || record.url || ""}\n\n## Documents\n\n${record.documents || record.document_links || ""}\n\n## Application\n\n## Feedback\n\n## Related Projects\n\n## Daily Work\n`;
			await this.app.vault.create(path, content);
			count++;
		}
		new Notice(`Imported ${count} career opportunities.`);
		this.scheduleRefresh();
	}

	async generateWeeklySummary(): Promise<void> {
		const end = new Date();
		const start = new Date(end.getTime() - 6 * 86400000);
		const files = this.app.vault.getMarkdownFiles().filter((f) => this.isInFolder(f, this.settings.dailyFolder));
		const relevant: string[] = [];
		for (const file of files) {
			const d = parseDate(file.basename);
			if (!d || d < start || d > end) continue;
			const text = await this.app.vault.read(file);
			relevant.push(`## ${file.basename}\n${extractDailySummary(text)}`);
		}
		const path = normalizePath(`${this.settings.dailyFolder}/Weekly Summary ${formatDateKey(end)}.md`);
		const content = `---\ntype: weekly_summary\nweek_ending: ${formatDateKey(end)}\n---\n\n# ResearchFlow Weekly Summary\n\n${relevant.join("\n\n") || "No daily notes found."}\n\n## Retrospective\n\n### Wins\n\n### Blockers\n\n### Decisions\n\n### Next Week\n`;
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing instanceof TFile) await this.app.vault.modify(existing, content);
		else await this.app.vault.create(path, content);
		new Notice("Weekly summary generated.");
	}

	async validateVault(): Promise<void> {
		const data = await this.getData();
		const problems: string[] = [];
		const projectNames = new Set(data.projects.map((p) => p.name));
		for (const task of data.tasks) {
			if (task.project && !projectNames.has(task.project)) problems.push(`Task ${task.name}: missing project ${task.project}`);
			if (!task.workDate) problems.push(`Task ${task.name}: missing work_date`);
		}
		const dailyFiles = this.app.vault.getMarkdownFiles().filter((f) => this.isInFolder(f, this.settings.dailyFolder));
		for (const project of data.projects) {
			if (!project.file.path) problems.push(`Project ${project.name}: invalid path`);
		}
		if (!problems.length) new Notice("ResearchFlow validation passed.");
		else {
			new Notice(`${problems.length} relationship issue(s) found. See console.`);
			console.warn("ResearchFlow validation", problems, dailyFiles.length);
		}
	}
}

class ResearchFlowHomeView extends ItemView {
	plugin: ResearchFlowPlugin;
	constructor(leaf: WorkspaceLeaf, plugin: ResearchFlowPlugin) { super(leaf); this.plugin = plugin; }
	getViewType(): string { return VIEW_TYPE_RESEARCH_FLOW; }
	getDisplayText(): string { return "ResearchFlow"; }
	getIcon(): string { return "layout-dashboard"; }
	async onOpen(): Promise<void> { await this.render(); }
	async onClose(): Promise<void> { this.contentEl.empty(); }

	async render(): Promise<void> {
		const data = await this.plugin.getData();
		const root = this.contentEl;
		root.empty();
		root.addClass("research-flow-home");
		const header = root.createDiv({ cls: "research-flow-header" });
		header.createEl("h1", { text: "ResearchFlow" });
		header.createEl("p", { text: `Research operating system · v${RF_VERSION}`, cls: "research-flow-subtitle" });
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

		this.section(root, "🔴 Blockers", "alert-circle");
		if (!data.blockers.length) this.empty(root, "No blockers.");
		for (const p of data.blockers) this.alert(root, p, "blocker");

		this.section(root, "🟠 Attention", "alert-triangle");
		if (!data.attention.length) this.empty(root, "Nothing flagged for attention.");
		for (const p of data.attention) this.alert(root, p, "attention");

		this.section(root, "⚠ Stale Projects", "clock");
		if (!data.staleProjects.length) this.empty(root, "No stale active projects.");
		for (const p of data.staleProjects) this.alert(root, p, "stale");

		this.section(root, "Today's Tasks", "check-square");
		if (!data.todayTasks.length) this.empty(root, "No incomplete tasks for today.");
		for (const task of data.todayTasks) this.taskRow(root, task);

		this.section(root, "Career — Upcoming", "briefcase");
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
		for (const p of data.projects.filter((p) => !isTerminalProject(p.status)).sort((a, b) => dateSort(a.deadline, b.deadline)).slice(0, 12)) this.healthRow(root, p);

		this.section(root, "ResearchFlow", "network");
		const graph = root.createDiv({ cls: "research-flow-info" });
		graph.createEl("p", { text: "Markdown-first: Projects ↔ Tasks ↔ Daily Work ↔ Reading ↔ Ideas ↔ Career." });
		graph.createEl("p", { text: "Task files are the source of truth for completion; project progress is derived from tasks." });
	}

	button(parent: HTMLElement, text: string, icon: string, callback: () => void): void {
		const b = parent.createEl("button", { text });
		b.addEventListener("click", callback);
	}
	section(root: HTMLElement, title: string, _icon: string): void { root.createEl("h2", { text: title, cls: "research-flow-section-title" }); }
	empty(root: HTMLElement, text: string): void { root.createDiv({ text, cls: "research-flow-empty" }); }

	stats(root: HTMLElement, data: ResearchFlowData): void {
		const box = root.createDiv({ cls: "research-flow-stats" });
		const items: Array<[string, string]> = [
			["Active Projects", String(data.projects.filter((p) => !isTerminalProject(p.status)).length)],
			["Open Tasks", String(data.tasks.filter((t) => !isDone(t.status)).length)],
			["Today", String(data.todayTasks.length)],
			["Blocked", String(data.blockers.length)],
			["Attention", String(data.attention.length)],
			["Stale", String(data.staleProjects.length)],
			["Reading Queue", String(data.readings.filter((r) => !isRead(r.status)).length)],
			["Career", String(data.career.filter((c) => !isCareerClosed(c.status)).length)],
		];
		for (const [label, value] of items) {
			const card = box.createDiv({ cls: "research-flow-stat" });
			card.createDiv({ text: value, cls: "research-flow-stat-value" });
			card.createDiv({ text: label, cls: "research-flow-stat-label" });
		}
	}

	projectCard(root: HTMLElement, p: Project): void {
		const card = root.createDiv({ cls: "research-flow-project-card" });
		const title = card.createEl("a", { text: p.name });
		title.addEventListener("click", (e) => { e.preventDefault(); void this.app.workspace.getLeaf(true).openFile(p.file); });
		card.createDiv({ text: `${p.domain || "General"} · ${p.priority} · ${p.progress}%`, cls: "research-flow-project-meta" });
		const bar = card.createDiv({ cls: "research-flow-progress" });
		const fill = bar.createDiv({ cls: "research-flow-progress-fill" });
		fill.style.width = `${p.progress}%`;
		if (p.nextAction) card.createDiv({ text: `Next: ${p.nextAction}`, cls: "research-flow-muted" });
		if (p.deadline) card.createDiv({ text: `Deadline: ${formatDateForDisplay(p.deadline)}`, cls: "research-flow-muted" });
		card.createDiv({ text: `Health: ${p.health}/100${p.stale ? " · stale" : ""}`, cls: p.health < 50 ? "research-flow-danger" : "research-flow-muted" });
	}

	alert(root: HTMLElement, p: Project, kind: string): void {
		const box = root.createDiv({ cls: "research-flow-alert-section" });
		const a = box.createEl("a", { text: p.name });
		a.addEventListener("click", (e) => { e.preventDefault(); void this.app.workspace.getLeaf(true).openFile(p.file); });
		box.createDiv({ text: kind === "blocker" ? p.blocker || "Blocked" : kind === "stale" ? `No recent activity for ${STALE_DAYS}+ days.` : "Project flagged for attention." });
	}

	taskRow(root: HTMLElement, task: Task): void {
		const row = root.createDiv({ cls: "research-flow-task-row" });
		const checkbox = row.createEl("input", { type: "checkbox" });
		checkbox.checked = false;
		checkbox.addEventListener("change", () => void this.completeTask(task));
		const a = row.createEl("a", { text: task.name });
		a.addEventListener("click", (e) => { e.preventDefault(); void this.app.workspace.getLeaf(true).openFile(task.file); });
		if (task.project) row.createSpan({ text: ` · ${task.project}`, cls: "research-flow-muted" });
	}

	careerRow(root: HTMLElement, c: CareerOpportunity): void {
		const row = root.createDiv({ cls: "research-flow-list-row" });
		const a = row.createEl("a", { text: `${c.role} — ${c.company}` });
		a.addEventListener("click", (e) => { e.preventDefault(); void this.app.workspace.getLeaf(true).openFile(c.file); });
		row.createSpan({ text: ` · ${c.deadline ? formatDateForDisplay(c.deadline) : "no deadline"} · ${c.status}`, cls: "research-flow-muted" });
	}

	readingRow(root: HTMLElement, r: ReadingItem): void {
		const row = root.createDiv({ cls: "research-flow-list-row" });
		const a = row.createEl("a", { text: r.name });
		a.addEventListener("click", (e) => { e.preventDefault(); void this.app.workspace.getLeaf(true).openFile(r.file); });
		row.createSpan({ text: ` · ${r.status}${r.project ? ` · ${r.project}` : ""}`, cls: "research-flow-muted" });
	}

	ideaRow(root: HTMLElement, i: ResearchIdea): void {
		const row = root.createDiv({ cls: "research-flow-list-row" });
		const a = row.createEl("a", { text: i.name });
		a.addEventListener("click", (e) => { e.preventDefault(); void this.app.workspace.getLeaf(true).openFile(i.file); });
		row.createSpan({ text: ` · ${i.domain || "General"} · ${i.kind}`, cls: "research-flow-muted" });
	}

	healthRow(root: HTMLElement, p: Project): void {
		const row = root.createDiv({ cls: "research-flow-list-row" });
		row.createSpan({ text: p.name });
		row.createSpan({ text: ` · ${p.progress}% · health ${p.health}/100 · ${p.deadline ? formatDateForDisplay(p.deadline) : "no deadline"}`, cls: "research-flow-muted" });
	}

	async completeTask(task: Task): Promise<void> {
		const old = await this.app.vault.read(task.file);
		const next = replaceFrontmatterValue(old, "status", "done");
		if (next === old) return;
		await this.app.vault.modify(task.file, next);
		await sleep(100);
		if (task.project) await this.plugin.syncProject(task.project);
		if (task.workDate) await this.plugin.syncDailyNote(task.workDate);
		this.plugin.scheduleRefresh();
	}
}

/*class CreateItemModal extends Modal {
	title: string;
	onSubmit: (value: string) => Promise<void>;
	constructor(app: App, title: string, onSubmit: (value: string) => Promise<void>) { super(app); this.title = title; this.onSubmit = onSubmit; }
	onOpen(): void {
		this.contentEl.empty(); this.contentEl.createEl("h2", { text: this.title });
		const input = this.contentEl.createEl("input", { type: "text", placeholder: "Name" }); input.style.width = "100%";
		const buttons = this.contentEl.createDiv();
		buttons.createEl("button", { text: "Cancel" }).onclick = () => this.close();
		buttons.createEl("button", { text: "Create", cls: "mod-cta" }).onclick = () => void this.submit(input.value);
		input.focus();
	}
	async submit(value: string): Promise<void> { if (!value.trim()) { new Notice("Name cannot be empty."); return; } await this.onSubmit(value.trim()); this.close(); }
	onClose(): void { this.contentEl.empty(); }
}*/

class CreateProjectModal extends Modal {
	onSubmit: (name: string, domain: string, kind: string, priority: string, deadline: string) => Promise<void>;
	constructor(app: App, onSubmit: (name: string, domain: string, kind: string, priority: string, deadline: string) => Promise<void>) { super(app); this.onSubmit = onSubmit; }
	onOpen(): void {
		this.contentEl.empty(); this.contentEl.createEl("h2", { text: "New Project" });
		const name = inputField(this.contentEl, "Project name", "Astronomy Agent");
		const domain = selectField(this.contentEl, "Domain", ["ML", "Quantum", "General"]);
		const kind = selectField(this.contentEl, "Project type", ["Research", "Project"]);
		const priority = selectField(this.contentEl, "Priority", ["high", "medium", "low"]);
		const deadline = inputField(this.contentEl, "Deadline", "", "date");
		modalButtons(this, this.contentEl, async () => { if (!name.value.trim()) { new Notice("Project name cannot be empty."); return; } await this.onSubmit(name.value.trim(), domain.value, kind.value, priority.value, deadline.value); this.close(); });
		name.focus();
	}
	onClose(): void { this.contentEl.empty(); }
}

class CreateIdeaModal extends Modal {
	onSubmit: (name: string, domain: string, kind: string, priority: string) => Promise<void>;
	constructor(app: App, onSubmit: (name: string, domain: string, kind: string, priority: string) => Promise<void>) { super(app); this.onSubmit = onSubmit; }
	onOpen(): void {
		this.contentEl.empty(); this.contentEl.createEl("h2", { text: "New Research Idea" });
		const name = inputField(this.contentEl, "Idea name", "Exclusive attention experiment");
		const domain = selectField(this.contentEl, "Domain", ["ML", "Quantum", "General"]);
		const kind = selectField(this.contentEl, "Idea type", ["Research", "Project"]);
		const priority = selectField(this.contentEl, "Priority", ["high", "medium", "low"]);
		modalButtons(this, this.contentEl, async () => { if (!name.value.trim()) { new Notice("Idea name cannot be empty."); return; } await this.onSubmit(name.value.trim(), domain.value, kind.value, priority.value); this.close(); });
	}
	onClose(): void { this.contentEl.empty(); }
}

class CreateTaskModal extends Modal {
	projects: string[];
	onSubmit: (name: string, project: string, workDate: string, dueDate: string, priority: string) => Promise<void>;
	constructor(app: App, projects: string[], onSubmit: (name: string, project: string, workDate: string, dueDate: string, priority: string) => Promise<void>) { super(app); this.projects = projects; this.onSubmit = onSubmit; }
	onOpen(): void {
		this.contentEl.empty(); this.contentEl.createEl("h2", { text: "New Task" });
		const name = inputField(this.contentEl, "Task name", "Run baseline experiment");
		const project = selectField(this.contentEl, "Project", ["", ...this.projects]);
		const workDate = inputField(this.contentEl, "Work date", today(), "date");
		const due = inputField(this.contentEl, "Due date", "", "date");
		const priority = selectField(this.contentEl, "Priority", ["high", "medium", "low"]);
		modalButtons(this, this.contentEl, async () => { if (!name.value.trim()) { new Notice("Task name cannot be empty."); return; } await this.onSubmit(name.value.trim(), project.value, workDate.value || today(), due.value, priority.value); this.close(); });
	}
	onClose(): void { this.contentEl.empty(); }
}

class CreateReadingModal extends Modal {
	projects: string[]; onSubmit: (name: string, url: string, type: string, project: string) => Promise<void>;
	constructor(app: App, projects: string[], onSubmit: (name: string, url: string, type: string, project: string) => Promise<void>) { super(app); this.projects = projects; this.onSubmit = onSubmit; }
	onOpen(): void {
		this.contentEl.empty(); this.contentEl.createEl("h2", { text: "New Reading" });
		const name = inputField(this.contentEl, "Title", "Paper / article title");
		const url = inputField(this.contentEl, "URL", "https://");
		const type = selectField(this.contentEl, "Type", ["paper", "article", "book", "documentation", "video", "other"]);
		const project = selectField(this.contentEl, "Related project", ["", ...this.projects]);
		modalButtons(this, this.contentEl, async () => { if (!name.value.trim()) { new Notice("Reading title cannot be empty."); return; } await this.onSubmit(name.value.trim(), url.value, type.value, project.value); this.close(); });
	}
	onClose(): void { this.contentEl.empty(); }
}

class CreateCareerModal extends Modal {
	projects: string[]; onSubmit: (company: string, role: string, deadline: string, match: string, project: string) => Promise<void>;
	constructor(app: App, projects: string[], onSubmit: (company: string, role: string, deadline: string, match: string, project: string) => Promise<void>) { super(app); this.projects = projects; this.onSubmit = onSubmit; }
	onOpen(): void {
		this.contentEl.empty(); this.contentEl.createEl("h2", { text: "New Career Opportunity" });
		const company = inputField(this.contentEl, "Company", "Company");
		const role = inputField(this.contentEl, "Role", "ML Researcher");
		const deadline = inputField(this.contentEl, "Deadline", "", "date");
		const match = inputField(this.contentEl, "Match %", "0", "number");
		const project = selectField(this.contentEl, "Related project", ["", ...this.projects]);
		modalButtons(this, this.contentEl, async () => { if (!company.value.trim() || !role.value.trim()) { new Notice("Company and role are required."); return; } await this.onSubmit(company.value.trim(), role.value.trim(), deadline.value, match.value || "0", project.value); this.close(); });
	}
	onClose(): void { this.contentEl.empty(); }
}

class ResearchFlowSettingTab extends PluginSettingTab {
	plugin: ResearchFlowPlugin;
	constructor(app: App, plugin: ResearchFlowPlugin) { super(app, plugin); this.plugin = plugin; }
	display(): void {
		const { containerEl } = this; containerEl.empty(); containerEl.createEl("h2", { text: "ResearchFlow" });
		containerEl.createEl("p", { text: `Version ${RF_VERSION}. Markdown-first research/project operating system.` });
		for (const [key, name] of [
			["projectsFolder", "Projects folder"], ["ideasFolder", "Ideas folder"], ["tasksFolder", "Tasks folder"],
			["careerFolder", "Career folder"], ["readingFolder", "Reading folder"], ["dailyFolder", "Daily folder"],
		] as Array<[keyof ResearchFlowSettings, string]>) {
			new Setting(containerEl).setName(name).addText((text) => text.setValue(this.plugin.settings[key]).onChange(async (value) => { this.plugin.settings[key] = value.trim(); await this.plugin.saveSettings(); }));
		}
	}
}

function inputField(parent: HTMLElement, label: string, placeholder: string, type = "text"): HTMLInputElement {
	parent.createEl("label", { text: label });
	const input = parent.createEl("input", { type, placeholder }); input.style.width = "100%"; return input;
}
function selectField(parent: HTMLElement, label: string, values: string[]): HTMLSelectElement {
	parent.createEl("label", { text: label });
	const select = parent.createEl("select"); select.style.width = "100%";
	for (const value of values) select.createEl("option", { value, text: value || "None" });
	return select;
}
function modalButtons(modal: Modal, parent: HTMLElement, submit: () => Promise<void>): void {
	const row = parent.createDiv();
	row.createEl("button", { text: "Cancel" }).onclick = () => modal.close();
	row.createEl("button", { text: "Create", cls: "mod-cta" }).onclick = () => void submit();
}

function frontmatterString(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	const text = String(value).trim();
	return text && text !== "null" ? text : undefined;
}
function numberValue(value: unknown, fallback: number): number { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function booleanValue(value: unknown): boolean { return value === true || String(value).toLowerCase() === "true"; }
function normalizeProjectName(value?: string): string | undefined { if (!value) return undefined; return value.replace(/^\[\[/, "").replace(/\]\]$/, "").trim(); }
function isDone(status?: string): boolean { const s = (status ?? "").toLowerCase(); return s === "done" || s === "completed"; }
function isTerminalProject(status?: string): boolean { const s = (status ?? "").toLowerCase(); return s === "completed" || s === "archived" || s === "cancelled"; }
function isRead(status: string): boolean { return ["read", "completed", "done"].includes(status.toLowerCase()); }
function isCareerClosed(status: string): boolean { return ["rejected", "withdrawn", "closed", "accepted", "archived"].includes(status.toLowerCase()); }
function priorityRank(priority: string): number { return priority.toLowerCase() === "high" ? 0 : priority.toLowerCase() === "medium" ? 1 : 2; }
function dateSort(a?: string, b?: string): number { if (!a && !b) return 0; if (!a) return 1; if (!b) return -1; return a.localeCompare(b); }
function daysUntil(date: string): number { const d = parseDate(date); if (!d) return 99999; return Math.ceil((d.getTime() - new Date(today()).getTime()) / 86400000); }
function parseDate(value: string): Date | null { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); if (!m) return null; return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); }
function formatDateKey(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function today(): string { return formatDateKey(new Date()); }
function formatDateForDisplay(date: string): string { const parsed = parseDate(date); if (!parsed) return date; return parsed.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
function sanitizeFileName(name: string): string { return name.trim().replace(/[\\/:*?"<>|#^]/g, "-").replace(/\s+/g, " ").replace(/-+/g, "-").trim(); }
function yamlValue(value: string): string { return value ? `"${value.replace(/"/g, "\\\"")}"` : ""; }
async function sleep(ms: number): Promise<void> { await new Promise((resolve) => window.setTimeout(resolve, ms)); }
function replaceFrontmatterValue(content: string, key: string, value: string): string {
	const regex = new RegExp(`(^${escapeRegExp(key)}:\\s*)(.*)$`, "m");
	if (regex.test(content)) return content.replace(regex, `$1${value}`);
	if (!content.startsWith("---")) return content;
	const close = content.indexOf("---", 3); if (close < 0) return content;
	return content.slice(0, close) + `${key}: ${value}\n` + content.slice(close);
}
function escapeRegExp(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function replaceBetweenMarkersText(content: string, startMarker: string, endMarker: string, replacement: string): string {
	const start = content.indexOf(startMarker); const end = content.indexOf(endMarker);
	if (start < 0 || end < start) return content;
	return content.slice(0, start + startMarker.length) + `\n${replacement}\n` + content.slice(end);
}
async function replaceBetweenMarkers(file: TFile, startMarker: string, endMarker: string, replacement: string, app: App): Promise<void> {
	const old = await app.vault.read(file); const next = replaceBetweenMarkersText(old, startMarker, endMarker, replacement);
	if (next !== old) await app.vault.modify(file, next);
}
function parseCSV(text: string): string[][] {
	const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
		else if (c === "," && !quoted) { row.push(field); field = ""; }
		else if ((c === "\n" || c === "\r") && !quoted) { if (c === "\r" && text[i + 1] === "\n") i++; row.push(field); field = ""; if (row.some((v) => v.trim())) rows.push(row); row = []; }
		else field += c;
	}
	if (field || row.length) { row.push(field); if (row.some((v) => v.trim())) rows.push(row); }
	return rows;
}
function extractDailySummary(content: string): string {
	const lines = content.split("\n");
	const keep: string[] = []; let inTasks = false;
	for (const line of lines) {
		if (line.includes("RESEARCHFLOW:TASKS:START")) { inTasks = true; continue; }
		if (line.includes("RESEARCHFLOW:TASKS:END")) { inTasks = false; continue; }
		if (inTasks) continue;
		if (/^## (Work Log|Decisions|Blockers|Ideas|Career|Reading)/.test(line) || /^- /.test(line)) keep.push(line);
	}
	return keep.slice(0, 40).join("\n");
}
