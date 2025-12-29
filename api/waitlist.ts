import { neon } from '@neondatabase/serverless';

export const config = {
  runtime: 'edge',
};

interface WaitlistRequest {
  email: string;
  turnstileToken: string;
}

interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
}

interface Metadata {
  user_agent: string | null;
  referrer: string | null;
  ip: string | null;
  country: string | null;
  city: string | null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await req.json()) as WaitlistRequest;
    const { email, turnstileToken } = body;

    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Valid email required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!turnstileToken) {
      return new Response(JSON.stringify({ error: 'Verification required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify Turnstile token
    const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY!,
        response: turnstileToken,
        remoteip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '',
      }),
    });

    const turnstileData = (await turnstileRes.json()) as TurnstileResponse;

    if (!turnstileData.success) {
      return new Response(JSON.stringify({ error: 'Verification failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const metadata: Metadata = {
      user_agent: req.headers.get('user-agent'),
      referrer: req.headers.get('referer'),
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          req.headers.get('x-real-ip'),
      country: req.headers.get('x-vercel-ip-country'),
      city: req.headers.get('x-vercel-ip-city'),
    };

    await sql`
      INSERT INTO waitlist (email, user_agent, referrer, ip_address, country, city)
      VALUES (
        ${email.toLowerCase().trim()},
        ${metadata.user_agent},
        ${metadata.referrer},
        ${metadata.ip},
        ${metadata.country},
        ${metadata.city}
      )
      ON CONFLICT (email) DO UPDATE SET
        updated_at = NOW(),
        signup_count = waitlist.signup_count + 1
    `;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Waitlist error:', error);
    return new Response(JSON.stringify({ error: 'Failed to join waitlist' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
