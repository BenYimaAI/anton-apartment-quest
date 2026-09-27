# Anton's Apartment Quest

A small family-friendly voxel apartment game that runs directly in the browser and is ready for **GitHub Pages**.

The apartment geometry is a simplified voxel reconstruction based on the supplied two-page apartment/furniture plan. The source floor-plan images themselves are **not included** in this public-ready repository so that the residential address and plan annotations are not accidentally published.

## What is already playable

- Live 3D apartment rendered with Three.js
- Main menu with a top-down apartment overview
- `Start Game` camera fly-in toward the entrance
- Anton as the playable 13-year-old character
- Anna, Mama and Papa as voxel NPCs
- Family appearance rules:
  - Anton: blond hair, blue eyes
  - Anna: 5 years old, blond hair, blue eyes
  - Mama: black hair, blue eyes
  - Papa: blond hair, blue eyes
- Warm wooden floors in main areas
- Dark-grey bathroom / utility tiles
- Light-grey walls
- Bedroom, utility area, kitchen, living/dining area, bathrooms and balcony/loggia
- Keyboard controls: WASD / arrow keys
- Touch controls on mobile/tablet
- Six starting missions:
  - Clean
  - Eat
  - Tidy Up
  - Renovate
  - Cook
  - Play with Anna
- XP, levels, coins and mission completion
- Local autosave via `localStorage`
- Family Wall
- HomeChat UI
- Parent Console at `parent.html`
- Optional Supabase hooks for cloud saves, cross-device messaging and family-wall updates

## Publish on GitHub Pages

1. Create a new GitHub repository, for example `anton-apartment-quest`.
2. Upload **the contents of this folder** to the repository root. `index.html` must be in the root.
3. Commit to `main`.
4. Open **Repository → Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select `main` and `/ (root)`.
7. Save.
8. GitHub will publish a URL similar to:
   `https://YOUR-GITHUB-NAME.github.io/anton-apartment-quest/`

No build step is required.

## Controls

| Action | Desktop | Touch |
|---|---|---|
| Move | WASD / arrows | On-screen D-pad |
| Interact | E | E button |
| Return to menu | Esc | reload/menu UI |
| HomeChat | purple HUD button | purple HUD button |

Walk close to a glowing mission marker and interact.

## Saving progress

### Default: local save

Progress is automatically stored in the browser. This works immediately on GitHub Pages without any account or backend.

The local save includes:
- Anton's position
- XP and level
- coins
- completed missions
- game settings

Local saves stay on that specific browser/device.

### Optional: cloud save

`config.js`, `js/backend.js`, and `supabase-setup.sql` contain the cloud integration foundation.

To enable it:
1. Create a Supabase project.
2. Run `supabase-setup.sql` in the Supabase SQL editor.
3. Create parent and Anton users in Supabase Authentication.
4. Insert the household/profile rows shown at the bottom of the SQL file.
5. Put your Supabase project URL and **anon** key in `config.js` and set `enabled: true`.
6. Use the built-in Family cloud login in the game Settings for Anton, and the built-in Parent cloud login on `parent.html`. Supabase persists the authenticated browser session automatically.

Do **not** put a Supabase service-role key in GitHub or browser code.

## Family Wall pictures

For a simple public release:
1. Add the image to `assets/family-wall/`.
2. Add a record to `data/family-wall.json`.

Example:

```json
{
  "id": "2026-10-01-trip",
  "date": "2026-10-01",
  "title": "Something new",
  "text": "Look what happened this week.",
  "image": "./assets/family-wall/trip.webp"
}
```

The in-game Family Wall modal updates automatically on the next deployment.

**Privacy:** a GitHub Pages website is public in the normal setup. Private family photos should not be committed to a public repository. For those, use the cloud path and private storage/signed URLs.

## HomeChat

HomeChat works in **local demo mode** immediately. Messages are persisted in browser storage.

Open `parent.html` in the same browser to:
- send messages as Papa, Mama or Family
- add Family Wall updates

For real communication between your device and Anton's device, enable the cloud backend. The SQL policies restrict records to the same household when properly configured.

## Parent Console

Published URL:

`https://YOUR-GITHUB-NAME.github.io/anton-apartment-quest/parent.html`

The parent console is deliberately lightweight in V1. In a later version it can be extended with:
- authenticated parent-only access
- quest creation
- rewards
- renovation unlocks
- image uploads
- read receipts
- daily/weekly quest schedules

## Edit missions

Edit `data/quests.json` rather than changing game code.

Each mission includes:

```json
{
  "id": "clean",
  "title": "Clean",
  "icon": "🧹",
  "x": -9.5,
  "z": 6.5,
  "xp": 20,
  "coins": 10,
  "hint": "Clean the laundry / utility area."
}
```

## Repository structure

```text
anton-apartment-quest/
├── index.html
├── parent.html
├── styles.css
├── config.js
├── README.md
├── supabase-setup.sql
├── .nojekyll
├── js/
│   ├── app.js
│   ├── world.js
│   ├── save.js
│   ├── backend.js
│   └── parent.js
├── data/
│   ├── quests.json
│   └── family-wall.json
└── assets/
    ├── family-wall/
    └── previews/
        ├── menu-concept.png
        └── gameplay-concept.png
```

## Notes about the V1 apartment

The V1 map reproduces the key spatial logic, materials and furniture categories from the supplied plan, but it is intentionally a simplified game reconstruction rather than a millimetre-accurate BIM model. The geometry is kept lightweight enough to run smoothly on normal browsers and phones.

The next fidelity pass can refine exact wall angles, windows, door swings, individual furniture proportions and photographs from the original plan while keeping the same game systems.
