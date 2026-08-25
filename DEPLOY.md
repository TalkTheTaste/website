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
4. Use these build settings: - Framework preset: `None` - Build command: leave empty - Build output directory: `.`
5. Add these Pages environment variables: - `ADMIN_PASSWORD`: your admin login password - `SESSION_SECRET`: a long random secret string - `CALLMEBOT_PHONE`: `971565390316` - `CALLMEBOT_APIKEY`: your CallMeBot API key

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
