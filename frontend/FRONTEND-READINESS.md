# Theologica frontend readiness review

Reviewed October 26, 2026. Scope: frontend source, application shell, shared dialogs, production build, lint, and offline service-worker behavior. This is a bounded production-hardening pass, not a claim that all workflows or devices have been certified.

## Implemented in this pass

- Removed global fixed-body/hidden-overflow behavior so long auth, legal, and offline pages can scroll; the study workspace retains its own viewport sizing.
- Added visible keyboard focus, a workspace skip link, native control color schemes, reduced CSS motion, and improved muted-text contrast in light/sepia themes.
- Added workspace loading and retry states, notes loading feedback, and a root error screen that does not depend on the application stylesheet.
- Shared prompt and confirmation dialogs now have accessible names, descriptions, prompt labeling, focus trapping/restoration, and Escape handling. Destructive confirmation starts on Cancel; pending confirmations prevent dismissal.
- Consolidated service-worker ownership in public/sw.js, removing the competing webpack-only PWA configuration. Registration is production-only; service-worker responses disable HTTP caching.
- Removed private API/auth caching configuration and root-page precaching. Private APIs and third-party auth bypass offline handling; uncached passages return a real 503 response. Activation clears known legacy private caches.
- Added three executable service-worker regression checks to npm test.

## Verification

- Production build: passed, including TypeScript and route generation.
- Security checks: 18 passed.
- Service-worker regression checks: 3 passed.
- Full ESLint: zero errors, 438 warnings across the working tree.
- Diff whitespace check: passed.
- Sol subagent performed the shared-dialog implementation and targeted lint/type validation.

## Remaining release gates

1. Exercise sign-in/out, account switching, notes saving/recovery, AI streaming, and canvas persistence against production-like accounts and services. Source and build checks cannot certify these workflows.
2. Browser/device QA: keyboard-only and screen-reader navigation; mobile Safari keyboard/safe areas; 200% zoom; all themes; slow/offline networking; service-worker upgrades. Offline reader dependencies need a cold-start test, not just cached-passage tests.
3. Reduce the main page's >500 KB source module by extracting reader, chat, navigation, and persistence responsibilities. Profile emitted bundles and interaction responsiveness before assigning performance targets.
4. Triage the 438 lint warnings, especially hooks/dependencies, refs, and broad any types. Do not suppress them as a substitute for fixes.
5. Extend dialog accessibility to feature-specific modals beyond the two shared UI components. Verify nested/modal coexistence and reduced-motion behavior for JavaScript-driven animations.
6. Plan the Next.js middleware-to-proxy migration flagged by the build. Review CSP against the actual authentication/provider deployment domains.
7. Add authenticated browser regression tests, error reporting, and measured performance/accessibility checks to CI.

Other concurrent edits appeared in the shared working tree during this review, including API and persistence changes. They were preserved. The checks above describe the combined working tree; those unrelated edits are not attributed to this frontend pass.

Nothing was deployed. The app is improved but is not yet fully production-certified.
