# Context

Marketing site for Context, at [rawcontext.com](https://rawcontext.com).

## Stack

- **Site**: [Astro](https://astro.build/), static output
- **Islands**: React, for the obfuscated contact link ([react-obfuscate](https://github.com/coston/react-obfuscate))
- **Animation**: WebGPU through [vgpu](https://vgpu.sh/); without WebGPU the canvases stay empty and the copy stands on its own
- **Fonts**: Newsreader and IBM Plex Mono, self-hosted from Fontsource through Astro's fonts API
- **API**: `api/waitlist.ts`, a Vercel Edge Function backed by Neon (PostgreSQL) and Cloudflare Turnstile
- **Hosting**: Vercel

## Layout

The source follows [Feature-Sliced Design](https://feature-sliced.design/). Astro's file router lives in the
`app` layer (`src/app/pages`, set with `srcDir` in `astro.config.ts`); the other layers sit beside it:

```
src/
  app/        routing, document layout, global styles
  pages/      one slice per screen: home, privacy, not-found
  widgets/    site-header, site-footer, hero, in-the-open
  features/   contact-email (the obfuscated mailto island)
  shared/     config, design tokens, small UI, the vgpu scene runtime
```

Each slice exposes an `index.ts`; import slices through it, never through their internals.

The favicon, touch icons, and `logo.*` files in `public/` are rendered from `public/logo.svg` and
`public/favicon.svg` by `scripts/render-icons.sh` (needs librsvg and ImageMagick).

## Development

```bash
bun install
bun run dev
```

`bun run build` writes the static site to `dist/`. `bun run check` type-checks the project, including
the `.astro` files.

## Deployment

Push to `master`. Vercel detects Astro, builds with `astro build`, serves `dist/`, and deploys `api/` as
functions. Security headers and the redirects for the retired `/projects` URLs are in `vercel.json`.
