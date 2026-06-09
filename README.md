# Casino Research 2026

This repo contains working notes and a source-led sample article for June 2026 casino-content research.

## Files

- [casino-research-session-2026.md](casino-research-session-2026.md): original session note
- [best-us-online-casinos-june-2026.md](best-us-online-casinos-june-2026.md): source-led sample article draft
- [source-notes-best-us-online-casinos-june-2026.md](source-notes-best-us-online-casinos-june-2026.md): source list and access-check notes
- [full-sample-best-us-online-casinos-2026.md](full-sample-best-us-online-casinos-2026.md): full article sample with review-template image embeds
- [image-evidence-priority-notes.md](image-evidence-priority-notes.md): image-priority rules for review evidence

## Editor App

The repo now includes a local web app for editorial production:

- path: `editor-app`
- purpose:
  - load a draft template
  - list manual image slots that editors must capture
  - collect uploaded images, alt text, and captions
  - generate a publish-ready markdown draft with the images stitched back into the article
- deploy-ready for Railway when the service root directory is set to `editor-app`

### Run Locally

1. `cd editor-app`
2. `npm install`
3. `npm start`
4. Open `http://localhost:4173`

### Railway

- set service root directory to `editor-app`
- Railway config is included in `editor-app/railway.json`
- healthcheck path: `/healthz`

### Railway Fallback

If you connect Railway to the repo root by mistake, the repo now includes:

- a root `package.json`
- a root `railway.json`

These forward startup into `editor-app`, so the app can still boot from the repo root.

### Current Sample Template

- `us-online-casinos-2026`
- required slots are currently focused on the highest-value BetRivers onboarding and support assets
- generated drafts are written to `editor-app/generated/` locally and are not committed

## Preview Assets

- [ranking-overview.svg](assets/ranking-overview.svg)
- [research-method.svg](assets/research-method.svg)
- [proxy-access-check.svg](assets/proxy-access-check.svg)

## Review Template Assets

These are planning templates for a proper review workflow. They are not first-hand casino evidence.

- [casino-review-evidence-board.png](assets/review-templates/casino-review-evidence-board.png)
- [mobile-lobby-capture-template.png](assets/review-templates/mobile-lobby-capture-template.png)
- [cashier-payment-capture-template.png](assets/review-templates/cashier-payment-capture-template.png)
- [live-support-capture-template.png](assets/review-templates/live-support-capture-template.png)
- [license-fairness-proof-template.png](assets/review-templates/license-fairness-proof-template.png)
- [real-world-device-photo-template.png](assets/review-templates/real-world-device-photo-template.png)

## Public Review Captures

These are real screenshots captured from public-facing pages during the June 9, 2026 research session. They are public-page evidence only and should not be described as logged-in or cashier proof.

- [DraftKings public capture](assets/review/draftkings/draftkings-public-casino-page-june-2026.png)
- [Caesars Palace Online public capture](assets/review/caesars-palace-online/caesars-public-getting-started-june-2026.png)
- [BetRivers public capture](assets/review/betrivers/betrivers-public-home-june-2026.png)
- [FanDuel public capture](assets/review/fanduel/fanduel-public-casino-101-june-2026.png)
- [BetMGM public capture](assets/review/betmgm/betmgm-public-rewards-page-june-2026.png)
