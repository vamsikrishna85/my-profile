# Vamsikrishna Gollapudi — Portfolio

Personal portfolio for Azure DevOps & Site Reliability Engineering. Static site, no build step, served by GitHub Pages at `/my-profile/`.

| File | Purpose |
|---|---|
| `index.html` | Content and structure |
| `styles.css` | Design tokens (dark/light, per-technology accents), layout, components |
| `main.js` | Navigation, theme, counters, case-study cards/modals, Architecture showcase, SRE incident simulation |
| `labs.js` | Presentation mode (8 slides per project) and failure playbooks |
| `voice-assistant.js/.css` | Optional narrated tour |
| `pdf-viewer.js/.css` | Lazy-loaded PDF.js resume viewer |
| `Vamsikrishna_Gollapudi_Resume.pdf` | Resume (view in page or download) |

## Editing content
- **Projects / presentation slides:** `CASES` and `CASE_EXTRA` in `main.js`. A missing field shows a labelled placeholder in presentation mode.
- **Architecture diagrams:** `DIAGRAMS` (layout on a grid) and `NOTES` (security / issue / troubleshooting per component) in `main.js`. `applied: false` marks educational-only references.
- **Playbooks:** `PLAYBOOKS` in `labs.js`.

## Deploy
Push to `main`. GitHub Pages (Settings → Pages → Deploy from branch `main` / root) publishes within a minute or two. All paths are relative, so the `/my-profile/` sub-path works without configuration.

The SRE lab and playbooks use simulated sample data generated in the browser. They do not connect to any real service.
