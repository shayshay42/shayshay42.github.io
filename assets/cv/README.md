# Research CVs

`source/EN.tex` and `source/FR.tex` are the English and French research CVs.
The French version was synchronized with the author's latest hand-edited English
source on November 5, 2026. Both emphasize scientific machine learning,
representation learning, world models, system identification, and control, and
state interest in research internships and full-time research roles.

Both CVs include ten works and three presentations, plus WeLD as a research
project immediately below the cross-modal world-model work. Scientific paper and
talk titles stay in English in the French bibliography. Preserve the author
order, dates, DOI links, co-first authorship, and status distinctions in both
versions: QSP is accepted at npj Precision Oncology; OIL is withdrawn from ICLR
2027 (author-confirmed November 7, 2026) and links to OpenReview; the MAIN entry is a poster;
Aspen is an accepted upcoming oral presentation; WeLD remains a research draft.
The October 28 neutrophil-trap paper is a bioRxiv preprint in auxiliary publications.

The website also lists WeLD as a manuscript, so its bibliography has eleven
works and three presentations. The private draft PDF and manuscript sources
remain outside the website repository. Keep CV sources, PDFs, publication page,
and BibTeX consistent when updating shared metadata.

The personal phone number and secondary GitHub profile are omitted from both
CVs. The personal email uses `[at]` and `[dot]` as plain text without a `mailto:`
annotation. Preserve these settings. Versioned download links request rebuilt
PDFs after a release. The original `Shayan_Academic_CV.zip` remains unchanged;
the earlier template's MIT license remains at `source/LICENSE`.

## Build

Use TeX Live with `latexmk` and pdfLaTeX. Required packages include `ebgaramond`,
`microtype`, `enumitem`, `titlesec`, `fancyhdr`, `geometry`, and `hyperref`.
No external images or manuscript files are required.

Run from the website repository root:

```sh
mkdir -p /tmp/shayan-cv-build/en /tmp/shayan-cv-build/fr
latexmk -pdf -interaction=nonstopmode -halt-on-error -no-shell-escape -outdir=/tmp/shayan-cv-build/en assets/cv/source/EN.tex
latexmk -pdf -interaction=nonstopmode -halt-on-error -no-shell-escape -outdir=/tmp/shayan-cv-build/fr assets/cv/source/FR.tex
cp /tmp/shayan-cv-build/en/EN.pdf assets/cv/shayan-hajhashemi-cv-en.pdf
cp /tmp/shayan-cv-build/fr/FR.pdf assets/cv/shayan-hajhashemi-cv-fr.pdf
```

Keep build logs and intermediate files outside the repository. Review each page
for overflow and split entries. Check extracted text, contact privacy, PDF links,
metadata, author order, dates, statuses, and all presentations before publishing.
