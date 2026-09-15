import { joinWaitlist } from '../api/join-waitlist';
import { TURNSTILE_SITE_KEY } from '../config/turnstile';
import { type Challenge, TurnstileError, createChallenge } from './turnstile';

const COPY = {
	busy: 'Joining…',
	success: "You're on the list. We'll write when there's something to use.",
	loadFailed: 'Verification could not load. Check your connection and try again.',
	verifyFailed: 'Verification failed. Try again.',
	offline: 'Connection failed. Try again.',
} as const;

type Tone = 'success' | 'error';

function messageFor(error: unknown): string {
	if (error instanceof TurnstileError) return error.kind === 'load' ? COPY.loadFailed : COPY.verifyFailed;
	return COPY.offline;
}

/**
 * Wires the waitlist form: prepares the invisible challenge the first time a
 * person engages, then on submit verifies, posts, and reports the outcome in
 * the live status line.
 */
export function initWaitlistForm(form: HTMLFormElement): void {
	const input = form.querySelector<HTMLInputElement>('input[name="email"]');
	const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
	const status = form.querySelector<HTMLElement>('[data-status]');
	const container = form.querySelector<HTMLElement>('[data-challenge]');
	if (!input || !button || !status || !container) return;

	const idleLabel = button.textContent;
	let challenge: Promise<Challenge> | undefined;

	const prepare = () => {
		challenge ??= createChallenge(container, TURNSTILE_SITE_KEY);
		challenge.catch(() => {
			challenge = undefined;
		});
		return challenge;
	};

	const setStatus = (message: string, tone?: Tone) => {
		status.textContent = message;
		if (tone) status.dataset.tone = tone;
		else delete status.dataset.tone;
	};

	const setBusy = (busy: boolean) => {
		button.disabled = busy;
		button.textContent = busy ? COPY.busy : idleLabel;
		form.setAttribute('aria-busy', String(busy));
	};

	form.addEventListener('focusin', prepare, { once: true });
	form.addEventListener('pointerenter', prepare, { once: true });

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		setBusy(true);
		setStatus('');
		let active: Challenge | undefined;
		try {
			active = await prepare();
			const token = await active.verify();
			const result = await joinWaitlist(input.value.trim(), token);
			if (result.ok) {
				setStatus(COPY.success, 'success');
				form.reset();
			} else {
				setStatus(result.message, 'error');
			}
		} catch (error) {
			setStatus(messageFor(error), 'error');
		} finally {
			// A token is single-use; clear the widget so the next attempt gets a fresh one.
			active?.reset();
			setBusy(false);
		}
	});
}
