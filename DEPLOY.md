# Deploy Talk The Taste to Cloudflare Pages

This project is now prepared for GitHub + Cloudflare Pages.

## GitHub

```bash
git add .
git commit -m "Prepare site for Cloudflare Pages"
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Cloudflare Pages

1. In Cloudflare, create a KV namespace named `TTT_DATA` and a preview namespace named `TTT_DATA_PREVIEW`.
2. Replace the placeholder `id` and `preview_id` values in `wrangler.toml`.
3. Create a Pages project connected to the GitHub repository.
4. Use the existing production Pages project `talkthetastewebsite` (serving `talkthetaste.com`); `talkthetaste` is an older, separate project. The `.node-version` file pins Node 22. Use these build settings: - Framework preset: `None` - Node.js: `22` or newer - Build command: `npm run build` - Build output directory: `dist`
5. Add these Pages environment variables: - `ADMIN_PASSWORD`: a unique admin password of at least 16 characters - `SESSION_SECRET`: an independent random secret of at least 32 characters - `CALLMEBOT_PHONE`: `971565390316` - `CALLMEBOT_APIKEY`: your CallMeBot API key

The admin CMS and contact leads use Cloudflare KV through the `TTT_DATA` binding. The first API read seeds KV with the current default projects/settings if the namespace is empty. Contact form submissions also send a WhatsApp alert through CallMeBot when the CallMeBot variables are configured.

## OneDrive Work Portfolio

The Work page can load clients automatically from Microsoft 365 OneDrive using this folder structure:

```text
TalkTheTaste/
  Work Portfolio/
    Clients/
      Client A/
        Photography/
        Videography/
      Client B/
        Photography/
        Videography/
```

Create a Microsoft Entra app registration with Microsoft Graph application access to read files, then add these Cloudflare Pages environment variables:

- `MS_TENANT_ID`: Microsoft tenant ID
- `MS_CLIENT_ID`: app registration client ID
- `MS_CLIENT_SECRET`: app registration client secret
- `ONEDRIVE_USER`: mailbox/user principal name that owns the OneDrive, for example `name@yourdomain.com`
- `ONEDRIVE_CLIENTS_PATH`: optional, defaults to `TalkTheTaste/Work Portfolio/Clients`

The Work page reads `/api/portfolio`. Each folder inside `Clients` becomes one client card. Files inside `Photography` and `Videography` are displayed in that client's gallery.

## Local Cloudflare Test

```bash
npm install
npm run cf:dev
```

Then open `http://localhost:8788`.

## Security and local configuration

The build publishes an allowlist of public files to `dist/`. Never set the Pages output directory to `.` or deploy the repository root. Runtime data, reports, Node source, dependency files and secrets are excluded. Root middleware also blocks private source/data paths for legacy Pages configurations.

Admin access is disabled until both `ADMIN_PASSWORD` (16+ characters) and `SESSION_SECRET` (32+ characters) are configured. There is no default login, and passwords are not read from settings JSON or returned to the browser. Set these as Cloudflare secrets. For local Pages development, copy `.dev.vars.example` to the ignored `.dev.vars` and supply local values. For Node development, export the variables before `npm start`; `.env.example` documents them but is not loaded automatically.

The Security panel explains that passwords are managed by the deployment. Change `ADMIN_PASSWORD` there, and rotate `SESSION_SECRET` to invalidate old sessions. Rotate any credentials that were previously stored in public settings files. Changing the code does not rotate secrets already configured in a deployed service or erase old Git history.

Node serves `dist/`, so run the build before invoking `node server.js` directly. `npm start` and `npm run dev` build automatically. Set `DATA_DIR` to an external writable directory when deploying Node. In production, use HTTPS; when a trusted reverse proxy terminates TLS, configure `TRUST_PROXY=1` only if exactly that proxy fronts the app.

Both runtimes limit login, lead and analytics requests. Node limits live in its process. Pages uses immediate per-isolate counters with best-effort KV carryover, which is not a globally atomic quota. For multiple instances and strict production abuse controls, configure Cloudflare rate-limit/WAF rules on `/api/auth/login` and `/api/leads/submit` as well.

Language links open the existing complete Arabic pages with `lang=ar` and `dir=rtl`. Specialized English pages without a translated counterpart link explicitly to the Arabic services overview. They no longer apply an incomplete word-by-word translation to English templates.

Run `npm run build`, `npm test`, and `npm audit` before deployment. The audit remediation verification is recorded under `reports/` and is not included in the public build.
