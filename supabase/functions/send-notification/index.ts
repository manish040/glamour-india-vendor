import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  notificationId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  customerName: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  type: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      notificationId,
      recipientEmail,
      recipientPhone,
      customerName,
      serviceName,
      bookingDate,
      bookingTime,
      type,
      message,
    }: NotificationRequest = await req.json();

    console.log("Processing notification:", { notificationId, type, recipientEmail });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let emailSent = false;
    let emailError = null;

    // Send email if recipient email is provided
    if (recipientEmail) {
      const subject = type === "reminder" 
        ? `Appointment Reminder - ${serviceName}` 
        : type === "confirmation"
        ? `Booking Confirmed - ${serviceName}`
        : type === "cancellation"
        ? `Booking Cancelled - ${serviceName}`
        : `Message from Glamour India`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 24px; }
            .logo { font-size: 24px; font-weight: bold; color: #e11d48; }
            .content { color: #374151; line-height: 1.6; }
            .details { background: #fef2f2; border-radius: 8px; padding: 16px; margin: 20px 0; }
            .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fecaca; }
            .details-row:last-child { border-bottom: none; }
            .label { color: #6b7280; font-size: 14px; }
            .value { font-weight: 600; color: #111827; }
            .footer { text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo">✨ Glamour India</div>
              </div>
              <div class="content">
                <p>Dear ${customerName},</p>
                <p>${message}</p>
                ${bookingDate && bookingTime ? `
                <div class="details">
                  <div class="details-row">
                    <span class="label">Service</span>
                    <span class="value">${serviceName}</span>
                  </div>
                  <div class="details-row">
                    <span class="label">Date</span>
                    <span class="value">${bookingDate}</span>
                  </div>
                  <div class="details-row">
                    <span class="label">Time</span>
                    <span class="value">${bookingTime}</span>
                  </div>
                </div>
                ` : ''}
                <p>We look forward to seeing you!</p>
              </div>
              <div class="footer">
                <p>© 2024 Glamour India. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: "Glamour India <onboarding@resend.dev>",
          to: [recipientEmail],
          subject: subject,
          html: htmlContent,
        });

        console.log("Email sent successfully:", emailResponse);
        emailSent = true;
      } catch (error: any) {
        console.error("Error sending email:", error);
        emailError = error.message;
      }
    }

    // Update notification status in database
    const newStatus = emailSent ? "sent" : (emailError ? "failed" : "pending");
    
    const { error: updateError } = await supabase
      .from("notifications")
      .update({
        status: newStatus,
        sent_at: emailSent ? new Date().toISOString() : null,
      })
      .eq("id", notificationId);

    if (updateError) {
      console.error("Error updating notification status:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: emailSent,
        status: newStatus,
        error: emailError,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
