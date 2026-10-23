'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {registerParentEmailRoutes}=require('../backend/parent-email-routes.cjs');
const id='00000000-0000-4000-8000-000000000001';
function setup(env={}){const routes={};const app={post:(path,...fns)=>{routes[path]=fns}};let calls=0;
 const admin={from:()=>{calls++;throw new Error('No DB calls expected')},rpc:async()=>({data:false,error:null})};
 registerParentEmailRoutes(app,{admin,requireManager:()=>{},env});
 const res=()=>({statusCode:200,status(n){this.statusCode=n;return this},json(data){this.body=data;return this}});
 return {routes,res,get calls(){return calls}};}
test('verification request disabled by default, no DB calls',async()=>{const h=setup();const r=h.res();await h.routes['/api/parents/email/verification/request'][1]({body:{studentId:id}},r);assert.equal(r.statusCode,503);assert.equal(h.calls,0)});
test('missing email configuration prevents DB access',async()=>{const h=setup({PARENT_EMAIL_VERIFICATION_ENABLED:'true'});const r=h.res();await h.routes['/api/parents/email/verification/request'][1]({body:{studentId:id}},r);assert.equal(r.statusCode,503);assert.equal(h.calls,0)});
test('confirmation disabled by default',async()=>{const h=setup();const r=h.res();await h.routes['/api/parents/email/verification/confirm'][0]({},r);assert.equal(r.statusCode,503);assert.equal(h.calls,0)});

test('invalid token rejected before RPC',async()=>{const h=setup({PARENT_EMAIL_VERIFICATION_ENABLED:'true'});const r=h.res();await h.routes['/api/parents/email/verification/confirm'][0]({body:{studentId:id,token:'invalid'}},r);assert.equal(r.statusCode,400)});
test('confirmation invokes only hash-based RPC',async()=>{const routes={};let params;const app={post:(name,...fns)=>routes[name]=fns};const admin={rpc:async(name,p)=>{assert.equal(name,'confirm_parent_email_verification');params=p;return {data:true,error:null}}};registerParentEmailRoutes(app,{admin,requireManager:()=>{},env:{PARENT_EMAIL_VERIFICATION_ENABLED:'true'}});const r=setup().res();await routes['/api/parents/email/verification/confirm'][0]({body:{studentId:id,token:'a'.repeat(64)}},r);assert.equal(r.body.success,true);assert.notEqual(params.p_token_hash,'a'.repeat(64));assert.equal(params.p_token_hash.length,64)});
test('failed RPC confirmation never reports success',async()=>{const routes={};const app={post:(name,...fns)=>routes[name]=fns};registerParentEmailRoutes(app,{admin:{rpc:async()=>({data:false,error:null})},requireManager:()=>{},env:{PARENT_EMAIL_VERIFICATION_ENABLED:'true'}});const r=setup().res();await routes['/api/parents/email/verification/confirm'][0]({body:{studentId:id,token:'a'.repeat(64)}},r);assert.equal(r.statusCode,400);assert.equal(r.body.success,false)});

test('database limiter unavailable fails closed before token storage or email',async()=>{
 const routes={};let saves=0,sends=0;
 const app={post:(name,...fns)=>routes[name]=fns};
 const admin={from(name){if(name!=='students'){saves++;throw Error('unexpected write')}return {select(){return this},eq(){return this},single:async()=>({data:{id,department_id:'d',parent_email:'parent@example.com',parent_email_verified_at:null},error:null})}},rpc:async()=>({data:null,error:{message:'offline'}})};
 registerParentEmailRoutes(app,{admin,requireManager:()=>{},env:{PARENT_EMAIL_VERIFICATION_ENABLED:'true',EMAILJS_SERVICE_ID:'s',EMAILJS_TEMPLATE_ID:'t',EMAILJS_PUBLIC_KEY:'p',EMAILJS_PRIVATE_KEY:'secret',PARENT_EMAIL_VERIFY_BASE_URL:'https://example.org/verify'},fetchImpl:async()=>{sends++;return {ok:true}}});
 const r=setup().res();await routes['/api/parents/email/verification/request'][1]({actor:{id:'actor',role:'admin'},body:{studentId:id}},r);
 assert.equal(r.statusCode,503);assert.equal(saves,0);assert.equal(sends,0);
});
test('database limiter denies request before email dispatch',async()=>{
 const routes={};let sends=0;const app={post:(name,...fns)=>routes[name]=fns};
 const admin={from:()=>({select(){return this},eq(){return this},single:async()=>({data:{id,parent_email:'parent@example.com'},error:null})}),rpc:async()=>({data:false,error:null})};
 registerParentEmailRoutes(app,{admin,requireManager:()=>{},env:{PARENT_EMAIL_VERIFICATION_ENABLED:'true',EMAILJS_SERVICE_ID:'s',EMAILJS_TEMPLATE_ID:'t',EMAILJS_PUBLIC_KEY:'p',EMAILJS_PRIVATE_KEY:'secret',PARENT_EMAIL_VERIFY_BASE_URL:'https://example.org/verify'},fetchImpl:async()=>{sends++;return {ok:true}}});
 const r=setup().res();await routes['/api/parents/email/verification/request'][1]({actor:{id:'actor',role:'admin'},body:{studentId:id}},r);
 assert.equal(r.statusCode,429);assert.equal(sends,0);
});
