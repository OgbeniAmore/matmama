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

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!callerRole || !["program_manager", "system_admin"].includes(callerRole.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("account_id")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invitation_id } = await req.json();
    if (!invitation_id) {
      return new Response(JSON.stringify({ error: "invitation_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up invitation, ensure same account
    const { data: invitation, error: invErr } = await supabaseAdmin
      .from("invitations")
      .select("*")
      .eq("id", invitation_id)
      .eq("account_id", callerProfile.account_id)
      .single();

    if (invErr || !invitation) {
      return new Response(JSON.stringify({ error: "Invitation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invitation.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Cannot revoke a ${invitation.status} invitation` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Find the corresponding auth user
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
    const target = usersList?.users?.find((u) => u.email === invitation.email);

    if (target) {
      // Verify user has not signed in yet (truly pending). If they have, just mark revoked.
      const neverSignedIn = !target.last_sign_in_at;

      if (neverSignedIn) {
        // Remove their profile from this account
        await supabaseAdmin
          .from("profiles")
          .delete()
          .eq("user_id", target.id)
          .eq("account_id", callerProfile.account_id);

        // Check if they belong to any other account
        const { data: otherProfiles } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("user_id", target.id);

        if (!otherProfiles || otherProfiles.length === 0) {
          // No other accounts — delete the auth user + role entirely
          await supabaseAdmin.from("user_roles").delete().eq("user_id", target.id);
          await supabaseAdmin.auth.admin.deleteUser(target.id);
        }
      }
    }

    // Mark invitation as revoked
    await supabaseAdmin
      .from("invitations")
      .update({ status: "revoked" })
      .eq("id", invitation_id);

    return new Response(JSON.stringify({ message: "Invitation revoked" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("revoke-invitation error:", err);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
