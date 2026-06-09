# Editor App

This is a deployable web app for the casino review workflow.

## Purpose

- load a draft template
- show required manual image slots
- let editors upload images, alt text, and captions
- generate a publish-ready markdown draft with the images stitched back into the article

## Local Run

1. `npm install`
2. `npm start`
3. Open `http://localhost:4173`

## Railway Deploy

Recommended setup:

1. Create a new Railway service from this repo
2. Set the service root directory to `editor-app`
3. Railway should detect Node automatically
4. Start command is already defined as `npm start`
5. Healthcheck path is `/healthz`

## Notes

- Generated markdown and uploaded assets are written to `generated/`
- Railway filesystem is ephemeral, so this is best for editorial generation and download, not long-term asset storage
- For durable storage later, connect S3-compatible object storage or a database-backed asset layer
