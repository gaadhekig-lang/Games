# GitHub Actions - Keep Supabase Alive

This workflow keeps your Supabase database "warm" by making periodic queries to prevent it from going to sleep.

## Setup Instructions

1. **Add Secrets to GitHub Repository:**
   - Go to your repository on GitHub
   - Navigate to: **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Add the following secrets:

   - `SUPABASE_URL`: Your Supabase project URL
     - Example: `https://xxxxx.supabase.co`
   
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous/public API key
     - Found in: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`

2. **Schedule:**
   - The workflow runs every Monday and Thursday at midnight UTC
   - You can also manually trigger it via the GitHub Actions tab → "Keep Supabase Alive" → "Run workflow"

3. **What it does:**
   - Makes a simple GET request to your `users` table
   - Only selects the `id` column and limits to 1 row (minimal data transfer)
   - This keeps the database connection active

## Customization

- **Change schedule**: Edit the `cron` expression in `.github/workflows/keep_alive.yml`
  - Format: `'minute hour day month weekday'`
  - Example: `'0 0 * * 1,4'` = Monday and Thursday at midnight UTC
  - More examples:
    - `'0 */6 * * *'` = Every 6 hours
    - `'0 0 * * 0'` = Every Sunday at midnight
    - `'0 12 * * *'` = Every day at noon UTC

- **Change table**: Replace `users` with any other table name in the curl command

