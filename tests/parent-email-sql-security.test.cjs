
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const migrations=path.resolve(__dirname,'../backend/supabase/migrations');
const read=(n)=>fs.readFileSync(path.join(migrations,n),'utf8');
test('verification quota is shared by student, not requester',()=>{
 const sql=read('20261022000400_parent_email_request_limits.sql');
 assert.match(sql,/primary key\s*\(student_id\)/i);
 assert.match(sql,/on conflict\s*\(student_id\)/i);
 assert.doesNotMatch(sql,/primary key\s*\(student_id\s*,\s*actor_id\)/i);
 assert.match(sql,/return v_attempts <= 3/i);
 assert.match(sql,/for update/i);
});
test('rate-limit RPC is not callable by anonymous or authenticated clients',()=>{
 const sql=read('20261022000400_parent_email_request_limits.sql');
 assert.match(sql,/revoke all on function public\.reserve_parent_email_verification_request\(uuid,text\) from public,anon,authenticated/i);
 assert.match(sql,/grant execute on function public\.reserve_parent_email_verification_request\(uuid,text\) to service_role/i);
 assert.match(sql,/enable row level security/i);
});
test('confirmation token has bounded attempts and service-only RPC',()=>{
 const tokens=read('20261022000100_parent_email_verification_tokens.sql');
 const confirmation=read('20261022000200_parent_email_atomic_confirmation.sql');
 assert.match(tokens,/attempts between 0 and 10/i);
 assert.match(confirmation,/v_token\.attempts >= 10/i);
 assert.match(confirmation,/set attempts = attempts \+ 1/i);
 assert.match(confirmation,/grant execute on function public\.confirm_parent_email_verification\(uuid,text\) to service_role/i);
});

test('role-aware RLS hardening removes public policies and protects client writes',()=>{
 const sql=read('20261023000000_restrict_anonymous_access.sql');
 assert.doesNotMatch(sql,/create policy\s+"?Public access/i);
 assert.match(sql,/revoke all privileges on table[\s\S]*from anon/i);
 assert.match(sql,/revoke insert,update,delete on public\.user_roles from authenticated/i);
 assert.match(sql,/create policy user_roles_read_own/i);
 assert.match(sql,/grant update\(full_name,avatar_url,mobile\) on public\.profiles to authenticated/i);
 assert.match(sql,/create policy profiles_update_own/i);
});
test('attendance policies are assignment-aware and student reads are own-record only',()=>{
 const sql=read('20261023000000_restrict_anonymous_access.sql');
 assert.match(sql,/create or replace function public\.can_manage_attendance/i);
 assert.match(sql,/teacher\.user_id\s*=\s*auth\.uid\(\)/i);
 assert.match(sql,/class\.name\s*=\s*nullif\(to_jsonb\(s\)->>'class_name'/i);
 assert.match(sql,/create policy attendance_student_read/i);
 assert.match(sql,/s\.user_id\s*=\s*auth\.uid\(\)/i);
 assert.doesNotMatch(sql,/create policy attendance_assigned_teacher_delete/i);
});
test('teaching assignments are role and department scoped',()=>{
 const sql=read('20261023000000_restrict_anonymous_access.sql');
 for(const action of ['read','insert','update','delete'])
  assert.match(sql,new RegExp(`create policy teacher_subjects_${action}_by_role`,'i'));
 assert.match(sql,/t\.department_id\s*=\s*public\.current_user_department_id\(\)/i);
 assert.match(sql,/s\.department_id\s*=\s*public\.current_user_department_id\(\)/i);
});
