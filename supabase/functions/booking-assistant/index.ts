import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, vendorId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch available services for context
    let servicesContext = '';
    if (vendorId) {
      const { data: services } = await supabase
        .from('services')
        .select('name, description, duration_minutes, price, category')
        .eq('vendor_id', vendorId)
        .eq('is_active', true);

      if (services && services.length > 0) {
        servicesContext = `\n\nAvailable services:\n${services.map(s => 
          `- ${s.name}: ${s.description || 'No description'} (${s.duration_minutes} min, $${s.price})${s.category ? ` - Category: ${s.category}` : ''}`
        ).join('\n')}`;
      }

      // Fetch today's bookings to know availability
      const today = new Date().toISOString().split('T')[0];
      const { data: bookings } = await supabase
        .from('bookings')
        .select('booking_date, booking_time, duration_minutes, service_name')
        .eq('vendor_id', vendorId)
        .gte('booking_date', today)
        .order('booking_date')
        .order('booking_time');

      if (bookings && bookings.length > 0) {
        servicesContext += `\n\nExisting bookings (busy times):\n${bookings.slice(0, 10).map(b => 
          `- ${b.booking_date} at ${b.booking_time}: ${b.service_name} (${b.duration_minutes || 60} min)`
        ).join('\n')}`;
      }
    }

    const systemPrompt = `You are a friendly and helpful booking assistant. Your role is to help customers:
1. Find available services and understand what's offered
2. Suggest suitable time slots based on their preferences
3. Answer questions about services, pricing, and duration
4. Guide them through the booking process

Be concise, friendly, and helpful. If you don't have specific availability information, suggest common business hours (9 AM - 6 PM, Monday-Saturday).
${servicesContext}

When suggesting times, consider typical business hours and try to offer 2-3 options. Always confirm the service they're interested in before suggesting times.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Booking assistant error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
