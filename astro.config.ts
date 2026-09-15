import react from '@astrojs/react';
import { wgslVitePlugin } from '@vgpu/wgsl/loader-vite';
import { defineConfig, fontProviders } from 'astro/config';

/** Path to a font file shipped by a Fontsource package. */
const fontsource = (pkg: string, file: string) => `./node_modules/${pkg}/files/${file}`;

export default defineConfig({
	site: 'https://rawcontext.com',

	// Feature-Sliced Design: the `app` layer owns initialisation and routing,
	// so Astro's file router lives in src/app/pages. The other layers
	// (pages, widgets, features, shared) sit beside it under src/.
	srcDir: './src/app',
	output: 'static',

	integrations: [react()],

	// No Markdown on the site; Shiki's inline styles would only fight the CSP.
	markdown: { syntaxHighlight: false },

	vite: {
		// Lets widgets import `.wgsl` files, with `import` between shader modules.
		plugins: [wgslVitePlugin()],
	},

	// Self-hosted fonts. Astro copies the files into the build and writes the
	// @font-face rules; nothing is fetched from a third party at runtime.
	fonts: [
		{
			name: 'Newsreader',
			cssVariable: '--font-newsreader',
			provider: fontProviders.local(),
			fallbacks: ['Georgia', 'Times New Roman', 'serif'],
			options: {
				variants: [
					{
						weight: '200 800',
						style: 'normal',
						src: [fontsource('@fontsource-variable/newsreader', 'newsreader-latin-opsz-normal.woff2')],
					},
					{
						weight: '200 800',
						style: 'italic',
						src: [fontsource('@fontsource-variable/newsreader', 'newsreader-latin-opsz-italic.woff2')],
					},
				],
			},
		},
		{
			name: 'IBM Plex Mono',
			cssVariable: '--font-plex-mono',
			provider: fontProviders.local(),
			fallbacks: ['ui-monospace', 'Menlo', 'monospace'],
			options: {
				variants: [
					{
						weight: 400,
						style: 'normal',
						src: [fontsource('@fontsource/ibm-plex-mono', 'ibm-plex-mono-latin-400-normal.woff2')],
					},
					{
						weight: 500,
						style: 'normal',
						src: [fontsource('@fontsource/ibm-plex-mono', 'ibm-plex-mono-latin-500-normal.woff2')],
					},
				],
			},
		},
	],

	security: {
		// Astro hashes its own inline scripts and styles into script-src and
		// style-src. The rest of the policy is declared here. Cloudflare
		// Turnstile (the waitlist form's bot check) needs its script, iframe,
		// and verification calls. Inline style attributes stay allowed because
		// react-obfuscate sets one on the contact link; that relaxation is
		// limited to attributes.
		csp: {
			scriptDirective: {
				resources: ["'self'", 'https://challenges.cloudflare.com'],
			},
			styleDirective: {
				resources: [{ resource: "'unsafe-inline'", kind: 'attribute' }],
			},
			directives: [
				"default-src 'self'",
				"base-uri 'self'",
				"form-action 'self'",
				"object-src 'none'",
				'frame-src https://challenges.cloudflare.com',
				"img-src 'self' data:",
				"font-src 'self'",
				"connect-src 'self' https://challenges.cloudflare.com",
			],
		},
	},
});
