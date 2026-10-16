import assert from "node:assert/strict";
import * as t from "../src/utils/topics.js";
const ok = (r)=>Object.keys(r).length===0;
assert.ok(t.validateTopic({title:"",description:""},[]).title);
assert.ok(t.validateTopic({title:"   ",description:""},[]).title);
assert.ok(ok(t.validateTopic({title:"Docker",description:""},[])));
assert.ok(t.validateTopic({title:"x".repeat(81),description:""},[]).title);
assert.ok(t.validateTopic({title:"a",description:"y".repeat(501)},[]).description);
const a=t.createTopic({title:"  Docker  ",description:" d "});
assert.equal(a.title,"Docker"); assert.equal(a.description,"d");
assert.ok(t.validateTopic({title:"docker",description:""},[a]).title);          // duplicate, case-insensitive
assert.ok(ok(t.validateTopic({title:"docker",description:""},[a],a.id)));        // editing itself is fine
assert.ok(ok(t.validateTopic({title:"日本語 & <b>é</b>",description:""},[a])));
assert.equal(t.canDeleteTopic(a.id,[]),true);
assert.equal(t.canDeleteTopic(a.id,[{topicId:a.id}]),false);
assert.equal(t.getProjectCount(a.id,[{topicId:a.id},{topicId:"z"}]),1);
assert.notEqual(t.newId(),t.newId());
assert.equal(t.formatDate("garbage"),"Unknown date");
console.log("topic logic checks passed");
