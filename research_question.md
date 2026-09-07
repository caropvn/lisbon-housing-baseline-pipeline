Based on the Field Lab brief, your thesis would be a **group-based causal machine-learning policy evaluation** of Lisbon’s housing market. The central task is to estimate whether immigration, foreign investment, and infrastructure projects have *causally* affected housing prices, rents, transaction volumes, affordability, and spatial inequality across Lisbon neighbourhoods. 

## Core research objective

You need to answer a policy-relevant question along the lines of:

> To what extent did immigration inflows, foreign investment, particularly policy changes around Golden Visas, and infrastructure expansion increase housing-market pressure in Lisbon, and which neighbourhoods were affected most?

The project explicitly expects you to examine:

- The effect of immigration inflows on housing prices and rental prices.
- The causal impact of the Golden Visa reform.
- The effect of infrastructure expansion on nearby property values.
- Whether immigration and infrastructure interact in nonlinear ways, for example, whether a new transport connection has a stronger price effect in high-immigration areas.
- Heterogeneous impacts across neighbourhoods rather than only a Lisbon-wide average.
- Counterfactuals, such as what housing outcomes might have been without the Golden Visa reform or if an infrastructure project had occurred later.
- Implications for housing affordability, inequality, and possible speculative pressure. 

## What you need to produce

The required outputs are:

| Deliverable | What it should contain |
|---|---|
| Final academic thesis report | Research motivation, literature review, data description, causal identification strategy, methods, results, robustness checks, policy implications, and limitations |
| Replicable ML pipeline documentation | Clear instructions and code structure that let another person reproduce data preparation, model estimation, validation, and results |
| Optional causal-impact dashboard | An interactive visual output showing estimated impacts across time and geography, such as neighbourhood maps and counterfactual scenarios |

The dashboard is optional and described as an advanced output, so it should not come before a credible and reproducible causal analysis. 

## Required analytical work

### 1. Build the dataset

You will need to combine multiple data sources into a neighbourhood-by-time, or ideally transaction-level, analytical dataset:

- **INE:** regional housing prices and demographic indicators.
- **Banco de Portugal:** mortgage flows and credit conditions, which are important controls because interest rates and lending availability also drive housing demand.
- **Land registry transactions:** property-level or local transaction data, including prices and transaction volumes.
- **Migration data:** immigration statistics from AIMA or other administrative sources.
- **Web-scraped real-estate listings:** advertised sale/rent price, time on market, listing characteristics, and location. 

A strong final panel could be at the parish or neighbourhood level, for example:

Neighbourhood * Month/Quarter

Potential variables include median sale price per square metre, median rent per square metre, number of sales, foreign-buyer exposure, immigration inflows, mortgage conditions, distance to infrastructure, and neighbourhood socioeconomic characteristics.

### 2. Define clear treatments and outcomes

The thesis needs specific, measurable definitions of the causes and effects you are studying.

**Potential outcomes**
- Sale price or price per square metre.
- Rent or rent per square metre.
- Transaction volume.
- Days on market.
- Affordability measure, such as housing cost relative to local income.
- Inequality measure, such as the widening price gap between high- and low-income neighbourhoods.

**Potential treatments**
- Immigration exposure, for example recent immigrant inflows relative to existing population.
- Foreign-investment exposure, perhaps proxied through transactions or listing patterns where direct data are available.
- Golden Visa policy reform, defined by a clear policy date and exposure mechanism.
- Infrastructure shock, such as new metro access, rail, road, or other local investment, measured by proximity and timing.

The most important early decision is choosing **one primary causal question**. Trying to identify all three mechanisms equally well may be too broad for a single thesis. A feasible design would make one topic primary and treat the others as controls, moderators, or secondary analyses.

## Methods expected

The brief names several methods. You do not necessarily need to make every method equally central, but your project should implement the core causal ML work well.

### Double Machine Learning

Use Double Machine Learning, or DML, to estimate causal effects while flexibly controlling for many confounders. This is particularly suitable when property prices depend on a large number of nonlinear factors, including property features, neighbourhood characteristics, macroeconomic conditions, credit availability, and local demand.

A simplified estimand could be:

\[
Y_{it} = \theta D_{it} + g(X_{it}) + \varepsilon_{it}
\]

where:

- \(Y_{it}\) is a housing outcome for neighbourhood or property \(i\) at time \(t\).
- \(D_{it}\) is the treatment, such as immigration intensity or infrastructure exposure.
- \(X_{it}\) contains observed confounders.
- \(\theta\) is the causal effect of interest.

DML uses machine learning to model both the outcome and the treatment assignment, then isolates the residual relationship needed to estimate \(\theta\).

### Causal Forests

Use Causal Forests to estimate **heterogeneous treatment effects**. Rather than reporting only an average effect, you can answer questions such as:

- Did immigration pressure raise prices more in already-expensive neighbourhoods?
- Were infrastructure benefits concentrated near new transit access?
- Did lower-income areas experience larger affordability deterioration?
- Were effects stronger in areas with high pre-existing foreign-investment exposure?

This is one of the most valuable parts of the proposed thesis because it connects advanced ML directly to a policy question about inequality.

### Spatial analysis

The brief expects spatial machine-learning models to capture spillovers. Housing markets are geographically connected: a metro expansion or price shock in one neighbourhood can affect adjacent areas.

Your analysis should therefore include:

- Geocoding properties, listings, or neighbourhood centroids.
- Mapping treatment intensity and housing outcomes.
- Creating spatial features, such as distance to infrastructure or neighbouring-area price changes.
- Testing spatial spillovers rather than assuming each neighbourhood is independent.
- Showing results visually through maps, where possible. 

### Policy evaluation methods

The readings also point to Difference-in-Differences and Event Studies. These are important for reforms and infrastructure interventions because they make timing explicit.

For example, for a Golden Visa reform, an event study could compare high-exposure and low-exposure neighbourhoods before and after the reform, while testing whether their pre-policy trends were similar. This would complement the ML models and substantially improve the credibility of your causal claims. 

### Agent-Based Model

The field lab proposes an Agent-Based Model, or ABM, to simulate competition between foreign and domestic buyers. In practice, this means creating simulated agents with different budgets, preferences, financing constraints, and location choices, then observing how prices and affordability evolve under alternative policy settings.

Potential counterfactual scenarios include:

- No Golden Visa reform.
- Lower foreign-buyer demand.
- Delayed infrastructure expansion.
- Higher immigration without additional housing supply.
- More new housing supply near transit projects.

This component is useful, but it is more ambitious and should be built after the empirical causal estimates are stable. The ABM should be calibrated with results from the data analysis, not used as a substitute for causal identification. 

## Suggested team division

This Field Lab is designed for **3 to 4 students**, with collective and individual components. The shared work includes research design, identification strategy, data collection and cleaning, model validation, policy interpretation, and the final presentation. 

A sensible division is:

| Person | Main individual responsibility | Useful outputs |
|---|---|---|
| Student 1 | Causal ML | DML model, causal forest, treatment-effect analysis, robustness checks |
| Student 2 | Spatial and infrastructure analysis | Geospatial data, proximity measures, spatial spillovers, maps, infrastructure event study |
| Student 3 | Agent-Based Model | Buyer/seller simulation, counterfactual scenarios, calibration and sensitivity analysis |
| Student 4, if applicable | Data engineering and web scraping | Reproducible ingestion pipeline, listing scraper, cleaning, geocoding, database-ready data model |

Given your background in business analytics, Python, data engineering, ML, dashboards, and automation, the strongest fit would likely be either:

- **Causal ML implementation**, if you want the most econometric and machine-learning-focused contribution.
- **Data engineering plus causal-impact dashboard**, if you want a more end-to-end applied analytics contribution.
- **Spatial ML**, if you want a technical project combining geospatial features, causal inference, and property-market analysis.

## Recommended thesis structure

A robust report structure would be:

1. **Introduction and policy problem**  
   Explain Lisbon’s housing affordability challenge and why immigration, foreign investment, and infrastructure shocks may matter.

2. **Literature review**  
   Cover urban economics, immigration and housing demand, foreign investment, Golden Visa-related research, causal ML, spatial econometrics, Difference-in-Differences, and policy evaluation.

3. **Institutional setting and hypotheses**  
   Document the relevant policy reform(s), infrastructure timeline(s), and why certain areas should have different exposure.

4. **Data and feature engineering**  
   Describe every source, geographic unit, time period, matching process, missing-data treatment, variables, and limitations.

5. **Identification strategy**  
   State exactly what causal effect you estimate, why treatment variation is plausibly exogenous or conditionally unconfounded, key assumptions, and threats to validity.

6. **Methods**  
   Present the baseline DiD or event-study design where applicable, DML estimation, causal forest design, spatial model, and ABM only if feasible.

7. **Results**  
   Report average effects, heterogeneous effects, neighbourhood maps, temporal event-study plots, and confidence intervals.

8. **Robustness and limitations**  
   Include placebo dates or areas, alternative treatment definitions, alternative geographic boundaries, sensitivity to controls, pre-trend tests, and careful discussion of data limitations.

9. **Policy implications**  
   Translate results into implications for affordability, housing supply, transport planning, foreign-investment policy, and targeted local interventions.

## Your first steps


3. **Narrow the scope immediately.** Decide whether your primary treatment is:
   - Immigration inflows,
   - Golden Visa or foreign-investment exposure, or
   - A specific infrastructure shock.

4. **Choose a unit of analysis** before collecting data: transaction-level data if accessible, otherwise neighbourhood/parish by month or quarter.

5. **Create a data-access inventory.** Separate sources into:
   - Public and immediately available.
   - Accessible through the university/advisor.
   - Requiring scraping or manual acquisition.
   - Unavailable or legally restricted.

6. **Write a one-page identification memo** with the primary outcome, treatment, comparison group, period, confounders, method, assumptions, and planned robustness checks.

7. **Set up a reproducible Python repository** from day one, with separate folders for raw data, cleaned data, source code, model outputs, figures, and documentation. Avoid committing restricted raw data to GitHub.

## Practical scope recommendation

The brief is ambitious. For a high-quality master’s thesis, prioritize a rigorous empirical core over many partially implemented methods.

A strong minimum viable thesis would be:

- One clearly defined policy or infrastructure shock.
- A clean neighbourhood-level panel dataset.
- A baseline DiD or event study.
- DML for adjusted causal estimates.
- Causal Forests for heterogeneity.
- Spatial features and mapped results.
- Reproducible code and documentation.

