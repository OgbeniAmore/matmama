const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROLE_GUIDES: Record<string, string> = {
  system_admin: `You are speaking with a SYSTEM ADMIN. They have full access: managing facilities, team members, viewing audit logs, exporting data, and overseeing all clients across all facilities. Guide them on configuration, user provisioning, and platform-wide oversight.`,
  program_manager: `You are speaking with a PROGRAM MANAGER. They oversee multiple facilities, manage team members, approve transfers, view audit logs, and export data. Guide them on program-level analytics, defaulter management, and team coordination.`,
  facility_officer: `You are speaking with a FACILITY OFFICER. They manage clients within their assigned facility, handle transfers, send reminders, register new clients (Routine Immunization, Family Planning, Ante Natal Care), and track defaulters. Guide them on day-to-day client care workflows.`,
  data_entry_officer: `You are speaking with a DATA ENTRY OFFICER. They register clients and update records but cannot delete clients, manage transfers, team, or facilities. Guide them on accurate data entry: registering clients, recording visits, updating contact info.`,
};

const PLATFORM_OVERVIEW = `
Matmama is a multi-tenant healthcare client tracking platform for Nigerian primary health facilities.

Core services tracked:
- **Routine Immunization**: Nigeria 2026 EPI Schedule with automated visit generation and progress tracking
- **Family Planning**: Client follow-up and reminders
- **Ante Natal Care (ANC)**: WHO 8-contact regimen scheduled from LMP (calculates EDD using Naegele's rule)

Key features:
- Client statuses: On Track (green), Defaulting (red), Completed (blue)
- Automated daily defaulter detection
- AI-generated SMS/WhatsApp reminders via Twilio
- Cross-facility client search using LASRAA ID, NIN ID, or system ID
- Secure client transfer workflow (requires source facility approval)
- Audit logs for all significant actions
- Notification preferences (in-app and email)
- Mobile-first responsive UI with bottom navigation

Navigation:
- /clients — manage clients (card layout)
- /defaulters — view and act on defaulting clients
- /reminders — reminder history
- /transfers — incoming/outgoing transfer requests
- /facilities — manage facilities (admins/managers)
- /team — invite and manage team members (admins/managers)
- /audit-log — view audit trail (admins/managers)
- /client-search — global cross-facility search
- /profile — your profile, permissions, password
- /notification-preferences — toggle alert types
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, role, language, userName } = await req.json();

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const roleGuide = ROLE_GUIDES[role] || ROLE_GUIDES.facility_officer;
    const langInstruction =
      language && language !== "auto"
        ? `Always respond in ${language}, regardless of the language of the question.`
        : `Detect the user's language from their message and respond in the same language. Default to English.`;

    const systemPrompt = `You are Mat, a friendly AI assistant for the Matmama healthcare platform.
${PLATFORM_OVERVIEW}

${roleGuide}

${userName ? `The user's name is ${userName}. Greet them by name on the first turn only.` : ""}

Communication rules:
- ${langInstruction}
- Be concise, warm, and practical. Use markdown (lists, **bold**, short headings).
- When explaining a workflow, give step-by-step numbered instructions referencing the actual menu items (e.g., "Go to **Clients** → tap **Add Client**").
- If the user asks about something they don't have permission for, politely explain their role doesn't include that and suggest who can help (e.g., a Program Manager).
- Never invent features that aren't listed above. If unsure, say so and suggest where to look.
- Keep answers under 200 words unless the user asks for detail.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to your Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
