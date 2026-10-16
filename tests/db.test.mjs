import assert from "node:assert/strict";
const b=new URL("../src/", import.meta.url).href;
const {checkConfig}=await import(b+"db/config.js");
const M=await import(b+"db/mapping.js");
const {createApi}=await import(b+"db/api.js");
let n=0; const eq=(a,c,m)=>{assert.deepEqual(a,c,m);n++;}; const ok=(c,m)=>{assert.ok(c,m);n++;};
const rejects=async(p,re,m)=>{ try{await p;}catch(e){ ok(re.test(e.message),(m||"")+" got: "+e.message); return e;} assert.fail("should reject "+m); };

// --- config ---
ok(!checkConfig("","").ok); ok(!checkConfig("https://your-project-ref.supabase.co","your-publishable-key").ok);
ok(!checkConfig("not a url","sb_publishable_abc").ok); ok(!checkConfig("ftp://x.supabase.co","sb_publishable_abc").ok);
ok(checkConfig("https://abcd.supabase.co","sb_publishable_abc123").ok);
ok(!checkConfig("https://abcd.supabase.co","sb_secret_abc123").ok,"secret key refused");
const jwt=(role)=>"h."+Buffer.from(JSON.stringify({role})).toString("base64url")+".s";
ok(!checkConfig("https://abcd.supabase.co",jwt("service_role")).ok,"service_role jwt refused");
ok(checkConfig("https://abcd.supabase.co",jwt("anon")).ok,"anon jwt ok");

// --- mapping / errors ---
eq(M.toTopic({id:"1",title:"T",description:null,created_at:"2026-01-01T00:00:00+00:00"}),{id:"1",title:"T",description:"",createdAt:"2026-01-01T00:00:00+00:00"});
const pr=M.toProject({id:"p",topic_id:"t",title:"X",description:null,caption:null,technologies:null,status:"Planned",created_at:"c",links:"bad"});
eq(pr.technologies,[]); eq(pr.links,[]); eq(pr.topicId,"t"); eq(pr.caption,"");
ok(M.makeError({status:401,message:"x"},"f").isAuth); ok(M.makeError({code:"PGRST301"},"f").isAuth); ok(M.makeError({message:"JWT expired"},"f").isAuth);
ok(!M.makeError({code:"23505"},"f").isAuth); ok(/already exists/.test(M.friendlyError({code:"23505"},"f")));
ok(/Could not reach/.test(M.friendlyError({message:"TypeError: Failed to fetch"},"f")));
ok(/still contains projects/.test(M.friendlyError({code:"23503"},"f",{"23503":"This topic still contains projects."})));
ok(/not found/.test(M.friendlyError({code:"PGRST116"},"f"))); ok(/Could not save/.test(M.friendlyError({message:"weird"},"Could not save.")));
ok(/Could not reach/.test(M.authMessage({message:"Failed to fetch"})));

import { fake } from "./helpers/fakeClient.mjs";
const cleaned={topicId:"topics-1",title:"  P  ",description:" d ",caption:" c ",technologies:["React"],status:"Planned",links:[{id:"l1",title:"GH",url:"https://github.com/a"}]};

// paging: 2500 topics => 3 requests, all rows, newest first
const many=Array.from({length:2500},(_,i)=>({id:"t"+String(i).padStart(4,"0"),title:"T"+i,description:"",created_at:new Date(2026,0,1,0,0,i).toISOString()}));
let c=fake({topics:many}); let all=await createApi(c).fetchAll();
eq(all.topics.length,2500,"all topics loaded"); eq(c.log.filter(l=>l.name==="topics").length,3,"3 pages"); ok(all.topics[0].createdAt>all.topics[2499].createdAt,"newest first");

// incomplete data is never returned: failure in either table rejects
let e=await rejects(createApi(fake({},{fail:{code:"",message:"TypeError: Failed to fetch"}})).fetchAll(),/Could not reach/,"network failure on load");
e=await rejects(createApi(fake({},{fail:{code:"PGRST301",message:"JWT expired",status:401}})).fetchAll(),/session has expired/,"expired"); ok(e.isAuth,"isAuth flag");
await rejects(createApi(fake({},{fail:{throw:"Failed to fetch"}})).fetchAll(),/Could not reach/,"thrown network error");

// topics
c=fake(); let api=createApi(c);
const t1=await api.insertTopic({title:"  Docker ",description:" d "}); eq(t1.title,"Docker"); eq(t1.description,"d"); eq(t1.createdAt,"2026-02-01T00:00:00+00:00");
eq(Object.keys(c.log[0].payload).sort(),["description","title"],"only allowed columns sent (no user_id/id)");
await rejects(api.insertTopic({title:"docker",description:""}),/already exists/,"duplicate topic");
const t1u=await api.updateTopic(t1.id,{title:"Docker 2",description:""}); eq(t1u.title,"Docker 2"); eq(t1u.id,t1.id);
await rejects(api.updateTopic("nope",{title:"x",description:""}),/not found/,"update missing topic");

// projects
c=fake({topics:[{id:"topics-1",title:"A",description:"",created_at:"c"},{id:"topics-2",title:"B",description:"",created_at:"c"}]}); api=createApi(c);
const p=await api.insertProject(cleaned); eq(p.title,"P"); eq(p.topicId,"topics-1"); eq(p.links,[{id:"l1",title:"GH",url:"https://github.com/a"}]); eq(p.technologies,["React"]);
eq(Object.keys(c.log[0].payload).sort(),["caption","description","links","status","technologies","title","topic_id"],"project payload columns");
await rejects(api.insertProject({...cleaned,topicId:"ghost"}),/no longer exists/,"project in missing topic");
const pu=await api.updateProject(p.id,{...cleaned,title:"Renamed",status:"Completed"}); eq(pu.title,"Renamed"); eq(pu.status,"Completed"); eq(pu.id,p.id);
const pm=await api.moveProject(p.id,"topics-2"); eq(pm.topicId,"topics-2"); eq(Object.keys(c.log.at(-1).payload),["topic_id"],"move sends only topic_id");
await rejects(api.moveProject(p.id,"ghost"),/no longer exists/,"move to missing topic");
await rejects(api.moveProject("nope","topics-1"),/not found/,"move missing project");
// topic with projects cannot be deleted, then can after project removed
await rejects(api.deleteTopic("topics-2"),/still contains projects/,"delete topic with projects");
ok(c.tables.topics.some(t=>t.id==="topics-2"),"topic still present after refused delete");
await api.deleteProject(p.id); eq(c.tables.projects.length,0);
await rejects(api.deleteProject(p.id),/not found/,"delete already-deleted project (0 rows)");
await api.deleteTopic("topics-2"); eq(c.tables.topics.length,1);
await rejects(api.deleteTopic("topics-2"),/not found/,"delete missing topic (0 rows)");
// failed save surfaces an error (never silent success)
await rejects(createApi(fake({},{fail:{code:"42501",message:"rls",status:403}})).insertTopic({title:"x",description:""}),/permission/,"permission error");
console.log(`all ${n} Supabase-layer checks passed`);
