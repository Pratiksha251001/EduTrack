'use strict';
const { issueVerificationToken, normalizeParentEmail, verifyToken } = require('./parent-email-verification.cjs');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';
function registerParentEmailRoutes(app, deps) {
  const { admin, requireManager, fetchImpl = fetch, now = Date.now, env = process.env } = deps;
  const disabled = () => env.PARENT_EMAIL_VERIFICATION_ENABLED !== 'true';
  const ready = () => !!(admin && env.EMAILJS_SERVICE_ID && env.EMAILJS_TEMPLATE_ID &&
    (env.EMAILJS_PUBLIC_KEY || env.EMAILJS_USER_ID) && env.EMAILJS_PRIVATE_KEY && env.PARENT_EMAIL_VERIFY_BASE_URL);
  app.post('/api/parents/email/verification/request', requireManager, async (req, res) => {
    if (disabled() || !ready()) return res.status(503).json({ success:false, message:'Parent verification is not enabled or configured.' });
    const studentId = req.body?.studentId;
    if (typeof studentId !== 'string' || !UUID.test(studentId)) return res.status(400).json({ success:false });
    const actor = req.actor;
    if (!actor) return res.status(401).json({ success:false });
    try {
      const {data:student,error} = await admin.from('students').select('id,department_id,parent_email,parent_email_verified_at,parent_name').eq('id',studentId).single();
      if (error || !student) return res.status(404).json({success:false});
      if (actor.role !== 'admin' && (!actor.departmentId || actor.departmentId !== student.department_id)) return res.status(403).json({success:false});
      const email = normalizeParentEmail(student.parent_email);
      if (!email) return res.status(400).json({success:false,message:'Valid parent email is required.'});
      if (student.parent_email_verified_at) return res.status(409).json({success:false,message:'Already verified.'});
      // Atomic, database-backed throttle: never send if the reservation fails.
      const {data:allowed,error:limitError} = await admin.rpc('reserve_parent_email_verification_request', {
        p_student_id: studentId, p_actor_id: actor.id
      });
      if (limitError || typeof allowed !== 'boolean') return res.status(503).json({success:false,message:'Verification rate limiter unavailable.'});
      if (!allowed) return res.status(429).json({success:false,message:'Try again later.'});
      const {token,tokenHash,expiresAt} = issueVerificationToken(now());
      const {error:saveError} = await admin.from('parent_email_verification_tokens').upsert({student_id:studentId,parent_email:email,token_hash:tokenHash,expires_at:expiresAt,attempts:0},{onConflict:'student_id'});
      if (saveError) return res.status(503).json({success:false,message:'Verification storage unavailable.'});
      const base = new URL(env.PARENT_EMAIL_VERIFY_BASE_URL);
      if (base.protocol!=='https:') return res.status(503).json({success:false,message:'Secure verification URL required.'});
      base.searchParams.set('studentId',studentId);
      base.searchParams.set('token',token);
      const provider = await fetchImpl(EMAILJS_URL,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),body:JSON.stringify({service_id:env.EMAILJS_SERVICE_ID,template_id:env.EMAILJS_TEMPLATE_ID,user_id:env.EMAILJS_PUBLIC_KEY||env.EMAILJS_USER_ID,accessToken:env.EMAILJS_PRIVATE_KEY,template_params:{to_email:email,to_name:student.parent_name||'Parent/Guardian',subject:'Verify your parent email',message:`Verify your email: ${base.toString()}`}})});
      if (!provider.ok) return res.status(502).json({success:false,message:'Email provider did not accept the request.'});
      return res.json({success:true,delivery:'provider_accepted'});
    } catch { return res.status(503).json({success:false,message:'Verification request unavailable.'}); }
  });
  // The database RPC atomically checks current email, expiration and token hash,
  // consumes the token once, and sets verification status in one transaction.
  app.post('/api/parents/email/verification/confirm', async (req,res) => {
    if (disabled() || !admin) return res.status(503).json({success:false,message:'Verification is disabled.'});
    const {studentId,token} = req.body || {};
    if (typeof studentId !== 'string' || !UUID.test(studentId) ||
        typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).json({success:false,message:'Invalid verification request.'});
    }
    try {
      const {hashToken} = require('./parent-email-verification.cjs');
      const {data,error} = await admin.rpc('confirm_parent_email_verification',{
        p_student_id:studentId,p_token_hash:hashToken(token)
      });
      if (error) return res.status(503).json({success:false,message:'Verification service unavailable.'});
      if (data !== true) return res.status(400).json({success:false,message:'Invalid or expired verification link.'});
      return res.json({success:true,verified:true});
    } catch {
      return res.status(503).json({success:false,message:'Verification service unavailable.'});
    }
  });
}
module.exports={registerParentEmailRoutes};
