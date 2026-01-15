import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  emails: string[];
  role: string;
  organizationId: string;
  eventId?: string;
  message?: string;
}

interface InvitationResult {
  email: string;
  success: boolean;
  invitationId?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate HTTP method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: InvitationRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { emails, role, organizationId, eventId, message } = body;

    // Validate inputs
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one email address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!role || !organizationId) {
      return new Response(
        JSON.stringify({ error: 'Role and organizationId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has permission to invite to this organization
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return new Response(
        JSON.stringify({ error: 'You are not a member of this organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user can invite (org_admin or event_manager)
    if (!['org_admin', 'event_manager'].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to invite members' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get event details if eventId provided
    let eventName: string | null = null;
    if (eventId) {
      const { data: event } = await supabase
        .from('events')
        .select('name')
        .eq('id', eventId)
        .single();
      eventName = event?.name || null;
    }

    // Get inviter's profile
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', user.id)
      .single();

    const inviterName = inviterProfile?.name || inviterProfile?.email || 'A team member';

    // Get Resend API key (optional - will skip email if not configured)
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    // Get app URL for invitation links
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';

    // Process each email
    const results: InvitationResult[] = [];

    for (const email of emails) {
      try {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          results.push({ email, success: false, error: 'Invalid email format' });
          continue;
        }

        // Check if already a member
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (existingProfile) {
          const { data: existingMember } = await supabase
            .from('organization_members')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('user_id', existingProfile.id)
            .maybeSingle();

          if (existingMember) {
            results.push({ email, success: false, error: 'User is already a member' });
            continue;
          }
        }

        // Check for existing pending invitation
        const { data: existingInvitation } = await supabase
          .from('invitations')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('email', email.toLowerCase())
          .eq('status', 'pending')
          .maybeSingle();

        if (existingInvitation) {
          results.push({ email, success: false, error: 'Invitation already pending' });
          continue;
        }

        // Create invitation
        const { data: invitation, error: inviteError } = await supabaseAdmin
          .from('invitations')
          .insert({
            organization_id: organizationId,
            event_id: eventId || null,
            email: email.toLowerCase(),
            role,
            invited_by: user.id,
            message: message || null,
          })
          .select('id, token')
          .single();

        if (inviteError || !invitation) {
          console.error('Error creating invitation:', inviteError);
          results.push({ email, success: false, error: 'Failed to create invitation' });
          continue;
        }

        // Send email if Resend is configured
        if (resendApiKey) {
          const inviteUrl = `${appUrl}/join/${invitation.token}`;

          // Build email content
          const subject = eventId
            ? `${inviterName} invited you to collaborate on ${eventName}`
            : `${inviterName} invited you to join ${org.name}`;

          const htmlContent = buildEmailHtml({
            inviterName,
            organizationName: org.name,
            eventName,
            role,
            message,
            inviteUrl,
          });

          try {
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: Deno.env.get('EMAIL_FROM') || 'Steady <noreply@steady.app>',
                to: [email],
                subject,
                html: htmlContent,
              }),
            });

            if (!emailResponse.ok) {
              const errorText = await emailResponse.text();
              console.error('Resend API error:', errorText);
              // Still mark as success since invitation was created
            }
          } catch (emailError) {
            console.error('Failed to send email:', emailError);
            // Still mark as success since invitation was created
          }
        }

        results.push({ email, success: true, invitationId: invitation.id });
      } catch (error) {
        console.error('Error processing invitation for', email, error);
        results.push({ email, success: false, error: 'Unexpected error' });
      }
    }

    // Return results
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `${successCount} invitation(s) sent${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface EmailTemplateParams {
  inviterName: string;
  organizationName: string;
  eventName: string | null;
  role: string;
  message: string | null | undefined;
  inviteUrl: string;
}

function buildEmailHtml(params: EmailTemplateParams): string {
  const { inviterName, organizationName, eventName, role, message, inviteUrl } = params;

  const roleLabels: Record<string, string> = {
    org_admin: 'Admin',
    event_manager: 'Event Manager',
    vendor: 'Vendor',
    partner: 'Partner',
    volunteer: 'Volunteer',
  };

  const roleLabel = roleLabels[role] || role;

  const inviteContext = eventName
    ? `to collaborate on <strong>${eventName}</strong>`
    : `to join <strong>${organizationName}</strong>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 560px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">You're Invited!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
                <strong>${inviterName}</strong> from <strong>${organizationName}</strong> has invited you ${inviteContext}.
              </p>

              ${message ? `
              <div style="background-color: #f9fafb; border-left: 4px solid #6366f1; padding: 16px 20px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-size: 14px; color: #4b5563; font-style: italic;">"${message}"</p>
              </div>
              ` : ''}

              <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">
                Your role: <span style="display: inline-block; background-color: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 9999px; font-weight: 500;">${roleLabel}</span>
              </p>

              <p style="margin: 24px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                Click the button below to accept this invitation and ${eventName ? 'start collaborating' : 'join the team'}.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding: 16px 0;">
                    <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 13px; color: #9ca3af; text-align: center;">
                This invitation will expire in 7 days.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">
                Powered by <strong style="color: #374151;">Steady</strong>
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Event planning made steady
              </p>
            </td>
          </tr>
        </table>

        <!-- Link fallback -->
        <table role="presentation" style="max-width: 560px; margin: 16px auto 0;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                If the button doesn't work, copy and paste this link:<br>
                <a href="${inviteUrl}" style="color: #6366f1; word-break: break-all;">${inviteUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
