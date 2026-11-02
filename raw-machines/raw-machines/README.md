# Raw Machines

App store on Vercel: static front end (`public/`), serverless API (`api/`), Neon Postgres, Vercel Blob for files.

## Deploy
1. Push this folder to GitHub, then import it in Vercel (Framework preset: Other).
2. Vercel project > Storage: create a **Neon Postgres** database (adds `DATABASE_URL`) and a **Blob** store (adds `BLOB_READ_WRITE_TOKEN`).
3. Settings > Environment Variables: add `JWT_SECRET` (a long random string, e.g. `openssl rand -hex 32`).
4. Open the Neon SQL editor and run `schema.sql` once.
5. Redeploy. Visit `/` (store) and `/developer.html` (console).

Local: `npm i -g vercel`, `vercel link`, `vercel env pull`, `npm i`, `vercel dev`.

## Workflow
Developer signs up (`/developer.html`) > creates app > uploads file (browser > Blob via `/api/upload`) > version row saved (`POST /api/apps?action=version`) > app appears in store.
User browses (`GET /api/apps`) > opens app (`GET /api/apps?id=`) > taps Install (`/api/download?versionId=`): counts download, saves history if logged in, redirects to the Blob file.
Library (`/api/library`) shows installs and flags "Update" when a newer build number exists.
