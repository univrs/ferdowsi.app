# Simurgh's View — Architectural Blueprint
### A <3D Living Chronicle of Time: From Big Bang to Present

---

## Vision Statement

Simurgh - Goddess' View is a real-time, AI-augmented, multi-dimensional visual timeline spanning the entirety of known time — from the Big Bang (~13.8B BCE) to the present second. It renders human and cosmic history as an infinitely navigable 3D space, with layered dimensions (science, politics, culture, conflict, philosophy, biology) that reveal increasing nuance as users zoom in from cosmological scales to individual days. Live open data feeds from Wikipedia, academic APIs, and AI agents continuously enrich the timeline, while a multi-user SaaS model with local-first architecture allows collaborative exploration and personal curation.

---

## Core Design Principles

**1. Infinite Zoom** — The X-axis spans from t=0 (Big Bang) to t=∞ (future), with logarithmic and linear mode switching. Zoom from billions of years to seconds.

**2. Dimensional Layers** — The Y-axis is a stack of themed "dimensions" (Cosmos, Earth, Biology, Society, Conflict, Science, Culture, Philosophy) each rendering at different Z depths, creating genuine 3D depth.

**3. Local-First, Cloud-Synced** — All data is cached in IndexedDB and SQLite WASM. Users own their data. Cloud sync is additive, not required.

**4. AI Agent Enrichment** — A swarm of specialized AI agents continuously crawls open data sources, validates facts, resolves conflicts, and proposes new event cards for editorial review.

**5. Open Data as Foundation** — Wikipedia, Wikidata, OpenAlex, GDELT, NewsAPI, arXiv, and government APIs provide the raw stream. AI agents curate, summarize, and connect.

---

## Phase 1 — Prototype (Current: Weeks 1–4)

### What We Built
- Static React/JSX prototype with 40+ seed events
- 6 time scale modes (Cosmic → Contemporary)
- 8 dimensional layers with toggle controls
- Hover preview cards + click modal with full detail
- Animated starfield canvas background
- Time ruler with adaptive tick intervals
- "Now" beam marker
- Epoch-aware event positioning

### Tech Stack (Phase 1)
```
Frontend:    React 18 + Tailwind (or inline styles)
Rendering:   CSS 3D transforms + Canvas API
Data:        Static JSON (hardcoded seed events)
Deployment:  Static hosting (Vercel/Cloudflare Pages)
```

---

## Phase 2 — Live Data Pipeline (Weeks 5–12)

### Wikipedia + Wikidata Integration

**Wikidata SPARQL API** is the primary structured source. Every major historical event has a `significant_event` (P793) or is a `historical period` (Q11514315). We can query:

```sparql
SELECT ?event ?label ?date ?category WHERE {
  ?event wdt:P31 wd:Q1190554 .          # instance of: occurrence
  ?event wdt:P585 ?date .               # point in time
  ?event rdfs:label ?label FILTER(LANG(?label) = "en") .
  OPTIONAL { ?event wdt:P31 ?category }
}
ORDER BY ?date
LIMIT 500
```

**Wikipedia Summary API** enriches event cards:
```
GET https://en.wikipedia.org/api/rest_v1/page/summary/{title}
```

**OpenAlex** for science/academic milestones:
```
GET https://api.openalex.org/works?filter=cited_by_count:>5000&sort=publication_year
```

**GDELT Project** for real-time global events:
```
GET https://api.gdeltproject.org/api/v2/doc/doc?query=...&mode=artlist&format=json
```

### Data Schema (PostgreSQL + Wikidata-compatible)

```sql
CREATE TABLE events (
  id            UUID PRIMARY KEY,
  wikidata_id   VARCHAR(20),           -- Q12345
  title         TEXT NOT NULL,
  year          BIGINT NOT NULL,       -- can be negative (BCE)
  year_precision INT DEFAULT 9,        -- Wikidata precision: 9=year, 11=day
  layer         VARCHAR(30) NOT NULL,  -- cosmos/earth/life/society/conflict/science/culture/philosophy
  importance    SMALLINT DEFAULT 3,    -- 1-5
  description   TEXT,
  long_desc     TEXT,
  tags          TEXT[],
  sources       JSONB,                 -- [{url, title, retrieved_at}]
  media         JSONB,                 -- [{type: image/video, url, caption}]
  coordinates   POINT,                 -- geographic location if applicable
  related_events UUID[],               -- linked events
  ai_summary    TEXT,
  verified      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_year ON events (year);
CREATE INDEX idx_events_layer ON events (layer);
CREATE INDEX idx_events_importance ON events (importance);
```

### Event Ingestion Pipeline

```
[Data Sources]
    ↓
[Ingestion Workers] ── GDELT, Wikipedia, arXiv, NewsAPI
    ↓
[Deduplication Service] ── fuzzy match on (year ± 1yr, title similarity > 0.85)
    ↓
[AI Classification Agent] ── assign layer, importance, tags via Claude API
    ↓
[Fact Validation Agent] ── cross-reference 2+ sources
    ↓
[Editorial Queue] ── human review for importance ≥ 4
    ↓
[Published Events DB]
    ↓
[CDN Cache] ── edge-cached JSON by epoch range
```

---

## Phase 3 — AI Agent Swarm (Weeks 13–20)

### Agent Architecture

Each agent is a specialized Claude API call with tools and memory, coordinated by an orchestrator:

```
ORCHESTRATOR
├── WikiAgent        — monitors Wikipedia "recent changes" for historical events
├── NewsAgent        — processes GDELT + NewsAPI for real-time events  
├── ScienceAgent     — monitors arXiv preprints for breakthrough papers
├── ClassifierAgent  — assigns layer + importance + tags
├── ConnectorAgent   — finds relationships between events (causal, temporal, thematic)
├── VerifierAgent    — cross-checks claims against 3+ sources
├── SummaryAgent     — generates multi-length descriptions (tweet / card / essay)
└── VisualAgent      — finds/generates imagery for events
```

### Agent Prompt Pattern (ClassifierAgent)

```
System: You are a historian and knowledge curator for a visualization of human history.
Given an event description, classify it precisely.

Output JSON only:
{
  "layer": "cosmos|earth|life|society|conflict|science|culture|philosophy",
  "importance": 1-5,  // 5 = civilization-changing, 1 = regional/minor
  "tags": ["tag1", "tag2"],  // 3-6 tags, specific nouns
  "time_precision": "century|decade|year|month|day",
  "confidence": 0.0-1.0
}

Rules:
- importance 5: Changes the course of human civilization or the physical world
- importance 4: Major global or regional transformation
- importance 3: Significant national or cultural event  
- importance 2: Notable but localized impact
- importance 1: Minor or highly uncertain events

Event: {event_description}
```

### Real-Time Event Feed

```typescript
// WebSocket subscription pattern
const socket = new WebSocket('wss://api.godsview.io/stream');

socket.onmessage = (msg) => {
  const event = JSON.parse(msg.data);
  if (event.type === 'new_event' && event.year >= currentEpoch.start) {
    addEventToTimeline(event);
    animateEventEntry(event);
  }
};
```

---

## Phase 4 — Multi-User SaaS + Local-First (Weeks 21–32)

### Local-First Architecture

**Technology**: CRDT-based sync using `automerge` or `yjs`, with IndexedDB as local store.

```
User Device
├── IndexedDB (automerge documents)
│   ├── personal_events      — user-created events
│   ├── cached_public_events — offline copy of public timeline
│   ├── user_preferences     — epoch defaults, active layers, bookmarks
│   └── collaboration_docs   — shared timelines with CRDTs
└── SQLite WASM (heavy queries)
    └── event_search_index   — full-text search offline

Cloud Sync
├── Supabase Realtime       — CRDT delta sync
├── Cloudflare R2           — media assets
└── Vercel Edge             — API routes + SSR
```

### User Tiers

| Feature                          | Free     | Explorer ($9/mo) | Scholar ($29/mo) | Institution |
|----------------------------------|----------|------------------|------------------|-------------|
| Public timeline access           | ✓        | ✓                | ✓                | ✓           |
| All time scales                  | ✓        | ✓                | ✓                | ✓           |
| Create personal events           | 50       | Unlimited        | Unlimited        | Unlimited   |
| Collaborative timelines          | —        | 3                | Unlimited        | Unlimited   |
| AI event enrichment requests     | —        | 100/mo           | Unlimited        | Unlimited   |
| Export (PNG/SVG/PDF)             | —        | ✓                | ✓                | ✓           |
| Embed in website                 | —        | —                | ✓                | ✓           |
| Custom data feeds                | —        | —                | ✓                | ✓           |
| White-label + API access         | —        | —                | —                | ✓           |

### CMS for Community Curation

- Any verified user can propose new events with sources
- AI pre-validates: checks source credibility, date consistency, layer classification
- Community voting + expert review queue
- Dispute resolution for contested historical facts (multiple "versions" of events with differing historical perspectives)
- Version history for every event card (git-like)

---

## Phase 5 — Advanced 3D Rendering (Weeks 33–48)

### Three.js / WebGPU Upgrade

Replace CSS 3D with a full Three.js scene for true depth:

```
Scene Graph
├── StarField (particle system, 100K points)
├── NebulaVolume (volumetric shader)
├── TimelineSpine (glowing tube geometry)
├── CategoryPlanes (transparent planes at different Z depths)
│   └── EventNodes (instanced mesh, LOD-aware)
├── ConnectionLines (bezier curves linking related events)
├── EpochMarkers (milestone pillars rising from the plane)
└── FocusCamera (smooth lerp navigation)
```

**Camera Navigation Modes:**
- **God View**: Orthographic, looking down at the full timeline
- **Journey Mode**: First-person fly-through time
- **Era Zoom**: Focus on a specific century with animated zoom
- **Event Cluster**: Pull back to see pattern clusters by tag/theme

### Visual Encoding

| Attribute        | Visual Encoding                                    |
|------------------|----------------------------------------------------|
| Importance       | Node size (3px to 18px radius)                     |
| Layer            | Node color (8 distinct hues)                       |
| Recency/quality  | Glow intensity                                     |
| Connections      | Curved bezier lines with animated flow particles   |
| Uncertainty      | Pulsing/dashed edge vs solid                       |
| Geographic       | Small globe texture on geo-tagged events           |
| Media-rich       | Thumbnail halo ring                                |

---

## Open Data Sources

| Source              | Type                    | Update Frequency | API Key  |
|---------------------|-------------------------|------------------|----------|
| Wikidata SPARQL      | Structured events        | Real-time         | None     |
| Wikipedia API        | Summaries, categories    | Real-time         | None     |
| GDELT 2.0           | Global news events       | 15 minutes        | None     |
| OpenAlex            | Academic papers          | Daily             | None     |
| NewsAPI             | News headlines           | Real-time         | Required |
| NASA EONET          | Earth/space events       | Real-time         | None     |
| USGS Earthquake API | Geological events        | Real-time         | None     |
| arXiv API           | Scientific preprints     | Daily             | None     |
| Chronicling America | Historical newspapers    | Static            | None     |
| Internet Archive    | Digitized historical docs| Static            | None     |

---

## Technical Stack Summary

```
FRONTEND
├── Framework:       React 18 / Next.js 14
├── 3D Engine:       Three.js → WebGPU (Phase 5)
├── State:           Zustand + Automerge CRDTs
├── Offline:         IndexedDB + SQLite WASM
├── Styling:         Tailwind CSS + CSS custom properties
└── Animation:       Framer Motion + GSAP for timeline transitions

BACKEND  
├── Runtime:         Node.js / Bun
├── Framework:       Hono (edge-compatible) or Fastify
├── Database:        Supabase (PostgreSQL + Realtime)
├── Cache:           Upstash Redis (event range cache)
├── AI:              Anthropic Claude API (agent swarm)
├── Queue:           Inngest (background ingestion jobs)
└── Search:          Meilisearch (fuzzy full-text event search)

INFRASTRUCTURE
├── Hosting:         Vercel (frontend) + Railway (backend)
├── CDN:             Cloudflare (media + API edge cache)
├── Auth:            Clerk or Supabase Auth
├── Payments:        Stripe
├── Monitoring:      Sentry + PostHog
└── Storage:         Cloudflare R2 (event media)

DATA PIPELINE
├── Ingestion:       Inngest scheduled functions
├── AI Classification: Claude claude-sonnet-4-6 with structured output
├── Deduplication:   pgvector semantic similarity
├── Validation:      Multi-source cross-reference
└── Distribution:    Incremental CDN cache invalidation
```

---

## Development Roadmap

```
MONTH 1  ████████████░░░░░░░░  Phase 1: Prototype
         ├── Static timeline w/ 50+ seed events
         ├── 6 time scales, 8 layers
         ├── Event cards, hover/click interactions
         └── DELIVERABLE: Demo-ready prototype ✓ (DONE)

MONTH 2  ░░░░████████████░░░░  Phase 2: Live Data
         ├── Wikidata/Wikipedia API integration
         ├── Event ingestion pipeline
         ├── PostgreSQL schema + API routes
         └── DELIVERABLE: 2,000+ live events

MONTH 3  ░░░░░░░░████████████  Phase 2-3: AI Agents
         ├── ClassifierAgent + SummaryAgent
         ├── GDELT real-time feed
         ├── Deduplication + editorial queue
         └── DELIVERABLE: 10,000+ events, daily updates

MONTH 4-5  Phase 3-4: Multi-user SaaS
         ├── Auth, user accounts, subscriptions
         ├── Personal event creation
         ├── Collaborative timelines (CRDTs)
         └── DELIVERABLE: Public beta launch

MONTH 6-8  Phase 4: Polish + Scale
         ├── Mobile-responsive design
         ├── Embed widget
         ├── Export (PNG/SVG/PDF/JSON)
         └── DELIVERABLE: v1.0 launch

MONTH 9-12  Phase 5: True 3D
         ├── Three.js scene replacement
         ├── Connection lines between related events
         ├── Journey mode (fly-through history)
         └── DELIVERABLE: v2.0 "God's View" vision realized
```

---

## Immediate Next Steps

1. **Set up Wikidata SPARQL query** — Pull 500 major historical events with dates and categories
2. **Build ingestion API route** — `/api/events?epoch=HISTORICAL&layer=all&limit=200`
3. **PostgreSQL schema** — Deploy on Supabase free tier
4. **Replace static EVENTS array** with API fetch + IndexedDB cache
5. **Claude classification agent** — Auto-classify imported Wikidata events
6. **Auth + user accounts** — Clerk for simple OAuth setup
7. **Event creation UI** — Allow users to add their own events with sources

---

*Simurgh's <3DView — Because human herstory deserves to be seen whole.*
