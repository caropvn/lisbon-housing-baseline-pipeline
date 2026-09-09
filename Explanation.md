The baseline model is a **descriptive, Portugal-wide district-by-quarter panel model**, not yet a Lisbon-specific causal model. Claude built it to establish a reproducible benchmark: assemble available national and district data, model housing-price patterns with fixed effects, expose what can and cannot be identified with the available variation, and prepare the project for a later causal-ML stage. 

## 1. What the baseline is for

The Field Lab’s intended thesis is about causal effects of immigration, foreign investment, and infrastructure shocks on Lisbon housing. The baseline does **not** estimate those effects yet. Instead, it answers a narrower preparatory question:

> After accounting for persistent differences between Portuguese districts and common time shocks, what housing-price variation remains, and can the currently available macroeconomic and foreign-investment series explain it?

The main design decision was to use a balanced panel of **20 Portuguese districts over 41 quarters, from 2015Q1 to 2025Q1**, yielding 820 district-quarter observations. The source documentation explicitly notes large cross-sectional differences, such as Lisbon versus interior districts, rather than variation within Lisbon neighbourhoods. 

This distinction is crucial:

| What the repository currently analyses | What the Field Lab ultimately requires |
|---|---|
| Portuguese districts, including one Lisboa district | Lisbon neighbourhoods or freguesias, ideally with local exposure variation |
| Asking sale prices from Idealista | Ideally a mix of asking prices and transaction-level or local administrative prices |
| Descriptive and fixed-effects baseline | Causal policy evaluation |
| National time-series covariates | Local, time-varying immigration, foreign-investment, and infrastructure treatment measures |
| Association and model fit | Causal effects and heterogeneous treatment effects |

So the baseline is a reasonable first milestone, but it should be framed in the thesis as a **national comparison benchmark and data-audit exercise**, not as evidence that foreign investment caused Lisbon prices to rise.

## 2. Data sources

The repository combines several source types. However, the variables do not all have the same geographic level, and that is the central issue in the model.

| Dataset / source | Geographic level | Frequency | Role in the pipeline | Key limitation |
|---|---|---|---|---|
| Idealista sale-price series | District | Monthly, converted to quarterly | Primary housing-price outcome | Asking prices, not observed transaction prices |
| Idealista rental-price series | District | Monthly | Initially collected as a potential secondary outcome | Incomplete for smaller districts, so excluded from the baseline |
| INE transaction data | National | Quarterly | Transaction counts, transaction values, price/value index, volume index | Same value is copied to every district in each quarter |
| Banco de Portugal mortgage-rate series | National | Monthly, converted to quarterly | Mortgage-rate control | No cross-district variation; coverage begins later |
| Banco de Portugal real-estate FDI series | National | Quarterly | Foreign-investment context variable | Not a measure of foreign investment in a specific district or Lisbon neighbourhood |
| Banco de Portugal total FDI stock | National | Annual or transformed to quarterly panel context | Broader foreign-capital context | Also national only |
| AIMA Golden Visa history | National | Historical series | Policy and foreign-investment context | Not yet converted into a treatment design |
| Construction-cost data | National | Quarterly or transformed to quarterly | Potential supply-cost control | Source status and model inclusion need verification |
| Population data | National | Annual | Demographic context | Not local enough for a district causal analysis |
| Unemployment data | Regional | Quarterly | Local-economic-condition control | Regional, not consistently district-level |

The primary dependent variable is **Idealista’s asking sale price per square metre**. Monthly prices are averaged arithmetically within each quarter. The national “Portugal” row is excluded from the dependent-variable panel and kept for validation, leaving 20 districts with complete sale-price series. 

The repository also contains INE transaction data. However, that data is national in the assembled panel. It provides useful market context and validation, but not district-specific transaction behaviour. 

### Key decision: sale prices, not rents

Rental prices were deliberately excluded from the main baseline because the rental series is incomplete in several smaller districts, in some cases covering as few as 10 quarters. The choice avoids creating an unbalanced dependent-variable panel or relying on aggressive imputation. That is a defensible data-quality decision. 

The trade-off is substantive: the Field Lab explicitly includes rents and affordability, but the current baseline addresses only the sale-price side of the housing market.

## 3. Cleaning and transformation pipeline

The repository uses a staged pipeline, even though the names overlap somewhat:

```text
Raw source files
  ↓
Source-specific cleaning / standardisation
  ↓
Quarterly national macro panel
  ↓
District-quarter Idealista price panel
  ↓
Merge national series onto every district-quarter row
  ↓
Derived price, growth, lag, and trend variables
  ↓
Fixed-effects model and exported tables/figures
```

### Step 1: Build the district housing-price panel

The Idealista source is monthly and district-level. The pipeline:

1. Reshapes the price data into a long format, with one row per `district × date`.
2. Keeps the sale-price-per-square-metre series.
3. Converts monthly observations into quarters.
4. Calculates the average of the three monthly values per quarter.
5. Removes rows without sale price.
6. Sorts the result by district and date.

The main sample is balanced, meaning each of the 20 districts has an observation in all 41 quarters. The repository documentation says no interpolation is required for the **sale-price outcome** because its monthly series is complete across the analysis window. 

### Step 2: Standardise time

Every input is brought to a quarterly date key:

- Monthly mortgage-rate data are converted to quarter start dates and averaged to quarterly frequency.
- Quarterly FDI and INE series are aligned to the same quarterly date variable.
- Annual series, where included, are effectively attached as annual context to quarters.
- The final dataset includes fields like year, quarter, period label, and a sequential time index `t`. 

This is necessary because the housing outcome is quarterly. But it also introduces an assumption: a quarterly average is an adequate representation of the relevant financing and market conditions affecting that quarter’s housing prices.

### Step 3: Merge macro and market controls

The model creates a national quarterly table by merging the available national series using a **full outer join on date**. This preserves the full historical coverage and allows gaps to remain rather than silently dropping time periods. 

It then performs a **left join** from the district-price panel onto that national table:

\[
\text{district-quarter price panel}
\;\leftarrow\;
\text{national variables by quarter}
\]

The consequence is that every district receives the same national mortgage rate, national FDI measure, national transaction index, and other national-level values in a given quarter. 

For example, in 2018Q2:

- Aveiro, Lisboa, Porto, and every other district have distinct Idealista prices.
- But all districts receive the same national FDI figure.
- All districts receive the same national mortgage rate.
- All districts receive the same national INE transaction volume index.

That is appropriate for a macro-context dataset. It becomes problematic only if the model tries to interpret these national series as explaining cross-district differences within the same quarter.

### Step 4: Derive modelling variables

The pipeline creates several transformations:

| Variable | Construction | Purpose |
|---|---|---|
| `price_sqm_sale` | Quarterly average asking sale price per square metre | Original-scale dependent-variable reference |
| `log_price` or `log_price_sale` | \( \ln(\text{price per sqm}) \) | Primary dependent variable |
| `price_growth_qoq` | Quarter-to-quarter change, implemented as a log difference in the modelling workflow | Robustness outcome for short-run growth |
| `price_growth_yoy` | Four-quarter log difference | Robustness outcome for annual price growth |
| `log_price_lag1` | Previous quarter’s log price within district | Used in growth-convergence specification |
| `t` | Sequential time trend | Used in trend specifications |

The log transformation is standard for positive, right-skewed prices. It means the model works with proportional changes rather than euro changes. A coefficient of 0.05 on an explanatory variable would be interpreted approximately as a 5 percent change in price, subject to the model specification. 

The model calculates within-district growth after sorting the panel by district and quarter:

\[
\Delta \ln(P_{it}) = \ln(P_{it}) - \ln(P_{i,t-1})
\]

and year-on-year growth as:

\[
\ln(P_{it}) - \ln(P_{i,t-4})
\]

These are useful robustness outcomes because they reduce dependence on persistent price-level differences across districts. 

## 4. Base model

### Literal base specification

The repository identifies **Specification 1** as the literal group baseline:

\[
\ln(P_{it}) = \alpha + \mu_i + \tau_t + \varepsilon_{it}
\]

where:

- \(P_{it}\) is Idealista asking sale price per square metre in district \(i\), quarter \(t\).
- \(\alpha\) is the intercept.
- \(\mu_i\) is the district fixed effect.
- \(\tau_t\) is the quarter fixed effect.
- \(\varepsilon_{it}\) is the unexplained residual.

In code terms, it is:

```python
log_price ~ 1 + EntityEffects + TimeEffects
```

The model uses clustered standard errors at the district level. This allows errors to be correlated within a district over time rather than pretending that each quarterly observation is independent. 

### What the fixed effects mean

**District fixed effects** control for time-invariant differences between districts, including long-standing differences in:

- Location and access to major cities.
- Climate and coast versus interior.
- Historical housing stock.
- Amenity value.
- Economic structure.
- Baseline income and demand.
- Persistent differences in housing-market attractiveness.

For example, Lisboa’s generally higher price level than a smaller interior district should not be attributed to FDI, the mortgage rate, or a particular year. The district fixed effect absorbs that stable gap.

**Quarter fixed effects** control for anything that affects all districts in the same quarter, including:

- National monetary and credit conditions.
- National macroeconomic shocks.
- COVID-era disruptions.
- Inflation.
- Nationwide housing-policy changes.
- Country-wide property-market cycles.
- National FDI flows, if those affect all places through a common quarterly shock.

This is why the pure two-way fixed-effects model is useful as a descriptive decomposition of geography and time.

### Other specifications

Claude included several additional models, not all of which should be treated as equal evidence.

| Specification | Purpose | Interpretation |
|---|---|---|
| Spec 0: Pooled OLS | No fixed effects | Naive benchmark, intentionally weak |
| Spec 0b: District FE only | Controls for persistent district differences | Shows how much price variation is cross-sectional |
| Spec 1: Two-way FE | District and quarter fixed effects | Literal baseline and best descriptive decomposition |
| Spec 2: District FE plus trend and covariates | Estimates coefficients on national series by omitting time FE | Association model, not clean causal identification |
| Spec 3: Restricted period plus mortgage rate | Uses 2019Q1 to 2025Q1, when mortgage data exists | Shorter-sample association model |
| Spec 5: Growth-convergence model | Models price growth with lagged price, volume, and FDI | Tests whether initially expensive districts grow differently |

The model comparison shows that district fixed effects alone explain much of total price variation. The documented result is \(R^2 = 0.725\) for the district-FE-only specification, while the two-way fixed-effects model reaches \(R^2 = 0.927\) with RMSE of 0.117 log points. This indicates that persistent geographic price differences dominate, and common time effects explain further variation. 

## 5. Decisions and assumptions

### Good decisions

- **Use a balanced sale-price panel.** This avoids missing-outcome interpolation and makes trends comparable across districts. 
- **Use log prices.** This is suitable for price data and makes growth specifications coherent. 
- **Use district and time fixed effects.** This is the correct baseline control for stable district differences and common national shocks. 
- **Cluster standard errors by district.** This is more realistic than assuming independent quarterly observations within a district. 
- **Keep pooled OLS only as a benchmark.** It makes the benefit of fixed effects transparent rather than treating a naive association as a finding.
- **Document limitations rather than hide them.** The project materials explicitly acknowledge the lack of district-level variation for several intended explanatory variables. 

### Assumptions built into it

1. **Idealista asking prices are a valid proxy for local market values.**  
   They may track market pressure, but they are not the same as completed transaction prices. Asking-price bias can vary by district and market conditions.

2. **A district is an acceptable geographic unit.**  
   This is acceptable for a national baseline but too coarse for the Field Lab’s Lisbon-neighbourhood causal questions. Lisboa is only one district, so the pipeline cannot reveal which parts of Lisbon experience pressure from immigration, tourism, foreign buyers, or a metro expansion.

3. **Monthly-to-quarterly averaging is appropriate.**  
   This assumes within-quarter volatility is not essential to the question.

4. **National variables affect all districts similarly within a quarter.**  
   This is mechanically imposed by the data merge. A national mortgage rate is identical for every district in the same quarter, even though local exposure to credit conditions may differ.

5. **District-level clustering is adequate.**  
   There are only 20 clusters. Clustered standard errors are directionally appropriate, but inference with few clusters can be fragile. You may eventually need small-cluster robustness checks, such as wild-cluster bootstrap methods.

6. **Fixed effects adequately control for confounding in the descriptive model.**  
   They only control for time-invariant district factors and common time shocks. They do not solve omitted time-varying district-level confounders.

### Most important limitation

The repository correctly notes that national covariates are absorbed by quarter fixed effects because they have no cross-district variation within a quarter. Put simply:

\[
X_t = X_t \text{ for every district } i
\]

If the model includes quarter fixed effects \(\tau_t\), it cannot separately estimate the coefficient on \(X_t\). The time effects already capture it perfectly.

That is why the literal baseline, Spec 1, contains only district and quarter effects, with no national FDI, mortgage, or volume covariates surviving as separately identified coefficients. 

The later specifications that include national FDI, volume, trends, or mortgage rates therefore remove the full time fixed effects or restrict the sample. Their coefficients can be useful **descriptive associations**, but they cannot be interpreted as the causal effect of foreign investment or mortgage rates on district prices.

## Bottom line

The pipeline’s core logic is sound as a baseline:

1. Build a balanced district-quarter sale-price panel.
2. Convert all usable series to a common quarterly timeline.
3. Merge national market context onto each district-quarter observation.
4. Transform price levels into logs and growth measures.
5. Estimate pooled, district-FE, and two-way-FE models.
6. Use results to show that the current data cannot identify local causal effects.

The key next step is not yet a more complex model. It is to move from this **Portugal district comparison panel** to a **Lisbon local-exposure panel**, ideally freguesia by quarter, with a treatment that varies by place and time. Only then can you use DML, Causal Forests, spatial models, or event studies to answer the actual Field Lab question. 




