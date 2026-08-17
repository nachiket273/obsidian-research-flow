/*
ResearchFlow
https://github.com/nachiket273/obsidian-research-flow
*/
var W=Object.defineProperty;var fe=Object.getOwnPropertyDescriptor;var ye=Object.getOwnPropertyNames;var we=Object.prototype.hasOwnProperty;var ve=(i,n)=>{for(var e in n)W(i,e,{get:n[e],enumerable:!0})},ke=(i,n,e,t)=>{if(n&&typeof n=="object"||typeof n=="function")for(let s of ye(n))!we.call(i,s)&&s!==e&&W(i,s,{get:()=>n[s],enumerable:!(t=fe(n,s))||t.enumerable});return i};var Ee=i=>ke(W({},"__esModule",{value:!0}),i);var $e={};ve($e,{default:()=>N});module.exports=Ee($e);var l=require("obsidian"),P="research-flow-home",G="1.0.0-alpha",de=14,be={projectsFolder:"02_Projects",ideasFolder:"03_Ideas",tasksFolder:"04_Tasks",careerFolder:"05_Career",readingFolder:"06_Reading",dailyFolder:"07_Daily"},N=class extends l.Plugin{constructor(){super(...arguments);this.syncing=!1;this.refreshTimer=null}async onload(){await this.loadSettings(),this.registerView(P,e=>new O(e,this)),this.addRibbonIcon("layout-dashboard","Open ResearchFlow",()=>void this.activateView()),this.addCommand({id:"open-home",name:"Open Home",callback:()=>void this.activateView()}),this.addCommand({id:"new-project",name:"New Project",callback:()=>void this.createProject()}),this.addCommand({id:"new-research-idea",name:"New Research Idea",callback:()=>void this.createResearchIdea()}),this.addCommand({id:"new-task",name:"New Task",callback:()=>void this.createTask()}),this.addCommand({id:"open-today",name:"Open Today's Daily Note",callback:()=>void this.openDailyNote()}),this.addCommand({id:"new-reading",name:"New Reading",callback:()=>void this.createReading()}),this.addCommand({id:"new-career-opportunity",name:"New Career Opportunity",callback:()=>void this.createCareerOpportunity()}),this.addCommand({id:"import-career-csv",name:"Import Career CSV",callback:()=>void this.importCareerCSV()}),this.addCommand({id:"weekly-summary",name:"Generate Weekly Research Summary",callback:()=>void this.generateWeeklySummary()}),this.addCommand({id:"validate-vault",name:"Validate ResearchFlow Relationships",callback:()=>void this.validateVault()}),this.addSettingTab(new J(this.app,this)),await this.ensureFolders(),this.registerEvent(this.app.metadataCache.on("changed",e=>{e instanceof l.TFile&&this.handleFileChange(e)})),this.registerEvent(this.app.vault.on("modify",e=>{e instanceof l.TFile&&this.handleFileChange(e)})),this.registerEvent(this.app.vault.on("create",e=>{e instanceof l.TFile&&this.handleFileChange(e)})),this.registerEvent(this.app.vault.on("delete",()=>this.scheduleRefresh())),this.registerEvent(this.app.vault.on("rename",()=>this.scheduleRefresh())),this.registerEvent(this.app.workspace.on("active-leaf-change",()=>this.scheduleRefresh())),console.log(`ResearchFlow ${G} loaded`)}onunload(){this.refreshTimer!==null&&window.clearTimeout(this.refreshTimer)}async loadSettings(){this.settings=Object.assign({},be,await this.loadData())}async saveSettings(){await this.saveData(this.settings)}async ensureFolders(){for(let e of[this.settings.projectsFolder,this.settings.ideasFolder,this.settings.tasksFolder,this.settings.careerFolder,this.settings.readingFolder,this.settings.dailyFolder]){let t=(0,l.normalizePath)(e);this.app.vault.getAbstractFileByPath(t)||await this.app.vault.createFolder(t)}}async activateView(){let{workspace:e}=this.app,t=null,s=e.getLeavesOfType(P);s.length>0?t=s[0]:t=e.getLeaf(!0),t&&(await t.setViewState({type:P,active:!0}),e.revealLeaf(t))}scheduleRefresh(){this.refreshTimer!==null&&window.clearTimeout(this.refreshTimer),this.refreshTimer=window.setTimeout(()=>{this.refreshTimer=null,this.refreshHomeViews()},150)}async refreshHomeViews(){for(let e of this.app.workspace.getLeavesOfType(P))e.view instanceof O&&await e.view.render()}async handleFileChange(e){var r,d,c;if(this.syncing){this.scheduleRefresh();return}let t=this.app.metadataCache.getFileCache(e),s=String((d=(r=t==null?void 0:t.frontmatter)==null?void 0:r.type)!=null?d:"");if(this.isInFolder(e,this.settings.dailyFolder))await this.syncTaskStatusesFromDailyNote(e);else if(s==="task"){let p=h((c=t==null?void 0:t.frontmatter)==null?void 0:c.project);p&&await this.syncProject(p)}this.scheduleRefresh()}isInFolder(e,t){let s=(0,l.normalizePath)(t).replace(/\/$/,"")+"/";return e.path.startsWith(s)}async getData(){var o,y,v,k,f,m,w,b,$,Q,U,Y,X,Z,ee,te,ne;let e=this.app.vault.getMarkdownFiles(),t=[],s=[],a=[],r=[],d=[];for(let g of e){let u=(o=this.app.metadataCache.getFileCache(g))==null?void 0:o.frontmatter;if(!u)continue;let C=String((y=u.type)!=null?y:"");if(C==="project"){let se=ae(u.progress,0),me=h(u.blocker),ge=re(u.attention),I=this.projectLastActivity(g,e,u),ie=this.projectIsStale(u.status,I);t.push({file:g,name:g.basename,domain:(v=h(u.domain))!=null?v:"",status:(k=h(u.status))!=null?k:"active",priority:(f=h(u.priority))!=null?f:"medium",progress:Math.max(0,Math.min(100,se)),blocker:me,attention:ge,deadline:h(u.deadline),start:h(u.start),nextAction:h(u.next_action),lastActivity:I,stale:ie,health:this.calculateProjectHealth(u,ie,I,se)})}else C==="task"?s.push({file:g,name:g.basename,status:(m=h(u.status))!=null?m:"todo",priority:(w=h(u.priority))!=null?w:"medium",project:S(h(u.project)),workDate:h(u.work_date),due:h(u.due)}):C==="reading"?a.push({file:g,name:g.basename,url:h(u.url),type:($=(b=h(u.reading_type))!=null?b:h(u.type_name))!=null?$:"article",status:(Q=h(u.status))!=null?Q:"unread",added:h(u.added),read:h(u.read),project:S(h(u.project))}):C==="career"?r.push({file:g,company:(U=h(u.company))!=null?U:"",role:(Y=h(u.role))!=null?Y:g.basename,deadline:h(u.deadline),match:ae(u.match,0),status:(X=h(u.status))!=null?X:"saved",applied:h(u.applied),feedback:h(u.feedback),documents:h(u.documents),project:S(h(u.project))}):C==="idea"&&d.push({file:g,name:g.basename,domain:(Z=h(u.domain))!=null?Z:"",kind:(ee=h(u.kind))!=null?ee:"research",status:(te=h(u.status))!=null?te:"seed",priority:(ne=h(u.priority))!=null?ne:"medium",project:S(h(u.project))})}let c=F(),p=s.filter(g=>g.workDate===c&&!D(g.status));return{projects:t,tasks:s,todayTasks:p,blockers:t.filter(g=>g.blocker&&g.blocker.toLowerCase()!=="none"),attention:t.filter(g=>g.attention),staleProjects:t.filter(g=>g.stale&&!x(g.status)),readings:a,career:r.sort((g,u)=>pe(g.deadline,u.deadline)),ideas:d}}projectLastActivity(e,t,s){var d,c;let a=e.stat.mtime;for(let p of t){let o=(d=this.app.metadataCache.getFileCache(p))==null?void 0:d.frontmatter;String((c=o==null?void 0:o.type)!=null?c:"")==="task"&&S(h(o==null?void 0:o.project))===e.basename&&(a=Math.max(a,p.stat.mtime))}let r=h(s.last_activity);if(r){let p=Date.parse(r);Number.isFinite(p)&&(a=Math.max(a,p))}return a}projectIsStale(e,t){return x(e)?!1:Date.now()-t>de*864e5}calculateProjectHealth(e,t,s,a){var c;let r=100;h(e.blocker)&&((c=h(e.blocker))==null?void 0:c.toLowerCase())!=="none"&&(r-=30),re(e.attention)&&(r-=15),t&&(r-=25);let d=h(e.deadline);if(d){let p=je(d);p<0?r-=25:p<=7&&a<80&&(r-=15)}return Date.now()-s>30*864e5&&(r-=10),Math.max(0,Math.min(100,r))}async createProject(){new H(this.app,async(e,t,s,a,r)=>{let d=T(e);if(!d){new l.Notice("Project name cannot be empty.");return}let c=(0,l.normalizePath)(`${this.settings.projectsFolder}/${d}.md`);if(this.app.vault.getAbstractFileByPath(c)){new l.Notice("A project with this name already exists.");return}let p=`---
type: project
domain: ${t}
status: active
priority: ${a}
progress: 0
start: ${F()}
deadline: ${r}
blocker:
attention: false
next_action:
last_activity: ${new Date().toISOString()}
project_kind: ${s}
---

# ${e}

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
`,o=await this.app.vault.create(c,p);new l.Notice(`Created project: ${e}`),await this.syncProject(e),await this.app.workspace.getLeaf(!0).openFile(o)})}async createResearchIdea(){new M(this.app,async(e,t,s,a)=>{let r=T(e);if(!r){new l.Notice("Idea name cannot be empty.");return}let d=(0,l.normalizePath)(`${this.settings.ideasFolder}/${r}.md`);if(this.app.vault.getAbstractFileByPath(d)){new l.Notice("An idea with this name already exists.");return}let c=`---
type: idea
domain: ${t}
kind: ${s}
status: seed
priority: ${a}
created: ${F()}
project:
---

# ${e}

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
`,p=await this.app.vault.create(d,c);new l.Notice(`Created research idea: ${e}`),await this.app.workspace.getLeaf(!0).openFile(p)})}async createTask(){let e=(await this.getData()).projects.map(t=>t.name).sort((t,s)=>t.localeCompare(s));new V(this.app,e,async(t,s,a,r,d)=>{let c=T(t);if(!c){new l.Notice("Task name cannot be empty.");return}let p=(0,l.normalizePath)(`${this.settings.tasksFolder}/${c}.md`);if(this.app.vault.getAbstractFileByPath(p)){new l.Notice("A task with this name already exists.");return}let o=s?`"[[${s}]]"`:"",y=`---
type: task
status: todo
priority: ${d}
project: ${o}
created: ${F()}
work_date: ${a}
due: ${r}
---

# ${t}

## Objective

## Architecture

## Code

## Tests

## Artifacts

## Issues

## Decisions

## Result

## Daily Work

- [[${a}]]
`,v=await this.app.vault.create(p,y);await this.ensureDailyNote(a),s&&await this.syncProject(s),await this.syncDailyNote(a),new l.Notice(`Created task: ${t}`),await this.app.workspace.getLeaf(!0).openFile(v)})}async createReading(){let e=(await this.getData()).projects.map(t=>t.name).sort();new B(this.app,e,async(t,s,a,r)=>{let d=T(t);if(!d){new l.Notice("Reading title cannot be empty.");return}let c=(0,l.normalizePath)(`${this.settings.readingFolder}/${d}.md`);if(this.app.vault.getAbstractFileByPath(c)){new l.Notice("A reading item with this name already exists.");return}let p=`---
type: reading
reading_type: ${a}
status: unread
added: ${F()}
read:
url: ${s}
project: ${r?`"[[${r}]]"`:""}
---

# ${t}

## Why I Saved This

## Notes

## Takeaways

## Related Projects

## Related Ideas
`,o=await this.app.vault.create(c,p);new l.Notice(`Added reading: ${t}`),await this.app.workspace.getLeaf(!0).openFile(o)})}async createCareerOpportunity(){let e=(await this.getData()).projects.map(t=>t.name).sort();new K(this.app,e,async(t,s,a,r,d)=>{let c=T(`${t} - ${s}`);if(!c){new l.Notice("Company and role are required.");return}let p=(0,l.normalizePath)(`${this.settings.careerFolder}/${c}.md`);if(this.app.vault.getAbstractFileByPath(p)){new l.Notice("That career opportunity already exists.");return}let o=`---
type: career
company: ${t}
role: ${s}
deadline: ${a}
match: ${r}
status: saved
applied:
feedback:
documents:
project: ${d?`"[[${d}]]"`:""}
---

# ${s} \u2014 ${t}

## Opportunity

## Documents

## Application

## Feedback

## Related Projects

## Daily Work
`,y=await this.app.vault.create(p,o);new l.Notice(`Added opportunity: ${t} \u2014 ${s}`),await this.app.workspace.getLeaf(!0).openFile(y)})}async openDailyNote(e=F()){let t=await this.ensureDailyNote(e);await this.syncDailyNote(e),await this.app.workspace.getLeaf(!0).openFile(t)}async ensureDailyNote(e){let t=(0,l.normalizePath)(`${this.settings.dailyFolder}/${e}.md`),s=this.app.vault.getAbstractFileByPath(t);if(s instanceof l.TFile)return s;let a=await this.app.vault.create(t,this.createDailyNoteContent(e));return new l.Notice(`Created daily note: ${e}`),a}createDailyNoteContent(e){return`---
type: daily
date: ${e}
---

# ${e}

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
`}async syncDailyNote(e){var d,c;let t=await this.ensureDailyNote(e),s=this.app.vault.getMarkdownFiles(),a=[];for(let p of s){let o=(d=this.app.metadataCache.getFileCache(p))==null?void 0:d.frontmatter;String((c=o==null?void 0:o.type)!=null?c:"")==="task"&&h(o==null?void 0:o.work_date)===e&&a.push(`- ${D(h(o==null?void 0:o.status))?"[x]":"[ ]"} [[${p.basename}]]`)}a.sort((p,o)=>p.localeCompare(o));let r=a.length?a.join(`
`):"_No tasks scheduled._";await Fe(t,"<!-- RESEARCHFLOW:TASKS:START -->","<!-- RESEARCHFLOW:TASKS:END -->",r,this.app)}async syncTaskStatusesFromDailyNote(e){var o,y,v,k;if(this.syncing)return;let t=await this.app.vault.read(e),s=t.indexOf("<!-- RESEARCHFLOW:TASKS:START -->"),a=t.indexOf("<!-- RESEARCHFLOW:TASKS:END -->");if(s<0||a<s)return;let r=t.slice(s,a),d=/^- \[([ xX])\] \[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/gm,c=[],p;for(;(p=d.exec(r))!==null;){let f=this.app.metadataCache.getFirstLinkpathDest(p[2].trim(),e.path);if(!(f instanceof l.TFile))continue;let m=(o=this.app.metadataCache.getFileCache(f))==null?void 0:o.frontmatter;String((y=m==null?void 0:m.type)!=null?y:"")==="task"&&c.push({file:f,status:p[1].toLowerCase()==="x"?"done":"todo"})}if(c.length){this.syncing=!0;try{let f=new Set;for(let m of c){let w=await this.app.vault.read(m.file),b=L(w,"status",m.status);b!==w&&await this.app.vault.modify(m.file,b);let $=S(h((k=(v=this.app.metadataCache.getFileCache(m.file))==null?void 0:v.frontmatter)==null?void 0:k.project));$&&f.add($)}await he(100);for(let m of f)await this.syncProject(m)}finally{this.syncing=!1}this.scheduleRefresh()}}async syncProject(e){let t=S(e);if(!t)return;let s=this.app.metadataCache.getFirstLinkpathDest(t,"");if(!(s instanceof l.TFile))return;let a=this.app.vault.getMarkdownFiles().filter(f=>{var w,b;let m=(w=this.app.metadataCache.getFileCache(f))==null?void 0:w.frontmatter;return String((b=m==null?void 0:m.type)!=null?b:"")==="task"&&S(h(m==null?void 0:m.project))===t}),r=a.filter(f=>{var m,w;return D(h((w=(m=this.app.metadataCache.getFileCache(f))==null?void 0:m.frontmatter)==null?void 0:w.status))}).length,d=a.length?Math.round(r/a.length*100):0,c=await this.app.vault.read(s),p=L(c,"progress",String(d)),o=L(p,"last_activity",new Date().toISOString()),y=a.sort((f,m)=>f.basename.localeCompare(m.basename)).map(f=>{var w,b;let m=h((b=(w=this.app.metadataCache.getFileCache(f))==null?void 0:w.frontmatter)==null?void 0:b.status);return`- ${D(m)?"[x]":"[ ]"} [[${f.basename}]]`}),v=y.length?y.join(`
`):"_No tasks yet._",k=o;if(k.includes("<!-- RESEARCHFLOW:PROJECT:TASKS:START -->"))k=ue(k,"<!-- RESEARCHFLOW:PROJECT:TASKS:START -->","<!-- RESEARCHFLOW:PROJECT:TASKS:END -->",v);else{let f="## Tasks",m=k.indexOf(f);if(m>=0){let w=`

<!-- RESEARCHFLOW:PROJECT:TASKS:START -->
${v}
<!-- RESEARCHFLOW:PROJECT:TASKS:END -->`;k=k.slice(0,m+f.length)+w+k.slice(m+f.length)}}k!==c&&await this.app.vault.modify(s,k)}async updateProjectProgress(e){await this.syncProject(e)}async importCareerCSV(){let e=document.createElement("input");e.type="file",e.accept=".csv,text/csv",e.onchange=()=>{var s;let t=(s=e.files)==null?void 0:s[0];t&&this.processCareerCSV(t)},e.click()}async processCareerCSV(e){let t=await e.text(),s=Se(t);if(s.length<2){new l.Notice("CSV contains no opportunity rows.");return}let a=s[0].map(d=>d.trim().toLowerCase().replace(/\s+/g,"_")),r=0;for(let d of s.slice(1)){let c={};a.forEach((f,m)=>{var w;c[f]=(w=d[m])!=null?w:""});let p=c.company||c.organization||"Unknown Company",o=c.role||c.title||"Opportunity",y=T(`${p} - ${o}`),v=(0,l.normalizePath)(`${this.settings.careerFolder}/${y}.md`);if(this.app.vault.getAbstractFileByPath(v))continue;let k=`---
type: career
company: ${R(p)}
role: ${R(o)}
deadline: ${R(c.deadline||c.last_date)}
match: ${c.match||0}
status: ${R(c.status||"saved")}
applied: ${R(c.applied)}
feedback: ${R(c.feedback)}
documents: ${R(c.documents||c.document_links)}
project: ${R(c.project)}
source: ${R(c.link||c.url)}
---

# ${o} \u2014 ${p}

## Opportunity

Source: ${c.link||c.url||""}

## Documents

${c.documents||c.document_links||""}

## Application

## Feedback

## Related Projects

## Daily Work
`;await this.app.vault.create(v,k),r++}new l.Notice(`Imported ${r} career opportunities.`),this.scheduleRefresh()}async generateWeeklySummary(){let e=new Date,t=new Date(e.getTime()-6*864e5),s=this.app.vault.getMarkdownFiles().filter(p=>this.isInFolder(p,this.settings.dailyFolder)),a=[];for(let p of s){let o=z(p.basename);if(!o||o<t||o>e)continue;let y=await this.app.vault.read(p);a.push(`## ${p.basename}
${Te(y)}`)}let r=(0,l.normalizePath)(`${this.settings.dailyFolder}/Weekly Summary ${q(e)}.md`),d=`---
type: weekly_summary
week_ending: ${q(e)}
---

# ResearchFlow Weekly Summary

${a.join(`

`)||"No daily notes found."}

## Retrospective

### Wins

### Blockers

### Decisions

### Next Week
`,c=this.app.vault.getAbstractFileByPath(r);c instanceof l.TFile?await this.app.vault.modify(c,d):await this.app.vault.create(r,d),new l.Notice("Weekly summary generated.")}async validateVault(){let e=await this.getData(),t=[],s=new Set(e.projects.map(r=>r.name));for(let r of e.tasks)r.project&&!s.has(r.project)&&t.push(`Task ${r.name}: missing project ${r.project}`),r.workDate||t.push(`Task ${r.name}: missing work_date`);let a=this.app.vault.getMarkdownFiles().filter(r=>this.isInFolder(r,this.settings.dailyFolder));for(let r of e.projects)r.file.path||t.push(`Project ${r.name}: invalid path`);t.length?(new l.Notice(`${t.length} relationship issue(s) found. See console.`),console.warn("ResearchFlow validation",t,a.length)):new l.Notice("ResearchFlow validation passed.")}},O=class extends l.ItemView{constructor(n,e){super(n),this.plugin=e}getViewType(){return P}getDisplayText(){return"ResearchFlow"}getIcon(){return"layout-dashboard"}async onOpen(){await this.render()}async onClose(){this.contentEl.empty()}async render(){let n=await this.plugin.getData(),e=this.contentEl;e.empty(),e.addClass("research-flow-home");let t=e.createDiv({cls:"research-flow-header"});t.createEl("h1",{text:"ResearchFlow"}),t.createEl("p",{text:`Research operating system \xB7 v${G}`,cls:"research-flow-subtitle"});let s=t.createDiv({cls:"research-flow-actions"});this.button(s,"New Project","plus",()=>void this.plugin.createProject()),this.button(s,"New Task","check-square",()=>void this.plugin.createTask()),this.button(s,"New Idea","lightbulb",()=>void this.plugin.createResearchIdea()),this.button(s,"Today","calendar",()=>void this.plugin.openDailyNote()),this.button(s,"Reading","book-open",()=>void this.plugin.createReading()),this.button(s,"Career","briefcase",()=>void this.plugin.createCareerOpportunity()),this.button(s,"Refresh","refresh-cw",()=>void this.render()),this.stats(e,n),this.section(e,"Active Projects","folder-kanban");let a=n.projects.filter(o=>!x(o.status));a.length||this.empty(e,"No active projects.");for(let o of a.sort((y,v)=>le(y.priority)-le(v.priority)))this.projectCard(e,o);this.section(e,"\u{1F534} Blockers","alert-circle"),n.blockers.length||this.empty(e,"No blockers.");for(let o of n.blockers)this.alert(e,o,"blocker");this.section(e,"\u{1F7E0} Attention","alert-triangle"),n.attention.length||this.empty(e,"Nothing flagged for attention.");for(let o of n.attention)this.alert(e,o,"attention");this.section(e,"\u26A0 Stale Projects","clock"),n.staleProjects.length||this.empty(e,"No stale active projects.");for(let o of n.staleProjects)this.alert(e,o,"stale");this.section(e,"Today's Tasks","check-square"),n.todayTasks.length||this.empty(e,"No incomplete tasks for today.");for(let o of n.todayTasks)this.taskRow(e,o);this.section(e,"Career \u2014 Upcoming","briefcase");let r=n.career.filter(o=>o.deadline&&!ce(o.status)).slice(0,8);r.length||this.empty(e,"No upcoming career opportunities.");for(let o of r)this.careerRow(e,o);this.section(e,"Reading Queue","book-open");let d=n.readings.filter(o=>!oe(o.status)).slice(0,8);d.length||this.empty(e,"Reading queue is empty.");for(let o of d)this.readingRow(e,o);this.section(e,"Research Ideas","lightbulb");let c=n.ideas.filter(o=>o.status.toLowerCase()!=="archived").slice(0,8);c.length||this.empty(e,"No active research ideas.");for(let o of c)this.ideaRow(e,o);this.section(e,"Project Health & Timeline","activity");for(let o of n.projects.filter(y=>!x(y.status)).sort((y,v)=>pe(y.deadline,v.deadline)).slice(0,12))this.healthRow(e,o);this.section(e,"ResearchFlow","network");let p=e.createDiv({cls:"research-flow-info"});p.createEl("p",{text:"Markdown-first: Projects \u2194 Tasks \u2194 Daily Work \u2194 Reading \u2194 Ideas \u2194 Career."}),p.createEl("p",{text:"Task files are the source of truth for completion; project progress is derived from tasks."})}button(n,e,t,s){n.createEl("button",{text:e}).addEventListener("click",s)}section(n,e,t){n.createEl("h2",{text:e,cls:"research-flow-section-title"})}empty(n,e){n.createDiv({text:e,cls:"research-flow-empty"})}stats(n,e){let t=n.createDiv({cls:"research-flow-stats"}),s=[["Active Projects",String(e.projects.filter(a=>!x(a.status)).length)],["Open Tasks",String(e.tasks.filter(a=>!D(a.status)).length)],["Today",String(e.todayTasks.length)],["Blocked",String(e.blockers.length)],["Attention",String(e.attention.length)],["Stale",String(e.staleProjects.length)],["Reading Queue",String(e.readings.filter(a=>!oe(a.status)).length)],["Career",String(e.career.filter(a=>!ce(a.status)).length)]];for(let[a,r]of s){let d=t.createDiv({cls:"research-flow-stat"});d.createDiv({text:r,cls:"research-flow-stat-value"}),d.createDiv({text:a,cls:"research-flow-stat-label"})}}projectCard(n,e){let t=n.createDiv({cls:"research-flow-project-card"});t.createEl("a",{text:e.name}).addEventListener("click",d=>{d.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),t.createDiv({text:`${e.domain||"General"} \xB7 ${e.priority} \xB7 ${e.progress}%`,cls:"research-flow-project-meta"});let r=t.createDiv({cls:"research-flow-progress"}).createDiv({cls:"research-flow-progress-fill"});r.style.width=`${e.progress}%`,e.nextAction&&t.createDiv({text:`Next: ${e.nextAction}`,cls:"research-flow-muted"}),e.deadline&&t.createDiv({text:`Deadline: ${_(e.deadline)}`,cls:"research-flow-muted"}),t.createDiv({text:`Health: ${e.health}/100${e.stale?" \xB7 stale":""}`,cls:e.health<50?"research-flow-danger":"research-flow-muted"})}alert(n,e,t){let s=n.createDiv({cls:"research-flow-alert-section"});s.createEl("a",{text:e.name}).addEventListener("click",r=>{r.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),s.createDiv({text:t==="blocker"?e.blocker||"Blocked":t==="stale"?`No recent activity for ${de}+ days.`:"Project flagged for attention."})}taskRow(n,e){let t=n.createDiv({cls:"research-flow-task-row"}),s=t.createEl("input",{type:"checkbox"});s.checked=!1,s.addEventListener("change",()=>void this.completeTask(e)),t.createEl("a",{text:e.name}).addEventListener("click",r=>{r.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),e.project&&t.createSpan({text:` \xB7 ${e.project}`,cls:"research-flow-muted"})}careerRow(n,e){let t=n.createDiv({cls:"research-flow-list-row"});t.createEl("a",{text:`${e.role} \u2014 ${e.company}`}).addEventListener("click",a=>{a.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),t.createSpan({text:` \xB7 ${e.deadline?_(e.deadline):"no deadline"} \xB7 ${e.status}`,cls:"research-flow-muted"})}readingRow(n,e){let t=n.createDiv({cls:"research-flow-list-row"});t.createEl("a",{text:e.name}).addEventListener("click",a=>{a.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),t.createSpan({text:` \xB7 ${e.status}${e.project?` \xB7 ${e.project}`:""}`,cls:"research-flow-muted"})}ideaRow(n,e){let t=n.createDiv({cls:"research-flow-list-row"});t.createEl("a",{text:e.name}).addEventListener("click",a=>{a.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),t.createSpan({text:` \xB7 ${e.domain||"General"} \xB7 ${e.kind}`,cls:"research-flow-muted"})}healthRow(n,e){let t=n.createDiv({cls:"research-flow-list-row"});t.createSpan({text:e.name}),t.createSpan({text:` \xB7 ${e.progress}% \xB7 health ${e.health}/100 \xB7 ${e.deadline?_(e.deadline):"no deadline"}`,cls:"research-flow-muted"})}async completeTask(n){let e=await this.app.vault.read(n.file),t=L(e,"status","done");t!==e&&(await this.app.vault.modify(n.file,t),await he(100),n.project&&await this.plugin.syncProject(n.project),n.workDate&&await this.plugin.syncDailyNote(n.workDate),this.plugin.scheduleRefresh())}},H=class extends l.Modal{constructor(n,e){super(n),this.onSubmit=e}onOpen(){this.contentEl.empty(),this.contentEl.createEl("h2",{text:"New Project"});let n=E(this.contentEl,"Project name","Astronomy Agent"),e=j(this.contentEl,"Domain",["ML","Quantum","General"]),t=j(this.contentEl,"Project type",["Research","Project"]),s=j(this.contentEl,"Priority",["high","medium","low"]),a=E(this.contentEl,"Deadline","","date");A(this,this.contentEl,async()=>{if(!n.value.trim()){new l.Notice("Project name cannot be empty.");return}await this.onSubmit(n.value.trim(),e.value,t.value,s.value,a.value),this.close()}),n.focus()}onClose(){this.contentEl.empty()}},M=class extends l.Modal{constructor(n,e){super(n),this.onSubmit=e}onOpen(){this.contentEl.empty(),this.contentEl.createEl("h2",{text:"New Research Idea"});let n=E(this.contentEl,"Idea name","Exclusive attention experiment"),e=j(this.contentEl,"Domain",["ML","Quantum","General"]),t=j(this.contentEl,"Idea type",["Research","Project"]),s=j(this.contentEl,"Priority",["high","medium","low"]);A(this,this.contentEl,async()=>{if(!n.value.trim()){new l.Notice("Idea name cannot be empty.");return}await this.onSubmit(n.value.trim(),e.value,t.value,s.value),this.close()})}onClose(){this.contentEl.empty()}},V=class extends l.Modal{constructor(n,e,t){super(n),this.projects=e,this.onSubmit=t}onOpen(){this.contentEl.empty(),this.contentEl.createEl("h2",{text:"New Task"});let n=E(this.contentEl,"Task name","Run baseline experiment"),e=j(this.contentEl,"Project",["",...this.projects]),t=E(this.contentEl,"Work date",F(),"date"),s=E(this.contentEl,"Due date","","date"),a=j(this.contentEl,"Priority",["high","medium","low"]);A(this,this.contentEl,async()=>{if(!n.value.trim()){new l.Notice("Task name cannot be empty.");return}await this.onSubmit(n.value.trim(),e.value,t.value||F(),s.value,a.value),this.close()})}onClose(){this.contentEl.empty()}},B=class extends l.Modal{constructor(n,e,t){super(n),this.projects=e,this.onSubmit=t}onOpen(){this.contentEl.empty(),this.contentEl.createEl("h2",{text:"New Reading"});let n=E(this.contentEl,"Title","Paper / article title"),e=E(this.contentEl,"URL","https://"),t=j(this.contentEl,"Type",["paper","article","book","documentation","video","other"]),s=j(this.contentEl,"Related project",["",...this.projects]);A(this,this.contentEl,async()=>{if(!n.value.trim()){new l.Notice("Reading title cannot be empty.");return}await this.onSubmit(n.value.trim(),e.value,t.value,s.value),this.close()})}onClose(){this.contentEl.empty()}},K=class extends l.Modal{constructor(n,e,t){super(n),this.projects=e,this.onSubmit=t}onOpen(){this.contentEl.empty(),this.contentEl.createEl("h2",{text:"New Career Opportunity"});let n=E(this.contentEl,"Company","Company"),e=E(this.contentEl,"Role","ML Researcher"),t=E(this.contentEl,"Deadline","","date"),s=E(this.contentEl,"Match %","0","number"),a=j(this.contentEl,"Related project",["",...this.projects]);A(this,this.contentEl,async()=>{if(!n.value.trim()||!e.value.trim()){new l.Notice("Company and role are required.");return}await this.onSubmit(n.value.trim(),e.value.trim(),t.value,s.value||"0",a.value),this.close()})}onClose(){this.contentEl.empty()}},J=class extends l.PluginSettingTab{constructor(n,e){super(n,e),this.plugin=e}display(){let{containerEl:n}=this;n.empty(),n.createEl("h2",{text:"ResearchFlow"}),n.createEl("p",{text:`Version ${G}. Markdown-first research/project operating system.`});for(let[e,t]of[["projectsFolder","Projects folder"],["ideasFolder","Ideas folder"],["tasksFolder","Tasks folder"],["careerFolder","Career folder"],["readingFolder","Reading folder"],["dailyFolder","Daily folder"]])new l.Setting(n).setName(t).addText(s=>s.setValue(this.plugin.settings[e]).onChange(async a=>{this.plugin.settings[e]=a.trim(),await this.plugin.saveSettings()}))}};function E(i,n,e,t="text"){i.createEl("label",{text:n});let s=i.createEl("input",{type:t,placeholder:e});return s.style.width="100%",s}function j(i,n,e){i.createEl("label",{text:n});let t=i.createEl("select");t.style.width="100%";for(let s of e)t.createEl("option",{value:s,text:s||"None"});return t}function A(i,n,e){let t=n.createDiv();t.createEl("button",{text:"Cancel"}).onclick=()=>i.close(),t.createEl("button",{text:"Create",cls:"mod-cta"}).onclick=()=>void e()}function h(i){if(i==null)return;let n=String(i).trim();return n&&n!=="null"?n:void 0}function ae(i,n){let e=Number(i);return Number.isFinite(e)?e:n}function re(i){return i===!0||String(i).toLowerCase()==="true"}function S(i){if(i)return i.replace(/^\[\[/,"").replace(/\]\]$/,"").trim()}function D(i){let n=(i!=null?i:"").toLowerCase();return n==="done"||n==="completed"}function x(i){let n=(i!=null?i:"").toLowerCase();return n==="completed"||n==="archived"||n==="cancelled"}function oe(i){return["read","completed","done"].includes(i.toLowerCase())}function ce(i){return["rejected","withdrawn","closed","accepted","archived"].includes(i.toLowerCase())}function le(i){return i.toLowerCase()==="high"?0:i.toLowerCase()==="medium"?1:2}function pe(i,n){return!i&&!n?0:i?n?i.localeCompare(n):-1:1}function je(i){let n=z(i);return n?Math.ceil((n.getTime()-new Date(F()).getTime())/864e5):99999}function z(i){let n=/^(\d{4})-(\d{2})-(\d{2})$/.exec(i);return n?new Date(Number(n[1]),Number(n[2])-1,Number(n[3])):null}function q(i){return`${i.getFullYear()}-${String(i.getMonth()+1).padStart(2,"0")}-${String(i.getDate()).padStart(2,"0")}`}function F(){return q(new Date)}function _(i){let n=z(i);return n?n.toLocaleDateString(void 0,{day:"numeric",month:"short",year:"numeric"}):i}function T(i){return i.trim().replace(/[\\/:*?"<>|#^]/g,"-").replace(/\s+/g," ").replace(/-+/g,"-").trim()}function R(i){return i?`"${i.replace(/"/g,'\\"')}"`:""}async function he(i){await new Promise(n=>window.setTimeout(n,i))}function L(i,n,e){let t=new RegExp(`(^${Re(n)}:\\s*)(.*)$`,"m");if(t.test(i))return i.replace(t,`$1${e}`);if(!i.startsWith("---"))return i;let s=i.indexOf("---",3);return s<0?i:i.slice(0,s)+`${n}: ${e}
`+i.slice(s)}function Re(i){return i.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function ue(i,n,e,t){let s=i.indexOf(n),a=i.indexOf(e);return s<0||a<s?i:i.slice(0,s+n.length)+`
${t}
`+i.slice(a)}async function Fe(i,n,e,t,s){let a=await s.vault.read(i),r=ue(a,n,e,t);r!==a&&await s.vault.modify(i,r)}function Se(i){let n=[],e=[],t="",s=!1;for(let a=0;a<i.length;a++){let r=i[a];r==='"'?s&&i[a+1]==='"'?(t+='"',a++):s=!s:r===","&&!s?(e.push(t),t=""):(r===`
`||r==="\r")&&!s?(r==="\r"&&i[a+1]===`
`&&a++,e.push(t),t="",e.some(d=>d.trim())&&n.push(e),e=[]):t+=r}return(t||e.length)&&(e.push(t),e.some(a=>a.trim())&&n.push(e)),n}function Te(i){let n=i.split(`
`),e=[],t=!1;for(let s of n){if(s.includes("RESEARCHFLOW:TASKS:START")){t=!0;continue}if(s.includes("RESEARCHFLOW:TASKS:END")){t=!1;continue}t||(/^## (Work Log|Decisions|Blockers|Ideas|Career|Reading)/.test(s)||/^- /.test(s))&&e.push(s)}return e.slice(0,40).join(`
`)}
