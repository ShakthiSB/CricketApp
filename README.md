# CrickScore

A full cricket scoring app: set up teams and a toss, score the match ball-by-ball, get full
scorecards and a result, and keep match history + stats — all running offline on-device.

## Full flow
**Home** → Start Match → **Select/Create Teams** (with contacts picker + WhatsApp invite) →
**Match Details** (overs/place/field + extensible custom fields) → **Toss** → **Summary** →
**Innings Setup** (pick openers + opening bowler) → **Live Scoring** (ball-by-ball pad, wickets,
extras, automatic bowler-change and next-batsman prompts, undo) → **Innings 2 Setup** → live
scoring with target/required-run-rate → **Result** → **Full Scorecard** → share to WhatsApp/etc.
**Stats** aggregates team win/loss record, **Man of the Match awards count**, top run-scorers
and top wicket-takers across all of it. Every completed match also gets its own Man of the
Match / Top Scorer / Top Bowler shown on its Result screen and in the History list (Man of the
Match is a simple weighted score: runs + boundary bonus + 20 points per wicket).

## What's inside
- `index.html`, `styles.css`, `app.js` — the whole app (no build step, no dependencies)
- `manifest.json`, `sw.js` — makes it an installable, offline-capable PWA
- `assets/` — app icons

## Try it right now
Open `index.html` in any browser (Chrome on Android recommended for the contacts picker).
Everything is saved to the device's local storage — no backend, no login, no internet needed
once it's loaded/installed.

## Turn this into a real, sideloadable .apk (free, ~2 minutes)
A real .apk has to be compiled with Android's build tools, which need to talk to Google's
servers — not something this sandbox can reach. So do this last step yourself, it's quick:

1. **Host the app somewhere public** (pick one):
   - Easiest: drag this folder into **https://app.netlify.com/drop** → you get a live URL instantly.
   - Or push it to a GitHub repo and turn on GitHub Pages.
2. Go to **https://www.pwabuilder.com**
3. Paste your live URL → click **Start**
4. Click **Package for stores** → choose **Android** → it auto-fills everything from `manifest.json`
5. Download the **.apk** (or signed bundle) it generates
6. Send the `.apk` file to any Android phone → open it → tap **Install** (allow "install from
   unknown sources" once, since it's not from the Play Store)

That's it — a real installable Android app, no developer account needed.

## Scoring rules implemented (kept casual/street-cricket simple, not full ICC law)
- **Saved Place & Field**: tap "+ Add" on Match Details to save the current Place/Field text
  for one-tap reuse next time (with a ✕ to remove ones you no longer need) — no more retyping
  your usual ground every match.
- **Single Batting**: checkbox on Match Details. When on, the match ends after one innings —
  no second team batting, no toss-decision win/loss comparison, just that one team's final score.
  Useful for nets/practice sessions where you just want to track one side's batting.
- Runs 0/1/2/3/4/6, wides (+1, not a legal ball), no-balls (+1 penalty, bat can still score,
  not a legal ball), byes & leg-byes (legal ball, runs to the team not the batsman)
- Strike rotates on odd runs taken; swaps automatically at the end of every over
- Wickets: Bowled / Caught / LBW / Run Out / Stumped / Hit Wicket / Retired — prompts for the
  next batsman automatically unless the innings is over
- Innings ends on: overs completed, all out (squad size − 1 wickets), or — in the 2nd innings —
  the target being chased down (ends immediately, even mid-over)
- Run-outs are simplified to 0 runs and assume the striker is the one dismissed (no mid-pitch
  runs-before-run-out or non-striker dismissals in this version)
- Undo reverts exactly one ball at a time, for the current innings, current session (it doesn't
  survive a page reload — that's the one thing not persisted to storage)

## Known limits (by design, flagged honestly rather than faked)
- **WhatsApp invite**: generates a real shareable WhatsApp message + link, but auto-adding that
  person to your team across their own phone needs a backend/database — not built yet. For now
  it drops a "pending invite" placeholder so you remember who you invited.
- **Contacts picker**: uses the phone's native Contact Picker API (Chrome on Android). Falls
  back to manual entry on unsupported browsers.
- **Share Result**: uses the Web Share API (opens the native share sheet, including WhatsApp)
  with a clipboard-copy fallback. It shares text, not a generated image.
- Squads with fewer than 2 players are auto-padded with placeholder names so scoring never
  breaks — add real players in the Add Team screen for proper stats.

## Extending later
`match.custom` already supports arbitrary extra fields from the "+ Add more details" accordion
on Match Details. The innings/ball-log data model in `app.js` is flat and JSON-serializable, so
hooking up a real backend for live multi-device sharing or tournament mode later is additive,
not a rewrite.

## Tested
Two headless end-to-end test scripts (Node + jsdom, simulating real button clicks) cover: full
setup flow, all-out innings ending, innings transition, target-chase finishing mid-over, result
computation, history/stats rendering, wides/no-balls/byes/leg-byes, undo, and automatic
bowler-change prompts at the end of an over. All pass.
