# Academic CVs

`source/EN.tex` and `source/FR.tex` are the English and French CV sources from
the supplied `Shayan_Academic_CV.zip`. The original archive remains unchanged.
These sources keep the existing biography, education, employment, and other
sections; publications and the invited SIAM talk were updated on September 30,
2026. Paper titles remain in English in both versions.

The PDFs use the original EB Garamond layout. English has four pages; French has
three. Source changes also correct the PDF author, prevent split
project entries in English, and fix one overflowing French paragraph.
The original Xovee CV template credits are retained in both sources; its
[MIT license](source/LICENSE) is included beside them.

The public CVs were rebuilt on October 14, 2026 with the personal phone number
removed from both sources and PDFs. The email is plain text with `[at]` replacing
`@` and `[dot]` replacing every dot, without a `mailto:` annotation. This deters
simple address harvesting but does not prevent all automated collection.
The site’s download links use a version query to request the rebuilt files.
Keep these public contact settings
when rebuilding; do not restore them from an older CV archive.

## Build

Use TeX Live with `latexmk` and pdfLaTeX. Required packages include `cjk`,
`ebgaramond`, `enumitem`, and `eqparbox`. pdfLaTeX preserves the sources' T1 font
configuration. No external images or other files from the archive are required.

Run from the website repository root:

```sh
mkdir -p /tmp/shayan-cv-build/en /tmp/shayan-cv-build/fr
latexmk -pdf -interaction=nonstopmode -halt-on-error -no-shell-escape -outdir=/tmp/shayan-cv-build/en assets/cv/source/EN.tex
latexmk -pdf -interaction=nonstopmode -halt-on-error -no-shell-escape -outdir=/tmp/shayan-cv-build/fr assets/cv/source/FR.tex
cp /tmp/shayan-cv-build/en/EN.pdf assets/cv/shayan-hajhashemi-cv-en.pdf
cp /tmp/shayan-cv-build/fr/FR.pdf assets/cv/shayan-hajhashemi-cv-fr.pdf
```

Build logs and intermediate files stay outside the repository. Check page
breaks, publication metadata, DOI links, and the SIAM talk link before replacing
the published PDFs. Keep publications consistent with `publications.html` and
`assets/publications.bib` at the repository root.
