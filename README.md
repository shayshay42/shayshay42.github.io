# Shayan’s research notebook

A minimal, responsive personal researcher blog inspired by the Carl Angel-5 pencil sharpener. A simple page brings together a short bio, research links, three full blog posts, project cards, and publications. White paper, restrained typography, an enamel palette, and an original cartoon-style 3D sharpener give the page its character.

## Continue on another machine

The development branch is `draft/research-notebook` in `shayshay42/shayshay42.github.io`. GitHub Pages publishes the `main` branch at https://shayshay42.github.io/. Draft pushes do not deploy.

```sh
git clone --branch draft/research-notebook https://github.com/shayshay42/shayshay42.github.io.git
cd shayshay42.github.io
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://localhost:4173. The Lorenz article is at http://localhost:4173/notes/weighted-weak-lorenz.html. The OIL article is at http://localhost:4173/notes/oil-and-learned-optimization.html. All website assets and the displayed results are included in this repository; the original research workspace is not needed to view or edit the site.

The PANDA exploration is at http://localhost:4173/notes/steering-a-forecasting-model.html. It follows activation steering, a search for an oscillatory bifurcation, and an SMWM-inspired model of activation dynamics. Its three figures distinguish a separate toy system, an actual PANDA noise-to-cycle forecast edit, and measured control results.

Keep the agreed design: white paper, one font at two text sizes, minimal sections, the Carl Angel-5 model, and red/blue/black/green enamel choices. The Lorenz note now uses the provenance-matched extended figure with integral-matching Lorenz, Panda, and Chronos-T5, and records the later weak-loss Panda-to-SINDy experiment. The notebook contains the three full research entries; the sample posts and their dialog have been removed.

For an existing checkout on another machine, update its remote once:

```sh
git remote set-url origin https://github.com/shayshay42/shayshay42.github.io.git
git fetch origin
git switch draft/research-notebook
git pull --ff-only
```

Share work with `git push`. To release a validated draft, fast-forward `main` to the reviewed commit and push `main`; Pages publishes that branch. Avoid force pushes. The website repository was renamed from `mathbio_blog`; the molecular Django repositories remain separate.

## Preview

Serve this directory to use the interactive 3D model:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Visit http://localhost:4173. No build or npm install is required. Typography uses Google Fonts, with local fallbacks when offline. Three.js is pinned and included locally. Opening `index.html` directly, disabling JavaScript, or using a browser without WebGL shows a rendered still of the same model.

## Editing

- `index.html`: biography, research links, note list, project cards, and sharpener viewer.
- `style.css`: layout, typography, responsive rules, enamel palette.
- `portrait-viewer.js`, `portrait.css`: subtle CSS depth and pointer/focus tilt for the homepage portrait, with reduced-motion support.
- `assets/portrait/`: original photo, transparent silhouette cutout, decorative chalk vectors, and masking instructions. The portrait links to LinkedIn and works without JavaScript or WebGL.
- `publications.html`: preprints, manuscripts, patents and their status, archive links, and research code.
- `assets/publications.bib`: full-author BibTeX citations for the six named works.
- `assets/cv/`: downloadable English and French CVs, with editable LaTeX sources in `source/`.
- `math.js`: shared LaTeX rendering for all `.blog-post` articles.
- `project-models.js`: original 3D adaptations of the Read the Room and Rizome marks, plus the molecular glider logo.
- `project-viewer.js`: lazy, on-demand logo rendering and pointer/focus tilt.
- `assets/projects/`: rendered logo previews for loading, no-JavaScript, and no-WebGL views.
- `theme.js`: shared enamel theme and matching sweater colors, with the choice persisted across the site.
- `notes/weighted-weak-lorenz.html`: research entry with verified Lorenz63 methods and core SINDy results.
- `notes/steering-a-forecasting-model.html`: short exploratory PANDA research note, with three figures and an open-ended conclusion.
- `assets/panda-steering/`: compact saved figure data, source provenance, four PNG/PDF panels, and a figure-regeneration script.
- `notes/oil-and-learned-optimization.html`: OIL, optimizer-field distillation, conditional flow matching, learned-region continuation, and completed RL preflights, with proposed extensions labeled separately.
- `assets/oil/`: original generated landscape, article-local styling, table CSV, evidence notes, and source/prompt provenance. The image illustrates the idea; it is not a measured loss surface.
- `assets/vendor/katex-0.18.9/`: pinned local math renderer, fonts, and MIT license. All three blogs use LaTeX `\(...\)` and `\[...\]` delimiters, rendered by the shared `math.js`; no CDN or installation is required.
- `assets/lorenz/results.csv`: exact VPT estimates and 95% intervals extracted from the accepted v2 bootstrap summary.
- `assets/lorenz/survival-extension.csv`: exact integral-matching, Panda, and Chronos summary values used in the extended figure discussion.
- `assets/lorenz/conditioner-results.csv`: exact source-gate and reserved-Lorenz values from the weak/Birkhoff conditioner study.
- `assets/lorenz/provenance.json`: source hash, extraction scope, and references.
- `sharpener-model.js`: editable 3D geometry and enamel materials; clamp, drawer, and crank are separate moving groups.
- `sharpener-viewer.js`: studio lighting, pointer/keyboard controls, on-demand rendering, and WebGL fallback.
- `assets/angel-5.glb`: portable red model, including the drawer label and separate crank parts.
- `assets/angel-5-{red,blue,black,green}.png`: rendered fallback images of the model.
- `tools/export-sharpener.html`: open through the local server to export a fresh GLB after editing the geometry.
- `assets/vendor/THREE-README.md`: renderer version, source, build command, and license.
- `assets/angel-5.svg`: earlier editable vector illustration, retained for reference.

The Lorenz, PANDA, and OIL entries are research drafts grounded in saved experimental results and local evidence. The enamel controls switch between red, blue, black, and green and save the choice in the browser. Each research entry has a standalone HTML page. Article text works without JavaScript; equations remain readable LaTeX source until the local renderer runs. Shared math styles keep display equations horizontally scrollable on narrow screens and KaTeX provides accessible MathML.

The article uses the extended three-panel survival plot copied unchanged from `artifacts/v2/tsfm_integral_survival/forecast_survival__all_tracks__noisy_levels.png`; a matching PDF is included. Its PNG and PDF SHA256 hashes were verified against the source result manifest. The title-free plot uses one boxed legend, partitioned into four information-track columns and containing all 16 methods. The post explicitly separates state-only dynamics learning, known-form parameter estimation, exact-physics surrogates, externally pretrained forecasting, and the later amortized Panda-to-SINDy experiment.

Paths in `provenance.json` identify files in the original research workspace; they are provenance references, not website dependencies.

## Publications and profile

`publications.html` lists four verified bioRxiv preprints, two additional named manuscripts, and two conference submissions with their titles withheld. Full citations for the six named works are in `assets/publications.bib`. The original three preprints were checked on September 30, 2026 against the bioRxiv API and publisher-deposited Crossref records:

- Immune phenotype: https://api.crossref.org/works/10.64898/2026.09.17.752366
- DiffDose: https://api.crossref.org/works/10.64898/2026.09.07.749974
- Latent space differentiation: https://api.crossref.org/works/10.64898/2026.03.04.709512

The RORγ preprint was added on October 7, 2026. Its version 1 posting date and full author order were checked against https://api.biorxiv.org/details/biorxiv/10.64898/2026.10.01.755741 and https://api.crossref.org/works/10.64898/2026.10.01.755741.

The RORγ and systemic immune phenotype papers are grouped under “Auxiliary publications,” after the six main entries and before Patents. Both retain their citations, authors, dates, and links, and remain in the BibTeX download.

The AISTATS 2027 and ICLR 2027 entries retain their author lists and venues, with review status supplied by the author on October 7, 2026. Keep their paper titles, submission links, and identifiers out of public files during anonymous review. They are placeholders on the page and are excluded from the BibTeX download until a public citation is available.

The Patents section uses the PCT request excerpt supplied by the author on October 7, 2026: the hematopoietic stress invention, inventors Shayan Hajhashemi, Jonathan Cools-Lartigue, Benjamin Gordon, and Kim Ma, and applicant Rizome Biotech Inc. “Filed on WIPO” is the author-supplied status. P8341PC00 is labeled as the applicant/agent file reference, not a patent publication or application number. The preview timestamp is not a filing date. Decode Legal Inc. is listed as the patent agent, with its website and the business address, docket email, and telephone supplied in the request. Inventor and applicant addresses remain omitted. Add a public record link and citation once a publication number is available.

Posting dates follow bioRxiv, which differ by one day from the Mila listing for DiffDose and latent space differentiation. Author names follow deposited paper metadata; the latent-space paper lists Ali Saberi. These are labeled as preprints. Update the page and BibTeX together when adding papers or newer versions.

The author supplied the manuscript review statuses on September 30, 2026: DiffDose is under review at *npj Systems Biology and Applications*, and the QSP explainability manuscript is under review at *npj Precision Oncology*. The latter's title and eleven-author order come from the supplied title-page screenshot; no public archive or DOI is asserted. The nanobody manuscript is retained as withdrawn for intellectual property reasons, with author-confirmed order Philip Roche, Shayan Hajhashemi, Uri David Akavia. Its 2020 date comes from the French CV.

English and French CV PDFs are linked as CV (EN/FR) in every page’s navigation and beneath the publications heading. Both retain the September 30, 2026 list of five works and statuses; the October 7 additions are on the publications page and have not been added to the CVs. Paper titles remain in their original English, with status labels translated in the French CV. Their sources were adapted from `EN.tex` and `FR.tex` in the supplied `Shayan_Academic_CV.zip`; unrelated variants were not copied into the website. The original archive is preserved. Keep both CV publication sections, PDFs, website entries, and BibTeX in sync when a paper changes status.

The homepage and both CVs also list the invited Real-MVP talk at the 2026 SIAM Conference on the Life Sciences (LS26), July 6, 2026, in Cleveland, Ohio. Its title and MS11 minisymposium details follow the [official talk entry](https://meetings.siam.org/sess/dsp_talk.cfm?p=157552) and [session schedule](https://meetings.siam.org/sess/dsp_programsess.cfm?sessioncode=88781). Invited status was confirmed by the author.

The shared navigation links to Notes, Projects, Publications ([scholar](https://scholar.google.com/citations?hl=en&user=uW3aYOcAAAAJ)), [Mila](https://mila.quebec/en/directory/shayan-hajhashemi), both GitHub profiles ([shayshay42](https://github.com/shayshay42) and [carlangle](https://github.com/carlangle)), and [LinkedIn](https://ca.linkedin.com/in/hshay). The homepage names supervisors [Morgan Craig](https://morgancraiglab.com/about) and [Amin Emad](https://www.ece.mcgill.ca/~aemad2/). The PANDA note is titled “Looking for a bifurcation inside an LLM”; its existing article URL is retained.

## Project cards

The homepage Projects section links directly to [Read the Room](https://readtheroom.site/), [Rizome Biotech](https://www.rizomebiotech.ai/), and the local [Molecular Game of Life](projects/molecular-game-of-life/). Read the Room also links to [Soud Al Kharusi's development story](https://soudkharusi.com/projects/readtheroom-app/). External card descriptions follow those project websites.

The logos use real beveled geometry with raised details: Read the Room's chameleon, Rizome's branching medallion, and a molecule transitioning into five enamel glider tiles. The external visual references are the sites' [chameleon mark](https://readtheroom.site/images/RTR-logo_Aug2025.png) and [Rizome mark](https://www.rizomebiotech.ai/favicon.png). The geometry is a stylized adaptation; the project names and marks identify their respective projects.

Cards are ordinary links with decorative 3D views. The scenes initialize near the viewport, tilt with the pointer or keyboard focus, and remain still when idle or when reduced motion is requested. Touch gestures retain normal link and page scrolling behavior. Local PNGs preserve the appearance when JavaScript or WebGL is unavailable. Brand colors stay fixed when the notebook enamel changes. Re-render the previews if the geometry or lighting changes.

## Sharpener controls

Click either black top holder or the chrome face to slide the pencil clamp forward on its rails. Click the clear shavings bin to pull it out, or the rear crank to turn it. Click the holder or bin again to close it. The **Holder**, **Bin**, and **Turn handle** buttons offer the same actions.

Drag the model to rotate it, or focus it and use the arrow keys. Home resets the view; H toggles the holder, B toggles the bin, and Enter or Space turns the crank. A drag never activates the part it started on, and vertical touch movement still scrolls the page. Reduced-motion mode opens parts instantly and advances the crank one step. The scene renders on demand and stays still when idle.

Red, blue, black, and green enamel choices persist across the site. The picker colors the sharpener’s painted parts, the notebook accent, and the portrait’s fleece. Blue restores the original photograph; the other sweater colors preserve its fabric texture, face, and details. Each sharpener color has a matching static preview when WebGL is unavailable. The PNG previews and exported GLB are regenerated from the same model. Direct-part interaction and fallback checks run with the browser-test setup below, using `tests/sharpener-browser.test.mjs`.

The model uses one rounded shell with front and rear drawer openings, an aligned bowed chrome face, short feed tabs, four low rubber pads, and a flat rear crank with a ribbed grip. The clear bin can be seen through from either end; the upper housing remains opaque enamel. The clamp moves forward 0.5 model units; the bin moves 0.7 units, carrying its label and shavings. The motion follows the [CARL loading instructions](https://www.carlmfg.com/faq/pencil-sharpener). The fallback PNGs use the same geometry, view, and lighting; regenerate them when the model changes. The GLB is an export for editing in other 3D tools; the homepage generates geometry directly from `sharpener-model.js`.

## PANDA figure regeneration

The PANDA panels are redrawn from a small, frozen data extract shipped with the site. They do not require PANDA, a GPU, the original activation arrays, or retraining. With NumPy and Matplotlib installed:

```sh
python3 assets/panda-steering/generate_figures.py
```

See `assets/panda-steering/README.md` for exact figure selections and provenance. The two control panels stack vertically on mobile; every panel links to its full-resolution PNG and a PDF download. The toy phase portrait is explicitly labeled as a separate mathematical example. The cyclic PANDA forecast comes from the H8 linear output-head intervention; the feedback experiment did not establish a Hopf or Neimark–Sacker bifurcation.

## Content and visual references

The research bio and interests come from https://github.com/shayshay42 . Project descriptions use the linked public repository descriptions:

- https://github.com/shayshay42/glioma_ddri
- https://github.com/shayshay42/neural_ode_benchmark
- https://github.com/shayshay42/spatial_transcriptomics_playground

Angel-5 appearance reference: https://www.carlmfg.com/angel-5-pencil-sharpener/ . The 3D geometry and earlier SVG are original stylized models, not dimensioned replicas; this personal site is not affiliated with CARL.

## GitHub Pages

This is a static site with relative asset paths and a `.nojekyll` file. Pages uses **Deploy from a branch → main → /(root)** in `shayshay42/shayshay42.github.io`. No application server or build step is required. The live site is https://shayshay42.github.io/ and the playground is https://shayshay42.github.io/projects/molecular-game-of-life/.

## Molecular Game of Life

The playground is a browser implementation of the original molecular Conway app. It parses SMILES, adds explicit hydrogens, and uses binary bond adjacency as the starting pattern in a 100×100 grid. The original centering convention is retained, and every generation applies synchronous B3/S23 rules with wrapping edges. Molecules above 100 atoms including hydrogens are rejected. Atom order is retained; no canonicalization or atom sorting is applied. RDKit versions and live PubChem records can differ from historical runs, so the fixed examples record their exact SMILES for reproducibility.

Name searches go directly to PubChem PUG REST when submitted. Results are cached in memory for the current tab, stale requests are cancelled, and a failed search preserves the current simulation. Explicit SMILES and the five examples need no PubChem connection. RDKit.js `2026.3.6` is pinned locally; its roughly 7.4 MB runtime loads only on the playground. Once those website assets are loaded, parsing and simulation run locally. See `assets/vendor/rdkit-2026.3.6/README.md` for source, license, and checksums. No Python, RDKit installation, API key, or database is needed to serve the site.

The page starts with pemoline paused. Play/Pause, Step, Reset, and the speed slider control the canvas; hiding the tab pauses playback. Reset restores the selected molecule's original adjacency grid. With JavaScript disabled, the explanation remains readable. If chemistry loading fails, the page offers a retry.

Core validation uses Node 22+ and the vendored chemistry runtime:

```sh
node --test tests/molecular-life.test.mjs
```

The browser acceptance suite uses Playwright and a running local server. Install Playwright in a separate tools directory, then point `PLAYWRIGHT_MODULE` to its `index.mjs`; set `BROWSER_CHANNEL=chrome` to use an installed Chrome, or install Playwright Chromium. `BASE_URL` can target a local preview or the published site:

```sh
PLAYWRIGHT_MODULE=/path/to/tools/node_modules/playwright/index.mjs BROWSER_CHANNEL=chrome node --test tests/molecular-browser.test.mjs
```

Use the same setup with `tests/portrait-browser.test.mjs` to check portrait tilt, keyboard navigation, reduced motion, responsive layout, and JavaScript/WebGL fallbacks.
