var H=Object.defineProperty;var ge=Object.getOwnPropertyDescriptor;var fe=Object.getOwnPropertyNames;var ye=Object.prototype.hasOwnProperty;var we=(a,n)=>{for(var e in n)H(a,e,{get:n[e],enumerable:!0})},ve=(a,n,e,t)=>{if(n&&typeof n=="object"||typeof n=="function")for(let s of fe(n))!ye.call(a,s)&&s!==e&&H(a,s,{get:()=>n[s],enumerable:!(t=ge(n,s))||t.enumerable});return a};var ke=a=>ve(H({},"__esModule",{value:!0}),a);var $e={};we($e,{default:()=>N});module.exports=ke($e);var r=require("obsidian"),D="research-flow-home",Fe="0.9.0",le=14,be={projectsFolder:"02_Projects",ideasFolder:"03_Ideas",tasksFolder:"04_Tasks",careerFolder:"05_Career",readingFolder:"06_Reading",dailyFolder:"07_Daily"},N=class extends r.Plugin{constructor(){super(...arguments);this.syncing=!1;this.refreshTimer=null}async onload(){await this.loadSettings(),this.registerView(D,e=>new O(e,this)),this.addRibbonIcon("layout-dashboard","Open ResearchFlow",()=>void this.activateView()),this.addCommand({id:"open-home",name:"Open Home",callback:()=>void this.activateView()}),this.addCommand({id:"new-project",name:"New Project",callback:()=>void this.createProject()}),this.addCommand({id:"new-research-idea",name:"New Research Idea",callback:()=>void this.createResearchIdea()}),this.addCommand({id:"new-task",name:"New Task",callback:()=>void this.createTask()}),this.addCommand({id:"open-today",name:"Open Today's Daily Note",callback:()=>void this.openDailyNote()}),this.addCommand({id:"new-reading",name:"New Reading",callback:()=>void this.createReading()}),this.addCommand({id:"new-career-opportunity",name:"New Career Opportunity",callback:()=>void this.createCareerOpportunity()}),this.addCommand({id:"import-career-csv",name:"Import Career CSV",callback:()=>void this.importCareerCSV()}),this.addCommand({id:"weekly-summary",name:"Generate Weekly Research Summary",callback:()=>void this.generateWeeklySummary()}),this.addCommand({id:"validate-vault",name:"Validate ResearchFlow Relationships",callback:()=>void this.validateVault()}),this.addSettingTab(new J(this.app,this)),await this.ensureFolders(),this.registerEvent(this.app.metadataCache.on("changed",e=>{e instanceof r.TFile&&this.handleFileChange(e)})),this.registerEvent(this.app.vault.on("modify",e=>{e instanceof r.TFile&&this.handleFileChange(e)})),this.registerEvent(this.app.vault.on("create",e=>{e instanceof r.TFile&&this.handleFileChange(e)})),this.registerEvent(this.app.vault.on("delete",()=>this.scheduleRefresh())),this.registerEvent(this.app.vault.on("rename",()=>this.scheduleRefresh())),this.registerEvent(this.app.workspace.on("active-leaf-change",()=>this.scheduleRefresh()))}onunload(){this.refreshTimer!==null&&window.clearTimeout(this.refreshTimer)}async loadSettings(){this.settings=Object.assign({},be,await this.loadData())}async saveSettings(){await this.saveData(this.settings)}async ensureFolders(){for(let e of[this.settings.projectsFolder,this.settings.ideasFolder,this.settings.tasksFolder,this.settings.careerFolder,this.settings.readingFolder,this.settings.dailyFolder]){let t=(0,r.normalizePath)(e);this.app.vault.getAbstractFileByPath(t)||await this.app.vault.createFolder(t)}}async activateView(){let{workspace:e}=this.app,t=null,s=e.getLeavesOfType(D);s.length>0?t=s[0]:t=e.getLeaf(!0),t&&(await t.setViewState({type:D,active:!0}),e.revealLeaf(t))}scheduleRefresh(){this.refreshTimer!==null&&window.clearTimeout(this.refreshTimer),this.refreshTimer=window.setTimeout(()=>{this.refreshTimer=null,this.refreshHomeViews()},150)}async refreshHomeViews(){for(let e of this.app.workspace.getLeavesOfType(D))e.view instanceof O&&await e.view.render()}async handleFileChange(e){var c,l,d;if(this.syncing){this.scheduleRefresh();return}let t=this.app.metadataCache.getFileCache(e),s=String((l=(c=t==null?void 0:t.frontmatter)==null?void 0:c.type)!=null?l:"");if(this.isInFolder(e,this.settings.dailyFolder))await this.syncTaskStatusesFromDailyNote(e);else if(s==="task"){let h=p((d=t==null?void 0:t.frontmatter)==null?void 0:d.project);h&&await this.syncProject(h)}this.scheduleRefresh()}isInFolder(e,t){let s=(0,r.normalizePath)(t).replace(/\/$/,"")+"/";return e.path.startsWith(s)}getManagedMarkdownFiles(){let e=[],t=new Set,s=[this.settings.projectsFolder,this.settings.ideasFolder,this.settings.tasksFolder,this.settings.careerFolder,this.settings.readingFolder,this.settings.dailyFolder],i=c=>{for(let l of c.children)l instanceof r.TFile&&l.extension==="md"?t.has(l.path)||(t.add(l.path),e.push(l)):l instanceof r.TFolder&&i(l)};for(let c of s){let l=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(c));l instanceof r.TFolder&&i(l)}return e}getManagedFilesInFolder(e){let t=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(e));if(!(t instanceof r.TFolder))return[];let s=[],i=c=>{for(let l of c.children)l instanceof r.TFile&&l.extension==="md"?s.push(l):l instanceof r.TFolder&&i(l)};return i(t),s}async getData(){var o,y,v,k,f,m,w,b,$,z,Q,U,Y,X,Z,ee,te;let e=this.getManagedMarkdownFiles(),t=[],s=[],i=[],c=[],l=[];for(let g of e){let u=(o=this.app.metadataCache.getFileCache(g))==null?void 0:o.frontmatter;if(!u)continue;let C=String((y=u.type)!=null?y:"");if(C==="project"){let ne=ie(u.progress,0),ue=p(u.blocker),me=ae(u.attention),I=this.projectLastActivity(g,e,u),se=this.projectIsStale(u.status,I);t.push({file:g,name:g.basename,domain:(v=p(u.domain))!=null?v:"",status:(k=p(u.status))!=null?k:"active",priority:(f=p(u.priority))!=null?f:"medium",progress:Math.max(0,Math.min(100,ne)),blocker:ue,attention:me,deadline:p(u.deadline),start:p(u.start),nextAction:p(u.next_action),lastActivity:I,stale:se,health:this.calculateProjectHealth(u,se,I,ne)})}else C==="task"?s.push({file:g,name:g.basename,status:(m=p(u.status))!=null?m:"todo",priority:(w=p(u.priority))!=null?w:"medium",project:T(p(u.project)),workDate:p(u.work_date),due:p(u.due)}):C==="reading"?i.push({file:g,name:g.basename,url:p(u.url),type:($=(b=p(u.reading_type))!=null?b:p(u.type_name))!=null?$:"article",status:(z=p(u.status))!=null?z:"unread",added:p(u.added),read:p(u.read),project:T(p(u.project))}):C==="career"?c.push({file:g,company:(Q=p(u.company))!=null?Q:"",role:(U=p(u.role))!=null?U:g.basename,deadline:p(u.deadline),match:ie(u.match,0),status:(Y=p(u.status))!=null?Y:"saved",applied:p(u.applied),feedback:p(u.feedback),documents:p(u.documents),project:T(p(u.project))}):C==="idea"&&l.push({file:g,name:g.basename,domain:(X=p(u.domain))!=null?X:"",kind:(Z=p(u.kind))!=null?Z:"research",status:(ee=p(u.status))!=null?ee:"seed",priority:(te=p(u.priority))!=null?te:"medium",project:T(p(u.project))})}let d=S(),h=s.filter(g=>g.workDate===d&&!P(g.status));return{projects:t,tasks:s,todayTasks:h,blockers:t.filter(g=>g.blocker&&g.blocker.toLowerCase()!=="none"),attention:t.filter(g=>g.attention),staleProjects:t.filter(g=>g.stale&&!x(g.status)),readings:i,career:c.sort((g,u)=>de(g.deadline,u.deadline)),ideas:l}}projectLastActivity(e,t,s){var l,d;let i=e.stat.mtime;for(let h of t){let o=(l=this.app.metadataCache.getFileCache(h))==null?void 0:l.frontmatter;String((d=o==null?void 0:o.type)!=null?d:"")==="task"&&T(p(o==null?void 0:o.project))===e.basename&&(i=Math.max(i,h.stat.mtime))}let c=p(s.last_activity);if(c){let h=Date.parse(c);Number.isFinite(h)&&(i=Math.max(i,h))}return i}projectIsStale(e,t){return x(e)?!1:Date.now()-t>le*864e5}calculateProjectHealth(e,t,s,i){var d;let c=100;p(e.blocker)&&((d=p(e.blocker))==null?void 0:d.toLowerCase())!=="none"&&(c-=30),ae(e.attention)&&(c-=15),t&&(c-=25);let l=p(e.deadline);if(l){let h=Ee(l);h<0?c-=25:h<=7&&i<80&&(c-=15)}return Date.now()-s>30*864e5&&(c-=10),Math.max(0,Math.min(100,c))}async createProject(){new _(this.app,async(e,t,s,i,c)=>{let l=R(e);if(!l){new r.Notice("Project name cannot be empty.");return}let d=(0,r.normalizePath)(`${this.settings.projectsFolder}/${l}.md`);if(this.app.vault.getAbstractFileByPath(d)){new r.Notice("A project with this name already exists.");return}let h=`---
type: project
domain: ${t}
status: active
priority: ${i}
progress: 0
start: ${S()}
deadline: ${c}
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
`,o=await this.app.vault.create(d,h);new r.Notice(`Created project: ${e}`),await this.syncProject(e),await this.app.workspace.getLeaf(!0).openFile(o)})}async createResearchIdea(){new M(this.app,async(e,t,s,i)=>{let c=R(e);if(!c){new r.Notice("Idea name cannot be empty.");return}let l=(0,r.normalizePath)(`${this.settings.ideasFolder}/${c}.md`);if(this.app.vault.getAbstractFileByPath(l)){new r.Notice("An idea with this name already exists.");return}let d=`---
type: idea
domain: ${t}
kind: ${s}
status: seed
priority: ${i}
created: ${S()}
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
`,h=await this.app.vault.create(l,d);new r.Notice(`Created research idea: ${e}`),await this.app.workspace.getLeaf(!0).openFile(h)})}async createTask(){let e=(await this.getData()).projects.map(t=>t.name).sort((t,s)=>t.localeCompare(s));new V(this.app,e,async(t,s,i,c,l)=>{let d=R(t);if(!d){new r.Notice("Task name cannot be empty.");return}let h=(0,r.normalizePath)(`${this.settings.tasksFolder}/${d}.md`);if(this.app.vault.getAbstractFileByPath(h)){new r.Notice("A task with this name already exists.");return}let o=s?`"[[${s}]]"`:"",y=`---
type: task
status: todo
priority: ${l}
project: ${o}
created: ${S()}
work_date: ${i}
due: ${c}
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

- [[${i}]]
`,v=await this.app.vault.create(h,y);await this.ensureDailyNote(i),s&&await this.syncProject(s),await this.syncDailyNote(i),new r.Notice(`Created task: ${t}`),await this.app.workspace.getLeaf(!0).openFile(v)})}async createReading(){let e=(await this.getData()).projects.map(t=>t.name).sort();new B(this.app,e,async(t,s,i,c)=>{let l=R(t);if(!l){new r.Notice("Reading title cannot be empty.");return}let d=(0,r.normalizePath)(`${this.settings.readingFolder}/${l}.md`);if(this.app.vault.getAbstractFileByPath(d)){new r.Notice("A reading item with this name already exists.");return}let h=`---
type: reading
reading_type: ${i}
status: unread
added: ${S()}
read:
url: ${s}
project: ${c?`"[[${c}]]"`:""}
---

# ${t}

## Why I Saved This

## Notes

## Takeaways

## Related Projects

## Related Ideas
`,o=await this.app.vault.create(d,h);new r.Notice(`Added reading: ${t}`),await this.app.workspace.getLeaf(!0).openFile(o)})}async createCareerOpportunity(){let e=(await this.getData()).projects.map(t=>t.name).sort();new K(this.app,e,async(t,s,i,c,l)=>{let d=R(`${t} - ${s}`);if(!d){new r.Notice("Company and role are required.");return}let h=(0,r.normalizePath)(`${this.settings.careerFolder}/${d}.md`);if(this.app.vault.getAbstractFileByPath(h)){new r.Notice("That career opportunity already exists.");return}let o=`---
type: career
company: ${t}
role: ${s}
deadline: ${i}
match: ${c}
status: saved
applied:
feedback:
documents:
project: ${l?`"[[${l}]]"`:""}
---

# ${s} \u2014 ${t}

## Opportunity

## Documents

## Application

## Feedback

## Related Projects

## Daily Work
`,y=await this.app.vault.create(h,o);new r.Notice(`Added opportunity: ${t} \u2014 ${s}`),await this.app.workspace.getLeaf(!0).openFile(y)})}async openDailyNote(e=S()){let t=await this.ensureDailyNote(e);await this.syncDailyNote(e),await this.app.workspace.getLeaf(!0).openFile(t)}async ensureDailyNote(e){let t=(0,r.normalizePath)(`${this.settings.dailyFolder}/${e}.md`),s=this.app.vault.getAbstractFileByPath(t);if(s instanceof r.TFile)return s;let i=await this.app.vault.create(t,this.createDailyNoteContent(e));return new r.Notice(`Created daily note: ${e}`),i}createDailyNoteContent(e){return`---
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
`}async syncDailyNote(e){var l,d;let t=await this.ensureDailyNote(e),s=this.getManagedFilesInFolder(this.settings.tasksFolder),i=[];for(let h of s){let o=(l=this.app.metadataCache.getFileCache(h))==null?void 0:l.frontmatter;String((d=o==null?void 0:o.type)!=null?d:"")==="task"&&p(o==null?void 0:o.work_date)===e&&i.push(`- ${P(p(o==null?void 0:o.status))?"[x]":"[ ]"} [[${h.basename}]]`)}i.sort((h,o)=>h.localeCompare(o));let c=i.length?i.join(`
`):"_No tasks scheduled._";await Se(t,"<!-- RESEARCHFLOW:TASKS:START -->","<!-- RESEARCHFLOW:TASKS:END -->",c,this.app)}async syncTaskStatusesFromDailyNote(e){var o,y,v,k;if(this.syncing)return;let t=await this.app.vault.read(e),s=t.indexOf("<!-- RESEARCHFLOW:TASKS:START -->"),i=t.indexOf("<!-- RESEARCHFLOW:TASKS:END -->");if(s<0||i<s)return;let c=t.slice(s,i),l=/^- \[([ xX])\] \[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/gm,d=[],h;for(;(h=l.exec(c))!==null;){let f=this.app.metadataCache.getFirstLinkpathDest(h[2].trim(),e.path);if(!(f instanceof r.TFile))continue;let m=(o=this.app.metadataCache.getFileCache(f))==null?void 0:o.frontmatter;String((y=m==null?void 0:m.type)!=null?y:"")==="task"&&d.push({file:f,status:h[1].toLowerCase()==="x"?"done":"todo"})}if(d.length){this.syncing=!0;try{let f=new Set;for(let m of d){let w=await this.app.vault.read(m.file),b=L(w,"status",m.status);b!==w&&await this.app.vault.modify(m.file,b);let $=T(p((k=(v=this.app.metadataCache.getFileCache(m.file))==null?void 0:v.frontmatter)==null?void 0:k.project));$&&f.add($)}await he(100);for(let m of f)await this.syncProject(m)}finally{this.syncing=!1}this.scheduleRefresh()}}async syncProject(e){let t=T(e);if(!t)return;let s=this.app.metadataCache.getFirstLinkpathDest(t,"");if(!(s instanceof r.TFile))return;let i=this.getManagedFilesInFolder(this.settings.tasksFolder).filter(f=>{var w,b;let m=(w=this.app.metadataCache.getFileCache(f))==null?void 0:w.frontmatter;return String((b=m==null?void 0:m.type)!=null?b:"")==="task"&&T(p(m==null?void 0:m.project))===t}),c=i.filter(f=>{var m,w;return P(p((w=(m=this.app.metadataCache.getFileCache(f))==null?void 0:m.frontmatter)==null?void 0:w.status))}).length,l=i.length?Math.round(c/i.length*100):0,d=await this.app.vault.read(s),h=L(d,"progress",String(l)),o=L(h,"last_activity",new Date().toISOString()),y=i.sort((f,m)=>f.basename.localeCompare(m.basename)).map(f=>{var w,b;let m=p((b=(w=this.app.metadataCache.getFileCache(f))==null?void 0:w.frontmatter)==null?void 0:b.status);return`- ${P(m)?"[x]":"[ ]"} [[${f.basename}]]`}),v=y.length?y.join(`
`):"_No tasks yet._",k=o;if(k.includes("<!-- RESEARCHFLOW:PROJECT:TASKS:START -->"))k=pe(k,"<!-- RESEARCHFLOW:PROJECT:TASKS:START -->","<!-- RESEARCHFLOW:PROJECT:TASKS:END -->",v);else{let f="## Tasks",m=k.indexOf(f);if(m>=0){let w=`

<!-- RESEARCHFLOW:PROJECT:TASKS:START -->
${v}
<!-- RESEARCHFLOW:PROJECT:TASKS:END -->`;k=k.slice(0,m+f.length)+w+k.slice(m+f.length)}}k!==d&&await this.app.vault.modify(s,k)}async updateProjectProgress(e){await this.syncProject(e)}async importCareerCSV(){let e=this.app.workspace.containerEl.createEl("input",{type:"file",cls:"research-flow-file-input"});e.accept=".csv,text/csv",e.hide(),e.addEventListener("change",()=>{var s;let t=(s=e.files)==null?void 0:s.item(0);if(!t){e.remove();return}this.processCareerCSV(t).finally(()=>e.remove())}),e.click()}async processCareerCSV(e){let t=await e.text(),s=Te(t);if(s.length<2){new r.Notice("CSV contains no opportunity rows.");return}let i=s[0].map(l=>l.trim().toLowerCase().replace(/\s+/g,"_")),c=0;for(let l of s.slice(1)){let d={};i.forEach((f,m)=>{var w;d[f]=(w=l[m])!=null?w:""});let h=d.company||d.organization||"Unknown Company",o=d.role||d.title||"Opportunity",y=R(`${h} - ${o}`),v=(0,r.normalizePath)(`${this.settings.careerFolder}/${y}.md`);if(this.app.vault.getAbstractFileByPath(v))continue;let k=`---
type: career
company: ${j(h)}
role: ${j(o)}
deadline: ${j(d.deadline||d.last_date)}
match: ${d.match||0}
status: ${j(d.status||"saved")}
applied: ${j(d.applied)}
feedback: ${j(d.feedback)}
documents: ${j(d.documents||d.document_links)}
project: ${j(d.project)}
source: ${j(d.link||d.url)}
---

# ${o} \u2014 ${h}

## Opportunity

Source: ${d.link||d.url||""}

## Documents

${d.documents||d.document_links||""}

## Application

## Feedback

## Related Projects

## Daily Work
`;await this.app.vault.create(v,k),c++}new r.Notice(`Imported ${c} career opportunities.`),this.scheduleRefresh()}async generateWeeklySummary(){let e=new Date,t=new Date(e.getTime()-6*864e5),s=this.getManagedFilesInFolder(this.settings.dailyFolder),i=[];for(let h of s){let o=G(h.basename);if(!o||o<t||o>e)continue;let y=await this.app.vault.read(h);i.push(`## ${h.basename}
${Re(y)}`)}let c=(0,r.normalizePath)(`${this.settings.dailyFolder}/Weekly Summary ${q(e)}.md`),l=`---
type: weekly_summary
week_ending: ${q(e)}
---

# ResearchFlow Weekly Summary

${i.join(`

`)||"No daily notes found."}

## Retrospective

### Wins

### Blockers

### Decisions

### Next Week
`,d=this.app.vault.getAbstractFileByPath(c);d instanceof r.TFile?await this.app.vault.modify(d,l):await this.app.vault.create(c,l),new r.Notice("Weekly summary generated.")}async validateVault(){let e=await this.getData(),t=[],s=new Set(e.projects.map(i=>i.name));for(let i of e.tasks)i.project&&!s.has(i.project)&&t.push(`Task ${i.name}: missing project ${i.project}`),i.workDate||t.push(`Task ${i.name}: missing work_date`);for(let i of e.projects)i.file.path||t.push(`Project ${i.name}: invalid path`);t.length?new r.Notice(`${t.length} relationship issue(s) found. Check the affected notes.`):new r.Notice("ResearchFlow validation passed.")}},O=class extends r.ItemView{constructor(n,e){super(n),this.plugin=e}getViewType(){return D}getDisplayText(){return"ResearchFlow"}getIcon(){return"layout-dashboard"}async onOpen(){await this.render()}async onClose(){this.contentEl.empty()}async render(){let n=await this.plugin.getData(),e=this.contentEl;e.empty(),e.addClass("research-flow-home");let t=e.createDiv({cls:"research-flow-header"});t.createEl("h1",{text:"ResearchFlow"}),t.createEl("p",{text:`Research operating system \xB7 v${Fe}`,cls:"research-flow-subtitle"});let s=t.createDiv({cls:"research-flow-actions"});this.button(s,"New Project","plus",()=>void this.plugin.createProject()),this.button(s,"New Task","check-square",()=>void this.plugin.createTask()),this.button(s,"New Idea","lightbulb",()=>void this.plugin.createResearchIdea()),this.button(s,"Today","calendar",()=>void this.plugin.openDailyNote()),this.button(s,"Reading","book-open",()=>void this.plugin.createReading()),this.button(s,"Career","briefcase",()=>void this.plugin.createCareerOpportunity()),this.button(s,"Refresh","refresh-cw",()=>void this.render()),this.stats(e,n),this.section(e,"Active Projects","folder-kanban");let i=n.projects.filter(o=>!x(o.status));i.length||this.empty(e,"No active projects.");for(let o of i.sort((y,v)=>ce(y.priority)-ce(v.priority)))this.projectCard(e,o);this.section(e,"\u{1F534} Blockers","alert-circle"),n.blockers.length||this.empty(e,"No blockers.");for(let o of n.blockers)this.alert(e,o,"blocker");this.section(e,"\u{1F7E0} Attention","alert-triangle"),n.attention.length||this.empty(e,"Nothing flagged for attention.");for(let o of n.attention)this.alert(e,o,"attention");this.section(e,"\u26A0 Stale Projects","clock"),n.staleProjects.length||this.empty(e,"No stale active projects.");for(let o of n.staleProjects)this.alert(e,o,"stale");this.section(e,"Today's Tasks","check-square"),n.todayTasks.length||this.empty(e,"No incomplete tasks for today.");for(let o of n.todayTasks)this.taskRow(e,o);this.section(e,"Career \u2014 Upcoming","briefcase");let c=n.career.filter(o=>o.deadline&&!oe(o.status)).slice(0,8);c.length||this.empty(e,"No upcoming career opportunities.");for(let o of c)this.careerRow(e,o);this.section(e,"Reading Queue","book-open");let l=n.readings.filter(o=>!re(o.status)).slice(0,8);l.length||this.empty(e,"Reading queue is empty.");for(let o of l)this.readingRow(e,o);this.section(e,"Research Ideas","lightbulb");let d=n.ideas.filter(o=>o.status.toLowerCase()!=="archived").slice(0,8);d.length||this.empty(e,"No active research ideas.");for(let o of d)this.ideaRow(e,o);this.section(e,"Project Health & Timeline","activity");for(let o of n.projects.filter(y=>!x(y.status)).sort((y,v)=>de(y.deadline,v.deadline)).slice(0,12))this.healthRow(e,o);this.section(e,"ResearchFlow","network");let h=e.createDiv({cls:"research-flow-info"});h.createEl("p",{text:"Markdown-first: Projects \u2194 Tasks \u2194 Daily Work \u2194 Reading \u2194 Ideas \u2194 Career."}),h.createEl("p",{text:"Task files are the source of truth for completion; project progress is derived from tasks."})}button(n,e,t,s){let i=n.createEl("button",{cls:"research-flow-action-button"}),c=i.createSpan({cls:"research-flow-action-icon"});(0,r.setIcon)(c,t),i.createSpan({text:e}),i.addEventListener("click",s)}section(n,e,t){let s=n.createDiv({cls:"research-flow-section-header"}),i=s.createSpan({cls:"research-flow-section-icon"});(0,r.setIcon)(i,t),s.createEl("h2",{text:e,cls:"research-flow-section-title"})}empty(n,e){n.createDiv({text:e,cls:"research-flow-empty"})}stats(n,e){let t=n.createDiv({cls:"research-flow-stats"}),s=[["Active Projects",String(e.projects.filter(i=>!x(i.status)).length)],["Open Tasks",String(e.tasks.filter(i=>!P(i.status)).length)],["Today",String(e.todayTasks.length)],["Blocked",String(e.blockers.length)],["Attention",String(e.attention.length)],["Stale",String(e.staleProjects.length)],["Reading Queue",String(e.readings.filter(i=>!re(i.status)).length)],["Career",String(e.career.filter(i=>!oe(i.status)).length)]];for(let[i,c]of s){let l=t.createDiv({cls:"research-flow-stat"});l.createDiv({text:c,cls:"research-flow-stat-value"}),l.createDiv({text:i,cls:"research-flow-stat-label"})}}projectCard(n,e){let t=n.createDiv({cls:"research-flow-project-card"});t.createEl("a",{text:e.name}).addEventListener("click",l=>{l.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),t.createDiv({text:`${e.domain||"General"} \xB7 ${e.priority} \xB7 ${e.progress}%`,cls:"research-flow-project-meta"}),t.createDiv({cls:"research-flow-progress"}).createDiv({cls:"research-flow-progress-fill"}).setCssProps({"--research-flow-progress":`${e.progress}%`}),e.nextAction&&t.createDiv({text:`Next: ${e.nextAction}`,cls:"research-flow-muted"}),e.deadline&&t.createDiv({text:`Deadline: ${W(e.deadline)}`,cls:"research-flow-muted"}),t.createDiv({text:`Health: ${e.health}/100${e.stale?" \xB7 stale":""}`,cls:e.health<50?"research-flow-danger":"research-flow-muted"})}alert(n,e,t){let s=n.createDiv({cls:"research-flow-alert-section"});s.createEl("a",{text:e.name}).addEventListener("click",c=>{c.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),s.createDiv({text:t==="blocker"?e.blocker||"Blocked":t==="stale"?`No recent activity for ${le}+ days.`:"Project flagged for attention."})}taskRow(n,e){let t=n.createDiv({cls:"research-flow-task-row"}),s=t.createEl("input",{type:"checkbox"});s.checked=!1,s.addEventListener("change",()=>void this.completeTask(e)),t.createEl("a",{text:e.name}).addEventListener("click",c=>{c.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),e.project&&t.createSpan({text:` \xB7 ${e.project}`,cls:"research-flow-muted"})}careerRow(n,e){let t=n.createDiv({cls:"research-flow-list-row"});t.createEl("a",{text:`${e.role} \u2014 ${e.company}`}).addEventListener("click",i=>{i.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),t.createSpan({text:` \xB7 ${e.deadline?W(e.deadline):"no deadline"} \xB7 ${e.status}`,cls:"research-flow-muted"})}readingRow(n,e){let t=n.createDiv({cls:"research-flow-list-row"});t.createEl("a",{text:e.name}).addEventListener("click",i=>{i.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),t.createSpan({text:` \xB7 ${e.status}${e.project?` \xB7 ${e.project}`:""}`,cls:"research-flow-muted"})}ideaRow(n,e){let t=n.createDiv({cls:"research-flow-list-row"});t.createEl("a",{text:e.name}).addEventListener("click",i=>{i.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),t.createSpan({text:` \xB7 ${e.domain||"General"} \xB7 ${e.kind}`,cls:"research-flow-muted"})}healthRow(n,e){let t=n.createDiv({cls:"research-flow-list-row"});t.createSpan({text:e.name}),t.createSpan({text:` \xB7 ${e.progress}% \xB7 health ${e.health}/100 \xB7 ${e.deadline?W(e.deadline):"no deadline"}`,cls:"research-flow-muted"})}async completeTask(n){let e=await this.app.vault.read(n.file),t=L(e,"status","done");t!==e&&(await this.app.vault.modify(n.file,t),await he(100),n.project&&await this.plugin.syncProject(n.project),n.workDate&&await this.plugin.syncDailyNote(n.workDate),this.plugin.scheduleRefresh())}},_=class extends r.Modal{constructor(n,e){super(n),this.onSubmit=e}onOpen(){this.contentEl.empty(),new r.Setting(this.contentEl).setName("New Project").setHeading();let n=F(this.contentEl,"Project name","Astronomy Agent"),e=E(this.contentEl,"Domain",["ML","Quantum","General"]),t=E(this.contentEl,"Project type",["Research","Project"]),s=E(this.contentEl,"Priority",["high","medium","low"]),i=F(this.contentEl,"Deadline","","date");A(this,this.contentEl,async()=>{if(!n.value.trim()){new r.Notice("Project name cannot be empty.");return}await this.onSubmit(n.value.trim(),e.value,t.value,s.value,i.value),this.close()}),n.focus()}onClose(){this.contentEl.empty()}},M=class extends r.Modal{constructor(n,e){super(n),this.onSubmit=e}onOpen(){this.contentEl.empty(),new r.Setting(this.contentEl).setName("New Research Idea").setHeading();let n=F(this.contentEl,"Idea name","Exclusive attention experiment"),e=E(this.contentEl,"Domain",["ML","Quantum","General"]),t=E(this.contentEl,"Idea type",["Research","Project"]),s=E(this.contentEl,"Priority",["high","medium","low"]);A(this,this.contentEl,async()=>{if(!n.value.trim()){new r.Notice("Idea name cannot be empty.");return}await this.onSubmit(n.value.trim(),e.value,t.value,s.value),this.close()})}onClose(){this.contentEl.empty()}},V=class extends r.Modal{constructor(n,e,t){super(n),this.projects=e,this.onSubmit=t}onOpen(){this.contentEl.empty(),new r.Setting(this.contentEl).setName("New Task").setHeading();let n=F(this.contentEl,"Task name","Run baseline experiment"),e=E(this.contentEl,"Project",["",...this.projects]),t=F(this.contentEl,"Work date",S(),"date"),s=F(this.contentEl,"Due date","","date"),i=E(this.contentEl,"Priority",["high","medium","low"]);A(this,this.contentEl,async()=>{if(!n.value.trim()){new r.Notice("Task name cannot be empty.");return}await this.onSubmit(n.value.trim(),e.value,t.value||S(),s.value,i.value),this.close()})}onClose(){this.contentEl.empty()}},B=class extends r.Modal{constructor(n,e,t){super(n),this.projects=e,this.onSubmit=t}onOpen(){this.contentEl.empty(),new r.Setting(this.contentEl).setName("New Reading").setHeading();let n=F(this.contentEl,"Title","Paper / article title"),e=F(this.contentEl,"URL","https://"),t=E(this.contentEl,"Type",["paper","article","book","documentation","video","other"]),s=E(this.contentEl,"Related project",["",...this.projects]);A(this,this.contentEl,async()=>{if(!n.value.trim()){new r.Notice("Reading title cannot be empty.");return}await this.onSubmit(n.value.trim(),e.value,t.value,s.value),this.close()})}onClose(){this.contentEl.empty()}},K=class extends r.Modal{constructor(n,e,t){super(n),this.projects=e,this.onSubmit=t}onOpen(){this.contentEl.empty(),new r.Setting(this.contentEl).setName("New Career Opportunity").setHeading();let n=F(this.contentEl,"Company","Company"),e=F(this.contentEl,"Role","ML Researcher"),t=F(this.contentEl,"Deadline","","date"),s=F(this.contentEl,"Match %","0","number"),i=E(this.contentEl,"Related project",["",...this.projects]);A(this,this.contentEl,async()=>{if(!n.value.trim()||!e.value.trim()){new r.Notice("Company and role are required.");return}await this.onSubmit(n.value.trim(),e.value.trim(),t.value,s.value||"0",i.value),this.close()})}onClose(){this.contentEl.empty()}},J=class extends r.PluginSettingTab{constructor(n,e){super(n,e),this.plugin=e}getSettingDefinitions(){return[{name:"Projects folder",desc:"Folder used for project pages.",control:{type:"text",key:"projectsFolder"}},{name:"Ideas folder",desc:"Folder used for research ideas.",control:{type:"text",key:"ideasFolder"}},{name:"Tasks folder",desc:"Folder used for detailed task pages.",control:{type:"text",key:"tasksFolder"}},{name:"Career folder",desc:"Folder used for career opportunities.",control:{type:"text",key:"careerFolder"}},{name:"Reading folder",desc:"Folder used for reading items.",control:{type:"text",key:"readingFolder"}},{name:"Daily folder",desc:"Folder used for daily work notes.",control:{type:"text",key:"dailyFolder"}}]}};function F(a,n,e,t="text"){let s=a.createDiv({cls:"research-flow-form-field"});return s.createEl("label",{text:n,cls:"research-flow-form-label"}),s.createEl("input",{type:t,placeholder:e,cls:"research-flow-form-control"})}function E(a,n,e){let t=a.createDiv({cls:"research-flow-form-field"});t.createEl("label",{text:n,cls:"research-flow-form-label"});let s=t.createEl("select",{cls:"research-flow-form-control"});for(let i of e)s.createEl("option",{value:i,text:i||"None"});return s}function A(a,n,e){let t=n.createDiv({cls:"research-flow-modal-buttons"});t.createEl("button",{text:"Cancel"}).addEventListener("click",()=>a.close()),t.createEl("button",{text:"Create",cls:"mod-cta"}).addEventListener("click",()=>void e())}function p(a){if(a==null)return;let n=String(a).trim();return n&&n!=="null"?n:void 0}function ie(a,n){let e=Number(a);return Number.isFinite(e)?e:n}function ae(a){return a===!0||String(a).toLowerCase()==="true"}function T(a){if(a)return a.replace(/^\[\[/,"").replace(/\]\]$/,"").trim()}function P(a){let n=(a!=null?a:"").toLowerCase();return n==="done"||n==="completed"}function x(a){let n=(a!=null?a:"").toLowerCase();return n==="completed"||n==="archived"||n==="cancelled"}function re(a){return["read","completed","done"].includes(a.toLowerCase())}function oe(a){return["rejected","withdrawn","closed","accepted","archived"].includes(a.toLowerCase())}function ce(a){return a.toLowerCase()==="high"?0:a.toLowerCase()==="medium"?1:2}function de(a,n){return!a&&!n?0:a?n?a.localeCompare(n):-1:1}function Ee(a){let n=G(a);return n?Math.ceil((n.getTime()-new Date(S()).getTime())/864e5):99999}function G(a){let n=/^(\d{4})-(\d{2})-(\d{2})$/.exec(a);return n?new Date(Number(n[1]),Number(n[2])-1,Number(n[3])):null}function q(a){return`${a.getFullYear()}-${String(a.getMonth()+1).padStart(2,"0")}-${String(a.getDate()).padStart(2,"0")}`}function S(){return q(new Date)}function W(a){let n=G(a);return n?n.toLocaleDateString(void 0,{day:"numeric",month:"short",year:"numeric"}):a}function R(a){return a.trim().replace(/[\\/:*?"<>|#^]/g,"-").replace(/\s+/g," ").replace(/-+/g,"-").trim()}function j(a){return a?`"${a.replace(/"/g,'\\"')}"`:""}async function he(a){await new Promise(n=>window.setTimeout(n,a))}function L(a,n,e){let t=new RegExp(`(^${je(n)}:\\s*)(.*)$`,"m");if(t.test(a))return a.replace(t,`$1${e}`);if(!a.startsWith("---"))return a;let s=a.indexOf("---",3);return s<0?a:a.slice(0,s)+`${n}: ${e}
`+a.slice(s)}function je(a){return a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function pe(a,n,e,t){let s=a.indexOf(n),i=a.indexOf(e);return s<0||i<s?a:a.slice(0,s+n.length)+`
${t}
`+a.slice(i)}async function Se(a,n,e,t,s){let i=await s.vault.read(a),c=pe(i,n,e,t);c!==i&&await s.vault.modify(a,c)}function Te(a){let n=[],e=[],t="",s=!1;for(let i=0;i<a.length;i++){let c=a[i];c==='"'?s&&a[i+1]==='"'?(t+='"',i++):s=!s:c===","&&!s?(e.push(t),t=""):(c===`
`||c==="\r")&&!s?(c==="\r"&&a[i+1]===`
`&&i++,e.push(t),t="",e.some(l=>l.trim())&&n.push(e),e=[]):t+=c}return(t||e.length)&&(e.push(t),e.some(i=>i.trim())&&n.push(e)),n}function Re(a){let n=a.split(`
`),e=[],t=!1;for(let s of n){if(s.includes("RESEARCHFLOW:TASKS:START")){t=!0;continue}if(s.includes("RESEARCHFLOW:TASKS:END")){t=!1;continue}t||(/^## (Work Log|Decisions|Blockers|Ideas|Career|Reading)/.test(s)||/^- /.test(s))&&e.push(s)}return e.slice(0,40).join(`
`)}
