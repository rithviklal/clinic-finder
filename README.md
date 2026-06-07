# The World Savers - Atlanta Clinic Volunteer Finder

Cloudflare Pages-ready React website for **theworldsavers.org**.

## Free stack

- Cloudflare Pages for hosting
- Supabase for database
- Google Analytics 4 for public analytics
- Custom anonymous tracking for unique visitors, page views, clinic clicks, and searches
- Chart.js for admin charts
- OpenStreetMap links for clinic map navigation

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Supabase setup

1. Create a free Supabase project.
2. Open **SQL Editor**.
3. Run `supabase/schema.sql`.
4. Run `supabase/seed.sql` for sample Atlanta clinic data.
5. Copy your Supabase URL and anon key into `.env` and Cloudflare Pages environment variables.

## Cloudflare Pages deployment

1. Push this folder to GitHub.
2. In Cloudflare, go to **Workers & Pages > Pages > Create project**.
3. Connect the GitHub repo.
4. Use:

```text
Build command: npm run build
Build output directory: dist
```

5. Add environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_GA_MEASUREMENT_ID
VITE_ADMIN_PASSCODE
```

6. Add your custom domain:

```text
theworldsavers.org
www.theworldsavers.org
```

## Admin dashboard

Go to:

```text
/admin
```

Enter the passcode from `VITE_ADMIN_PASSCODE`.

## Privacy

This project does not collect names, emails, raw IP addresses, or student personal information. It creates an anonymous browser ID for analytics.
