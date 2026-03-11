# CLAUDE CODE — Goddess' ♡3D View
## Complete Build + Cloudflare Deployment Plan
### `ferdowsi.app` — Because human HERstory deserves to be seen whole.

---

> **For Claude Code:** Execute every numbered step in order. Each step includes the exact commands, file contents, and verification checks. Do not skip steps. If a command fails, diagnose and fix before continuing.

---

## Prerequisites Check

```bash
node --version        # Must be ≥ 18.0.0
npm --version         # Must be ≥ 9.0.0
git --version         # Any recent version
npx wrangler --version # Will install if missing
```

---

## STEP 1 — Clone & Inspect the Repo

```bash
git clone https://github.com/univrs/ferdowsi.app.git
cd ferdowsi.app
ls -la
# Expect: .gitignore  LICENSE  README.md  gods-view-timeline.jsx
```

---

## STEP 2 — Scaffold Vite + React Project

We use Vite because it produces a static build that Cloudflare Pages deploys with zero config.

```bash
# From inside ferdowsi.app/
npm create vite@latest . -- --template react
# When prompted "Current directory is not empty. Remove existing files and continue?"
# Type: y  (we will restore the files we need afterwards)
```

Now restore the existing files:

```bash
git checkout README.md gods-view-timeline.jsx .gitignore
```

Install dependencies:

```bash
npm install
npm install --save-dev @vitejs/plugin-react
```

---

## STEP 3 — Project Structure

After scaffold + restore, the tree should look like this. Create any missing files/folders:

```
ferdowsi.app/
├── public/
│   ├── favicon.svg          ← create this (Step 4)
│   └── og-image.png         ← placeholder for now
├── src/
│   ├── components/
│   │   └── GoddessView.jsx  ← rename + rebrand from gods-view-timeline.jsx (Step 5)
│   ├── data/
│   │   └── events.js        ← extract EVENTS array (Step 6)
│   ├── App.jsx              ← create this (Step 7)
│   ├── main.jsx             ← create this (Step 8)
│   └── index.css            ← create this (Step 9)
├── gods-view-timeline.jsx   ← original, keep for reference
├── index.html               ← update title/meta (Step 10)
├── vite.config.js           ← verify (Step 11)
├── wrangler.toml            ← create for Cloudflare (Step 12)
├── .github/
│   └── workflows/
│       └── deploy.yml       ← GitHub Actions CI/CD (Step 13)
├── README.md
├── .gitignore               ← update (Step 14)
└── package.json
```

Create the `src/components/` and `src/data/` directories:

```bash
mkdir -p src/components src/data public .github/workflows
```

---

## STEP 4 — Create favicon.svg

Create `public/favicon.svg` — a glowing heart-diamond for Goddess' ♡3D View:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="g" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#e879f9"/>
      <stop offset="50%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#3b0764"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="64" height="64" fill="#02030c" rx="14"/>
  <path d="M32 48 C32 48 14 36 14 24 C14 17 19 13 24 13 C27.5 13 30.5 15 32 18 C33.5 15 36.5 13 40 13 C45 13 50 17 50 24 C50 36 32 48 32 48Z" 
        fill="url(#g)" filter="url(#glow)" opacity="0.95"/>
  <text x="32" y="38" text-anchor="middle" font-size="11" fill="white" 
        font-family="serif" opacity="0.6">3D</text>
</svg>
```

---

## STEP 5 — Create src/components/GoddessView.jsx

This is the fully rebranded component. Copy `gods-view-timeline.jsx` and apply these changes:

```bash
cp gods-view-timeline.jsx src/components/GoddessView.jsx
```

Then open `src/components/GoddessView.jsx` and apply ALL of these exact changes:

**5a. Update the branding in the GLOBAL_CSS / CSS constant** — find any font import and ensure it includes:
```
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;900&family=Share+Tech+Mono&family=Lora:ital,wght@0,400;0,500;1,400&display=swap');
```

**5b. In the LAYERS array, ADD two new herstory-specific layers** at the front of the array:

```javascript
const LAYERS = [
  // ── NEW HERSTORY LAYERS ──
  { id:"herstory",   label:"HERSTORY & WOMEN",    color:"#f0abfc", accent:"#c026d3" },
  { id:"indigenous", label:"INDIGENOUS WISDOM",   color:"#fcd34d", accent:"#b45309" },
  // ── ORIGINAL LAYERS ──
  { id:"cosmos",     label:"COSMOS & PHYSICS",    color:"#c4b5fd", accent:"#7c3aed" },
  { id:"earth",      label:"EARTH & CLIMATE",     color:"#6ee7b7", accent:"#059669" },
  { id:"life",       label:"LIFE & BIOLOGY",      color:"#a7f3d0", accent:"#10b981" },
  { id:"society",    label:"HUMAN & SOCIETY",     color:"#fde68a", accent:"#d97706" },
  { id:"conflict",   label:"WAR & POLITICS",      color:"#fca5a5", accent:"#dc2626" },
  { id:"science",    label:"SCIENCE & TECH",      color:"#93c5fd", accent:"#2563eb" },
  { id:"culture",    label:"ARTS & CULTURE",      color:"#f9a8d4", accent:"#db2777" },
  { id:"philosophy", label:"PHILOSOPHY & IDEAS",  color:"#e9d5ff", accent:"#9333ea" },
];
```

**5c. ADD these herstory seed events** to the EVENTS array (append before the closing bracket):

```javascript
// ── HERSTORY EVENTS ──
{ id:101, year:-3500,      layer:"herstory",   imp:4, title:"First Female Pharaohs",           desc:"Queens Neithhotep and Merneith rule ancient Egypt independently. Female leadership in one of history's greatest civilizations predates many later 'firsts' by millennia. Their names were erased from later king lists.", tags:["egypt","women","leadership","erased"] },
{ id:102, year:-2300,      layer:"herstory",   imp:5, title:"Enheduanna — First Named Author",  desc:"High priestess of Ur, daughter of Sargon of Akkad, writes the Hymns to Inanna — the first signed literary works in human history. She is the world's first named poet, predating Homer by 1,500 years. History forgot her for 4,000.", tags:["writing","poetry","women","mesopotamia","erased"] },
{ id:103, year:-1500,      layer:"herstory",   imp:4, title:"Hatshepsut Rules Egypt",           desc:"One of history's most successful pharaohs reigns for 20+ years, commissioning massive temples and leading trade expeditions. Her stepson Thutmose III later smashed her statues and chiseled out her name from monuments.", tags:["egypt","pharaoh","women","erased","power"] },
{ id:104, year:-500,       layer:"herstory",   imp:3, title:"Artemisia Commands Battle Fleet",  desc:"Queen of Halicarnassus commands her own warships at the Battle of Salamis — the only commander, male or female, whom Xerxes personally commended for courage. Her tactical advice was ignored; if followed, Persia would have won.", tags:["war","women","greece","military","leadership"] },
{ id:105, year:-350,       layer:"herstory",   imp:4, title:"Agnodice — First Female Doctor",   desc:"Athenian woman disguises herself as a man to study medicine under Herophilus. Becomes the most popular physician in Athens. Prosecuted. Saved by female patients who revolt. Athens changes its laws allowing women to study medicine.", tags:["medicine","women","greece","rights","courage"] },
{ id:106, year:624,        layer:"herstory",   imp:4, title:"Khadijah bint Khuwaylid",          desc:"Muhammad's first wife and first Muslim. A successful merchant who employed Muhammad and proposed marriage to him. She funded the early Islamic movement from her own fortune. Called 'Mother of the Faithful' and Islam's first convert.", tags:["islam","women","business","faith","leadership"] },
{ id:107, year:1030,       layer:"herstory",   imp:3, title:"Murasaki Shikibu's Tale of Genji", desc:"Japanese noblewoman writes what many scholars call the world's first novel — 1,000 years before most Western women could publish. The Tale of Genji explores psychology and love with a sophistication that astonished 20th-century novelists.", tags:["literature","women","japan","first","novel"] },
{ id:108, year:1098,       layer:"herstory",   imp:4, title:"Hildegard von Bingen — Polymath",  desc:"Abbess, composer of 77 musical works, playwright, herbalist, visionary, and theologian who corresponded with popes and emperors. Published the first known descriptions of female orgasm in medical literature. Her music was 'lost' for 600 years.", tags:["science","music","women","medieval","genius"] },
{ id:109, year:1405,       layer:"herstory",   imp:3, title:"Christine de Pizan — Feminist Author", desc:"Italian-born French poet, the first known woman in Europe to make her living by her pen. Her 'Book of the City of Ladies' (1405) directly refuted male scholars who claimed women were inferior by nature — 600 years before the word 'feminism' existed.", tags:["literature","women","feminism","france","writing"] },
{ id:110, year:1843,       layer:"herstory",   imp:5, title:"Ada Lovelace — First Programmer",  desc:"Daughter of Lord Byron, she writes the first algorithm intended for a machine — Charles Babbage's Analytical Engine. She envisions that machines could compose music, manipulate symbols, and do things beyond calculation. 100 years before the first computer.", tags:["computing","women","programming","first","technology"] },
{ id:111, year:1848,       layer:"herstory",   imp:5, title:"Seneca Falls Convention",          desc:"Elizabeth Cady Stanton and 300 others draft the Declaration of Sentiments, modeled on the Declaration of Independence: 'all men and women are created equal.' The formal birth of the women's rights movement in the United States.", tags:["feminism","rights","usa","suffrage","equality"] },
{ id:112, year:1898,       layer:"herstory",   imp:5, title:"Marie Curie — First Nobel",        desc:"First woman to win a Nobel Prize (Physics, 1903). First person to win a second Nobel Prize (Chemistry, 1911). First woman professor at the Sorbonne. Discovered polonium and radium. The French Academy of Sciences refused to admit her due to her sex.", tags:["science","women","physics","chemistry","first","erased"] },
{ id:113, year:1920,       layer:"herstory",   imp:5, title:"Women's Suffrage — USA",           desc:"19th Amendment ratified. American women gain the right to vote after 72 years of organized struggle. Millions of women of color would still be denied this right for decades. New Zealand was first in 1893.", tags:["suffrage","rights","usa","democracy","equality"] },
{ id:114, year:1950,       layer:"herstory",   imp:5, title:"Rosalind Franklin's Photo 51",     desc:"Franklin's X-ray crystallography reveals the double helix structure of DNA. Watson and Crick use her data without permission or credit. They win the Nobel Prize; she is not mentioned. She dies before the prize is awarded, having never known what was done with her work.", tags:["science","women","dna","erased","injustice","biology"] },
{ id:115, year:1963,       layer:"herstory",   imp:4, title:"Betty Friedan's Feminine Mystique", desc:"Documents 'the problem that has no name' — educated women's suffocation inside suburban domesticity. Becomes the catalyst of second-wave feminism. A million copies sold in the first year. The book that launched a movement.", tags:["feminism","usa","rights","equality","liberation"] },
{ id:116, year:1963,       layer:"herstory",   imp:4, title:"Valentina Tereshkova in Space",    desc:"First woman in space, orbiting Earth 48 times. A Soviet textile worker and amateur parachutist, she is selected from 400 candidates. She remains the only woman to have flown a solo space mission. The USSR then grounded all female cosmonauts for 19 years.", tags:["space","women","soviet","first","courage"] },
{ id:117, year:1976,       layer:"herstory",   imp:5, title:"Katherine Johnson's Calculations", desc:"NASA mathematician Katherine Johnson manually verified the orbital mechanics for John Glenn's historic first American orbital flight. NASA refused to trust the new IBM computers until Glenn personally requested Johnson check their figures.", tags:["computing","women","nasa","mathematics","erased"] },
{ id:118, year:2017,       layer:"herstory",   imp:4, title:"#MeToo Goes Global",               desc:"Tarana Burke's decade-old movement explodes worldwide after the Weinstein exposé. Millions of women share experiences of harassment and assault. The most significant shift in workplace power dynamics since suffrage.", tags:["feminism","justice","global","movement","equality"] },
{ id:119, year:2020,       layer:"herstory",   imp:4, title:"First Female VP of the USA",       desc:"Kamala Harris becomes the first woman, first Black American, and first South Asian American to serve as Vice President of the United States — breaking one of the last glass ceilings in American political history.", tags:["politics","women","usa","first","equality"] },
// ── INDIGENOUS WISDOM ──
{ id:201, year:-40000,     layer:"indigenous", imp:5, title:"Aboriginal Songlines",             desc:"Australia's First Peoples develop a navigational and cosmological system encoded in song that maps the continent's entire landscape. Some songlines remain accurate to geological features formed 10,000+ years ago. The oldest continuous knowledge system on Earth.", tags:["indigenous","australia","navigation","wisdom","cosmology"] },
{ id:202, year:-12000,     layer:"indigenous", imp:4, title:"First Nations Terra Management",    desc:"Indigenous peoples across the Americas practice sophisticated land management — controlled burns, aquaculture, food forests — maintaining biodiversity at a scale that post-colonial 'wilderness' destroyed. Called 'wilderness' by colonizers who erased its management.", tags:["indigenous","ecology","americas","science","erased"] },
{ id:203, year:-3000,      layer:"indigenous", imp:4, title:"Polynesian Navigation",            desc:"Pacific Islanders navigate 10 million square miles of open ocean using only stars, wave patterns, birds, and phosphorescence. They reach Hawaii 1,500 years before Europeans know the Pacific exists. The greatest navigational achievement in pre-modern history.", tags:["indigenous","navigation","pacific","ocean","genius"] },
{ id:204, year:1492,       layer:"indigenous", imp:5, title:"Indigenous Genocide Begins",       desc:"Columbus's arrival begins the systematic destruction of the Western Hemisphere's civilizations. 90% of indigenous populations — an estimated 55 million people — die within 150 years from disease, enslavement, and slaughter. The largest demographic catastrophe in human history.", tags:["genocide","indigenous","colonialism","americas","catastrophe"] },
{ id:205, year:1830,       layer:"indigenous", imp:4, title:"Trail of Tears",                   desc:"US Indian Removal Act forces 60,000+ Native Americans from their ancestral lands. 15,000 die on forced marches. Entire nations — Cherokee, Muscogee, Seminole, Choctaw, Chickasaw — are ethnically cleansed from the American Southeast.", tags:["indigenous","genocide","usa","removal","catastrophe"] },
```

**5d. Update the header branding** — Find the header section and change:
- `GOD'S` → `GODDESS'`  
- `◈ CHRONICLE OF TIME ◈` → `♡ HERSTORY OF TIME ♡`
- `FUTURE ∞` → `OUR FUTURE ∞`
- `PROTOTYPE v0.1 · DATA: STATIC · LIVE FEEDS: PLANNED` → `PROTOTYPE v0.1 · HERSTORY EDITION · LIVE FEEDS: NEXT`

**5e. Update the bottom tagline** in the status bar or footer:
- Add: `Goddess' ♡3D View — Because human HERstory deserves to be seen whole.`

**5f. Update the export default function name:**
```javascript
export default function GoddessView() {   // was: GodsView
```

---

## STEP 6 — Create src/data/events.js

Extract event data for cleaner architecture (future-proofing for API replacement):

```javascript
// src/data/events.js
// Static seed events — will be replaced by API calls in Phase 2
// Sources: Wikipedia, Wikidata, curated herstory research

export const SEED_EVENTS = [
  // ... paste the full EVENTS array from GoddessView.jsx here
  // including the new herstory + indigenous events from Step 5c
];

export const LAYERS = [
  // ... paste the LAYERS array here
];

export const EPOCHS = {
  // ... paste the EPOCHS object here
};
```

---

## STEP 7 — Create src/App.jsx

```javascript
// src/App.jsx
import GoddessView from './components/GoddessView';

export default function App() {
  return <GoddessView />;
}
```

---

## STEP 8 — Create src/main.jsx

```javascript
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## STEP 9 — Create src/index.css

```css
/* src/index.css */
/* Minimal reset — component handles all visual styling */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #02030c;
}

/* Prevent text selection during timeline drag */
.timeline-drag {
  user-select: none;
  -webkit-user-select: none;
}
```

---

## STEP 10 — Update index.html

Replace the default Vite `index.html` content:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- SEO -->
    <title>Goddess' ♡3D View — HERstory of Time</title>
    <meta name="description" content="A 3D living chronicle of time from Big Bang to present — surfacing women's history, indigenous wisdom, and the missing links of human civilization. Because HERstory deserves to be seen whole." />
    <meta name="keywords" content="herstory, history, timeline, 3D, women's history, indigenous, visualization, cosmos" />
    
    <!-- Open Graph -->
    <meta property="og:title" content="Goddess' ♡3D View" />
    <meta property="og:description" content="Because human HERstory deserves to be seen whole." />
    <meta property="og:url" content="https://ferdowsi.app" />
    <meta property="og:type" content="website" />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Goddess' ♡3D View — HERstory of Time" />
    <meta name="twitter:description" content="A 3D visual timeline of human herstory from Big Bang to now." />
    
    <!-- Preconnect for Google Fonts (used in component) -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    
    <!-- Theme color for mobile browsers -->
    <meta name="theme-color" content="#02030c" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## STEP 11 — Verify vite.config.js

Ensure `vite.config.js` looks like this:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
```

---

## STEP 12 — Create wrangler.toml (Cloudflare Pages)

```toml
# wrangler.toml
name = "ferdowsi-app"
compatibility_date = "2024-01-01"

# Cloudflare Pages configuration
[site]
bucket = "./dist"

# Environment-specific settings
[env.production]
name = "ferdowsi-app"
```

Also create `public/_redirects` for SPA routing:

```
# public/_redirects
/*    /index.html    200
```

And `public/_headers` for security + performance:

```
# public/_headers
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.js
  Cache-Control: public, max-age=31536000, immutable

/*.css
  Cache-Control: public, max-age=31536000, immutable
```

---

## STEP 13 — Create GitHub Actions CI/CD

Create `.github/workflows/deploy.yml`:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    name: Build & Deploy
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NODE_ENV: production

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: ferdowsi-app
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
          wranglerVersion: '3'
```

---

## STEP 14 — Update .gitignore

```
# .gitignore
node_modules/
dist/
.env
.env.local
.env.production.local
.DS_Store
*.log
.wrangler/
.dev.vars
```

---

## STEP 15 — Local Build Test

```bash
# Install all deps fresh
npm install

# Start dev server — verify it loads at http://localhost:3000
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
# Opens at http://localhost:4173 — verify it looks correct

# Check bundle size
ls -la dist/assets/
# Expect: main JS chunk ~200-400KB, CSS minimal
```

**Verify checklist before deploying:**
- [ ] Timeline loads with starfield background
- [ ] 6 epoch buttons switch correctly with fade transition
- [ ] Hover cards appear on event nodes
- [ ] Click modal opens and closes
- [ ] Layer sidebar toggles work
- [ ] "HERSTORY & WOMEN" layer shows female events
- [ ] "INDIGENOUS WISDOM" layer shows indigenous events
- [ ] NOW beam is visible and pulsing
- [ ] GODDESS' ♡3D View branding in header
- [ ] No console errors

---

## STEP 16 — Cloudflare Pages Setup (One-Time Manual Step)

This step is done once in the Cloudflare dashboard, then CI/CD takes over.

### 16a. Create the Pages Project

1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. Select your account → **Workers & Pages** → **Create application** → **Pages**
3. Click **Connect to Git**
4. Authorize GitHub and select the `univrs/ferdowsi.app` repository
5. Configure the build:
   - **Project name:** `ferdowsi-app`
   - **Production branch:** `main`
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** `20` (set in Environment Variables as `NODE_VERSION = 20`)
6. Click **Save and Deploy**

### 16b. Get API Credentials for GitHub Actions

1. In Cloudflare dashboard → **My Profile** → **API Tokens**
2. Click **Create Token** → **Use template: Edit Cloudflare Workers**
3. Under "Account Resources" → Include → your account
4. Under "Zone Resources" → Include → All zones (or just ferdowsi.app)
5. Click **Continue to summary** → **Create Token**
6. **COPY THIS TOKEN** — you won't see it again

7. Your **Account ID** is visible in the URL of your Cloudflare dashboard:
   `https://dash.cloudflare.com/ACCOUNT_ID_HERE/...`

### 16c. Add Secrets to GitHub

1. Go to `https://github.com/univrs/ferdowsi.app/settings/secrets/actions`
2. Add these two repository secrets:
   - **Name:** `CLOUDFLARE_API_TOKEN` → **Value:** (the token from 16b)
   - **Name:** `CLOUDFLARE_ACCOUNT_ID` → **Value:** (your account ID)

---

## STEP 17 — Connect Custom Domain ferdowsi.app

### 17a. In Cloudflare Pages (after first deployment succeeds)

1. Go to your `ferdowsi-app` Pages project
2. Click **Custom domains** → **Set up a custom domain**
3. Enter: `ferdowsi.app`
4. Click **Continue**
5. Since `ferdowsi.app` is already in Cloudflare (domain exists), it will auto-configure the CNAME

### 17b. Also add www redirect (optional but recommended)

In the same custom domains section:
- Add `www.ferdowsi.app`
- This will redirect to `ferdowsi.app`

### 17c. Verify DNS (Cloudflare DNS dashboard)

Go to **DNS** for `ferdowsi.app` domain and verify these records exist:

```
Type    Name        Content                          Proxied
CNAME   @           ferdowsi-app.pages.dev           ✓ (orange cloud)
CNAME   www         ferdowsi-app.pages.dev           ✓ (orange cloud)
```

If the records are not auto-created, add them manually.

### 17d. SSL/TLS Settings

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to: **Full (strict)**
3. Go to **SSL/TLS** → **Edge Certificates**
4. Enable: **Always Use HTTPS** ✓
5. Enable: **Automatic HTTPS Rewrites** ✓
6. Enable: **HSTS** (Header: `max-age=31536000`) ✓

---

## STEP 18 — Commit and Push Everything

```bash
# Stage all new files
git add .

# Commit with semantic message
git commit -m "feat: scaffold Vite+React build, rebrand to Goddess' ♡3D View

- Add Vite build system with React 18
- Rename GodsView → GoddessView with herstory branding  
- Add HERSTORY & WOMEN layer with 19 seed events
- Add INDIGENOUS WISDOM layer with 5 seed events
- Add Cloudflare Pages config (wrangler.toml, _redirects, _headers)
- Add GitHub Actions CI/CD pipeline
- Update index.html with proper SEO meta tags
- Update README with herstory tagline"

# Push to main — this triggers the GitHub Action
git push origin main
```

---

## STEP 19 — Verify Deployment

After pushing:

1. Watch the GitHub Actions run at: `https://github.com/univrs/ferdowsi.app/actions`
2. The workflow should complete in ~2 minutes
3. Check the Cloudflare Pages deployment at: `https://dash.cloudflare.com` → Workers & Pages → ferdowsi-app
4. Once deployed, visit: `https://ferdowsi.app`

**Final verification checklist:**
- [ ] `https://ferdowsi.app` loads (not `http://`)
- [ ] SSL padlock shown in browser
- [ ] Goddess' ♡3D View title in browser tab
- [ ] Timeline renders correctly
- [ ] All epoch switches work
- [ ] HERSTORY layer visible and populated
- [ ] Mobile viewport doesn't break layout (check at 390px width)
- [ ] No mixed-content warnings in console
- [ ] PageSpeed Insights score > 85

---

## STEP 20 — Post-Deploy Optimizations

### 20a. Add Cloudflare Analytics (free)

In Pages project → **Analytics** tab → Enable Web Analytics.
This gives privacy-respecting visitor stats without cookies.

### 20b. Speed test

```bash
# Test build size
npx bundlesize
# Or simply check:
du -sh dist/assets/
```

### 20c. Lighthouse audit

Run in Chrome DevTools on the live site. Target scores:
- Performance: > 85
- Accessibility: > 75  
- Best Practices: > 90
- SEO: > 90

---

## Troubleshooting

### Build fails: "Cannot find module 'react'"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Cloudflare deploy fails: "Build command exited with code 1"
- Check the Cloudflare build logs
- Verify `NODE_VERSION = 20` is set in Pages environment variables
- Try adding `NPM_FLAGS = --legacy-peer-deps` if peer dep conflicts

### Domain not resolving after adding custom domain
- DNS propagation can take up to 24 hours (usually < 5 min on Cloudflare)
- Check `dig ferdowsi.app` — should return Cloudflare IPs (104.x.x.x)

### Fonts not loading in production
- Verify the Google Fonts `@import` is in the CSS string within the component
- Cloudflare's `_headers` file allows external font loads by default

### Starfield canvas blank
- This is a CSS z-index issue if `position: fixed` is overridden
- Ensure `index.css` has `#root { overflow: hidden }` not `overflow: scroll`

---

## What Comes Next (Phase 2 Sprint)

Once the site is live, the next Claude Code session should:

1. **Wikidata SPARQL integration** — Replace static EVENTS with live API:
   ```bash
   npm install @tanstack/react-query
   # Create src/hooks/useWikidataEvents.js
   # Create src/api/wikidata.js with SPARQL queries
   ```

2. **IndexedDB caching** — Offline-first with `idb`:
   ```bash
   npm install idb
   # Create src/cache/eventCache.js
   ```

3. **Search** — Full-text search across all events:
   ```bash
   npm install fuse.js
   # Add search bar to header
   ```

4. **Cloudflare Workers API** — Edge-cached event endpoint:
   ```bash
   # Create workers/events.js (Hono framework)
   # Deploy as workers.ferdowsi.app subdomain
   ```

---

*Goddess' ♡3D View — Because human HERstory deserves to be seen whole.*  
*ferdowsi.app — Named for Ferdowsi, the Persian poet who preserved 1,000 years of history in verse.*
