/**
 * Site-wide facts. Server-only: this module is imported from `.astro` files
 * during the build. Do not import it from client scripts or React islands,
 * or the contact addresses end up in the shipped JavaScript.
 */
export const site = {
	name: 'Context',
	legalName: 'Raw Context LLC',
	url: 'https://rawcontext.com',
	description:
		'Context makes AI useful. We build software that has a model somewhere inside it, and tools for the people and agents who build that kind of software.',
	githubUrl: 'https://github.com/rawcontext',
	contactEmail: 'chris@rawcontext.com',
	privacyEmail: 'chris@cheney.dev',
} as const;
