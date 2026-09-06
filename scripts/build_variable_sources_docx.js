const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, AlignmentType, Footer, PageNumber, ExternalHyperlink,
} = require("docx");
const fs = require("fs");

const FULL_W = 9360;

function cell(text, { width, bold = false, shade = null, align = AlignmentType.LEFT, color = null } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { type: ShadingType.CLEAR, color: "auto", fill: shade } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold, size: 18, color: color || undefined })],
    })],
  });
}

function statusCell(status, width) {
  const have = status === "HAVE";
  return cell(status, { width, bold: true, shade: have ? "E3F5EC" : "FDEEE8", align: AlignmentType.CENTER, color: have ? "0F7A4C" : "B8471C" });
}

function multiCell(lines, width, { shade = null } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { type: ShadingType.CLEAR, color: "auto", fill: shade } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: lines.map((l, i) => new Paragraph({
      spacing: { after: i === lines.length - 1 ? 0 : 40 },
      children: Array.isArray(l) ? l : [new TextRun({ text: l, size: 18 })],
    })),
  });
}

function link(text, url) {
  return new ExternalHyperlink({ link: url, children: [new TextRun({ text, size: 18, color: "2a78d6", underline: {} })] });
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
        children: r.map((c, i) => {
          if (c.status) return statusCell(c.status, scaled[i]);
          if (c.lines) return multiCell(c.lines, scaled[i]);
          return cell(String(c), { width: scaled[i] });
        }),
      })),
    ],
  });
}

function h(text, level) {
  return new Paragraph({ text, heading: level, spacing: { before: 320, after: 140 } });
}

function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 160, ...(opts.spacing || {}) }, children: [new TextRun({ text, size: 20 })] });
}

const doc = new Document({
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1080, right: 1080 } },
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
        children: [new TextRun({ text: "Variable Source Map", bold: true, size: 32 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [new TextRun({
          text: "Every variable in both models — what's already sourced, and where to get what's missing",
          italics: true, size: 20, color: "595959",
        })],
      }),

      p("This is the single reference for data retrieval — matches the HAVE/NEED tags in the model diagram. \"HAVE\" means the file is already in data/ in the pipeline. \"NEED\" means a source has been identified but the data hasn't been pulled in yet."),

      h("Baseline model (group benchmark)", HeadingLevel.HEADING_1),
      table(
        ["Variable", "Status", "Source", "Where to get it"],
        [
          [{ lines: ["House price (DV)"] }, { status: "HAVE" }, { lines: ["idealista/data"] }, { lines: ["Already in data/idealista_prices_consolidated.csv — district-level, monthly, 2015–2025"] }],
          [{ lines: ["Transaction volume / value index"] }, { status: "HAVE" }, { lines: ["INE"] }, { lines: ["Already in data/ine_transaction_data.csv — national, quarterly, 2009–2025"] }],
          [{ lines: ["Mortgage rate"] }, { status: "HAVE" }, { lines: ["Banco de Portugal, BPstat"] }, { lines: ["Already in data/bdp_mortgage_rate_fixed.csv — series 12710780"] }],
          [{ lines: ["Construction costs"] }, { status: "NEED" }, { lines: ["INE — Índice de custo de construção de habitação nova (base 2021)"] }, { lines: ["Search ine.pt or dados.gov.pt for that exact title; exact download link not yet confirmed"] }],
          [{ lines: ["Unemployment / income"] }, { status: "NEED" }, { lines: ["INE / PORDATA"] }, { lines: ["Only found at municipality/NUTS level, not district — would need aggregation up to district"] }],
          [{ lines: ["Population"] }, { status: "NEED" }, { lines: ["INE — Estimativas anuais da população residente"] }, { lines: ["PORDATA has municipality-level; district-level not yet located"] }],
        ],
        [20, 10, 22, 38],
      ),

      h("Foreign investment model (your subtopic)", HeadingLevel.HEADING_1),
      table(
        ["Variable", "Status", "Source", "Where to get it"],
        [
          [{ lines: ["House price (Y) — district"] }, { status: "HAVE" }, { lines: ["idealista/data"] }, { lines: ["Same file as baseline — data/idealista_prices_consolidated.csv"] }],
          [{ lines: ["House price (Y) — freguesia, Lisbon"] }, { status: "NEED" }, { lines: ["INE — Preços da Habitação ao Nível Local"] }, { lines: ["Search \"Preços da Habitação ao Nível Local\" on ine.pt (or site:ine.pt on Google). Interactive map at geohab.ine.pt covers Lisboa at freguesia level but is view-only, no export confirmed."] }],
          [{ lines: ["FDI real estate — transactions"] }, { status: "HAVE" }, { lines: ["Banco de Portugal, BPstat"] }, { lines: ["Already in data/bdp_fdi_realestate_quarterly.csv — series 12565842. National only — needs local-exposure conversion (Bartik-style) to vary by freguesia"] }],
          [{ lines: ["FDI real estate — stock"] }, { status: "NEED" }, { lines: ["Banco de Portugal, BPstat"] }, { lines: [[link("bpstat.bportugal.pt/serie/12571296", "https://bpstat.bportugal.pt/serie/12571296"), new TextRun({text: " — series identified, not yet pulled in", size: 18})]] }],
          [{ lines: ["FDI total (denominator)"] }, { status: "HAVE" }, { lines: ["Banco de Portugal, BPstat"] }, { lines: ["Already in data/bdp_fdi_total_stock_annual.csv — series 12573788"] }],
          [{ lines: ["Foreign buyer share (nationality / tax residence)"] }, { status: "NEED" }, { lines: ["INE, within the Preços da Habitação ao Nível Local release"] }, { lines: ["Same release as freguesia prices above — look for the nationality/tax-residence table inside the quarterly \"Quadros\" (tables) attachment"] }],
          [{ lines: ["Foreign buyer share — freguesia, transaction-level (richest)"] }, { status: "NEED" }, { lines: ["Confidencial Imobiliário — SIR / Foreign Buyer Index"] }, { lines: ["Paid/institutional. Possible NOVA IMS cooperation protocol (2021, unconfirmed) — pending Prof. Matos"] }],
          [{ lines: ["Foreign buyer headline stats (citable, not raw data)"] }, { status: "HAVE" }, { lines: ["Confidencial Imobiliário, via press"] }, { lines: [[link("dinheirovivo.dn.pt", "https://dinheirovivo.dn.pt/economia/estrangeiros-compraram-1392-casas-em-lisboa-no-ano-passado-menos-s-em-2017"), new TextRun({text: " — 2025 Lisbon foreign-buyer figures, citable with attribution", size: 18})]] }],
          [{ lines: ["Golden Visa pre/post indicator"] }, { status: "NEED" }, { lines: ["AIMA — Observatório das Migrações"] }, { lines: [[link("om.aima.gov.pt", "https://om.aima.gov.pt"), new TextRun({text: " — historical ARI data 2012–2023 (route closed Oct. 2023); could not fetch directly, check statistics section manually", size: 18})]] }],
          [{ lines: ["Pre-treatment price trend"] }, { status: "HAVE" }, { lines: ["Constructed from price data above"] }, { lines: ["Derived variable (lagged log price) — no separate source needed once price panel is built"] }],
          [{ lines: ["Tourism / short-term rental density"] }, { status: "NEED" }, { lines: ["Inside Airbnb, via Kaggle"] }, { lines: [[link("kaggle.com/datasets/maurylukas/listings", "https://www.kaggle.com/datasets/maurylukas/listings"), new TextRun({text: " — 2021 Lisbon Airbnb data, identified but not pulled into pipeline", size: 18})]] }],
          [{ lines: ["Local income, employment"] }, { status: "NEED" }, { lines: ["Same gap as baseline"] }, { lines: ["See Unemployment / income row above"] }],
          [{ lines: ["Construction / supply activity"] }, { status: "NEED" }, { lines: ["INE — Estatísticas da Construção e Habitação"] }, { lines: ["Exact download link not yet verified — search that title on ine.pt"] }],
          [{ lines: ["Heterogeneity: distance to center / tourist zones"] }, { status: "NEED" }, { lines: ["Constructed from freguesia geospatial boundaries"] }, { lines: ["Needs a freguesia shapefile/GeoJSON (e.g. from CAOP, INE's official admin boundaries) — not yet sourced"] }],
          [{ lines: ["Heterogeneity: existing foreign-population share"] }, { status: "NEED" }, { lines: ["INE / AIMA migration statistics"] }, { lines: ["Concelho-level AIMA data exists; freguesia-level not yet confirmed"] }],
          [{ lines: ["Heterogeneity: housing stock type / age"] }, { status: "NEED" }, { lines: ["INE — Census (Recenseamento) 2021"] }, { lines: ["Freguesia-level building-age tables — not yet sourced"] }],
        ],
        [20, 10, 22, 38],
      ),

      h("Cross-country benchmark (optional, context only)", HeadingLevel.HEADING_1),
      table(
        ["Variable", "Status", "Source", "Where to get it"],
        [
          [{ lines: ["FDI by sector (NACE), EU-comparable"] }, { status: "NEED" }, { lines: ["Eurostat"] }, { lines: [[link("bop_fdi6_pos databrowser", "https://ec.europa.eu/eurostat/databrowser/view/BOP_FDI6_POS/default/table?lang=en&category=bop_6.bop_fdi6"), new TextRun({text: " — filter to NACE L, Real estate activities", size: 18})]] }],
          [{ lines: ["FDI sector split, narrative context"] }, { status: "HAVE" }, { lines: ["AICEP Portugal Global, via press"] }, { lines: ["Citable headline figures (e.g. real estate share of total FDI) — not raw data"] }],
        ],
        [20, 10, 22, 38],
      ),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("../outputs/variable_source_map.docx", buf);
  console.log("written");
});
