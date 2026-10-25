# Theologica Bible Study Workspace

Theologica is a Scripture study workspace built with Next.js. It combines a Bible reader, study notes, chat-based assistance, an interactive canvas, interlinear tools, reading tracking, and installable PWA support.

## Stack

- Next.js 16 App Router, React 19, and TypeScript
- Clerk for sign-in
- PostgreSQL and Prisma for account data
- Google Gemini for AI features
- Vercel deployment (the Vercel project is configured to build from `frontend/`)

## Local development

Requirements: Node.js 20 or later and PostgreSQL.

1. Copy `frontend/.env.example` to `frontend/.env.local` and set the required values.
2. Install dependencies and create the Prisma client:

   ```bash
   cd frontend
   npm ci
   ```

3. Apply committed database migrations:

   ```bash
   npm run db:migrate
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

The development server is available at <http://localhost:3000>.

## Environment variables

Required for the full production app:

- `DATABASE_URL`: PostgreSQL connection string used by Prisma.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`: Clerk credentials.
- `GEMINI_API_KEY`: Google AI Studio key for AI features.
- `NEXT_PUBLIC_APP_URL`: canonical public app URL.
- `GUEST_CHAT_SECRET`: at least 32 random characters used to sign guest chat sessions. If omitted, `CLERK_SECRET_KEY` is used. Set a dedicated value in production so guest sessions remain valid across deployments.

Optional integrations and admin settings are documented in `frontend/.env.example`, including API.Bible, Pixazo, the developer console, and admin allowlists. Never commit `.env.local` or production secrets.

## Checks

Run these from `frontend/`:

```bash
npm run lint
npm test
npm run build
```

`npm run build` generates the Prisma client before running the Next.js production build. Database migrations must be deployed before serving code that depends on a newly added table.

## How to add a new Bible version

Adding a new Bible translation to Theologica is a centralized, single-file process:

1. **Add the translation definition to the central registry:**
   Open `frontend/src/lib/bibleTranslations.ts` and add an entry to `BIBLE_TRANSLATION_REGISTRY`:
   ```ts
   {
     id: 'nasb',
     name: 'New American Standard Bible',
     abbreviation: 'NASB',
     year: '2020',
     publisher: 'The Lockman Foundation',
     description: 'Highly acclaimed for precision and word-for-word fidelity.',
     category: 'literal',
     license: 'copyrighted', // 'public-domain' | 'open-license' | 'copyrighted'
     licenseText: 'Full required legal copyright text...',
     copyrightNotice: 'Short copyright notice for chapter headers...',
     source: { type: 'local', dir: 'nasb' }, // or { type: 'bolls', key: '...' }, { type: 'api.bible', bibleId: '...' }
     hasInterlinear: false,
     isPublicDomain: false,
     readingPlanSupported: true,
   }
   ```

2. **Supply the Bible text data:**
   - **Local static version (`type: 'local'`):** Add the chapter JSON files in `frontend/public/bibles/{dir}/{BOOK_CODE}.json`.
   - **Bolls Life API fallback (`type: 'bolls'`):** Specify the Bolls translation code (e.g., `key: 'ASV'`).
   - **API.Bible copyrighted integration (`type: 'api.bible'`):** Specify the API.Bible UUID in `bibleId` (activates when `BIBLE_API_KEY` is provided).

3. **Automatic discovery:**
   The entire application — Study reader, version switcher dropdown, parallel split view, search, Tracker reading plans, Notes scripture linking, Canvas cards, and the public Legal & Licensing page (`/legal`) — will automatically discover, render, and attribute the new translation with zero extra configuration.

## Deployment

The linked Vercel project builds the `frontend/` directory when changes are pushed to the connected GitHub branch. The Vercel build command baselines an existing app database when needed, applies committed Prisma migrations, then builds the app. Configure the production environment variables in Vercel and ensure PostgreSQL is reachable. Vercel preview deployments should use a separate database or a safely isolated schema because preview builds also apply pending migrations.
