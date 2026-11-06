# Research CVs

`source/EN.tex` is the English research CV approved by Shayan Hajhashemi on
October 14, 2026. It emphasizes world models, representation learning, system
identification, and control. The author seeks research internships and full-time
research roles. Its three-page layout includes ten works and three presentations.
Submission dates, review statuses, OIL co-first authorship, and the upcoming
Aspen oral acceptance were supplied by the author. The November 5 update records
the author-confirmed QSP acceptance at npj Precision Oncology and adds the MAIN
2026 poster, with author order and October 30 date verified against the official
conference abstracts and program. The subsequent hand-edited source adds WeLD
as a research project directly below the cross-modal world-model work and the
October 28 neutrophil-trap preprint to auxiliary publications. The attached WeLD
manuscript remains outside the public website repository.

**The French CV is unchanged at the author's explicit request.** `source/FR.tex`
and `shayan-hajhashemi-cv-fr.pdf` retain their previous three-page layout,
bibliography, and SIAM presentation. This release updates only the English CV;
do not rebuild or replace the French PDF as part of it. Scientific titles remain
in English in the French version.

Keep the English source, PDF, `publications.html`, homepage talks, and
`assets/publications.bib` consistent. A later French update requires the author's
instruction.

The original `Shayan_Academic_CV.zip` remains unchanged. Earlier CV versions
used the Xovee CV template; its MIT license remains at `source/LICENSE`.
The English layout follows the approved research draft; the French source retains the earlier template. Private manuscript
evidence and review notes are not website assets and must not be copied here.

The public sources and PDFs omit the personal phone number. The email uses
`[at]` and `[dot]` as plain text, with no `mailto:` annotation. Preserve these
settings when rebuilding. This discourages simple harvesting but is not a
promise that no bot can recover the address. Versioned download links request
updated PDFs after a release.

## Build

Use TeX Live with `latexmk` and pdfLaTeX. Required packages include `ebgaramond`,
`microtype`, `enumitem`, `titlesec`, `fancyhdr`, `geometry`, and `hyperref` for
English; the preserved French source also uses `cjk` and `eqparbox`.
No external images or archive files are required.

Run from the website repository root:

```sh
mkdir -p /tmp/shayan-cv-build/en
latexmk -pdf -interaction=nonstopmode -halt-on-error -no-shell-escape -outdir=/tmp/shayan-cv-build/en assets/cv/source/EN.tex
cp /tmp/shayan-cv-build/en/EN.pdf assets/cv/shayan-hajhashemi-cv-en.pdf
```

Keep build logs and intermediate files outside the repository. Review every
PDF page for overflow and split entries. Check extracted text, contact privacy,
PDF annotations, metadata, author order, review status, DOI links, and all presentation
entries before replacing the public PDFs.
