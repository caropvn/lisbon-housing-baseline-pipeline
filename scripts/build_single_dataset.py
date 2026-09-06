import pandas as pd
import numpy as np

PIPE = "/home/claude/work/lisbon_housing_baseline/data/"
CLEAN = "/home/claude/work/lisbon_housing_baseline/data/clean/"

def qstart(dt):
    dt = pd.to_datetime(dt)
    q = (dt.dt.month - 1)//3
    return pd.to_datetime(dict(year=dt.dt.year, month=q*3+1, day=1))

DISTRICTS = ['aveiro','azores','beja','braga','braganca','castelo-branco','coimbra',
             'evora','faro','guarda','leiria','lisboa','madeira','portalegre','porto',
             'santarem','setubal','viana-do-castelo','vila-real','viseu']

REGION_MAP = {d: ('Regiao Autonoma dos Acores' if d=='azores'
                   else 'Regiao Autonoma da Madeira' if d=='madeira'
                   else 'Continente') for d in DISTRICTS}

# ---------- 1. district house prices (monthly -> quarterly) ----------
idl = pd.read_csv(PIPE + "idealista_prices_consolidated_wide.csv")
idl['date'] = pd.to_datetime(idl['date'])
idl['qdate'] = qstart(idl['date'])

long_rows = []
for d in DISTRICTS:
    sale_col = f"{d}_sale"
    rent_col = f"{d}_rental"
    g = idl.groupby('qdate').agg(
        price_sqm_sale=(sale_col, 'mean') if sale_col in idl.columns else (sale_col, 'mean'),
    )
    g2 = idl.groupby('qdate')[rent_col].mean() if rent_col in idl.columns else None
    for qdate, row in g.iterrows():
        rec = {'district': d, 'date': qdate, 'price_sqm_sale': row['price_sqm_sale']}
        if g2 is not None:
            rec['price_sqm_rental'] = g2.loc[qdate]
        long_rows.append(rec)

panel = pd.DataFrame(long_rows).sort_values(['district','date']).reset_index(drop=True)
panel = panel.dropna(subset=['price_sqm_sale'], how='all')

panel['log_price_sale'] = np.log(panel['price_sqm_sale'])
panel = panel.sort_values(['district','date'])
panel['price_growth_qoq'] = panel.groupby('district')['price_sqm_sale'].pct_change()
panel['price_growth_yoy'] = panel.groupby('district')['price_sqm_sale'].pct_change(4)

# ---------- 2. national variables (same value every district, each quarter) ----------
ine = pd.read_csv(PIPE + "ine_transaction_data.csv")
ine['date'] = pd.to_datetime(ine['date'])
ine_q = ine[['date','transaction_count','transaction_value_thousands','value_index','volume_index']].rename(
    columns={'transaction_count':'ine_transaction_count_national',
             'transaction_value_thousands':'ine_transaction_value_thousands_national',
             'value_index':'ine_price_value_index_national',
             'volume_index':'ine_volume_index_national'})

mort = pd.read_csv(PIPE + "bdp_mortgage_rate_fixed.csv")
mort['date'] = pd.to_datetime(mort['date'])
mort['qdate'] = qstart(mort['date'])
mort_q = mort.groupby('qdate')['mortgage_rate_fixed'].mean().reset_index().rename(
    columns={'qdate':'date','mortgage_rate_fixed':'mortgage_rate_fixed_pct_national'})

fdi_tx = pd.read_csv(PIPE + "bdp_fdi_realestate_quarterly.csv")
fdi_tx['date'] = pd.to_datetime(fdi_tx['date'])
fdi_tx['qdate'] = qstart(fdi_tx['date'])
fdi_tx_q = fdi_tx.groupby('qdate')['fdi_real_estate_transactions_meur'].sum().reset_index().rename(
    columns={'qdate':'date','fdi_real_estate_transactions_meur':'fdi_realestate_transactions_meur_national'})

fdi_stock = pd.read_csv(PIPE + "bdp_fdi_realestate_stock_quarterly.csv")
fdi_stock['date'] = pd.to_datetime(fdi_stock['date'])
fdi_stock['qdate'] = qstart(fdi_stock['date'])
fdi_stock_q = fdi_stock.groupby('qdate')['fdi_real_estate_stock_meur'].last().reset_index().rename(
    columns={'qdate':'date','fdi_real_estate_stock_meur':'fdi_realestate_stock_meur_national'})

fdi_tot = pd.read_csv(PIPE + "bdp_fdi_total_stock_annual.csv")
rows = []
for _, r in fdi_tot.iterrows():
    for m in (1,4,7,10):
        rows.append({'date': pd.Timestamp(year=int(r['year']), month=m, day=1), 'fdi_total_stock_meur_national': r['fdi_total_stock_meur']})
fdi_tot_q = pd.DataFrame(rows)

cc = pd.read_csv(CLEAN + "construction_cost_index_monthly.csv")
cc['date'] = pd.to_datetime(cc['date'])
cc_tot = cc[cc['production_factor']=='Total'].copy()
cc_tot['qdate'] = qstart(cc_tot['date'])
cc_q = cc_tot.groupby('qdate')['yoy_growth_rate_pct'].mean().reset_index().rename(
    columns={'qdate':'date','yoy_growth_rate_pct':'construction_cost_yoy_growth_pct_national'})

pop = pd.read_csv(CLEAN + "population_by_region_annual.csv")
pop_pt = pop[(pop['geo_level']=='NUTS 2024') & (pop['region']=='Portugal')]
rows = []
for _, r in pop_pt.iterrows():
    for m in (1,4,7,10):
        rows.append({'date': pd.Timestamp(year=int(r['year']), month=m, day=1), 'population_national': r['population']})
pop_q = pd.DataFrame(rows)

national = ine_q
for d in [mort_q, fdi_tx_q, fdi_stock_q, fdi_tot_q, cc_q, pop_q]:
    national = national.merge(d, on='date', how='outer')

# ---------- 3. regional unemployment (Continente / Acores / Madeira) ----------
unemp = pd.read_csv(CLEAN + "unemployment_rate_nuts1_quarterly.csv")
unemp['date'] = pd.to_datetime(unemp['date'])
unemp_mf = unemp[unemp['sex']=='MF'][['date','region','unemployment_rate_pct']]

# ---------- 4. assemble final dataset ----------
panel = panel.merge(national, on='date', how='left')
panel['region'] = panel['district'].map(REGION_MAP)
panel = panel.merge(unemp_mf, on=['date','region'], how='left')
panel = panel.rename(columns={'unemployment_rate_pct':'unemployment_rate_pct_regional'})
panel = panel.drop(columns=['region'])

panel['year'] = panel['date'].dt.year
panel['quarter'] = panel['date'].dt.quarter
panel['period'] = panel['quarter'].astype(str) + 'T' + panel['year'].astype(str)

first_cols = ['district','period','year','quarter','date']
other_cols = [c for c in panel.columns if c not in first_cols]
panel = panel[first_cols + other_cols].sort_values(['district','date']).reset_index(drop=True)

out_path = "/home/claude/work/lisbon_housing_baseline/data/clean/district_quarter_full_dataset.csv"
panel.to_csv(out_path, index=False)
print(panel.shape)
print(panel.columns.tolist())
print(panel[panel['district']=='lisboa'].tail(6).to_string())
