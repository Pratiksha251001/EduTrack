'use strict';
const {prepareParentNotice}=require('./parent-notification-policy.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function registerParentNotificationDispatch(app,{admin,requireManager,env=process.env,fetchImpl=fetch}) {
 app.post('/api/parents/attendance/notify',requireManager,async(req,res)=>{
  if(env.PARENT_ATTENDANCE_EMAIL_ENABLED!=='true'||!admin)return res.status(503).json({success:false,message:'Parent attendance email disabled.'});
  const {studentId,kind,date}=req.body||{};
  if(typeof studentId!=='string'||!UUID.test(studentId)||typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||!['daily_attendance','low_attendance'].includes(kind))return res.status(400).json({success:false});
  if(!req.actor)return res.status(401).json({success:false});
  if(!env.EMAILJS_SERVICE_ID||!env.EMAILJS_TEMPLATE_ID||!(env.EMAILJS_PUBLIC_KEY||env.EMAILJS_USER_ID)||!env.EMAILJS_PRIVATE_KEY)return res.status(503).json({success:false,message:'Provider unavailable.'});
  try {
   const {data:student,error}=await admin.from('students').select('id,department_id,full_name,parent_name,parent_email,parent_email_verified_at').eq('id',studentId).single();
   if(error||!student)return res.status(404).json({success:false});
   if(req.actor.role!=='admin'&&(!req.actor.departmentId||req.actor.departmentId!==student.department_id))return res.status(403).json({success:false});
   // Attendance data comes from trusted storage, not client-supplied rates.
   const {data:records,error:attendanceError}=await admin.from('attendance').select('status').eq('student_id',studentId).lte('date',date);
   if(attendanceError||!Array.isArray(records))return res.status(503).json({success:false,message:'Attendance data unavailable.'});
   const total=records.length,present=records.filter(r=>r.status==='present').length;
   const rate=total?(present*100/total):null;
   if(total===0)return res.status(422).json({success:false,reason:'no_attendance_records'});
   const notice=prepareParentNotice({student,kind,date,totalSessions:total,attendanceRate:rate});
   if(!notice.ok)return res.status(422).json({success:false,reason:notice.reason});
   const {data:claimed,error:claimError}=await admin.rpc('claim_parent_notification',{p_student_id:studentId,p_kind:kind,p_date:date,p_recipient:notice.recipient});
   if(claimError)return res.status(503).json({success:false,message:'Notification ledger unavailable.'});
   if(claimed!==true)return res.status(409).json({success:false,message:'Already claimed or attempted.'});
   let state='unknown';
   try {
    const message=kind==='low_attendance'?`Attendance warning: ${student.full_name} has ${rate}% attendance as of ${date}.`:`Attendance update for ${student.full_name} on ${date}. Current attendance: ${rate===null?'not available':rate+'%'}.`;
    const provider=await fetchImpl('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),body:JSON.stringify({service_id:env.EMAILJS_SERVICE_ID,template_id:env.EMAILJS_TEMPLATE_ID,user_id:env.EMAILJS_PUBLIC_KEY||env.EMAILJS_USER_ID,accessToken:env.EMAILJS_PRIVATE_KEY,template_params:{to_email:notice.recipient,to_name:student.parent_name||'Parent/Guardian',subject:kind==='low_attendance'?'Low attendance warning':'Attendance update',message,student_name:student.full_name,attendance_rate:String(rate??''),college_name:'EduTrack'}})});
    state=provider.ok?'provider_accepted':'provider_rejected';
   }catch{state='unknown';}
   const {data:logged,error:logError}=await admin.rpc('complete_parent_notification',{p_student_id:studentId,p_kind:kind,p_date:date,p_status:state});
   if(logError||logged!==true)return res.status(503).json({success:false,message:'Provider outcome could not be recorded.'});
   return res.status(state==='provider_accepted'?200:502).json({success:state==='provider_accepted',status:state});
  }catch{return res.status(503).json({success:false,message:'Notification service unavailable.'});}
 });
}
module.exports={registerParentNotificationDispatch};
