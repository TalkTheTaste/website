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

## Local Cloudflare Test

```bash
npm install
npm run cf:dev
```

Then open `http://localhost:8788`.
