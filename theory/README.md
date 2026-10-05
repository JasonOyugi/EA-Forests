# Mathematical theory

This directory contains the LaTeX source for *Measure-Valued Stochastic Control
and Matching in Spatial Forestry Markets* and its technical companion.

## Contents

- `paper/working-paper.tex`: working-paper entry point.
- `paper/references.bib`: bibliography verified against arXiv metadata.
- `chapters/main.tex`: technical-companion entry point.
- `chapters/*/chapter.tex`: maintained chapter sources.
- `chapters/*/examples/*.py`: executable numerical examples.
- `preamble.tex`: shared typesetting configuration.

The East African numerical section is a prior-predictive calibration. Its values
are conditional on the stated priors and structural assumptions.

## Build

Run Tectonic from each entry-point directory:

```powershell
cd theory/paper
tectonic working-paper.tex

cd ../chapters
tectonic main.tex
```

The committed PDFs are `paper/working-paper.pdf` and
`chapters/theory-companion.pdf`.
