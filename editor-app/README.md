# Editor App

This is a deployable web app for the casino review workflow.

## Purpose

- enter a title and generate a draft article from a template
- queue generated drafts in a dashboard with status tracking
- let editors upload required image evidence later
- keep alt text and captions auto-filled by default, with optional advanced edit
- finalize a publish-ready markdown file once the required slots are filled

## Local Run

1. `npm install`
2. `npm start`
3. Open `http://localhost:4173`
4. Use the workflow:
   - create draft
   - review queue
   - upload images
   - finalize output

## Railway Deploy

Recommended setup:

1. Create a new Railway service from this repo
2. Set the service root directory to `editor-app`
3. Railway should detect Node automatically
4. Start command is already defined as `npm start`
5. Healthcheck path is `/healthz`

## Notes

- Draft records are written to `data/articles/`
- Generated markdown and uploaded assets are written to `generated/articles/`
- Railway filesystem is ephemeral, so this is best for editorial generation and download, not long-term asset storage
- For durable storage later, connect S3-compatible object storage or a database-backed asset layer
