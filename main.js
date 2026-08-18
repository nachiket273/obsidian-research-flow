var H=Object.defineProperty;var ge=Object.getOwnPropertyDescriptor;var fe=Object.getOwnPropertyNames;var ye=Object.prototype.hasOwnProperty;var we=(a,s)=>{for(var e in s)H(a,e,{get:s[e],enumerable:!0})},ve=(a,s,e,t)=>{if(s&&typeof s=="object"||typeof s=="function")for(let n of fe(s))!ye.call(a,n)&&n!==e&&H(a,n,{get:()=>s[n],enumerable:!(t=ge(s,n))||t.enumerable});return a};var ke=a=>ve(H({},"__esModule",{value:!0}),a);var $e={};we($e,{default:()=>N});module.exports=ke($e);var r=require("obsidian"),D="research-flow-home",Fe="0.9.2",le=14,be={projectsFolder:"02_Projects",ideasFolder:"03_Ideas",tasksFolder:"04_Tasks",careerFolder:"05_Career",readingFolder:"06_Reading",dailyFolder:"07_Daily"},N=class extends r.Plugin{constructor(){super(...arguments);this.syncing=!1;this.refreshTimer=null}async onload(){await this.loadSettings(),this.registerView(D,e=>new O(e,this)),this.addRibbonIcon("layout-dashboard","Open ResearchFlow",()=>void this.activateView()),this.addCommand({id:"open-home",name:"Open Home",callback:()=>void this.activateView()}),this.addCommand({id:"new-project",name:"New Project",callback:()=>void this.createProject()}),this.addCommand({id:"new-research-idea",name:"New Research Idea",callback:()=>void this.createResearchIdea()}),this.addCommand({id:"new-task",name:"New Task",callback:()=>void this.createTask()}),this.addCommand({id:"open-today",name:"Open Today's Daily Note",callback:()=>void this.openDailyNote()}),this.addCommand({id:"new-reading",name:"New Reading",callback:()=>void this.createReading()}),this.addCommand({id:"new-career-opportunity",name:"New Career Opportunity",callback:()=>void this.createCareerOpportunity()}),this.addCommand({id:"import-career-csv",name:"Import Career CSV",callback:()=>void this.importCareerCSV()}),this.addCommand({id:"weekly-summary",name:"Generate Weekly Research Summary",callback:()=>void this.generateWeeklySummary()}),this.addCommand({id:"validate-vault",name:"Validate ResearchFlow Relationships",callback:()=>void this.validateVault()}),this.addSettingTab(new J(this.app,this)),await this.ensureFolders(),this.registerEvent(this.app.metadataCache.on("changed",e=>{e instanceof r.TFile&&this.handleFileChange(e)})),this.registerEvent(this.app.vault.on("modify",e=>{e instanceof r.TFile&&this.handleFileChange(e)})),this.registerEvent(this.app.vault.on("create",e=>{e instanceof r.TFile&&this.handleFileChange(e)})),this.registerEvent(this.app.vault.on("delete",()=>this.scheduleRefresh())),this.registerEvent(this.app.vault.on("rename",()=>this.scheduleRefresh())),this.registerEvent(this.app.workspace.on("active-leaf-change",()=>this.scheduleRefresh()))}onunload(){this.refreshTimer!==null&&window.clearTimeout(this.refreshTimer)}async loadSettings(){this.settings=Object.assign({},be,await this.loadData())}async saveSettings(){await this.saveData(this.settings)}async ensureFolders(){for(let e of[this.settings.projectsFolder,this.settings.ideasFolder,this.settings.tasksFolder,this.settings.careerFolder,this.settings.readingFolder,this.settings.dailyFolder]){let t=(0,r.normalizePath)(e);this.app.vault.getAbstractFileByPath(t)||await this.app.vault.createFolder(t)}}async activateView(){let{workspace:e}=this.app,t=null,n=e.getLeavesOfType(D);n.length>0?t=n[0]:t=e.getLeaf(!0),t&&(await t.setViewState({type:D,active:!0}),e.revealLeaf(t))}scheduleRefresh(){this.refreshTimer!==null&&window.clearTimeout(this.refreshTimer),this.refreshTimer=window.setTimeout(()=>{this.refreshTimer=null,this.refreshHomeViews()},150)}async refreshHomeViews(){for(let e of this.app.workspace.getLeavesOfType(D))e.view instanceof O&&await e.view.render()}async handleFileChange(e){var o,l,d;if(this.syncing){this.scheduleRefresh();return}let t=this.app.metadataCache.getFileCache(e),n=String((l=(o=t==null?void 0:t.frontmatter)==null?void 0:o.type)!=null?l:"");if(this.isInFolder(e,this.settings.dailyFolder))await this.syncTaskStatusesFromDailyNote(e);else if(n==="task"){let h=p((d=t==null?void 0:t.frontmatter)==null?void 0:d.project);h&&await this.syncProject(h)}this.scheduleRefresh()}isInFolder(e,t){let n=(0,r.normalizePath)(t).replace(/\/$/,"")+"/";return e.path.startsWith(n)}getManagedMarkdownFiles(){let e=[],t=new Set,n=[this.settings.projectsFolder,this.settings.ideasFolder,this.settings.tasksFolder,this.settings.careerFolder,this.settings.readingFolder,this.settings.dailyFolder],i=o=>{for(let l of o.children)l instanceof r.TFile&&l.extension==="md"?t.has(l.path)||(t.add(l.path),e.push(l)):l instanceof r.TFolder&&i(l)};for(let o of n){let l=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(o));l instanceof r.TFolder&&i(l)}return e}getManagedFilesInFolder(e){let t=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(e));if(!(t instanceof r.TFolder))return[];let n=[],i=o=>{for(let l of o.children)l instanceof r.TFile&&l.extension==="md"?n.push(l):l instanceof r.TFolder&&i(l)};return i(t),n}async getData(){var c,g,w,v,y,m,k,b,$,z,Q,U,Y,X,Z,ee,te;let e=this.getManagedMarkdownFiles(),t=[],n=[],i=[],o=[],l=[];for(let f of e){let u=(c=this.app.metadataCache.getFileCache(f))==null?void 0:c.frontmatter;if(!u)continue;let C=String((g=u.type)!=null?g:"");if(C==="project"){let ne=ie(u.progress,0),ue=p(u.blocker),me=ae(u.attention),I=this.projectLastActivity(f,e,u),se=this.projectIsStale(u.status,I);t.push({file:f,name:f.basename,domain:(w=p(u.domain))!=null?w:"",status:(v=p(u.status))!=null?v:"active",priority:(y=p(u.priority))!=null?y:"medium",progress:Math.max(0,Math.min(100,ne)),blocker:ue,attention:me,deadline:p(u.deadline),start:p(u.start),nextAction:p(u.next_action),lastActivity:I,stale:se,health:this.calculateProjectHealth(u,se,I,ne)})}else C==="task"?n.push({file:f,name:f.basename,status:(m=p(u.status))!=null?m:"todo",priority:(k=p(u.priority))!=null?k:"medium",project:T(p(u.project)),workDate:p(u.work_date),due:p(u.due)}):C==="reading"?i.push({file:f,name:f.basename,url:p(u.url),type:($=(b=p(u.reading_type))!=null?b:p(u.type_name))!=null?$:"article",status:(z=p(u.status))!=null?z:"unread",added:p(u.added),read:p(u.read),project:T(p(u.project))}):C==="career"?o.push({file:f,company:(Q=p(u.company))!=null?Q:"",role:(U=p(u.role))!=null?U:f.basename,deadline:p(u.deadline),match:ie(u.match,0),status:(Y=p(u.status))!=null?Y:"saved",applied:p(u.applied),feedback:p(u.feedback),documents:p(u.documents),project:T(p(u.project))}):C==="idea"&&l.push({file:f,name:f.basename,domain:(X=p(u.domain))!=null?X:"",kind:(Z=p(u.kind))!=null?Z:"research",status:(ee=p(u.status))!=null?ee:"seed",priority:(te=p(u.priority))!=null?te:"medium",project:T(p(u.project))})}let d=S(),h=n.filter(f=>f.workDate===d&&!P(f.status));return{projects:t,tasks:n,todayTasks:h,blockers:t.filter(f=>f.blocker&&f.blocker.toLowerCase()!=="none"),attention:t.filter(f=>f.attention),staleProjects:t.filter(f=>f.stale&&!x(f.status)),readings:i,career:o.sort((f,u)=>de(f.deadline,u.deadline)),ideas:l}}projectLastActivity(e,t,n){var l,d;let i=e.stat.mtime;for(let h of t){let c=(l=this.app.metadataCache.getFileCache(h))==null?void 0:l.frontmatter;String((d=c==null?void 0:c.type)!=null?d:"")==="task"&&T(p(c==null?void 0:c.project))===e.basename&&(i=Math.max(i,h.stat.mtime))}let o=p(n.last_activity);if(o){let h=Date.parse(o);Number.isFinite(h)&&(i=Math.max(i,h))}return i}projectIsStale(e,t){return x(e)?!1:Date.now()-t>le*864e5}calculateProjectHealth(e,t,n,i){var d;let o=100;p(e.blocker)&&((d=p(e.blocker))==null?void 0:d.toLowerCase())!=="none"&&(o-=30),ae(e.attention)&&(o-=15),t&&(o-=25);let l=p(e.deadline);if(l){let h=Ee(l);h<0?o-=25:h<=7&&i<80&&(o-=15)}return Date.now()-n>30*864e5&&(o-=10),Math.max(0,Math.min(100,o))}async createProject(){new _(this.app,async(t,n,i,o,l)=>{let d=R(t);if(!d){new r.Notice("Project name cannot be empty.");return}let h=(0,r.normalizePath)(`${this.settings.projectsFolder}/${d}.md`);if(this.app.vault.getAbstractFileByPath(h)){new r.Notice("A project with this name already exists.");return}let c=`---
type: project
domain: ${n}
status: active
priority: ${o}
progress: 0
start: ${S()}
deadline: ${l}
blocker:
attention: false
next_action:
last_activity: ${new Date().toISOString()}
project_kind: ${i}
---

# ${t}

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
`,g=await this.app.vault.create(h,c);new r.Notice(`Created project: ${t}`),await this.syncProject(t),await this.app.workspace.getLeaf(!0).openFile(g)}).open()}async createResearchIdea(){new M(this.app,async(t,n,i,o)=>{let l=R(t);if(!l){new r.Notice("Idea name cannot be empty.");return}let d=(0,r.normalizePath)(`${this.settings.ideasFolder}/${l}.md`);if(this.app.vault.getAbstractFileByPath(d)){new r.Notice("An idea with this name already exists.");return}let h=`---
type: idea
domain: ${n}
kind: ${i}
status: seed
priority: ${o}
created: ${S()}
project:
---

# ${t}

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
`,c=await this.app.vault.create(d,h);new r.Notice(`Created research idea: ${t}`),await this.app.workspace.getLeaf(!0).openFile(c)}).open()}async createTask(){let e=(await this.getData()).projects.map(n=>n.name).sort((n,i)=>n.localeCompare(i));new V(this.app,e,async(n,i,o,l,d)=>{let h=R(n);if(!h){new r.Notice("Task name cannot be empty.");return}let c=(0,r.normalizePath)(`${this.settings.tasksFolder}/${h}.md`);if(this.app.vault.getAbstractFileByPath(c)){new r.Notice("A task with this name already exists.");return}let g=i?`"[[${i}]]"`:"",w=`---
type: task
status: todo
priority: ${d}
project: ${g}
created: ${S()}
work_date: ${o}
due: ${l}
---

# ${n}

## Objective

## Architecture

## Code

## Tests

## Artifacts

## Issues

## Decisions

## Result

## Daily Work

- [[${o}]]
`,v=await this.app.vault.create(c,w);await this.ensureDailyNote(o),i&&await this.syncProject(i),await this.syncDailyNote(o),new r.Notice(`Created task: ${n}`),await this.app.workspace.getLeaf(!0).openFile(v)}).open()}async createReading(){let e=(await this.getData()).projects.map(n=>n.name).sort();new B(this.app,e,async(n,i,o,l)=>{let d=R(n);if(!d){new r.Notice("Reading title cannot be empty.");return}let h=(0,r.normalizePath)(`${this.settings.readingFolder}/${d}.md`);if(this.app.vault.getAbstractFileByPath(h)){new r.Notice("A reading item with this name already exists.");return}let c=`---
type: reading
reading_type: ${o}
status: unread
added: ${S()}
read:
url: ${i}
project: ${l?`"[[${l}]]"`:""}
---

# ${n}

## Why I Saved This

## Notes

## Takeaways

## Related Projects

## Related Ideas
`,g=await this.app.vault.create(h,c);new r.Notice(`Added reading: ${n}`),await this.app.workspace.getLeaf(!0).openFile(g)}).open()}async createCareerOpportunity(){let e=(await this.getData()).projects.map(n=>n.name).sort();new K(this.app,e,async(n,i,o,l,d)=>{let h=R(`${n} - ${i}`);if(!h){new r.Notice("Company and role are required.");return}let c=(0,r.normalizePath)(`${this.settings.careerFolder}/${h}.md`);if(this.app.vault.getAbstractFileByPath(c)){new r.Notice("That career opportunity already exists.");return}let g=`---
type: career
company: ${n}
role: ${i}
deadline: ${o}
match: ${l}
status: saved
applied:
feedback:
documents:
project: ${d?`"[[${d}]]"`:""}
---

# ${i} \u2014 ${n}

## Opportunity

## Documents

## Application

## Feedback

## Related Projects

## Daily Work
`,w=await this.app.vault.create(c,g);new r.Notice(`Added opportunity: ${n} \u2014 ${i}`),await this.app.workspace.getLeaf(!0).openFile(w)}).open()}async openDailyNote(e=S()){let t=await this.ensureDailyNote(e);await this.syncDailyNote(e),await this.app.workspace.getLeaf(!0).openFile(t)}async ensureDailyNote(e){let t=(0,r.normalizePath)(`${this.settings.dailyFolder}/${e}.md`),n=this.app.vault.getAbstractFileByPath(t);if(n instanceof r.TFile)return n;let i=await this.app.vault.create(t,this.createDailyNoteContent(e));return new r.Notice(`Created daily note: ${e}`),i}createDailyNoteContent(e){return`---
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
`}async syncDailyNote(e){var l,d;let t=await this.ensureDailyNote(e),n=this.getManagedFilesInFolder(this.settings.tasksFolder),i=[];for(let h of n){let c=(l=this.app.metadataCache.getFileCache(h))==null?void 0:l.frontmatter;String((d=c==null?void 0:c.type)!=null?d:"")==="task"&&p(c==null?void 0:c.work_date)===e&&i.push(`- ${P(p(c==null?void 0:c.status))?"[x]":"[ ]"} [[${h.basename}]]`)}i.sort((h,c)=>h.localeCompare(c));let o=i.length?i.join(`
`):"_No tasks scheduled._";await Se(t,"<!-- RESEARCHFLOW:TASKS:START -->","<!-- RESEARCHFLOW:TASKS:END -->",o,this.app)}async syncTaskStatusesFromDailyNote(e){var c,g,w,v;if(this.syncing)return;let t=await this.app.vault.read(e),n=t.indexOf("<!-- RESEARCHFLOW:TASKS:START -->"),i=t.indexOf("<!-- RESEARCHFLOW:TASKS:END -->");if(n<0||i<n)return;let o=t.slice(n,i),l=/^- \[([ xX])\] \[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/gm,d=[],h;for(;(h=l.exec(o))!==null;){let y=this.app.metadataCache.getFirstLinkpathDest(h[2].trim(),e.path);if(!(y instanceof r.TFile))continue;let m=(c=this.app.metadataCache.getFileCache(y))==null?void 0:c.frontmatter;String((g=m==null?void 0:m.type)!=null?g:"")==="task"&&d.push({file:y,status:h[1].toLowerCase()==="x"?"done":"todo"})}if(d.length){this.syncing=!0;try{let y=new Set;for(let m of d){let k=await this.app.vault.read(m.file),b=L(k,"status",m.status);b!==k&&await this.app.vault.modify(m.file,b);let $=T(p((v=(w=this.app.metadataCache.getFileCache(m.file))==null?void 0:w.frontmatter)==null?void 0:v.project));$&&y.add($)}await he(100);for(let m of y)await this.syncProject(m)}finally{this.syncing=!1}this.scheduleRefresh()}}async syncProject(e){let t=T(e);if(!t)return;let n=this.app.metadataCache.getFirstLinkpathDest(t,"");if(!(n instanceof r.TFile))return;let i=this.getManagedFilesInFolder(this.settings.tasksFolder).filter(y=>{var k,b;let m=(k=this.app.metadataCache.getFileCache(y))==null?void 0:k.frontmatter;return String((b=m==null?void 0:m.type)!=null?b:"")==="task"&&T(p(m==null?void 0:m.project))===t}),o=i.filter(y=>{var m,k;return P(p((k=(m=this.app.metadataCache.getFileCache(y))==null?void 0:m.frontmatter)==null?void 0:k.status))}).length,l=i.length?Math.round(o/i.length*100):0,d=await this.app.vault.read(n),h=L(d,"progress",String(l)),c=L(h,"last_activity",new Date().toISOString()),g=i.sort((y,m)=>y.basename.localeCompare(m.basename)).map(y=>{var k,b;let m=p((b=(k=this.app.metadataCache.getFileCache(y))==null?void 0:k.frontmatter)==null?void 0:b.status);return`- ${P(m)?"[x]":"[ ]"} [[${y.basename}]]`}),w=g.length?g.join(`
`):"_No tasks yet._",v=c;if(v.includes("<!-- RESEARCHFLOW:PROJECT:TASKS:START -->"))v=pe(v,"<!-- RESEARCHFLOW:PROJECT:TASKS:START -->","<!-- RESEARCHFLOW:PROJECT:TASKS:END -->",w);else{let y="## Tasks",m=v.indexOf(y);if(m>=0){let k=`

<!-- RESEARCHFLOW:PROJECT:TASKS:START -->
${w}
<!-- RESEARCHFLOW:PROJECT:TASKS:END -->`;v=v.slice(0,m+y.length)+k+v.slice(m+y.length)}}v!==d&&await this.app.vault.modify(n,v)}async updateProjectProgress(e){await this.syncProject(e)}async importCareerCSV(){let e=this.app.workspace.containerEl.createEl("input",{type:"file",cls:"research-flow-file-input"});e.accept=".csv,text/csv",e.hide(),e.addEventListener("change",()=>{var n;let t=(n=e.files)==null?void 0:n.item(0);if(!t){e.remove();return}this.processCareerCSV(t).finally(()=>e.remove())}),e.click()}async processCareerCSV(e){let t=await e.text(),n=Te(t);if(n.length<2){new r.Notice("CSV contains no opportunity rows.");return}let i=n[0].map(l=>l.trim().toLowerCase().replace(/\s+/g,"_")),o=0;for(let l of n.slice(1)){let d={};i.forEach((y,m)=>{var k;d[y]=(k=l[m])!=null?k:""});let h=d.company||d.organization||"Unknown Company",c=d.role||d.title||"Opportunity",g=R(`${h} - ${c}`),w=(0,r.normalizePath)(`${this.settings.careerFolder}/${g}.md`);if(this.app.vault.getAbstractFileByPath(w))continue;let v=`---
type: career
company: ${j(h)}
role: ${j(c)}
deadline: ${j(d.deadline||d.last_date)}
match: ${d.match||0}
status: ${j(d.status||"saved")}
applied: ${j(d.applied)}
feedback: ${j(d.feedback)}
documents: ${j(d.documents||d.document_links)}
project: ${j(d.project)}
source: ${j(d.link||d.url)}
---

# ${c} \u2014 ${h}

## Opportunity

Source: ${d.link||d.url||""}

## Documents

${d.documents||d.document_links||""}

## Application

## Feedback

## Related Projects

## Daily Work
`;await this.app.vault.create(w,v),o++}new r.Notice(`Imported ${o} career opportunities.`),this.scheduleRefresh()}async generateWeeklySummary(){let e=new Date,t=new Date(e.getTime()-6*864e5),n=this.getManagedFilesInFolder(this.settings.dailyFolder),i=[];for(let h of n){let c=G(h.basename);if(!c||c<t||c>e)continue;let g=await this.app.vault.read(h);i.push(`## ${h.basename}
${Re(g)}`)}let o=(0,r.normalizePath)(`${this.settings.dailyFolder}/Weekly Summary ${q(e)}.md`),l=`---
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
`,d=this.app.vault.getAbstractFileByPath(o);d instanceof r.TFile?await this.app.vault.modify(d,l):await this.app.vault.create(o,l),new r.Notice("Weekly summary generated.")}async validateVault(){let e=await this.getData(),t=[],n=new Set(e.projects.map(i=>i.name));for(let i of e.tasks)i.project&&!n.has(i.project)&&t.push(`Task ${i.name}: missing project ${i.project}`),i.workDate||t.push(`Task ${i.name}: missing work_date`);for(let i of e.projects)i.file.path||t.push(`Project ${i.name}: invalid path`);t.length?new r.Notice(`${t.length} relationship issue(s) found. Check the affected notes.`):new r.Notice("ResearchFlow validation passed.")}},O=class extends r.ItemView{constructor(s,e){super(s),this.plugin=e}getViewType(){return D}getDisplayText(){return"ResearchFlow"}getIcon(){return"layout-dashboard"}async onOpen(){await this.render()}async onClose(){this.contentEl.empty()}async render(){let s=await this.plugin.getData(),e=this.contentEl;e.empty(),e.addClass("research-flow-home");let t=e.createDiv({cls:"research-flow-header"});t.createEl("h1",{text:"ResearchFlow"}),t.createEl("p",{text:`Research operating system \xB7 v${Fe}`,cls:"research-flow-subtitle"});let n=t.createDiv({cls:"research-flow-actions"});this.button(n,"New Project","plus",()=>void this.plugin.createProject()),this.button(n,"New Task","check-square",()=>void this.plugin.createTask()),this.button(n,"New Idea","lightbulb",()=>void this.plugin.createResearchIdea()),this.button(n,"Today","calendar",()=>void this.plugin.openDailyNote()),this.button(n,"Reading","book-open",()=>void this.plugin.createReading()),this.button(n,"Career","briefcase",()=>void this.plugin.createCareerOpportunity()),this.button(n,"Refresh","refresh-cw",()=>void this.render()),this.stats(e,s),this.section(e,"Active Projects","folder-kanban");let i=s.projects.filter(c=>!x(c.status));i.length||this.empty(e,"No active projects.");for(let c of i.sort((g,w)=>ce(g.priority)-ce(w.priority)))this.projectCard(e,c);this.section(e,"\u{1F534} Blockers","alert-circle"),s.blockers.length||this.empty(e,"No blockers.");for(let c of s.blockers)this.alert(e,c,"blocker");this.section(e,"\u{1F7E0} Attention","alert-triangle"),s.attention.length||this.empty(e,"Nothing flagged for attention.");for(let c of s.attention)this.alert(e,c,"attention");this.section(e,"\u26A0 Stale Projects","clock"),s.staleProjects.length||this.empty(e,"No stale active projects.");for(let c of s.staleProjects)this.alert(e,c,"stale");this.section(e,"Today's Tasks","check-square"),s.todayTasks.length||this.empty(e,"No incomplete tasks for today.");for(let c of s.todayTasks)this.taskRow(e,c);this.section(e,"Career \u2014 Upcoming","briefcase");let o=s.career.filter(c=>c.deadline&&!oe(c.status)).slice(0,8);o.length||this.empty(e,"No upcoming career opportunities.");for(let c of o)this.careerRow(e,c);this.section(e,"Reading Queue","book-open");let l=s.readings.filter(c=>!re(c.status)).slice(0,8);l.length||this.empty(e,"Reading queue is empty.");for(let c of l)this.readingRow(e,c);this.section(e,"Research Ideas","lightbulb");let d=s.ideas.filter(c=>c.status.toLowerCase()!=="archived").slice(0,8);d.length||this.empty(e,"No active research ideas.");for(let c of d)this.ideaRow(e,c);this.section(e,"Project Health & Timeline","activity");for(let c of s.projects.filter(g=>!x(g.status)).sort((g,w)=>de(g.deadline,w.deadline)).slice(0,12))this.healthRow(e,c);this.section(e,"ResearchFlow","network");let h=e.createDiv({cls:"research-flow-info"});h.createEl("p",{text:"Markdown-first: Projects \u2194 Tasks \u2194 Daily Work \u2194 Reading \u2194 Ideas \u2194 Career."}),h.createEl("p",{text:"Task files are the source of truth for completion; project progress is derived from tasks."})}button(s,e,t,n){let i=s.createEl("button",{cls:"research-flow-action-button"}),o=i.createSpan({cls:"research-flow-action-icon"});(0,r.setIcon)(o,t),i.createSpan({text:e}),i.addEventListener("click",n)}section(s,e,t){let n=s.createDiv({cls:"research-flow-section-header"}),i=n.createSpan({cls:"research-flow-section-icon"});(0,r.setIcon)(i,t),n.createEl("h2",{text:e,cls:"research-flow-section-title"})}empty(s,e){s.createDiv({text:e,cls:"research-flow-empty"})}stats(s,e){let t=s.createDiv({cls:"research-flow-stats"}),n=[["Active Projects",String(e.projects.filter(i=>!x(i.status)).length)],["Open Tasks",String(e.tasks.filter(i=>!P(i.status)).length)],["Today",String(e.todayTasks.length)],["Blocked",String(e.blockers.length)],["Attention",String(e.attention.length)],["Stale",String(e.staleProjects.length)],["Reading Queue",String(e.readings.filter(i=>!re(i.status)).length)],["Career",String(e.career.filter(i=>!oe(i.status)).length)]];for(let[i,o]of n){let l=t.createDiv({cls:"research-flow-stat"});l.createDiv({text:o,cls:"research-flow-stat-value"}),l.createDiv({text:i,cls:"research-flow-stat-label"})}}projectCard(s,e){let t=s.createDiv({cls:"research-flow-project-card"});t.createEl("a",{text:e.name}).addEventListener("click",l=>{l.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),t.createDiv({text:`${e.domain||"General"} \xB7 ${e.priority} \xB7 ${e.progress}%`,cls:"research-flow-project-meta"}),t.createDiv({cls:"research-flow-progress"}).createDiv({cls:"research-flow-progress-fill"}).setCssProps({"--research-flow-progress":`${e.progress}%`}),e.nextAction&&t.createDiv({text:`Next: ${e.nextAction}`,cls:"research-flow-muted"}),e.deadline&&t.createDiv({text:`Deadline: ${W(e.deadline)}`,cls:"research-flow-muted"}),t.createDiv({text:`Health: ${e.health}/100${e.stale?" \xB7 stale":""}`,cls:e.health<50?"research-flow-danger":"research-flow-muted"})}alert(s,e,t){let n=s.createDiv({cls:"research-flow-alert-section"});n.createEl("a",{text:e.name}).addEventListener("click",o=>{o.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),n.createDiv({text:t==="blocker"?e.blocker||"Blocked":t==="stale"?`No recent activity for ${le}+ days.`:"Project flagged for attention."})}taskRow(s,e){let t=s.createDiv({cls:"research-flow-task-row"}),n=t.createEl("input",{type:"checkbox"});n.checked=!1,n.addEventListener("change",()=>void this.completeTask(e)),t.createEl("a",{text:e.name}).addEventListener("click",o=>{o.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),e.project&&t.createSpan({text:` \xB7 ${e.project}`,cls:"research-flow-muted"})}careerRow(s,e){let t=s.createDiv({cls:"research-flow-list-row"});t.createEl("a",{text:`${e.role} \u2014 ${e.company}`}).addEventListener("click",i=>{i.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),t.createSpan({text:` \xB7 ${e.deadline?W(e.deadline):"no deadline"} \xB7 ${e.status}`,cls:"research-flow-muted"})}readingRow(s,e){let t=s.createDiv({cls:"research-flow-list-row"});t.createEl("a",{text:e.name}).addEventListener("click",i=>{i.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),t.createSpan({text:` \xB7 ${e.status}${e.project?` \xB7 ${e.project}`:""}`,cls:"research-flow-muted"})}ideaRow(s,e){let t=s.createDiv({cls:"research-flow-list-row"});t.createEl("a",{text:e.name}).addEventListener("click",i=>{i.preventDefault(),this.app.workspace.getLeaf(!0).openFile(e.file)}),t.createSpan({text:` \xB7 ${e.domain||"General"} \xB7 ${e.kind}`,cls:"research-flow-muted"})}healthRow(s,e){let t=s.createDiv({cls:"research-flow-list-row"});t.createSpan({text:e.name}),t.createSpan({text:` \xB7 ${e.progress}% \xB7 health ${e.health}/100 \xB7 ${e.deadline?W(e.deadline):"no deadline"}`,cls:"research-flow-muted"})}async completeTask(s){let e=await this.app.vault.read(s.file),t=L(e,"status","done");t!==e&&(await this.app.vault.modify(s.file,t),await he(100),s.project&&await this.plugin.syncProject(s.project),s.workDate&&await this.plugin.syncDailyNote(s.workDate),this.plugin.scheduleRefresh())}},_=class extends r.Modal{constructor(s,e){super(s),this.onSubmit=e}onOpen(){this.contentEl.empty(),new r.Setting(this.contentEl).setName("New Project").setHeading();let s=F(this.contentEl,"Project name","Astronomy Agent"),e=E(this.contentEl,"Domain",["ML","Quantum","General"]),t=E(this.contentEl,"Project type",["Research","Project"]),n=E(this.contentEl,"Priority",["high","medium","low"]),i=F(this.contentEl,"Deadline","","date");A(this,this.contentEl,async()=>{if(!s.value.trim()){new r.Notice("Project name cannot be empty.");return}await this.onSubmit(s.value.trim(),e.value,t.value,n.value,i.value),this.close()}),s.focus()}onClose(){this.contentEl.empty()}},M=class extends r.Modal{constructor(s,e){super(s),this.onSubmit=e}onOpen(){this.contentEl.empty(),new r.Setting(this.contentEl).setName("New Research Idea").setHeading();let s=F(this.contentEl,"Idea name","Exclusive attention experiment"),e=E(this.contentEl,"Domain",["ML","Quantum","General"]),t=E(this.contentEl,"Idea type",["Research","Project"]),n=E(this.contentEl,"Priority",["high","medium","low"]);A(this,this.contentEl,async()=>{if(!s.value.trim()){new r.Notice("Idea name cannot be empty.");return}await this.onSubmit(s.value.trim(),e.value,t.value,n.value),this.close()})}onClose(){this.contentEl.empty()}},V=class extends r.Modal{constructor(s,e,t){super(s),this.projects=e,this.onSubmit=t}onOpen(){this.contentEl.empty(),new r.Setting(this.contentEl).setName("New Task").setHeading();let s=F(this.contentEl,"Task name","Run baseline experiment"),e=E(this.contentEl,"Project",["",...this.projects]),t=F(this.contentEl,"Work date",S(),"date"),n=F(this.contentEl,"Due date","","date"),i=E(this.contentEl,"Priority",["high","medium","low"]);A(this,this.contentEl,async()=>{if(!s.value.trim()){new r.Notice("Task name cannot be empty.");return}await this.onSubmit(s.value.trim(),e.value,t.value||S(),n.value,i.value),this.close()})}onClose(){this.contentEl.empty()}},B=class extends r.Modal{constructor(s,e,t){super(s),this.projects=e,this.onSubmit=t}onOpen(){this.contentEl.empty(),new r.Setting(this.contentEl).setName("New Reading").setHeading();let s=F(this.contentEl,"Title","Paper / article title"),e=F(this.contentEl,"URL","https://"),t=E(this.contentEl,"Type",["paper","article","book","documentation","video","other"]),n=E(this.contentEl,"Related project",["",...this.projects]);A(this,this.contentEl,async()=>{if(!s.value.trim()){new r.Notice("Reading title cannot be empty.");return}await this.onSubmit(s.value.trim(),e.value,t.value,n.value),this.close()})}onClose(){this.contentEl.empty()}},K=class extends r.Modal{constructor(s,e,t){super(s),this.projects=e,this.onSubmit=t}onOpen(){this.contentEl.empty(),new r.Setting(this.contentEl).setName("New Career Opportunity").setHeading();let s=F(this.contentEl,"Company","Company"),e=F(this.contentEl,"Role","ML Researcher"),t=F(this.contentEl,"Deadline","","date"),n=F(this.contentEl,"Match %","0","number"),i=E(this.contentEl,"Related project",["",...this.projects]);A(this,this.contentEl,async()=>{if(!s.value.trim()||!e.value.trim()){new r.Notice("Company and role are required.");return}await this.onSubmit(s.value.trim(),e.value.trim(),t.value,n.value||"0",i.value),this.close()})}onClose(){this.contentEl.empty()}},J=class extends r.PluginSettingTab{constructor(s,e){super(s,e),this.plugin=e}getSettingDefinitions(){return[{name:"Projects folder",desc:"Folder used for project pages.",control:{type:"text",key:"projectsFolder"}},{name:"Ideas folder",desc:"Folder used for research ideas.",control:{type:"text",key:"ideasFolder"}},{name:"Tasks folder",desc:"Folder used for detailed task pages.",control:{type:"text",key:"tasksFolder"}},{name:"Career folder",desc:"Folder used for career opportunities.",control:{type:"text",key:"careerFolder"}},{name:"Reading folder",desc:"Folder used for reading items.",control:{type:"text",key:"readingFolder"}},{name:"Daily folder",desc:"Folder used for daily work notes.",control:{type:"text",key:"dailyFolder"}}]}};function F(a,s,e,t="text"){let n=a.createDiv({cls:"research-flow-form-field"});return n.createEl("label",{text:s,cls:"research-flow-form-label"}),n.createEl("input",{type:t,placeholder:e,cls:"research-flow-form-control"})}function E(a,s,e){let t=a.createDiv({cls:"research-flow-form-field"});t.createEl("label",{text:s,cls:"research-flow-form-label"});let n=t.createEl("select",{cls:"research-flow-form-control"});for(let i of e)n.createEl("option",{value:i,text:i||"None"});return n}function A(a,s,e){let t=s.createDiv({cls:"research-flow-modal-buttons"});t.createEl("button",{text:"Cancel"}).addEventListener("click",()=>a.close());let i=t.createEl("button",{text:"Create",cls:"mod-cta"});i.addEventListener("click",()=>{i.disabled||(i.disabled=!0,e().catch(o=>{let l=o instanceof Error?o.message:String(o);new r.Notice(`ResearchFlow: ${l}`)}).finally(()=>{i.disabled=!1}))})}function p(a){if(a==null)return;let s=String(a).trim();return s&&s!=="null"?s:void 0}function ie(a,s){let e=Number(a);return Number.isFinite(e)?e:s}function ae(a){return a===!0||String(a).toLowerCase()==="true"}function T(a){if(a)return a.replace(/^\[\[/,"").replace(/\]\]$/,"").trim()}function P(a){let s=(a!=null?a:"").toLowerCase();return s==="done"||s==="completed"}function x(a){let s=(a!=null?a:"").toLowerCase();return s==="completed"||s==="archived"||s==="cancelled"}function re(a){return["read","completed","done"].includes(a.toLowerCase())}function oe(a){return["rejected","withdrawn","closed","accepted","archived"].includes(a.toLowerCase())}function ce(a){return a.toLowerCase()==="high"?0:a.toLowerCase()==="medium"?1:2}function de(a,s){return!a&&!s?0:a?s?a.localeCompare(s):-1:1}function Ee(a){let s=G(a);return s?Math.ceil((s.getTime()-new Date(S()).getTime())/864e5):99999}function G(a){let s=/^(\d{4})-(\d{2})-(\d{2})$/.exec(a);return s?new Date(Number(s[1]),Number(s[2])-1,Number(s[3])):null}function q(a){return`${a.getFullYear()}-${String(a.getMonth()+1).padStart(2,"0")}-${String(a.getDate()).padStart(2,"0")}`}function S(){return q(new Date)}function W(a){let s=G(a);return s?s.toLocaleDateString(void 0,{day:"numeric",month:"short",year:"numeric"}):a}function R(a){return a.trim().replace(/[\\/:*?"<>|#^]/g,"-").replace(/\s+/g," ").replace(/-+/g,"-").trim()}function j(a){return a?`"${a.replace(/"/g,'\\"')}"`:""}async function he(a){await new Promise(s=>window.setTimeout(s,a))}function L(a,s,e){let t=new RegExp(`(^${je(s)}:\\s*)(.*)$`,"m");if(t.test(a))return a.replace(t,`$1${e}`);if(!a.startsWith("---"))return a;let n=a.indexOf("---",3);return n<0?a:a.slice(0,n)+`${s}: ${e}
`+a.slice(n)}function je(a){return a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function pe(a,s,e,t){let n=a.indexOf(s),i=a.indexOf(e);return n<0||i<n?a:a.slice(0,n+s.length)+`
${t}
`+a.slice(i)}async function Se(a,s,e,t,n){let i=await n.vault.read(a),o=pe(i,s,e,t);o!==i&&await n.vault.modify(a,o)}function Te(a){let s=[],e=[],t="",n=!1;for(let i=0;i<a.length;i++){let o=a[i];o==='"'?n&&a[i+1]==='"'?(t+='"',i++):n=!n:o===","&&!n?(e.push(t),t=""):(o===`
`||o==="\r")&&!n?(o==="\r"&&a[i+1]===`
`&&i++,e.push(t),t="",e.some(l=>l.trim())&&s.push(e),e=[]):t+=o}return(t||e.length)&&(e.push(t),e.some(i=>i.trim())&&s.push(e)),s}function Re(a){let s=a.split(`
`),e=[],t=!1;for(let n of s){if(n.includes("RESEARCHFLOW:TASKS:START")){t=!0;continue}if(n.includes("RESEARCHFLOW:TASKS:END")){t=!1;continue}t||(/^## (Work Log|Decisions|Blockers|Ideas|Career|Reading)/.test(n)||/^- /.test(n))&&e.push(n)}return e.slice(0,40).join(`
`)}
