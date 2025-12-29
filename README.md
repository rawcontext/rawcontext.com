#  `Context`

Marketing site for Context — open-source tools for autonomous AI systems.

## Stack

- **Site**: [Zola](https://www.getzola.org/) static site generator
- **Styles**: SCSS
- **Scripts**: TypeScript (bundled with Bun)
- **API**: Vercel Edge Functions
- **Database**: Neon (PostgreSQL)
- **Hosting**: Vercel

## Development

```bash
# Install dependencies
bun install

# Build JS
bun run build:js

# Run Zola dev server
zola serve
```

## Deployment

Push to `master` or run:

```bash
vercel --prod
```
