import assert from "node:assert/strict";
const base=new URL("../src/utils/", import.meta.url).href;
const T=await import(base+"topics.js"); const P=await import(base+"projects.js");
let n=0; const ok=(c,m)=>{assert.ok(c,m); n++;}; const eq=(a,b,m)=>{assert.equal(a,b,m); n++;};
const topicA=T.createTopic({title:"Docker",description:""}), topicB=T.createTopic({title:"React",description:""});
const topics=[topicA,topicB];
const form=(o={})=>({topicId:topicA.id,title:"My App",caption:"",description:"",technologies:"",status:"Planned",links:[],...o});
// invalid titles
ok(P.validateProject(form({title:""}),topics).errors.title,"empty title");
ok(P.validateProject(form({title:"   \t "}),topics).errors.title,"whitespace title");
ok(P.validateProject(form({title:"x".repeat(121)}),topics).errors.title,"121 chars");
ok(!P.validateProject(form({title:"x".repeat(120)}),topics).errors.title,"120 chars ok");
// topic validity
ok(P.validateProject(form({topicId:""}),topics).errors.topicId,"no topic");
ok(P.validateProject(form({topicId:"ghost"}),topics).errors.topicId,"missing topic");
// no links is valid; trimming
let r=P.validateProject(form({title:"  Spaced  ",caption:" c ",description:" d "}),topics);
ok(Object.keys(r.errors).length===0,"valid, no links"); eq(r.cleaned.title,"Spaced"); eq(r.cleaned.links.length,0); eq(r.cleaned.caption,"c");
// length limits
ok(P.validateProject(form({caption:"x".repeat(161)}),topics).errors.caption,"caption len");
ok(P.validateProject(form({description:"x".repeat(2001)}),topics).errors.description,"desc len");
ok(P.validateProject(form({status:"Done"}),topics).errors.status,"bad status");
// technologies
eq(JSON.stringify(P.parseTechnologies(" React, Node.js ,react,, Docker\nAWS ")),'["React","Node.js","Docker","AWS"]');
ok(P.validateProject(form({technologies:Array.from({length:31},(_, i)=>"t"+i).join(",")}),topics).errors.technologies,"too many tech");
// URLs
for (const u of ["https://github.com/a/b","http://localhost:3000/x","https://hub.docker.com/r/a/b","https://例え.jp/ページ"]) ok(P.normalizeUrl(u).url,u);
for (const u of ["","github.com","javascript:alert(1)","ftp://a.com","https://","https://nodot","http://a b.com","data:text/html,hi"]) ok(P.normalizeUrl(u).error,"reject "+u);
// multiple links, blank row ignored, partial row errors
r=P.validateProject(form({links:[{id:"1",title:"GitHub",url:"https://github.com/a"},{id:"2",title:"",url:""},{id:"3",title:"Docs",url:"https://docs.example.com"},{id:"4",title:"Demo",url:"https://youtu.be/x"}]}),topics);
ok(Object.keys(r.errors).length===0,"multi links valid"); eq(r.cleaned.links.length,3);
r=P.validateProject(form({links:[{id:"1",title:"",url:"https://a.com"},{id:"2",title:"Bad",url:"nope"},{id:"3",title:"Fine",url:"https://ok.com"}]}),topics);
ok(r.errors.links[0].title&&!r.errors.links[0].url,"row0 title err"); ok(r.errors.links[1].url&&!r.errors.links[1].title,"row1 url err"); eq(r.errors.links[2],null);
ok(P.validateProject(form({links:[{id:"1",title:"x".repeat(81),url:"https://a.com"}]}),topics).errors.links[0].title,"link title len");
// create / update
const cleaned=P.validateProject(form({title:"<script>alert(1)</script> & “quotes” 日本語 é",description:"<img src=x onerror=alert(1)>\nline2"}),topics).cleaned;
const p1=P.createProject(cleaned); ok(p1.id&&p1.createdAt,"id+date"); eq(p1.description,"<img src=x onerror=alert(1)>\nline2","special chars stored as plain text"); eq(p1.topicId,topicA.id);
const p2=P.createProject(P.validateProject(form({title:"Second"}),topics).cleaned); ok(p1.id!==p2.id,"unique ids");
const upd=P.updateProject(p1,P.validateProject(form({title:"Renamed",status:"Completed"}),topics).cleaned);
eq(upd.id,p1.id); eq(upd.createdAt,p1.createdAt); eq(upd.title,"Renamed"); eq(upd.status,"Completed"); eq(upd.topicId,topicA.id);
// move
let projects=[p1,p2];
let m=P.moveProject(projects,p1.id,topicB.id,topics); eq(m.projects.find(p=>p.id===p1.id).topicId,topicB.id); eq(m.projects.find(p=>p.id===p2.id).topicId,topicA.id);
ok(P.moveProject(projects,p1.id,"ghost",topics).error,"move to missing topic"); ok(P.moveProject(projects,"nope",topicB.id,topics).error,"invalid project id");
eq(projects.find(p=>p.id===p1.id).topicId,topicA.id,"original untouched on failed move");
projects=m.projects;
// counts
eq(T.getProjectCount(topicA.id,projects),1); eq(T.getProjectCount(topicB.id,projects),1);
// search/filter
const set=[{...p1,title:"Docker Blog",description:"Uses nginx"},{...p2,title:"Chess",description:"docker compose here",topicId:topicB.id},{id:"x",topicId:topicA.id,title:"Weather",description:undefined,technologies:[],links:[]}];
eq(P.filterProjects(set,{query:"DOCKER"}).length,2); eq(P.filterProjects(set,{query:"nginx"}).length,1); eq(P.filterProjects(set,{query:"zzz"}).length,0);
eq(P.filterProjects(set,{query:"  "}).length,3); eq(P.filterProjects(set,{topicId:topicB.id}).length,1); eq(P.filterProjects(set,{query:"docker",topicId:topicA.id}).length,1);
// delete + counts + topic delete guard
let after=projects.filter(p=>p.id!==p1.id); eq(after.length,1); eq(T.getProjectCount(topicB.id,after),0);
eq(T.canDeleteTopic(topicB.id,projects),false); eq(T.canDeleteTopic(topicB.id,after),true);
eq(T.canDeleteTopic(topicA.id,[]),true,"topic with no projects");
console.log(`all ${n} project-logic checks passed`);
