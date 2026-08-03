import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const { data: { user: caller }, error: authError } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !caller) return json({ error: "Unauthorized" }, 401);

    const { data: callerRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    const callerIsAdmin = callerRole?.role === "system_admin";
    const callerIsPm = callerRole?.role === "program_manager";
    if (!callerIsAdmin && !callerIsPm) {
      return json({ error: "Forbidden: insufficient permissions" }, 403);
    }

    const body = await req.json();
    const { user_id, role, facility_id, lga } = body as {
      user_id?: string;
      role?: string | null;
      facility_id?: string | null;
      lga?: string | null;
    };

    if (!user_id) return json({ error: "user_id is required" }, 400);
    if (user_id === caller.id && role) {
      return json({ error: "You cannot change your own role" }, 400);
    }

    const { data: targetProfile } = await admin
      .from("profiles")
      .select("user_id, account_id, lga, facility_id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (!targetProfile) return json({ error: "Member not found" }, 404);

    // Program Managers are limited to their own LGA and cannot grant elevated roles
    if (callerIsPm) {
      const { data: callerProfile } = await admin
        .from("profiles")
        .select("lga")
        .eq("user_id", caller.id)
        .maybeSingle();

      let targetLga = targetProfile.lga;
      if (!targetLga && targetProfile.facility_id) {
        const { data: fac } = await admin
          .from("facilities")
          .select("lga")
          .eq("id", targetProfile.facility_id)
          .maybeSingle();
        targetLga = fac?.lga ?? null;
      }
      if (!callerProfile?.lga || targetLga !== callerProfile.lga) {
        return json({ error: "You can only manage members in your own LGA" }, 403);
      }
      if (role && ["system_admin", "program_manager"].includes(role)) {
        return json({ error: "Only system admins can assign that role" }, 403);
      }
    }

    if (role) {
      // The unique constraint is (user_id, role), so replace the row rather than upsert.
      const { error: delErr } = await admin.from("user_roles").delete().eq("user_id", user_id);
      if (delErr) {
        console.error("role delete error:", delErr);
        return json({ error: "Failed to update role" }, 500);
      }
      const { error: insErr } = await admin
        .from("user_roles")
        .insert({ user_id, role });
      if (insErr) {
        console.error("role insert error:", insErr);
        return json({ error: insErr.message || "Failed to update role" }, 400);
      }
    }

    const updates: Record<string, unknown> = {};
    if (facility_id !== undefined) updates.facility_id = facility_id || null;
    if (lga !== undefined) updates.lga = lga || null;
    // System admins and program managers are not scoped to a facility/LGA seat
    if (role === "system_admin") {
      updates.facility_id = null;
      updates.lga = null;
    }

    if (Object.keys(updates).length > 0) {
      const { error: profErr } = await admin
        .from("profiles")
        .update(updates)
        .eq("user_id", user_id);
      if (profErr) {
        console.error("profile update error:", profErr);
        return json({ error: profErr.message || "Failed to update assignment" }, 400);
      }
    }

    await admin.from("audit_logs").insert({
      user_id: caller.id,
      account_id: targetProfile.account_id,
      action: "UPDATE_MEMBER",
      table_name: "user_roles",
      record_id: user_id,
      new_data: { role: role ?? null, ...updates },
    });

    return json({ success: true, user_id, role: role ?? null });
  } catch (err) {
    console.error("update-member error:", err);
    return json({ error: "An internal error occurred" }, 500);
  }
});
