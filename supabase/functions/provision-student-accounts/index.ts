import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const getCorsHeaders = (request: Request) => {
  const requestOrigin = request.headers.get("Origin") ?? "";
  const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const localOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
  const allowedOrigin = [...configuredOrigins, ...localOrigins].includes(
    requestOrigin,
  )
    ? requestOrigin
    : (configuredOrigins[0] ?? localOrigins[0]);
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
};

Deno.serve(async (request) => {
  const corsHeaders = getCorsHeaders(request);
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) throw new Error("Missing authorization token");

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: caller, error: callerError } =
      await callerClient.auth.getUser();
    if (callerError || !caller.user) throw new Error("Unauthorized");

    const admin = createClient(url, serviceKey);
    const { data: callerRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.user.id)
      .maybeSingle();
    if (callerRole?.role !== "admin") {
      throw new Error("Only an administrator can provision accounts");
    }

    const body = await request.json();
    const students = Array.isArray(body.students) ? body.students : [];
    if (students.length < 1 || students.length > 100) {
      throw new Error("Provide between 1 and 100 students");
    }

    const results: Array<Record<string, unknown>> = [];
    for (const item of students) {
      try {
        const email = String(item.email || "")
          .trim()
          .toLowerCase();
        const password = String(item.password || "");
        if (
          !email ||
          password.length < 6 ||
          !item.studentId ||
          !item.fullName
        ) {
          throw new Error("Invalid student account data");
        }
        const { data: existingStudent } = await admin
          .from("students")
          .select("id, user_id")
          .eq("id", item.studentId)
          .maybeSingle();
        if (!existingStudent) throw new Error("Student record not found");
        if (existingStudent.user_id)
          throw new Error("Student already has a linked account");

        const { data: created, error: createError } =
          await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: item.fullName },
          });
        if (createError || !created.user)
          throw createError ?? new Error("Auth account was not created");

        const userId = created.user.id;
        const { error: profileError } = await admin.from("profiles").upsert({
          id: userId,
          full_name: item.fullName,
          must_change_password: true,
        });
        const { error: roleError } = await admin.from("user_roles").upsert(
          {
            user_id: userId,
            role: "student",
            department_id: item.departmentId || null,
          },
          { onConflict: "user_id,role" },
        );
        const { error: studentError } = await admin
          .from("students")
          .update({ user_id: userId, email })
          .eq("id", item.studentId);

        if (profileError || roleError || studentError) {
          await admin.auth.admin.deleteUser(userId);
          throw profileError || roleError || studentError;
        }
        results.push({ studentId: item.studentId, userId, email, ok: true });
      } catch (error) {
        results.push({
          studentId: item.studentId,
          email: item.email,
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown provisioning error",
        });
      }
    }

    return Response.json(
      { results },
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown request error",
      },
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
