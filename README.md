# CrickScore

A full cricket scoring app: set up teams and a toss, score the match ball-by-ball, get full
scorecards and a result, and keep match history + stats — all running offline on-device.

## Full flow
**Home** (with a "Last match" card for quick re-viewing) → Start Match → **Select/Create Teams**
(create, edit, or delete teams; add players manually or from contacts, multi-select) →
**Match Details** (overs/place/field with one-tap reusable saved locations, Single Batting and
Single Batsman modes, extensible custom fields) → **Toss** (tap-to-pick or animated coin flip
that randomly decides the winner) → **Summary** → **Innings Setup** → **Live Scoring**
(ball-by-ball pad, wickets, extras, automatic bowler-change/next-batsman prompts, undo) →
second innings with target/required-run-rate → **Result** (with Man of the Match, Top Scorer,
Top Bowler, and a big "Start Another Match" button to go straight back into team selection) →
**Full Scorecard** (top performers bolded per innings) → share to WhatsApp/etc. Every completed
match is saved to **History** (with per-match delete), and **Stats** aggregates team records,
Man of the Match awards, top run-scorers and top wicket-takers — filterable by month, with a
full Reset option.

## What's inside
- `index.html`, `styles.css`, `app.js` — the whole app (no build step, no dependencies)
- `manifest.json`, `sw.js` — makes it an installable, offline-capable PWA
- `assets/` — app icons

## Try it right now
Open `index.html` in any browser (Chrome on Android recommended for the contacts picker).
Everything is saved to the device's local storage — no backend, no login, no internet needed
once it's loaded/installed.

## Turn this into a real, sideloadable .apk (free, ~2 minutes)
1. Host the app folder's contents publicly (Netlify Drop, or GitHub Pages on a repo)
2. Go to **https://www.pwabuilder.com**, paste the URL, click Start
3. Click **Package for stores** → **Android** (Google Play tab) → Generate → Download Package
4. Unzip it, get the `.apk` to your phone (Drive, USB cable, or zip-then-WhatsApp/Gmail since
   raw `.apk` files get blocked by most messaging apps), tap Install (allow unknown sources once)

**To make it open full-screen (not inside Chrome):** create a second repo named exactly
`<yourusername>.github.io`, add a file at `.well-known/assetlinks.json` with the content
PWABuilder generated alongside your `.apk`, and add an empty `.nojekyll` file at the repo root
(GitHub Pages' default Jekyll processor silently ignores dot-folders otherwise). Give it 10-15
minutes for GitHub's CDN to propagate, then uninstall + reinstall the same `.apk` on your phone.

**For future updates:** re-upload changed files to your app's repo (GitHub Pages auto-rebuilds),
then regenerate the package in PWABuilder — but use the **same signing keystore** from your first
download (look for "use existing key" in the Android packaging options) so the new `.apk`
installs as an update rather than requiring an uninstall, and so `assetlinks.json` verification
stays valid. Keep that keystore file backed up somewhere safe; it can't be regenerated if lost.

## Scoring rules implemented (kept casual/street-cricket simple, not full ICC law)
- **Saved Place & Field**: tap "+ Add" on Match Details to save the current Place/Field text
  for one-tap reuse next time (with a ✕ to remove ones you no longer need).
- **Single Batting**: checkbox on Match Details. Match ends after one innings — no second team
  batting, no win/loss comparison, just that one team's final score.
- **Single Batsman**: checkbox on Match Details. Only one batsman bats per innings (no
  non-striker) — innings ends on overs completed or the first wicket. Combine with Single
  Batting for a true solo net-practice session (one innings, one batsman, no second team).
- Runs 0/1/2/3/4/6, wides (+1, not a legal ball), no-balls (+1 penalty, bat can still score,
  not a legal ball), byes & leg-byes (legal ball, runs to the team not the batsman)
- Strike rotates on odd runs taken; swaps automatically at the end of every over (skipped
  entirely in Single Batsman mode, since there's no second batsman to rotate to)
- Wickets: Bowled / Caught / LBW / Run Out / Stumped / Hit Wicket / Retired — prompts for the
  next batsman automatically unless the innings is over
- Innings ends on: overs completed, all out (squad size − 1 wickets, or first wicket in Single
  Batsman mode), or — in the 2nd innings — the target being chased down (ends immediately, even
  mid-over)
- Coin flip: tap the coin for a genuine 50/50 randomized result that sets the toss winner
  automatically; you can still tap the team buttons directly to pick the winner manually instead
- Undo reverts exactly one ball at a time, for the current innings, current session (it doesn't
  survive a page reload — that's the one thing not persisted to storage)

## Awards & sharing
- **Man of the Match**: a simple weighted score (runs + boundary bonus + 20 pts/wicket),
  computed automatically per match and shown on the Result screen, in History, and counted in
  Stats as a leaderboard of most MOTM awards.
- **Top Scorer / Top Bowler**: also computed per match, shown on Result and aggregated in Stats.
- **Share Result**: opens the native share sheet (WhatsApp, etc.) or copies to clipboard,
  including the scoreline, Man of the Match, Top Scorer, and Top Bowler.
- **Share Scorecard**: from the full Scorecard screen, shares a complete ball-by-ball summary
  (every batsman's runs/balls/how-out, every bowler's figures) as text.
- On the Scorecard screen itself, the top scorer and top wicket-taker in each innings are shown
  in **bold** so the standout performer is visible at a glance.

## Team management
- **Edit Team**: pencil icon on any team card in Select Teams — rename or add/remove players
  without recreating the team.
- **Delete Team**: trash icon on any team card — asks for confirmation first.
- **Add from Contacts**: uses the phone's native multi-select Contact Picker (Chrome on Android)
  to add several players in one go. Falls back to manual entry on unsupported browsers.
- WhatsApp invite was removed — it redirected out to a separate app without any way to actually
  track who joined, which felt more like friction than a real feature. Manual entry + contacts
  picker cover the same need more directly.

## History & Stats
- **History**: every completed match listed with a quick score summary; tap to view its full
  scorecard, or tap the ✕ to delete just that one match (also removes it from stats).
- **Stats**: month-by-month filter dropdown (defaults to "All time"), team win/loss/tie record,
  Man of the Match leaderboard, Top Scorers, Top Bowlers. A "Reset All Stats & History" button
  at the bottom permanently clears everything (confirmation required).
- **Home screen**: shows a "Last match" card linking straight to your most recently completed
  match's result, even after you've navigated away from it.

## Known limits (by design, flagged honestly rather than faked)
- **Contacts picker**: native browser API, Chrome on Android only currently has solid support.
- **Share**: uses the Web Share API with a clipboard-copy fallback. Shares text, not an image.
- Squads with fewer than the minimum required players are auto-padded with placeholder names
  so scoring never breaks — add real players in the Add Team screen for proper stats.
- Run-outs are simplified to 0 runs and assume the striker is the one dismissed.

## Tested
Four headless end-to-end test scripts (Node + jsdom, simulating real button clicks) cover: full
setup flow, all-out/target-chase innings endings, wides/no-balls/byes/leg-byes, undo, automatic
bowler-change prompts, Single Batting, Single Batsman (standalone and combined), team edit/
delete, coin-flip toss, Start Another Match, history delete, stats month filter + reset, share
scorecard, and bolded top performers. One genuine bug was caught and fixed during this round:
viewing Home while a match was between innings (1st innings finished, 2nd innings setup not yet
started) used to crash; Home now shows a "Set Up Next Innings" prompt in that state instead.
All tests pass as of the latest build.
