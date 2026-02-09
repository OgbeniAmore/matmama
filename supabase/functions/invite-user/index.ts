import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller has manager/admin role
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!callerRole || !["program_manager", "system_admin"].includes(callerRole.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller's account
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("account_id")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: "Caller profile not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, role, facility_id } = await req.json();

    if (!email || !role) {
      return new Response(JSON.stringify({ error: "email and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountId = callerProfile.account_id;

    // Check if user already exists in account
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id")
      .eq("account_id", accountId)
      .eq("user_id", (
        await supabaseAdmin.rpc("get_user_by_email", { _email: email }).then(r => r.data)
      ) ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle();

    // Create or get auth user
    let userId: string;
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      userId = existingUser.id;

      // Check if already in this account
      const { data: profileCheck } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .eq("account_id", accountId)
        .maybeSingle();

      if (profileCheck) {
        // Update their role instead
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role }, { onConflict: "user_id" });

        if (facility_id) {
          await supabaseAdmin
            .from("profiles")
            .update({ facility_id })
            .eq("user_id", userId)
            .eq("account_id", accountId);
        }

        return new Response(JSON.stringify({ message: "User role updated", userId }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add to this account
      await supabaseAdmin.from("profiles").insert({
        user_id: userId,
        account_id: accountId,
        facility_id: facility_id || null,
      });

      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role }, { onConflict: "user_id" });
    } else {
      // Create new user with a temporary password
      const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { invited_by: caller.id },
      });

      if (createError || !newUser.user) {
        return new Response(JSON.stringify({ error: createError?.message || "Failed to create user" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = newUser.user.id;

      // Create profile
      await supabaseAdmin.from("profiles").insert({
        user_id: userId,
        account_id: accountId,
        facility_id: facility_id || null,
      });

      // Assign role
      await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role,
      });
    }

    // Record invitation
    await supabaseAdmin.from("invitations").upsert({
      account_id: accountId,
      email,
      role,
      facility_id: facility_id || null,
      invited_by: caller.id,
      status: "accepted",
    }, { onConflict: "account_id,email" });

    return new Response(
      JSON.stringify({ message: "User invited successfully", userId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("invite-user error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
