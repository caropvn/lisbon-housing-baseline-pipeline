"""
Lisbon Housing Thesis - Group Baseline Model (district x quarter)
====================================================================
Nova SBE Business Analytics Field Lab, Fall 2025/2026
"Immigration, Foreign Investment, and Infrastructure Shocks in Lisbon's
Housing Market: A Causal Machine Learning and Policy Evaluation Approach"

Purpose
-------
Reproducible pipeline for the group-shared baseline model specified in
thesis_project_context.md ("## Baseline model (group-shared benchmark)"):
    Unit        : district x quarter panel
                  (DOWNGRADED from freguesia -> district: the only price
                  series available in this data drop, idealista/data, is
                  reported at district/NUTS-III-ish granularity, not
                  freguesia. INE "Precos da Habitacao ao Nivel Local" would
                  restore freguesia granularity and should replace this
                  panel once obtained -- see Section 6 "Limitations".)
    DV          : log(price per sqm), quarterly price growth (robustness)
    Model       : two-way fixed-effects OLS (district FE + quarter FE),
                  clustered SE by district, plus a stepwise Pooled -> FE
                  -> FE+covariates progression for interpretability
    Output      : R^2, RMSE, coefficient tables -> benchmark for thesis S6.1

Data sources
------------
1. archive/idealista_prices_consolidated.csv   - district x month asking
   price per sqm (sale), idealista/data, 2015-01 to 2025-03.
2. archive/ine_transaction_data.csv            - national quarterly
   transaction counts/values and INE value/volume indices, 2009-2025.
3. Banco de Portugal BPstat (fetched live, series IDs below), national:
   - series 12710780: interest rate, new fixed-rate mortgage loans (monthly)
   - series 12565842: inward FDI, real estate, quarterly transactions (EUR m)
   - series 12573788: inward FDI, all countries, annual stock (EUR m)

Known limitation (flagged explicitly, do not treat as an oversight):
   All three BdP/INE macro series are NATIONAL only -> zero cross-sectional
   (district) variation -> perfectly collinear with quarter fixed effects.
   Spec 4 below demonstrates this by attempting to estimate them inside a
   full two-way FE model; linearmodels raises an absorption error, which we
   report rather than suppress. This is itself a finding: identifying the
   effect of nationally-uniform shocks (FDI, mortgage conditions) within a
   TWFE panel is mechanically impossible without geographic variation in
   exposure -- motivating the DML / Bartik-style local-exposure design used
   in the foreign-investment subtopic (S5/S6.3).
"""

import warnings

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from linearmodels.panel import PanelOLS, PooledOLS

pd.set_option("display.width", 120)

# ----------------------------------------------------------------------
# 1. Load & build district x quarter panel
# ----------------------------------------------------------------------

def build_panel(data_dir="data"):
    panel = pd.read_csv(f"{data_dir}/clean/district_quarter_full_dataset.csv", parse_dates=["date"])
    panel = panel.rename(columns={
        "log_price_sale": "log_price",
        "ine_transaction_count_national": "transaction_count",
        "ine_transaction_value_thousands_national": "transaction_value_thousands",
        "ine_price_value_index_national": "value_index",
        "ine_volume_index_national": "volume_index",
        "mortgage_rate_fixed_pct_national": "mortgage_rate_fixed",
        "fdi_realestate_transactions_meur_national": "fdi_real_estate_transactions_meur",
    })
    panel["quarter"] = panel["date"].dt.to_period("Q")
    panel = panel.sort_values(["district", "quarter"])
    panel["price_growth_qoq"] = panel.groupby("district")["log_price"].diff()
    panel["price_growth_yoy"] = panel.groupby("district")["log_price"].diff(4)
    panel["log_price_lag1"] = panel.groupby("district")["log_price"].shift(1)

    panel["quarter_p"] = panel["quarter"]
    panel["qdate"] = panel["quarter_p"].dt.to_timestamp()
    panel["t"] = panel["quarter_p"].astype(int)
    panel["t"] = panel["t"] - panel["t"].min()

    panel = panel.set_index(["district", "qdate"])
    panel.index = panel.index.set_names(["district", "quarter"])
    return panel


def r2_rmse(res, y):
    resid = res.resids.values
    sse = np.sum(resid ** 2)
    sst = np.sum((y.values - y.values.mean()) ** 2)
    r2_total = 1 - sse / sst
    rmse = np.sqrt(np.mean(resid ** 2))
    return r2_total, rmse


# ----------------------------------------------------------------------
# 2. Specifications
# ----------------------------------------------------------------------

def run_all_specs(panel):
    results = {}

    # Spec 0: naive pooled OLS, no fixed effects at all (floor benchmark)
    m0 = PooledOLS.from_formula(
        "log_price ~ 1 + t + volume_index + fdi_real_estate_transactions_meur", data=panel
    )
    r0 = m0.fit(cov_type="clustered", cluster_entity=True)
    results["0_pooled_ols"] = (r0, *r2_rmse(r0, panel["log_price"]))

    # Spec 0b: district FE only, no covariates (cross-sectional heterogeneity floor)
    m0b = PanelOLS.from_formula("log_price ~ 1 + EntityEffects", data=panel)
    r0b = m0b.fit(cov_type="clustered", cluster_entity=True)
    results["0b_entity_fe_only"] = (r0b, *r2_rmse(r0b, panel["log_price"]))

    # Spec 1: pure two-way FE decomposition (district FE + quarter FE), the
    # literal group-baseline spec. No covariates survive (see Spec 4).
    m1 = PanelOLS.from_formula("log_price ~ 1 + EntityEffects + TimeEffects", data=panel)
    r1 = m1.fit(cov_type="clustered", cluster_entity=True)
    results["1_twfe_decomposition"] = (r1, *r2_rmse(r1, panel["log_price"]))

    # Spec 2: district FE + linear trend + national covariates (full sample,
    # 2015Q1-2025Q1). Trend absorbs common time drift so covariates are not
    # purely collinear with entity effects; still correlated with the trend.
    m2 = PanelOLS.from_formula(
        "log_price ~ 1 + t + volume_index + fdi_real_estate_transactions_meur + EntityEffects",
        data=panel,
    )
    r2 = m2.fit(cov_type="clustered", cluster_entity=True)
    results["2_entity_fe_trend_covars"] = (r2, *r2_rmse(r2, panel["log_price"]))

    # Spec 3: as Spec 2 + mortgage rate, restricted to 2019Q1-2025Q1 (mortgage
    # series coverage start).
    panel_r = panel.dropna(subset=["mortgage_rate_fixed"])
    m3 = PanelOLS.from_formula(
        "log_price ~ 1 + t + mortgage_rate_fixed + volume_index + "
        "fdi_real_estate_transactions_meur + EntityEffects",
        data=panel_r,
    )
    r3 = m3.fit(cov_type="clustered", cluster_entity=True)
    results["3_entity_fe_trend_mortgage_restricted"] = (r3, *r2_rmse(r3, panel_r["log_price"]))

    # Spec 4: attempt full TWFE (district FE + quarter FE) with the national
    # covariates included, to demonstrate the absorption / collinearity
    # problem explicitly rather than assert it. This is EXPECTED to fail:
    # the national covariates are constant across districts within a quarter,
    # so they are perfectly collinear with the quarter fixed effects once
    # demeaned. On some numpy/scipy versions, the singular intermediate
    # matrix triggers benign RuntimeWarnings (divide-by-zero / overflow in
    # matmul) in the moment before linearmodels detects the absorption and
    # raises AbsorbingEffectError -- both are suppressed here since they are
    # a side effect of the intentional failure case, not a real problem.
    spec4_error = None
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            m4 = PanelOLS.from_formula(
                "log_price ~ 1 + mortgage_rate_fixed + volume_index + "
                "fdi_real_estate_transactions_meur + EntityEffects + TimeEffects",
                data=panel_r,
            )
            r4 = m4.fit(cov_type="clustered", cluster_entity=True)
        results["4_full_twfe_with_covars"] = (r4, *r2_rmse(r4, panel_r["log_price"]))
    except Exception as e:  # expected: absorbed-variable ValueError
        spec4_error = str(e)

    # Spec 5: beta-convergence / robustness with alternative DV (QoQ growth)
    panel_g = panel.dropna(subset=["price_growth_qoq"])
    m5 = PanelOLS.from_formula(
        "price_growth_qoq ~ 1 + log_price_lag1 + volume_index + "
        "fdi_real_estate_transactions_meur + EntityEffects",
        data=panel_g,
    )
    r5 = m5.fit(cov_type="clustered", cluster_entity=True)
    results["5_growth_convergence"] = (r5, *r2_rmse(r5, panel_g["price_growth_qoq"]))

    return results, spec4_error


def write_figures(panel, results, output_dir="outputs"):
    fig, ax = plt.subplots(figsize=(10, 6))
    plot_panel = panel.drop(columns=["quarter"]).reset_index()
    for district, group in plot_panel.groupby("district"):
        ax.plot(group["quarter"], group["log_price"], linewidth=1, label=district)
    ax.set(title="Log sale price per square metre by district", xlabel="Quarter", ylabel="Log price")
    ax.legend(ncol=4, fontsize=8, frameon=False)
    fig.tight_layout()
    fig.savefig(f"{output_dir}/fig1_district_price_trends.png", dpi=180)
    plt.close(fig)

    res = results["2_entity_fe_trend_covars"][0]
    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    residuals = res.resids
    axes[0].scatter(res.fitted_values.iloc[:, 0], residuals, alpha=0.35, s=12)
    axes[0].axhline(0, color="black", linewidth=0.8)
    axes[0].set(xlabel="Fitted log price", ylabel="Residual", title="Residuals vs fitted")
    axes[1].hist(residuals, bins=25, edgecolor="white")
    axes[1].set(xlabel="Residual", ylabel="Count", title="Residual distribution")
    fig.tight_layout()
    fig.savefig(f"{output_dir}/fig2_residual_diagnostics.png", dpi=180)
    plt.close(fig)


def main(data_dir="data", output_dir="outputs"):
    panel = build_panel(data_dir)
    panel.to_csv(f"{output_dir}/district_quarter_panel_final.csv")

    results, spec4_error = run_all_specs(panel)

    rows = []
    for name, (res, r2t, rmse) in results.items():
        rows.append({
            "spec": name,
            "n_obs": int(res.nobs),
            "r2_total": round(r2t, 4),
            "r2_within": round(res.rsquared_within, 4) if hasattr(res, "rsquared_within") else np.nan,
            "rmse": round(rmse, 4),
        })
    summary = pd.DataFrame(rows)
    print(summary.to_string(index=False))
    summary.to_csv(f"{output_dir}/model_comparison_table.csv", index=False)

    print("\n--- Spec 4 (full TWFE + national covariates) ---")
    print("Failed as expected (absorption):" if spec4_error else "Unexpectedly succeeded")
    if spec4_error:
        print(spec4_error)

    for name in ["2_entity_fe_trend_covars", "3_entity_fe_trend_mortgage_restricted", "5_growth_convergence"]:
        res = results[name][0]
        out = pd.DataFrame({
            "param": res.params.index,
            "coef": res.params.values,
            "std_err": res.std_errors.values,
            "t_stat": res.tstats.values,
            "p_value": res.pvalues.values,
        })
        out.to_csv(f"{output_dir}/coefs_{name}.csv", index=False)
        print(f"\n--- {name} ---")
        print(res)

    write_figures(panel, results, output_dir)


if __name__ == "__main__":
    main()
