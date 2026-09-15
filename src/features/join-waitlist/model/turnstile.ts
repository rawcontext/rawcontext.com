/**
 * A thin, typed wrapper around Cloudflare Turnstile in invisible mode.
 * The script is loaded on demand, so nothing reaches Cloudflare until a
 * person engages with the form. The widget runs its challenge as soon as it
 * renders, so by the time the form is submitted a token is usually waiting.
 */
interface TurnstileRenderOptions {
	sitekey: string;
	appearance?: 'always' | 'execute' | 'interaction-only';
	callback?: (token: string) => void;
	'error-callback'?: (code?: string) => void;
	'expired-callback'?: () => void;
	'timeout-callback'?: () => void;
}

interface TurnstileApi {
	render(container: HTMLElement, options: TurnstileRenderOptions): string;
	reset(widgetId?: string): void;
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const ONLOAD_CALLBACK = 'contextTurnstileReady';
const LOAD_TIMEOUT_MS = 15_000;
const VERIFY_TIMEOUT_MS = 20_000;

type TurnstileWindow = Window & {
	turnstile?: TurnstileApi;
	[ONLOAD_CALLBACK]?: () => void;
};

export class TurnstileError extends Error {
	constructor(
		readonly kind: 'load' | 'verify',
		message: string,
	) {
		super(message);
		this.name = 'TurnstileError';
	}
}

let loading: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
	loading ??= new Promise<TurnstileApi>((resolve, reject) => {
		const host = window as TurnstileWindow;
		if (host.turnstile) {
			resolve(host.turnstile);
			return;
		}

		const fail = (message: string) => {
			clearTimeout(timer);
			loading = undefined;
			reject(new TurnstileError('load', message));
		};
		const timer = setTimeout(() => fail('Turnstile did not load in time'), LOAD_TIMEOUT_MS);

		host[ONLOAD_CALLBACK] = () => {
			clearTimeout(timer);
			if (host.turnstile) resolve(host.turnstile);
			else fail('Turnstile loaded without its API');
		};

		const script = document.createElement('script');
		script.src = `${SCRIPT_URL}?render=explicit&onload=${ONLOAD_CALLBACK}`;
		script.async = true;
		script.onerror = () => fail('Turnstile script failed to load');
		document.head.append(script);
	});
	return loading;
}

export interface Challenge {
	/** Resolves with a token: the one already waiting, or the next one issued. */
	verify(): Promise<string>;
	/** Clears a used token (they are single-use) and starts a new challenge. */
	reset(): void;
}

type Waiter = { resolve: (token: string) => void; reject: (error: Error) => void };

export async function createChallenge(container: HTMLElement, siteKey: string): Promise<Challenge> {
	const turnstile = await loadTurnstile();
	let token: string | undefined;
	let failed = false;
	let waiters: Waiter[] = [];

	const settle = (outcome: { token: string } | { error: Error }) => {
		const pending = waiters;
		waiters = [];
		for (const waiter of pending) {
			if ('token' in outcome) waiter.resolve(outcome.token);
			else waiter.reject(outcome.error);
		}
	};

	const widgetId = turnstile.render(container, {
		sitekey: siteKey,
		appearance: 'interaction-only',
		callback: (issued) => {
			token = issued;
			failed = false;
			settle({ token: issued });
		},
		'error-callback': () => {
			token = undefined;
			failed = true;
			settle({ error: new TurnstileError('verify', 'Verification failed') });
		},
		'expired-callback': () => {
			token = undefined;
			turnstile.reset(widgetId);
		},
		'timeout-callback': () => turnstile.reset(widgetId),
	});

	const restart = () => {
		token = undefined;
		failed = false;
		turnstile.reset(widgetId);
	};

	return {
		verify: () => {
			if (token) return Promise.resolve(token);
			if (failed) restart();
			return new Promise<string>((resolve, reject) => {
				const timer = setTimeout(() => {
					waiters = waiters.filter((waiter) => waiter !== entry);
					reject(new TurnstileError('verify', 'Verification timed out'));
				}, VERIFY_TIMEOUT_MS);
				const entry: Waiter = {
					resolve: (issued) => {
						clearTimeout(timer);
						resolve(issued);
					},
					reject: (error) => {
						clearTimeout(timer);
						reject(error);
					},
				};
				waiters.push(entry);
			});
		},
		reset: restart,
	};
}
