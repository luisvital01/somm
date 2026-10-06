# Somm · Deductive Tasting Log

Mobile web app for recording deductive wine tastings (blind or study), hosted on GitHub Pages.
Data is saved as a CSV + label photos in a separate **private** repository via the GitHub API.

- App: `luisvital01/somm` (public, GitHub Pages) → https://luisvital01.github.io/somm
- Data: `luisvital01/somm-data` (private)
  - `tastings.csv` — one row per tasting, key `Wine ID` (`YYYY` + 4 digits, e.g. `20260001`)
  - `photos/<Wine ID>.jpg` — label photos
  - `meta.json` — last used ID per year (so deleted IDs are never reused)

## Screens
- **New** — step-by-step grid: Setup → Sight → Nose → Palate → Conclusion → The Wine → Notes
  (Study mode: Setup → The Wine → Sight → Nose → Palate → Notes; conclusions are hidden).
  Drafts are kept on the phone if you close the app mid-tasting.
- **Tastings** — search, filter, view, edit and delete (delete asks you to type the Wine ID).
- **Summary** — totals, blind/study, red/white/rosé, blind accuracy over time, top grapes/countries/regions, grape profiles.
- **Settings** — GitHub token, sync status, CSV download.

## Setup
1. Upload these files to the root of `somm` and enable **Settings → Pages → Deploy from a branch → main / (root)**.
2. Create a fine-grained token: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens.
   Repository access: *Only select repositories* → `somm-data`. Permissions → Repository → **Contents: Read and write**.
3. Open the app on your phone → Settings → paste the token → Test connection → Save.
4. Add to Home Screen (Safari: Share → Add to Home Screen; Chrome: ⋮ → Add to Home screen).

## Notes
- Works offline; changes sync when back online (one commit per sync).
- Multi-choice cells in the CSV use `|` as separator (e.g. `Lemon|Green Apple`).
- To open the CSV in Excel (pt-BR): Data → From Text/CSV, delimiter *comma*, encoding UTF-8.
- No build step, no dependencies: plain HTML/CSS/JS modules.
