const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, AlignmentType, ImageRun, Footer, PageNumber,
} = require("docx");
const fs = require("fs");

const FULL_W = 9360; // 6.5in usable at 1440 dxa/in on Letter w/ 1in margins

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160, ...(opts.spacing || {}) },
    children: [new TextRun({ text, ...opts })],
    ...opts.pOpts,
  });
}

function h(text, level) {
  return new Paragraph({ text, heading: level, spacing: { before: 280, after: 140 } });
}

function cell(text, { width, bold = false, shade = null, align = AlignmentType.LEFT, italics = false } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { type: ShadingType.CLEAR, color: "auto", fill: shade } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold, italics, size: 19 })],
    })],
  });
}

function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const scaled = widths.map((w) => Math.round((w / total) * FULL_W));
  return new Table({
    width: { size: FULL_W, type: WidthType.DXA },
    columnWidths: scaled,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((htext, i) => cell(htext, { width: scaled[i], bold: true, shade: "D9D9D9" })),
      }),
      ...rows.map((r) => new TableRow({
        children: r.map((c, i) => cell(String(c), { width: scaled[i] })),
      })),
    ],
  });
}

function note(text) {
  return new Paragraph({
    spacing: { before: 60, after: 200 },
    children: [new TextRun({ text, italics: true, size: 18, color: "595959" })],
  });
}

function img(path, widthPx, heightPx, caption) {
  const data = fs.readFileSync(path);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 80 },
      children: [new ImageRun({ data, type: "png", transformation: { width: widthPx, height: heightPx } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: caption, italics: true, size: 18, color: "595959" })],
    }),
  ];
}

const doc = new Document({
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080" })],
        })],
      }),
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({ text: "Group-Shared Baseline Model", bold: true, size: 32 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({
          text: "Immigration, Foreign Investment, and Infrastructure Shocks in Lisbon's Housing Market",
          italics: true, size: 22,
        })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [new TextRun({
          text: "Nova SBE Business Analytics Field Lab, Fall 2025/2026 — Advisor: Miguel Matos",
          size: 19, color: "595959",
        })],
      }),

      h("1. Scope and purpose", HeadingLevel.HEADING_1),
      p("This document implements the group-shared baseline specified in the project's shared benchmark design: a two-way fixed-effects (TWFE) panel regression of log house price on entity and time fixed effects, reported alongside R², RMSE and coefficient tables to serve as the comparison point for the causal machine learning results in §6.1. Two deviations from the original specification are made explicit and carried through the analysis rather than concealed."),

      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({ text: "Geographic unit. ", bold: true }),
          new TextRun({ text: "The specified panel unit was freguesia × quarter. The only price series available in the current data drop (idealista/data, consolidated) is reported at district level, not freguesia. The panel below is therefore built at district × quarter resolution (20 mainland districts + Azores + Madeira). Freguesia-level resolution requires INE “Preços da Habitação ao Nível Local,” listed in the project's own data-source table but not yet pulled into this drop; re-running this pipeline against that source is the natural next step (§6)." }),
        ],
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({ text: "Covariates. ", bold: true }),
          new TextRun({ text: "The specified controls (mortgage rate, construction costs, unemployment/income, population) and IVs (immigration inflow, FDI/foreign-buyer share, infrastructure investment, supply constraint) are, in every source this project has identified so far, published at national or NUTS II level — none carry district-level cross-sectional variation. Three national series were retrieved live from Banco de Portugal BPstat for this baseline (mortgage rate, FDI real-estate transactions); population, unemployment, construction costs and immigration stock by district were not able to be sourced in clean, verifiable form in this pass — see §5 for why, and §6 for what this implies." }),
        ],
      }),

      h("2. Data", HeadingLevel.HEADING_1),
      h("2.1 Sources", HeadingLevel.HEADING_2),
      table(
        ["Series", "Source", "Coverage", "Frequency", "Role"],
        [
          ["Asking sale price / sqm", "idealista/data (consolidated)", "20 districts, 2015Q1–2025Q1", "Monthly → quarterly mean", "Dependent variable"],
          ["Transaction count / value, INE value & volume indices", "INE (ine_transaction_data.csv)", "National, 2009–2025", "Quarterly", "Demand-side control"],
          ["Mortgage rate, new fixed-rate loans", "Banco de Portugal BPstat, series 12710780", "National, 2018M12–2026M06", "Monthly → quarterly mean", "Credit-conditions control"],
          ["Inward FDI, real estate, transactions", "Banco de Portugal BPstat, series 12565842", "National, 2008Q1–2026Q1", "Quarterly", "Foreign-investment proxy (IV)"],
          ["Inward FDI, all countries, stock", "Banco de Portugal BPstat, series 12573788", "National, 2008–2025", "Annual", "Context / EDA only"],
        ],
        [16, 20, 18, 14, 18],
      ),
      note("BPstat series retrieved via the BPstat Data API (bpstat.bportugal.pt/data/v1) on the date of this analysis; values are reproduced in data/bdp_*.csv alongside the pipeline script."),

      h("2.2 Panel construction", HeadingLevel.HEADING_2),
      p("Idealista's monthly district-level asking sale price per sqm is averaged to quarterly frequency (arithmetic mean of the 3 months in each quarter). The “portugal” national aggregate row is excluded from the panel and reserved for validation. This yields a balanced panel of 20 districts × 41 quarters (2015Q1–2025Q1, n = 820); every district has a complete, gap-free monthly sale series over the full window, so no interpolation is required for the dependent variable. The rental series is materially less complete for several smaller districts (as few as 10 quarters for Guarda) and is not used here. Log price is the primary dependent variable; QoQ and YoY log differences are constructed for robustness. National covariates are merged onto the panel by quarter and are therefore identical across all 20 districts within a quarter — the mechanical consequence of this is developed in §3.3."),

      ...img("../outputs/fig1_district_price_trends.png", 560, 350, "Figure 1. District asking sale prices, 2015Q1–2025Q1. Lisboa, Porto and Faro highlighted; remaining 17 districts in gray. Source: idealista/data."),

      h("3. Methodology", HeadingLevel.HEADING_1),
      h("3.1 Estimating equation", HeadingLevel.HEADING_2),
      p("The group baseline is the standard TWFE panel model:"),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [new TextRun({ text: "log(price_sqm)ᵢₜ = αᵢ + γₜ + β′Xᵢₜ + εᵢₜ", italics: true, size: 22 })],
      }),
      p("where i indexes district, t indexes quarter, αᵢ is the district fixed effect, γₜ is the quarter fixed effect, Xᵢₜ is the covariate vector, and standard errors are clustered by district throughout. Because Xᵢₜ in this data drop is national-only (Xᵢₜ = Xₜ for all i), it is collinear with γₜ by construction; §3.3 demonstrates this directly rather than assuming it. Five specifications are estimated in sequence to isolate what each component of the model is doing:"),
      table(
        ["Spec", "Fixed effects", "Covariates", "Sample"],
        [
          ["0 — Pooled OLS", "None", "t, volume_index, FDI", "Full, n=820"],
          ["0b — Entity FE only", "District", "None", "Full, n=820"],
          ["1 — TWFE decomposition (baseline spec)", "District + Quarter", "None", "Full, n=820"],
          ["2 — Entity FE + trend + covariates", "District", "t, volume_index, FDI", "Full, n=820"],
          ["3 — Entity FE + trend + mortgage + covariates", "District", "t, mortgage, volume_index, FDI", "Restricted, n=520 (2019Q1–2025Q1)"],
          ["4 — Full TWFE + covariates (diagnostic)", "District + Quarter", "mortgage, volume_index, FDI", "Restricted, n=520 — fails to estimate"],
          ["5 — Growth / convergence (robustness DV)", "District", "log(price)ₜ₋₁, volume_index, FDI", "Full, n=800"],
        ],
        [10, 24, 30, 26],
      ),
      note("Spec 1 is the literal group-baseline specification. Specs 0, 0b, 2–5 are diagnostic and robustness extensions added to make the identification problem in §3.3 visible and to extract usable coefficients on the national covariates the group's baseline design calls for."),

      h("3.2 Evaluation metrics", HeadingLevel.HEADING_2),
      p("R² is reported both as within-R² (variance explained by covariates after demeaning by the included fixed effects — zero by construction for models with no covariates) and total R² = 1 − SSR/SST against the raw dependent variable, which is the more informative figure for models whose explanatory power comes primarily from the fixed effects themselves. RMSE is computed on the same residual (log price scale)."),

      h("3.3 The identification problem (Spec 4)", HeadingLevel.HEADING_2),
      p("Fitting log(price) on district FE + quarter FE + {mortgage rate, transaction volume index, FDI real estate} raises an absorption error in linearmodels: “The included effects have fully absorbed one or more of the variables … Intercept, mortgage_rate_fixed, volume_index, fdi_real_estate_transactions_meur.” This is not a bug to work around — it is the correct econometric outcome. Any variable that is constant across the cross-section within a period is a linear combination of the quarter dummies, so a TWFE estimator with quarter FE cannot separately identify its coefficient, by construction, regardless of sample size. This holds for every IV/control in the group's baseline table that is sourced nationally: mortgage rate, construction costs, unemployment, population growth (to the extent it is drawn from national series), total FDI, and total immigration stock. It does not hold for genuinely district-varying series (e.g., district-level population, unemployment, permits, or nationality-level buyer shares by freguesia), which is precisely why obtaining those series is not optional polish but a binding precondition for estimating the baseline as specified."),
      p("This has a direct, positive implication for §5/§6.3: it is also exactly why a plain TWFE panel cannot identify the FDI → price effect described in the foreign-investment subtopic, and why that subtopic's design already moves to DML / Causal Forest with a Bartik-style local-exposure instrument (interacting the national FDI shock with a district's pre-existing exposure share) rather than a panel regression on the raw national series. Spec 4's failure is the baseline's own evidence for that design choice."),

      h("4. Results", HeadingLevel.HEADING_1),
      h("4.1 Model comparison", HeadingLevel.HEADING_2),
      table(
        ["Spec", "N", "R² (total)", "R² (within)", "RMSE (log price)"],
        [
          ["0 — Pooled OLS", "820", "0.199", "—", "0.387"],
          ["0b — Entity FE only", "820", "0.725", "0.000", "0.227"],
          ["1 — TWFE decomposition (baseline)", "820", "0.927", "0.000", "0.117"],
          ["2 — Entity FE + trend + covariates", "820", "0.924", "0.723", "0.120"],
          ["3 — Entity FE + trend + mortgage + covariates", "520", "0.978", "0.829", "0.069"],
          ["4 — Full TWFE + covariates", "520", "—", "—", "does not estimate (absorbed)"],
          ["5 — Growth / convergence", "800", "0.120", "0.059", "0.027"],
        ],
        [26, 8, 14, 14, 20],
      ),
      p("The district fixed effect alone (Spec 0b) accounts for 72.5% of total variance in log price — cross-sectional heterogeneity between districts (Lisboa vs. interior districts spans roughly a 5× price range) dominates the variance decomposition. Adding quarter fixed effects (Spec 1, the group baseline) raises total R² to 92.7% and lowers RMSE to 0.117 log points (≈12% typical deviation), confirming that within-district timing also matters, but is second-order relative to level differences across districts. Spec 3, restricted to the 2019Q1–2025Q1 window over which the mortgage-rate series is available, reaches the best fit of any covariate-based specification (R² = 0.978, RMSE = 0.069) precisely because a linear trend plus three national series proxies for the omitted quarter effects reasonably well over a shorter, more homogeneous window."),

      h("4.2 Coefficient tables", HeadingLevel.HEADING_2),
      p("Spec 2 — district FE + linear trend + national covariates (full sample, n=820):", { bold: true }),
      table(
        ["Parameter", "Coef.", "Std. Err.", "t", "p"],
        [
          ["Intercept", "6.788", "0.057", "118.83", "<0.001"],
          ["t (quarter index)", "0.0156", "0.0020", "7.79", "<0.001"],
          ["INE transaction volume index", "−0.0010", "0.0003", "−3.04", "0.002"],
          ["FDI real estate (EUR m, quarterly)", "0.00013", "0.00004", "3.02", "0.003"],
        ],
        [30, 16, 16, 12, 12],
      ),
      p("Spec 3 — district FE + trend + mortgage rate + covariates (restricted sample, n=520):", { bold: true }),
      table(
        ["Parameter", "Coef.", "Std. Err.", "t", "p"],
        [
          ["Intercept", "6.530", "0.044", "147.34", "<0.001"],
          ["t (quarter index)", "0.0180", "0.0016", "11.49", "<0.001"],
          ["Mortgage rate, fixed (%)", "0.0347", "0.0087", "3.98", "<0.001"],
          ["INE transaction volume index", "0.00009", "0.00012", "0.76", "0.447"],
          ["FDI real estate (EUR m, quarterly)", "−0.000013", "0.000018", "−0.73", "0.467"],
        ],
        [30, 16, 16, 12, 12],
      ),
      note("The positive, significant coefficient on the mortgage rate in Spec 3 is counter-intuitive under a causal reading (standard demand theory predicts higher financing cost → lower price) and should not be interpreted causally: 2022–2024 combines a rising-rate environment with continued nominal price growth driven by inflation and constrained supply, so the coefficient is picking up a spurious positive correlation with the common time trend rather than an estimated price elasticity. This is the same identification problem as §3.3 in a milder form — t and mortgage_rate_fixed have VIF 3.41 and 4.27 respectively (Table, §4.3), well below the conventional VIF>10 collinearity threshold but still correlated enough to bias a naive causal reading."),
      p("Spec 5 — convergence / robustness, DV = QoQ log price growth, district FE (n=800):", { bold: true }),
      table(
        ["Parameter", "Coef.", "Std. Err.", "t", "p"],
        [
          ["Intercept", "0.149", "0.064", "2.33", "0.020"],
          ["log(price)ₜ₋₁ (lagged level)", "−0.0245", "0.0093", "−2.63", "0.009"],
          ["INE transaction volume index", "0.00014", "0.00004", "3.15", "0.002"],
          ["FDI real estate (EUR m, quarterly)", "0.0000288", "0.0000075", "3.86", "<0.001"],
        ],
        [30, 16, 16, 12, 12],
      ),
      p("The negative, significant coefficient on the lagged log price level is a standard β-convergence result in housing economics: districts with higher price levels grow more slowly in subsequent quarters (conditional on district FE, i.e. mean reversion around each district's own trend rather than convergence toward a national mean). Both national covariates retain the same sign and remain significant when the DV is expressed in growth terms, for the same reason they were significant in Spec 2 — they are proxying for the common time trend, not for district-specific price dynamics."),

      h("4.3 Diagnostics", HeadingLevel.HEADING_2),
      ...img("../outputs/fig2_residual_diagnostics.png", 560, 250, "Figure 2. Residual histogram and normal Q-Q plot, Spec 1 (two-way FE decomposition)."),
      p("Residuals from the baseline TWFE decomposition (Spec 1) are approximately centered and roughly symmetric but show a heavier left tail than a normal distribution (Q-Q plot, Figure 2) — a small number of district-quarter cells fall well below what district- and time-average pricing would predict, most plausibly the 2020 COVID-onset quarters and a handful of small, thin-market districts where a few listings can move the quarterly mean sharply. Variance inflation factors for Spec 3's covariates are all below the conventional threshold of 10 (max VIF 6.17, FDI real estate; Table below), so multicollinearity is not a first-order concern for the coefficients reported in §4.2, though the FDI/trend correlation flagged in the note above is a substantive concern distinct from mechanical VIF."),
      table(
        ["Variable", "VIF"],
        [
          ["const", "203.0 (uninformative for intercept)"],
          ["t (quarter index)", "3.41"],
          ["Mortgage rate, fixed", "4.27"],
          ["INE transaction volume index", "1.84"],
          ["FDI real estate transactions", "6.17"],
        ],
        [60, 40],
      ),

      h("5. Reproducibility", HeadingLevel.HEADING_1),
      p("All results in this document are produced by scripts/baseline_model.py, a single pipeline that (1) rebuilds the district × quarter panel from the three raw sources in data/, (2) fits all seven specifications, and (3) writes the comparison table and per-spec coefficient tables to outputs/. Re-running it end to end reproduces every number in §4 exactly; no manual steps are required between data and results, consistent with the Field Lab's “replicable ML pipeline documentation” deliverable."),

      h("6. Limitations and next steps for the group", HeadingLevel.HEADING_1),
      table(
        ["Gap", "Why it matters", "Suggested source / owner"],
        [
          ["Freguesia, not district, resolution", "The group's own baseline spec requires freguesia × quarter for entity FE fine enough to support the immigration/infrastructure/supply subtopics, which vary within a district", "INE “Preços da Habitação ao Nível Local” (already in the project's own source table, not yet pulled)"],
          ["No district-varying controls or IVs", "Every macro series located so far is national — mechanically unidentifiable inside quarter FE (§3.3); this is the binding constraint on the whole baseline, not a cosmetic gap", "District/concelho population & unemployment (INE), AIMA migration by concelho, construction permits by concelho — aggregate up to district"],
          ["Mortgage-rate series truncated to 2018M12–", "37% of the panel (2015Q1–2018Q3) has no mortgage-rate observation; Spec 3 drops to n=520", "BdP domain 21 may have a longer-running average lending-rate series; confirm coverage before the group standardizes on one rate series"],
          ["Construction cost index not retrieved", "Listed in the baseline's control set; not sourced in this pass after two search attempts (INE page not resolvable to a stable download link in this session)", "INE Índice de custo de construção de habitação nova (base 2021) — confirm exact table code on ine.pt Base de Dados"],
          ["Idealista price is an asking price, not a transacted price", "Standard idealista/data limitation; INE transaction-value data (already merged as a national control) is the transacted-price cross-check but only at national granularity", "Land-registry transaction microdata, if the group secures access (see project context “Confidencial Imobiliário” row, unconfirmed)"],
        ],
        [20, 40, 40],
      ),
      p("None of these gaps invalidate the baseline as a benchmark for model comparison in §6.1 — Spec 1's R²/RMSE are valid, reproducible numbers against which the group's ML and causal models can be judged. They do mean the baseline, as currently estimable, decomposes price into “which district” and “which quarter” rather than testing the substantive IVs (immigration, FDI, infrastructure, supply) the thesis is about — that test requires either freguesia-level data or a subtopic-specific identification strategy (DML/Bartik) that does not rely on cross-sectional variation in a national aggregate, exactly the direction §5/§6.3 already takes for foreign investment."),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("../outputs/baseline_model_section.docx", buf);
  console.log("written");
});
