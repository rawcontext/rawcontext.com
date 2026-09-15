export type JoinWaitlistResult = { ok: true } | { ok: false; message: string };

const FALLBACK_MESSAGE = 'Something went wrong. Try again.';

/** Posts an address to the waitlist endpoint (a Vercel function in `api/`). */
export async function joinWaitlist(email: string, turnstileToken: string): Promise<JoinWaitlistResult> {
	const response = await fetch('/api/waitlist', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email, turnstileToken }),
	});
	if (response.ok) return { ok: true };

	const body = (await response.json().catch(() => ({}))) as { error?: string };
	return { ok: false, message: body.error ?? FALLBACK_MESSAGE };
}
