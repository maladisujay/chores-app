# Chores 🧹

A phone-first chore tracker for your home: log chores with before/after photos, earn points, see who did what on a calendar, and keep things fair with a leaderboard and housemate voting.

Free to run: hosted on **GitHub Pages**, data on **Supabase's free tier**.

---

## Setup (about 10 minutes, one time)

### 1. Supabase (database, sign-in, photos)

1. Sign in at [supabase.com](https://supabase.com) and open your project (or create a free one).
2. **SQL Editor → New query** → paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   It creates the tables, security rules, functions and the private `chore-photos` bucket. It's safe to run again after updates.
3. **Authentication → Sign In / Providers** → turn on **Allow anonymous sign-ins** → Save.
   (Nobody needs an email or password. People join with the home code, their name and a 4-digit PIN.)
4. **Project Settings → API Keys** → copy the **anon** (or **publishable**) key.

### 2. Connect the app

Open [`src/config.js`](src/config.js) and fill in:

```js
export const SUPABASE_URL = 'https://<your-project-ref>.supabase.co'
export const SUPABASE_ANON_KEY = '<anon or publishable key>'
```

Both values are meant to be public. Security comes from the database rules, not from hiding the key.
Leave the key empty and the app runs in **demo mode**: it keeps everything in your browser, which is handy for trying things out.

### 3. Publish on GitHub Pages

1. Create a GitHub repo (it can be private if your plan allows Pages for private repos, otherwise public) and push this folder to `main`.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The **Deploy to GitHub Pages** workflow builds and publishes on every push. Your link is
   `https://<your-username>.github.io/<repo-name>/`

### 4. On your phone

Open the link → **Share → Add to Home Screen** (iPhone) or **⋮ → Install app** (Android). It opens full-screen like a native app.

> The home-screen app keeps its own sign-in, separate from the browser. The first time you open it, tap **Join with a code**, pick your name and enter your PIN.

---

## How it works

**Owner** creates the home, adds roommates' names, picks the chores, points and sections, and gets a 6-character code + invite link.

**Roommates** open the link (or enter the code), tap their name, pick a color and set a PIN. If someone isn't on the list they can add themselves while the home is **open**. Close it from the House tab once everyone's in. Members who already joined can always sign back in.

| Feature | Details |
| --- | --- |
| Log a chore | Big **+** button. Pick the chore, change the date/time if you're logging late, add **before** and **after** photos and a note. |
| Photo rule | Owner can require an **after** photo. Before photos are always optional. The owner is never required to add photos. |
| Owner powers | Log for anyone, any date, custom one-off chores, override points, edit or delete any log directly, mark a log incomplete or restore it. |
| Change requests | Members can't edit or delete posted chores. They **request** an edit or deletion, the owner approves or rejects, and the history keeps the record. |
| Voting | Housemates can vote a chore "not done properly". If **more than half** of everyone who has joined votes (the doer counts toward the total but can't vote), the chore is voided: its points are taken back **plus a 50% penalty**. Voting window is configurable (default 7 days). |
| Calendar | Colored dots per person per day. Tap a day to see who did what. Swipe to change months. |
| Leaderboard | Week / Month / All time, podium, chores count, penalties, streaks and per-person stats. |
| Needs some love | Shows the chores that have gone longest without being done. Tap one to log it. |
| Chores editor | Sections act as separators (Kitchen, Bathroom…). **Drag handles** reorder chores, move them between sections, or move whole sections. 36 illustrated icons. Point changes only affect future logs. |
| Members | Rename, recolor, **reset sign-in & PIN** (lost phone / forgot PIN), transfer ownership, remove (their history stays). |
| Realtime | Everyone's screen updates live when someone logs, votes or the owner approves something. |

### Edge cases handled
- Can't log in the future. Members can backdate up to 30 days (the owner has no limit). Chores logged more than a day after they were done get a "Logged later" tag.
- Points are stored on each log, so editing a chore's points or deleting a chore never rewrites history.
- One pending request per chore. An owner's direct edit cancels any pending request on that chore.
- 5 wrong PIN attempts lock that member for 15 minutes.
- Colors and names are unique within a home.
- Photos are resized on the phone before upload, which also strips location metadata. They're stored privately and only members can view them.
- Removing a member or deleting a chore keeps past history intact.
- Back gesture / Android back button closes sheets and pages instead of leaving the app.
- Works in light and dark mode, respects reduced-motion settings.

---

## Development

```bash
npm install
npm run dev        # http://localhost:5173 (demo mode if no key is set)
npm run test:db    # runs schema.sql in an in-memory Postgres (PGlite) and checks the business rules
npm run build
```

In demo mode a **Demo** pill lets you switch between roommates on one device to try joining, voting and approvals.

### Keeping Supabase awake
Free Supabase projects pause after about a week with no activity. The included **Keep Supabase awake** workflow pings the database twice a week. Nothing to set up.

### Project layout
```
supabase/schema.sql      database, security rules and all business logic (Postgres functions)
src/config.js            your Supabase URL + key
src/lib/                 backends (Supabase / demo), stats, image compression, helpers
src/icons/               illustrated chore icons + UI icons
src/screens/, src/sheets/, src/components/   UI
tests/db.test.mjs        rule tests
```
