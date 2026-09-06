import pandas as pd
import numpy as np

PIPE = "/home/claude/work/lisbon_housing_baseline/data/"
CLEAN = "/home/claude/work/lisbon_housing_baseline/data/clean/"

def qstart(dt):
    dt = pd.to_datetime(dt)
    q = (dt.dt.month - 1)//3
    return pd.to_datetime(dict(year=dt.dt.year, month=q*3+1, day=1))

# --- idealista (monthly -> quarterly mean) ---
idl = pd.read_csv(PIPE + "idealista_prices_consolidated_wide.csv")
idl['date'] = pd.to_datetime(idl['date'])
idl['qdate'] = qstart(idl['date'])
idl_q = idl.groupby('qdate').agg(
    house_price_portugal_sale_eur_sqm=('portugal_sale','mean'),
    house_price_portugal_rental_eur_sqm=('portugal_rental','mean'),
    house_price_lisboa_sale_eur_sqm=('lisboa_sale','mean'),
    house_price_lisboa_rental_eur_sqm=('lisboa_rental','mean'),
    house_price_porto_sale_eur_sqm=('porto_sale','mean'),
).reset_index().rename(columns={'qdate':'date'})

# --- INE transactions (already quarterly) ---
ine = pd.read_csv(PIPE + "ine_transaction_data.csv")
ine['date'] = pd.to_datetime(ine['date'])
ine_q = ine[['date','transaction_count','transaction_value_thousands','value_index','volume_index']].rename(
    columns={'transaction_count':'ine_transaction_count','transaction_value_thousands':'ine_transaction_value_thousands',
             'value_index':'ine_price_value_index','volume_index':'ine_volume_index'})

# --- BdP mortgage rate (monthly -> quarterly mean) ---
mort = pd.read_csv(PIPE + "bdp_mortgage_rate_fixed.csv")
mort['date'] = pd.to_datetime(mort['date'])
mort['qdate'] = qstart(mort['date'])
mort_q = mort.groupby('qdate')['mortgage_rate_fixed'].mean().reset_index().rename(
    columns={'qdate':'date','mortgage_rate_fixed':'mortgage_rate_fixed_pct'})

# --- BdP FDI real estate transactions (quarterly) ---
fdi_tx = pd.read_csv(PIPE + "bdp_fdi_realestate_quarterly.csv")
fdi_tx['date'] = pd.to_datetime(fdi_tx['date'])
fdi_tx['qdate'] = qstart(fdi_tx['date'])
fdi_tx_q = fdi_tx.groupby('qdate')['fdi_real_estate_transactions_meur'].sum().reset_index().rename(columns={'qdate':'date'})

# --- BdP FDI real estate stock (quarterly) ---
fdi_stock = pd.read_csv(PIPE + "bdp_fdi_realestate_stock_quarterly.csv")
fdi_stock['date'] = pd.to_datetime(fdi_stock['date'])
fdi_stock['qdate'] = qstart(fdi_stock['date'])
fdi_stock_q = fdi_stock.groupby('qdate')['fdi_real_estate_stock_meur'].last().reset_index().rename(
    columns={'qdate':'date','fdi_real_estate_stock_meur':'fdi_realestate_stock_meur'})

# --- BdP FDI total stock (annual -> repeat across 4 quarters) ---
fdi_tot = pd.read_csv(PIPE + "bdp_fdi_total_stock_annual.csv")
rows = []
for _, r in fdi_tot.iterrows():
    for m in (1,4,7,10):
        rows.append({'date': pd.Timestamp(year=int(r['year']), month=m, day=1), 'fdi_total_stock_meur': r['fdi_total_stock_meur']})
fdi_tot_q = pd.DataFrame(rows)

# --- unemployment (Portugal, MF) ---
unemp = pd.read_csv(CLEAN + "unemployment_rate_nuts1_quarterly.csv")
unemp['date'] = pd.to_datetime(unemp['date'])
unemp_q = unemp[(unemp['region']=='Portugal') & (unemp['sex']=='MF')][['date','unemployment_rate_pct']].rename(
    columns={'unemployment_rate_pct':'unemployment_rate_portugal_pct'})

# --- construction cost (Total factor, monthly -> quarterly mean) ---
cc = pd.read_csv(CLEAN + "construction_cost_index_monthly.csv")
cc['date'] = pd.to_datetime(cc['date'])
cc_tot = cc[cc['production_factor']=='Total'].copy()
cc_tot['qdate'] = qstart(cc_tot['date'])
cc_q = cc_tot.groupby('qdate')['yoy_growth_rate_pct'].mean().reset_index().rename(
    columns={'qdate':'date','yoy_growth_rate_pct':'construction_cost_yoy_growth_pct'})

# --- population (Portugal, annual -> repeat across 4 quarters) ---
pop = pd.read_csv(CLEAN + "population_by_region_annual.csv")
pop_pt = pop[(pop['geo_level']=='NUTS 2024') & (pop['region']=='Portugal')]
rows = []
for _, r in pop_pt.iterrows():
    for m in (1,4,7,10):
        rows.append({'date': pd.Timestamp(year=int(r['year']), month=m, day=1), 'population_portugal': r['population']})
pop_q = pd.DataFrame(rows)

# =========================================================
# MERGE — full outer join on date, full history (gaps allowed)
# =========================================================
dfs = [idl_q, ine_q, mort_q, fdi_tx_q, fdi_stock_q, fdi_tot_q, unemp_q, cc_q, pop_q]
master = dfs[0]
for d in dfs[1:]:
    master = master.merge(d, on='date', how='outer')

master = master.sort_values('date').reset_index(drop=True)
master['year'] = master['date'].dt.year
master['quarter'] = master['date'].dt.quarter
master['period'] = master['quarter'].astype(str) + 'T' + master['year'].astype(str)

cols = ['period','year','quarter','date'] + [c for c in master.columns if c not in ('period','year','quarter','date')]
master = master[cols]

master.to_csv("/home/claude/work/lisbon_housing_baseline/data/clean/master_national_quarterly_panel.csv", index=False)
print(master.shape)
print(master['date'].min(), master['date'].max())
print(list(master.columns))
print(master.tail(8).to_string())
