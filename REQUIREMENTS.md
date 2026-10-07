# Personal CV Website — Requirements (draft)

## Goal
An online CV that presents my profile clearly and, through tasteful animations,
signals strong technical skills.

## Audience
Recruiters, hiring managers, technical peers. Must be readable in < 30 seconds.

## Content (sections)
- [ ] Hero: name, title, one-line pitch
- [ ] About
- [ ] Experience (timeline)
- [ ] Skills (grouped: languages, frameworks, tools)
- [ ] Projects (cards with links / screenshots)
- [ ] Education & certifications
- [ ] Contact (email / LinkedIn / GitHub) — public info only
- [ ] Downloadable PDF CV
- [ ] Languages: EN only / EN + FR  ← TBD

All CV content lives in one data file (e.g. `src/data/cv.json`) so it can be
updated without touching components.

## Animations / "wow" factor
- [ ] Signature effect (TBD): terminal intro typing `whoami` → reveals CV
      (with "skip" button, plays once per session)
- [ ] Scroll-triggered section reveals
- [ ] Subtle hover effects on cards / links
- [ ] Optional: interactive background (particles / node graph)
- [ ] Optional easter egg: hidden terminal (`~` key) with commands like
      `help`, `skills`, `projects`, `contact`

## Non-functional
- Mobile-first, responsive
- Lighthouse ≥ 90 (performance, accessibility, SEO)
- Respect `prefers-reduced-motion` (disable heavy animations)
- Dark theme by default, optional light toggle
- No tracking beyond optional privacy-friendly analytics
- Page load < 2s on 4G

## Tech stack (proposal)
- Framework: Astro (or Vite + React) — TBD
- Styling: Tailwind CSS
- Animation: Framer Motion or GSAP
- Hosting: GitHub Pages / Netlify / Vercel (free tier)
- Custom domain: optional

## Milestones
1. Content data file
2. Static responsive layout
3. Signature animation
4. Micro-interactions & easter egg
5. Polish (a11y, SEO, perf, PDF)
6. Deploy

## Open questions
- Which signature effect?
- Stack choice?
- Bilingual?
- Extra sections (blog, testimonials, …)?
