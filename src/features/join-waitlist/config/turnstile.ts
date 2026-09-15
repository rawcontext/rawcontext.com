/**
 * Cloudflare Turnstile site keys are public. The production key is bound to
 * rawcontext.com; in development the documented always-passing test key is
 * used so the flow can be exercised on localhost.
 */
const PRODUCTION_SITE_KEY = '0x4AAAAAACJhYfFcaH1IGN1W';
const TEST_SITE_KEY = '1x00000000000000000000AA';

export const TURNSTILE_SITE_KEY = import.meta.env.DEV ? TEST_SITE_KEY : PRODUCTION_SITE_KEY;
