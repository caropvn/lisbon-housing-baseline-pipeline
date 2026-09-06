# Lisbon Housing Baseline Pipeline

This repository contains the reproducible district-quarter baseline analysis for the Nova SBE Field Lab master's thesis on Lisbon's housing market. It includes the foreign-investment context variables, model outputs, and a runnable notebook.

## Quick start

The project uses Python. From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Open the notebook in VS Code or Jupyter:

```bash
jupyter notebook notebooks/lisbon_baseline_walkthrough_json.ipynb
```

Run the notebook cells from top to bottom. The notebook visibly loads the clean district-quarter dataset, prepares the panel, estimates the fixed-effects specifications, validates the results, and saves tables and figures into `outputs/`.

You can also run the script version:

```bash
python scripts/run_baseline.py
```

## Main files

- `notebooks/lisbon_baseline_walkthrough_json.ipynb`: editable, cell-by-cell analysis.
- `scripts/run_baseline.py`: command-line runner.
- `scripts/baseline_model.py`: reusable model implementation.
- `data/clean/district_quarter_full_dataset.csv`: clean district-quarter input dataset.
- `outputs/`: generated model tables, coefficient tables, and figures.

## Notes

The full two-way fixed-effects specification with national controls is expected to report an absorption/collinearity error. Those variables do not vary across districts within a quarter, so quarter fixed effects absorb them. This is reported as a limitation of the baseline design, not silently ignored.

The `.venv/` environment and macOS metadata are excluded from version control. A friend should create their own environment using `requirements.txt`.
