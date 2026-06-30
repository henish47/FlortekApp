import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get SMTP configuration from Deno environment secrets
    const host = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
    const port = parseInt(Deno.env.get("SMTP_PORT") || "465", 10);
    const username = Deno.env.get("SMTP_USER");
    const password = Deno.env.get("SMTP_PASS");

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "SMTP credentials not configured in Supabase secrets (SMTP_USER/SMTP_PASS)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Connecting to SMTP server ${host}:${port} as ${username}...`);

    const client = new SMTPClient({
      connection: {
        hostname: host,
        port: port,
        tls: port === 465, // Use secure TLS for 465, otherwise standard STARTTLS
        auth: {
          username: username,
          password: password,
        },
      },
    });

    console.log(`Sending email to ${to}...`);
    await client.send({
      from: username,
      to: to,
      subject: subject,
      content: body,
      html: body.replace(/\n/g, '<br/>'), // Optional HTML conversion
    });

    await client.close();
    console.log("Email sent successfully!");

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("SMTP Email Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
