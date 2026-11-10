"""Regenerate the blog's four panels from figure-data.json, using no models.

Run with Python 3, NumPy, and Matplotlib. Paths resolve beside this script,
so the command works from any directory. Original experiment files are not
needed and are never opened by this script.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FixedLocator, FuncFormatter, NullLocator
import numpy as np


HERE = Path(__file__).resolve().parent
INK = "#253348"
BLUE = "#3268BD"
ORANGE = "#C97836"
MUTED = "#8490A2"
PALETTE = {"smwm": BLUE, "pca": ORANGE, "direct": INK}
DIMENSIONS = {"toy-phase": (5.5, 4.8), "panda-cycle": (6.4, 4.4),
              "activation-control": (5.5, 4.4), "waveform-control": (5.5, 4.4)}
DPI = 200


def load_data(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if data.get("schema_version") != 1:
        raise ValueError("Unsupported figure-data schema")
    trajectories = data["toy"]["trajectories"]
    if [row["mu"] for row in trajectories] != [-0.05, 0.05]:
        raise ValueError("The toy panel requires the two recorded parameter settings")
    for row in trajectories:
        values = np.asarray(row["xy"], dtype=np.float64)
        if values.shape != (600, 2) or not np.isfinite(values).all():
            raise ValueError("Expected all 600 recorded two-dimensional toy states")
    for name in ("input_tail", "unedited_forecast", "edited_forecast"):
        values = np.asarray(data["panda_cycle"][name], dtype=np.float32)
        if values.shape != (128,) or not np.isfinite(values).all():
            raise ValueError(f"Expected exactly 128 finite values for {name}")
    rows = data["control"]["series"]
    expected = {(objective, method, seed) for objective in ("activation", "waveform")
                for method in ("smwm", "pca", "direct") for seed in (0, 1, 2)}
    observed = {(row["objective"], row["method"], row["seed"]) for row in rows}
    if observed != expected or len(rows) != len(expected):
        raise ValueError("Expected both objectives and all three methods/seeds")
    for row in rows:
        values = np.asarray(row["values"], dtype=np.float32)
        if values.shape != (128,) or not np.isfinite(values).all() or np.any(values <= 0):
            raise ValueError("Control panels require all 128 positive, finite error ratios")
        # Preserve the source arrays' float32 reduction, including the even-N median.
        if float(np.median(values)) != row["median"]:
            raise ValueError("Saved median does not match the copied case-level ratios")
    return data


def style_axis(ax):
    ax.spines[["top", "right"]].set_visible(False)
    ax.spines[["left", "bottom"]].set_color("#CAD0D9")
    ax.tick_params(colors=INK, length=3, pad=6)
    ax.set_axisbelow(True)


def save(fig, directory, stem):
    paths = [directory / f"{stem}.png", directory / f"{stem}.pdf"]
    fig.savefig(paths[0], dpi=DPI, facecolor="white")
    # Stable PDF metadata makes repeated generation byte-identical in one environment.
    fig.savefig(paths[1], facecolor="white", metadata={"Creator": "generate_figures.py",
                "CreationDate": None, "ModDate": None})
    plt.close(fig)
    return paths


def toy_panel(data, directory):
    fig, ax = plt.subplots(figsize=DIMENSIONS["toy-phase"])
    fig.subplots_adjust(left=.15, right=.96, bottom=.19, top=.79)
    for record, color, label in zip(data["toy"]["trajectories"], (BLUE, ORANGE),
                                   ("μ = −0.05: decays", "μ = +0.05: persists")):
        xy = np.asarray(record["xy"], dtype=np.float64)
        ax.plot(xy[:, 0], xy[:, 1], color=color, lw=1.8, label=label)
        ax.scatter(xy[-1, 0], xy[-1, 1], s=20, color=color, zorder=3)
    ax.set_aspect("equal", adjustable="box")
    ax.set_xlim(-.25, .25)
    ax.set_ylim(-.25, .25)
    ax.set_xticks([-.2, 0, .2])
    ax.set_yticks([-.2, 0, .2])
    ax.set_xlabel("State coordinate $z_1$", labelpad=7)
    ax.set_ylabel("State coordinate $z_2$", labelpad=7)
    style_axis(ax)
    ax.grid(alpha=.12, color=MUTED)
    fig.suptitle("Toy system", y=.98, fontsize=19, color=INK, fontweight="bold")
    handles, labels = ax.get_legend_handles_labels()
    fig.legend(handles, labels, loc="upper center", bbox_to_anchor=(.52, .915),
               ncol=2, frameon=False, fontsize=13, columnspacing=1.1, handlelength=1.3)
    return save(fig, directory, "toy-phase")


def cycle_panel(data, directory):
    values = data["panda_cycle"]
    fig, ax = plt.subplots(figsize=DIMENSIONS["panda-cycle"])
    fig.subplots_adjust(left=.15, right=.94, bottom=.19, top=.76)
    ax.plot(np.arange(-128, 0), values["input_tail"], color=INK, lw=1,
            label="_nolegend_")
    ax.plot(np.arange(128), values["unedited_forecast"], color=MUTED, lw=1.7,
            label="Unedited")
    ax.plot(np.arange(128), values["edited_forecast"], color=BLUE, lw=2,
            label="Edited")
    ax.axvline(0, color=INK, lw=1, ls=(0, (2, 3)), alpha=.6)
    ax.text(.035, .98, "Input", transform=ax.transAxes, ha="left", va="top", fontsize=14, color=INK,
            bbox=dict(facecolor="white", edgecolor="none", pad=2))
    ax.text(.52, .98, "Forecast", transform=ax.transAxes, ha="left", va="top", fontsize=14, color=MUTED)
    ax.set_xlim(-128, 127)
    ax.set_xticks([-128, 0, 127])
    ax.set_xlabel("Sample relative to forecast", labelpad=9, fontsize=16)
    ax.set_ylabel("Signal value", labelpad=8, fontsize=16)
    style_axis(ax)
    ax.grid(axis="y", color=MUTED, alpha=.12)
    ax.tick_params(labelsize=14)
    fig.suptitle("PANDA · linear output-head edit", y=.98, fontsize=18, color=INK, fontweight="bold")
    handles, labels = ax.get_legend_handles_labels()
    fig.legend(handles, labels, loc="upper center", bbox_to_anchor=(.60, .90), ncol=2,
               frameon=False, fontsize=16, columnspacing=1.5, handlelength=1.8)
    return save(fig, directory, "panda-cycle")


def control_panel(data, directory, objective):
    stem = f"{objective}-control"
    fig, ax = plt.subplots(figsize=DIMENSIONS[stem])
    fig.subplots_adjust(left=.23, right=.96, bottom=.22, top=.82)
    rows = [row for row in data["control"]["series"] if row["objective"] == objective]
    for index, method in enumerate(("smwm", "pca", "direct")):
        selected = sorted((row for row in rows if row["method"] == method), key=lambda row: row["seed"])
        y = [float(np.median(np.asarray(row["values"], dtype=np.float32))) for row in selected]
        ax.scatter(index + np.array([-.09, 0, .09]), y, color=PALETTE[method], s=46, zorder=3)
    ax.axhline(1, color=MUTED, ls=(0, (3, 3)), lw=1.1)
    ax.text(2.34, 1.11, "No edit", color=MUTED, ha="right", va="bottom", fontsize=11)
    ax.set_yscale("log")
    ax.set_xlim(-.45, 2.45)
    # Both objectives share the physical no-edit normalization and axis range.
    ax.set_ylim(1e-4, 2)
    ax.yaxis.set_major_locator(FixedLocator([1e-4, 1e-3, 1e-2, 1e-1, 1]))
    ax.yaxis.set_major_formatter(FuncFormatter(lambda value, _: f"{value:g}"))
    ax.yaxis.set_minor_locator(NullLocator())
    ax.set_xticks([0, 1, 2], ["SMWM", "PCA", "Direct\nPANDA"])
    ax.set_ylabel("Median error / no edit", labelpad=10)
    style_axis(ax)
    ax.grid(axis="y", color=MUTED, alpha=.12)
    title = "Reachable activation target" if objective == "activation" else "Requested waveform target"
    fig.suptitle(title, y=.97, fontsize=18, color=INK, fontweight="bold")
    return save(fig, directory, stem)


def generate(data_path=HERE / "figure-data.json", output_dir=HERE):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    data = load_data(data_path)
    matplotlib.rcParams.update({"font.family": "DejaVu Sans", "font.size": 13,
        "axes.labelsize": 14, "xtick.labelsize": 13, "ytick.labelsize": 12,
        "axes.labelcolor": INK, "text.color": INK, "pdf.fonttype": 42,
        "path.simplify": False})
    paths = toy_panel(data, output_dir) + cycle_panel(data, output_dir)
    paths += control_panel(data, output_dir, "activation")
    paths += control_panel(data, output_dir, "waveform")
    return paths


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=HERE / "figure-data.json")
    parser.add_argument("--output-dir", type=Path, default=HERE)
    args = parser.parse_args()
    for path in generate(args.data, args.output_dir):
        print(f"{path.name}  {hashlib.sha256(path.read_bytes()).hexdigest()}")
