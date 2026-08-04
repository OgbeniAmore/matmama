import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateTempPassword(): string {
  // 16 chars, mixed case, digits, symbols
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pwd = "";
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 12; i++) pwd += chars[arr[i] % chars.length];
  return pwd + "Aa1!";
}

function buildEmailHtml(opts: {
  email: string;
  tempPassword: string;
  role: string;
  appUrl: string;
  inviterName: string;
  expiresAt: string;
}) {
  const { email, tempPassword, role, appUrl, inviterName, expiresAt } = opts;
  const roleLabel = role
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  const expiryDate = new Date(expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>You're invited to Matmama</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#0F766E 0%,#14B8A6 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.3px;">Matmama</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">Maternal & Child Health Tracking</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 24px;">
              <h2 style="margin:0 0 12px;color:#0f172a;font-size:20px;font-weight:600;">You've been invited 🎉</h2>
              <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
                <strong>${inviterName}</strong> has invited you to join their team on Matmama as a
                <strong style="color:#0F766E;">${roleLabel}</strong>.
              </p>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Use the credentials below to sign in. We recommend changing your password right after first login.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:18px 22px;">
                    <p style="margin:0 0 4px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Email</p>
                    <p style="margin:0 0 14px;color:#0f172a;font-size:15px;font-family:'SF Mono',Monaco,monospace;">${email}</p>
                    <p style="margin:0 0 4px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Temporary Password</p>
                    <p style="margin:0;color:#0f172a;font-size:16px;font-family:'SF Mono',Monaco,monospace;font-weight:600;">${tempPassword}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="background:#0F766E;border-radius:8px;">
                    <a href="${appUrl}/auth" style="display:inline-block;padding:13px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Sign in to Matmama</a>
                  </td>
                </tr>
              </table>

              <div style="background:#fef3c7;border-left:3px solid #f59e0b;border-radius:4px;padding:12px 16px;margin-bottom:8px;">
                <p style="margin:0;color:#78350f;font-size:13px;line-height:1.5;">
                  ⏱ This invitation expires on <strong>${expiryDate}</strong>. After that, ask your manager for a new one.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #f1f5f9;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;text-align:center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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
      return new Response(JSON.stringify({ error: "Forbidden: insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("account_id, first_name, last_name")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: "Caller profile not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, role, facility_id, lga, resend, user_id, statusOnly } = body;

    const inviterNameForEmail = [callerProfile.first_name, callerProfile.last_name]
      .filter(Boolean)
      .join(" ") || "A team manager";

    const COOLDOWN_SECONDS = 120;

    // ---- Invite status lookup (no side effects other than marking acceptance) ----
    if (statusOnly) {
      if (!user_id && !email) {
        return new Response(JSON.stringify({ error: "user_id or email is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let sEmail: string | null = email ?? null;
      let lastSignInAt: string | null = null;
      if (user_id) {
        const { data: target } = await supabaseAdmin.auth.admin.getUserById(user_id);
        sEmail = target?.user?.email ?? sEmail;
        lastSignInAt = target?.user?.last_sign_in_at ?? null;
      }

      let invite: any = null;
      if (sEmail) {
        const { data } = await supabaseAdmin
          .from("invitations")
          .select("status, last_sent_at, send_count, last_send_ok, last_send_error, accepted_at, expires_at")
          .eq("email", sEmail)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        invite = data;
      }

      const accepted = !!lastSignInAt;
      if (accepted && invite && !invite.accepted_at && sEmail) {
        await supabaseAdmin
          .from("invitations")
          .update({ accepted_at: lastSignInAt, status: "accepted" })
          .eq("email", sEmail);
        invite.accepted_at = lastSignInAt;
        invite.status = "accepted";
      }

      const remaining = invite?.last_sent_at
        ? Math.max(
            0,
            Math.ceil(COOLDOWN_SECONDS - (Date.now() - new Date(invite.last_sent_at).getTime()) / 1000),
          )
        : 0;

      return new Response(
        JSON.stringify({
          email: sEmail,
          accepted,
          acceptedAt: invite?.accepted_at ?? lastSignInAt ?? null,
          lastSentAt: invite?.last_sent_at ?? null,
          sendCount: invite?.send_count ?? 0,
          lastSendOk: invite?.last_send_ok ?? null,
          lastSendError: invite?.last_send_error ?? null,
          status: invite?.status ?? null,
          cooldownSeconds: COOLDOWN_SECONDS,
          cooldownRemaining: remaining,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }



    // ---- Resend invitation: reset the temp password and re-send the email ----
    if (resend) {
      if (!user_id && !email) {
        return new Response(JSON.stringify({ error: "user_id or email is required to resend" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let targetId: string | null = user_id ?? null;
      let targetEmail: string | null = email ?? null;

      if (targetId) {
        const { data: target } = await supabaseAdmin.auth.admin.getUserById(targetId);
        targetEmail = target?.user?.email ?? null;
      } else {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();
        const found = list?.users?.find((u) => u.email === targetEmail);
        targetId = found?.id ?? null;
      }

      if (!targetId || !targetEmail) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: targetRoleRow } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", targetId)
        .maybeSingle();

      // ---- Cooldown: block repeat sends within RESEND_COOLDOWN_SECONDS ----
      const COOLDOWN_SECONDS = 120;
      const { data: existingInvite } = await supabaseAdmin
        .from("invitations")
        .select("last_sent_at, send_count")
        .eq("account_id", callerProfile.account_id)
        .eq("email", targetEmail)
        .maybeSingle();

      if (existingInvite?.last_sent_at) {
        const elapsed = (Date.now() - new Date(existingInvite.last_sent_at).getTime()) / 1000;
        if (elapsed < COOLDOWN_SECONDS) {
          const retryAfter = Math.ceil(COOLDOWN_SECONDS - elapsed);
          return new Response(
            JSON.stringify({
              error: `Please wait ${retryAfter}s before resending this invitation.`,
              cooldown: true,
              retryAfterSeconds: retryAfter,
              lastSentAt: existingInvite.last_sent_at,
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const newTempPassword = generateTempPassword();
      const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
        password: newTempPassword,
      });
      if (pwErr) {
        console.error("resend password reset error:", pwErr);
        return new Response(JSON.stringify({ error: "Failed to reset temporary password" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }


      const resendExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const resendKeyForResend = Deno.env.get("RESEND_API_KEY");
      const resendAppUrl = Deno.env.get("APP_URL") || "https://main.d34ou16e4j43yh.amplifyapp.com";
      let resendSent = false;
      let resendError: string | null = null;

      const resendHtml = buildEmailHtml({
        email: targetEmail,
        tempPassword: newTempPassword,
        role: targetRoleRow?.role ?? role ?? "facility_officer",
        appUrl: resendAppUrl,
        inviterName: inviterNameForEmail,
        expiresAt: resendExpiry,
      });

      if (resendKeyForResend) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKeyForResend}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Matmama <onboarding@resend.dev>",
              to: [targetEmail],
              subject: `Your Matmama invitation (resent)`,
              html: resendHtml,
            }),
          });
          if (res.ok) {
            resendSent = true;
          } else {
            resendError = await res.text();
            console.error("Resend send failed:", resendError);
          }
        } catch (e) {
          resendError = String(e);
          console.error("Resend error:", e);
        }
      } else {
        resendError = "Email service not configured — share credentials manually";
      }

      const nowIso = new Date().toISOString();
      await supabaseAdmin
        .from("invitations")
        .upsert(
          {
            account_id: callerProfile.account_id,
            email: targetEmail,
            role: (targetRoleRow?.role ?? role ?? "facility_officer"),
            invited_by: caller.id,
            status: "pending",
            expires_at: resendExpiry,
            last_sent_at: nowIso,
            send_count: (existingInvite?.send_count ?? 0) + 1,
            last_send_ok: resendSent,
            last_send_error: resendError,
          },
          { onConflict: "account_id,email" }
        );

      return new Response(
        JSON.stringify({
          message: resendSent
            ? "Invitation email resent"
            : "Temporary password reset — share it manually",
          userId: targetId,
          email: targetEmail,
          emailSent: resendSent,
          emailError: resendError,
          lastSentAt: nowIso,
          sendCount: (existingInvite?.send_count ?? 0) + 1,
          cooldownSeconds: COOLDOWN_SECONDS,
          tempPassword: resendSent ? null : newTempPassword,
        }),

        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email || !role) {
      return new Response(JSON.stringify({ error: "email and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // System Admin only check for inviting system_admin or unrestricted PM placement
    const callerIsAdmin = callerRole.role === "system_admin";
    if (role === "system_admin" && !callerIsAdmin) {
      return new Response(JSON.stringify({ error: "Only system admins can invite system admins" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (role === "program_manager" && !callerIsAdmin) {
      return new Response(JSON.stringify({ error: "Only system admins can invite program managers" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (role === "program_manager" && !lga) {
      return new Response(JSON.stringify({ error: "An LGA assignment is required for Program Managers" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountId = callerProfile.account_id;
    const inviterName = [callerProfile.first_name, callerProfile.last_name]
      .filter(Boolean)
      .join(" ") || "A team manager";

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    let userId: string;
    let tempPassword: string | null = null;
    let isNewUser = false;

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
        // Update role + facility + lga instead
        // Unique constraint is (user_id, role) — replace the row so the new role sticks
        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userId, role });
        if (roleErr) {
          console.error("role update error:", roleErr);
          return new Response(JSON.stringify({ error: "Failed to update role" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const updates: Record<string, unknown> = {};
        if (facility_id !== undefined) updates.facility_id = facility_id;
        if (lga !== undefined) updates.lga = lga;
        if (Object.keys(updates).length > 0) {
          await supabaseAdmin
            .from("profiles")
            .update(updates)
            .eq("user_id", userId)
            .eq("account_id", accountId);
        }

        return new Response(
          JSON.stringify({ message: `User already in team — role updated to ${role}`, userId, roleUpdated: true }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Reset password so we can email a fresh temp one
      tempPassword = generateTempPassword();
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: tempPassword });

      await supabaseAdmin.from("profiles").insert({
        user_id: userId,
        account_id: accountId,
        facility_id: facility_id || null,
        lga: lga || null,
      });

      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
    } else {
      isNewUser = true;
      tempPassword = generateTempPassword();
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { invited_by: caller.id },
      });

      if (createError || !newUser.user) {
        console.error("createUser error:", createError);
        return new Response(JSON.stringify({ error: "Failed to create user account" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = newUser.user.id;

      await supabaseAdmin.from("profiles").insert({
        user_id: userId,
        account_id: accountId,
        facility_id: facility_id || null,
        lga: lga || null,
      });

      await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role,
      });
    }

    // Record/refresh invitation row (status: pending until they sign in)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: invitationRow } = await supabaseAdmin
      .from("invitations")
      .upsert(
        {
          account_id: accountId,
          email,
          role,
          facility_id: facility_id || null,
          invited_by: caller.id,
          status: "pending",
          expires_at: expiresAt,
          last_sent_at: new Date().toISOString(),
          send_count: 1,

        },
        { onConflict: "account_id,email" }
      )
      .select()
      .single();

    // Send invitation email via Lovable AI Gateway -> use Resend if available, else log
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const appUrl = Deno.env.get("APP_URL") || "https://main.d34ou16e4j43yh.amplifyapp.com";
    let emailSent = false;
    let emailError: string | null = null;

    if (tempPassword) {
      const html = buildEmailHtml({
        email,
        tempPassword,
        role,
        appUrl,
        inviterName,
        expiresAt,
      });

      if (resendKey) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Matmama <onboarding@resend.dev>",
              to: [email],
              subject: `${inviterName} invited you to Matmama`,
              html,
            }),
          });
          if (res.ok) {
            emailSent = true;
          } else {
            emailError = await res.text();
            console.error("Resend send failed:", emailError);
          }
        } catch (e) {
          emailError = String(e);
          console.error("Resend error:", e);
        }
      } else {
        console.log("[invite-user] No RESEND_API_KEY — email not sent. Temp password for", email, ":", tempPassword);
        emailError = "Email service not configured — share credentials manually";
      }
    }

    if (invitationRow?.id) {
      await supabaseAdmin
        .from("invitations")
        .update({ last_send_ok: emailSent, last_send_error: emailError })
        .eq("id", invitationRow.id);
    }



    return new Response(
      JSON.stringify({
        message: emailSent
          ? "Invitation sent successfully"
          : "User created — share temporary password manually",
        userId,
        isNewUser,
        emailSent,
        emailError,
        // Only return tempPassword if email failed, so manager can share manually
        tempPassword: emailSent ? null : tempPassword,
        invitationId: invitationRow?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("invite-user error:", err);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
