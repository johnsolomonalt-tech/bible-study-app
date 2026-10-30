# Feature verification — October 30, 2026

## Fixes in this pass

- Made the tracker’s Reading Streak and daily verse cards actual keyboard-accessible buttons. Streak opens its calendar; daily verse opens scripture and the reader.
- Fixed chapter touch handling that suppressed the first tap. Duplicate synthetic clicks and scrolling no longer toggle a chapter accidentally.
- Separated book expansion and Mark/Unmark All controls; added chapter read state for assistive technology.
- Added calendar/pace dialog semantics, Escape dismissal for pace, and scrolling for short calendar screens. Completed Bible reading now reports zero days remaining.
- Disabled note formatting in Preview, explained how to enable it, and prevented desktop callout menus from being clipped.
- Stopped hidden Canvas boards and modal-focused controls from responding to board shortcuts.
- Persisted viewed chapters that came from the prewarmed book cache, enabling retrieval after an offline reload.
- Added export generation errors, truthful clipboard success/failure feedback, labelled close controls, focus containment, Escape dismissal, and prevention of concurrent format/lens requests. Export source changes and board switches no longer reuse another guide.
- Fixed guest conversation creation failures: preserve draft and attachments, show a retry message, and never send an invented chat ID.
- Added cookie-bound signed conversation capabilities so guest ownership survives serverless cold starts. Guest history remains locally persisted; bounded context accompanies requests. Added recovery for expired guest cookies.
- Restored guest conversations and the active conversation after reload. Prevented guest account-streak polling.

## Verification evidence

`npm test`: **55 passed** (18 security checks, 3 service-worker tests, 34 behavioral regressions). `npx tsc --noEmit` and `npm run build`: passed. `git diff --check`: passed.

| Area | Verified |
| --- | --- |
| Tracker | Streak calendar opening by keyboard; mobile calendar fits 390px viewport; goal dialog opening and Escape; individual chapter marking/unmarking; Mark/Unmark All with Space; touch handler toggles once and ignores scrolling (behavioral test). |
| Reading plans | Filtering to Acts; starting and pausing; existing Four Gospels Continue Reading navigates to Matthew 1. |
| Reader | Chapter loading, interlinear Greek/Hebrew rendering, daily-verse modal, and Read Full Chapter navigation to John 15. Cache persistence/offline retrieval verified with a fresh provider instance. |
| Devotional | Morning/evening switching, previous/next dates, and Open in Study navigation to the displayed reference. Calendar/leap-year mapping regression passes. |
| Notes | Creation, editing, reload persistence, pinning, Preview disables formatting, Write/callout insertion, Split rendering, scripture insertion and backlink creation. |
| Canvas | Card creation/editing, markdown rendering, save/reload persistence, undo/redo. Hidden-board shortcut regression passes. |
| Study guide | Real generation, Markdown download, edit mode, labelled close control and Escape. Failed clipboard writes and failed generation have behavioral regressions. |
| Guest AI chat | Real first reply and automatic naming. Restarted dev server and reloaded browser; saved chat restored. A second question correctly identified Psalm 23 from prior context. Active conversation restoration verified after another reload. |
| Chat isolation/recovery | Fresh module instances verify signed capabilities without shared memory. Different/missing cookies, altered tokens, and mismatched conversation IDs rejected. History roles/size bounded. Failed creation preserves drafts; expired-session recovery carries context once. |
| Responsive/settings | Mobile navigation, mobile streak dialog dimensions, settings opening/category navigation/Escape at 390×844. Desktop viewport restored afterward. |

## Limits

This is a feature smoke test plus targeted behavioral coverage, not proof of every possible state or device combination. No signed-in test account/database was available locally, so account creation, real cross-device cloud sync, authenticated sharing/import, and developer-console operations were not tested end to end. Authorization paths have automated coverage.

Physical-device touch, audio output/voice selection, microphone/browser permissions, full offline PWA installation, image/PDF upload analysis and image generation, print-to-PDF output, all translations, and all AI generation modes were not fully exercised. The downloadable study guide was verified as Markdown. Destructive reset/delete actions were not performed on user data.

The local development environment needed a guest signing secret; a random value was added only to ignored `.env.local`. Production must retain its existing `CLERK_SECRET_KEY` or `GUEST_CHAT_SECRET`; no secret values were committed.
