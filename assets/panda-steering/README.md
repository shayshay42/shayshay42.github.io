# PANDA research-note figures

These four panels are redraws of saved experiment data. They do not run PANDA,
fit a model, or create new experimental outcomes.

| Panel | PNG dimensions | Selection |
| --- | --- | --- |
| `toy-phase` | 1100 × 960 | Both saved 600-step toy trajectories at μ = −0.05 and +0.05 |
| `panda-cycle` | 1280 × 880 | Fixed white-noise case 0, channel 0, shared H8 vector at strength 2 |
| `activation-control` | 1100 × 880 | Actual activation-goal error ratios, all 128 contexts, each of three seeds |
| `waveform-control` | 1100 × 880 | Actual requested-waveform error ratios, the same 128 contexts and seeds |

Each panel also has a vector PDF. The article pairs the two control panels as
one figure; their axes use the same no-edit normalization and logarithmic range.

The November 10, 2026 revision shortens the toy title and removes narrative
annotations from the control panels. The saved data and plotted values are unchanged.

## Regenerate

Python 3, NumPy, and Matplotlib are the only requirements:

```sh
python -m pip install numpy matplotlib
python assets/panda-steering/generate_figures.py
```

The script resolves its data file relative to itself. It can run from any
working directory and accepts `--data` and `--output-dir`. No original workspace,
Torch installation, checkpoint, GPU, or network access is required to regenerate
the figures. The exact package versions used here are in `provenance.json`.

`figure-data.json` contains the copied toy coordinates, three selected signal
traces, and all 128 case-level ratios for each plotted controller seed. The
script validates and recomputes each median in the source array's float32
precision. `control_medians.csv` lists the 18 plotted values.

## Interpretation

- The toy system is separate from PANDA. Its phase portrait uses the actual
  two-dimensional state; no projection is fitted. The common initial state
  is `[0.03, 0]`, and the saved archive starts after the first update. Its
  rational rotation makes trajectories on the invariant circle 32-periodic.
- The PANDA cycle is an imposed pattern through the final linear output head.
  It is not a forecast-accuracy result or evidence of an autonomous oscillator.
  The plot displays the final 128 samples of a 512-sample input and all 128
  forecast samples. Strength 2 is a descriptive sweep example.
- Activation error compares the actual full H6 endpoint with a recorded
  reachable target. Waveform error compares the actual output with a prescribed
  counterfactual waveform. Each ratio uses the same context's unedited error as
  its denominator; lower is better and 1 means no edit.
- Each dot is a median across 128 contexts for one seed. Three seeds reuse
  those contexts and are not 384 independent test inputs. The markers are not
  confidence intervals, and the figures do not use amplitude-gated success rates.

`provenance.json` records the exact original source files and SHA-256 hashes,
indices, metric definitions, generated artifact hashes, and verification results.
