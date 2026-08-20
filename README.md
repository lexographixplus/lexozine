# Lexozine Studio

Lexozine Studio is LexoGraphix Plus's internal magazine design and digital publishing workspace. It is being built as a standalone Next.js application for assembling full magazine issues, importing manuscripts, designing editorial layouts, managing imagery, and producing digital/print-ready output.

## Current foundation

- Next.js 16 + React 19 + TypeScript
- Full-screen editorial design workspace
- Cover, contents, and article canvas modes
- Multi-issue dashboard with reusable issue templates
- DOCX, TXT, and HTML manuscript import via Mammoth
- Rule-based first-pass editorial block tagging
- Editable headline, deck, body, and pull-quote blocks
- 1/2/3-column editorial flow and theme presets
- Browser autosave/recovery for the prototype stage
- Media library with local image upload, alt text, and focal-point controls
- Typed `Issue -> Article -> Block` publishing model
- PostgreSQL/Neon-ready production schema
- GitHub Actions workflow for type-check and production build verification

## Routes

- `/` — current issue editor
- `/issues` — issue dashboard and reusable templates
- `/media` — publication media library

## Architecture

The UI is intentionally separated from storage through typed domain models and a small persistence abstraction. The current build can run without external services while the production PostgreSQL/Neon layer is reviewed and provisioned.

Key files:

- `components/studio-shell.tsx` — primary editorial workspace
- `components/issue-dashboard.tsx` — multi-issue management
- `components/media-library.tsx` — media asset workflow
- `lib/editor-model.ts` — shared publishing types and theme tokens
- `lib/issue-templates.ts` — reusable publication templates
- `lib/issue-store.ts` — persistence interface/current browser implementation
- `db/schema.sql` — production PostgreSQL schema

## Planned production layers

1. Connect issue/article/block persistence to PostgreSQL/Neon.
2. Move image storage from browser data URLs to managed blob/object storage.
3. Add team authentication and review/version workflows.
4. Expand reusable master-page and article-layout templates.
5. Add professional PDF pagination/export and a shareable web edition.
6. Add automated accessibility, responsive, and export QA.

## Development

```bash
npm install
npm run dev
```

Type-check and build:

```bash
npm run check
npm run build
```

All active development is currently isolated on `feature/lexozine-studio-foundation` until review and merge approval.
