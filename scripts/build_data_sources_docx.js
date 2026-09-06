const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, AlignmentType, Footer, PageNumber, ExternalHyperlink,
} = require("docx");
const fs = require("fs");

const FULL_W = 9360; // 6.5in usable at 1440 dxa/in, Letter, 1in margins

function cell(text, { width, bold = false, shade = null, align = AlignmentType.LEFT } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { type: ShadingType.CLEAR, color: "auto", fill: shade } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold, size: 19 })],
    })],
  });
}

function linkCell(text, url, { width, shade = null } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { type: ShadingType.CLEAR, color: "auto", fill: shade } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      children: [new ExternalHyperlink({
        link: url,
        children: [new TextRun({ text, size: 19, color: "2a78d6", underline: {} })],
      })],
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
        children: r.map((c, i) => {
          if (typeof c === "object" && c.url) return linkCell(c.text, c.url, { width: scaled[i] });
          return cell(String(c), { width: scaled[i] });
        }),
      })),
    ],
  });
}

function h(text, level) {
  return new Paragraph({ text, heading: level, spacing: { before: 280, after: 140 } });
}

function p(runsOrText, opts = {}) {
  const children = Array.isArray(runsOrText) ? runsOrText : [new TextRun({ text: runsOrText })];
  return new Paragraph({ spacing: { after: 160, ...(opts.spacing || {}) }, children });
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
        children: [new TextRun({ text: "Data Sources", bold: true, size: 32 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [new TextRun({
          text: "Lisbon Housing Baseline — Nova SBE Business Analytics Field Lab, Fall 2025/2026",
          italics: true, size: 20, color: "595959",
        })],
      }),

      p("Two groups of files. Group A was already in the project's Master Thesis folder. Group B was fetched live from Banco de Portugal during this analysis. All six files are used by the baseline pipeline and live in data/ inside the pipeline package."),

      h("Group A — files already in the project folder (Master Thesis/archive/)", HeadingLevel.HEADING_2),
      table(
        ["File", "What it is", "Source", "Coverage"],
        [
          ["idealista_prices_consolidated.csv", "District-level asking price per sqm (sale + rental), long format — the file the pipeline actually uses", "idealista/data (idealista's market-data arm)", "20 Portuguese districts + national, monthly, 2015-01 to 2025-03"],
          ["idealista_prices_consolidated_wide.csv", "Same data, pivoted wide (one column per district)", "idealista/data", "Same as above — not used directly; kept for reference"],
          ["ine_transaction_data.csv", "National quarterly property transaction counts, values, and price/volume indices", "INE (Instituto Nacional de Estatística)", "National only, quarterly, 2009 to 2025"],
        ],
        [26, 32, 22, 20],
      ),

      h("Group B — files fetched during this session (not originally in the folder)", HeadingLevel.HEADING_2),
      table(
        ["File", "What it is", "Source", "Coverage"],
        [
          ["bdp_mortgage_rate_fixed.csv", "Interest rate on new fixed-rate residential mortgage loans", { text: "Banco de Portugal, BPstat, series 12710780", url: "https://bpstat.bportugal.pt/serie/12710780" }, "National only, monthly, 2018-12 to 2026-06"],
          ["bdp_fdi_realestate_quarterly.csv", "Inward foreign direct investment into real estate, quarterly transactions (EUR million)", { text: "Banco de Portugal, BPstat, series 12565842", url: "https://bpstat.bportugal.pt/serie/12565842" }, "National only, quarterly, 2008 Q1 to 2026 Q1"],
          ["bdp_fdi_total_stock_annual.csv", "Total inward FDI, all countries, annual stock (EUR million)", { text: "Banco de Portugal, BPstat, series 12573788", url: "https://bpstat.bportugal.pt/serie/12573788" }, "National only, annual, 2008 to 2025"],
        ],
        [26, 32, 22, 20],
      ),

      p([
        new TextRun({ text: "These were pulled through BPstat's public data API (", size: 20 }),
        new TextRun({ text: "bpstat.bportugal.pt/data/v1", italics: true, size: 20 }),
        new TextRun({ text: "). The series pages linked above are the human-readable version of the same numbers, so any value can be spot-checked against the site directly.", size: 20 }),
      ], { spacing: { before: 120 } }),

      h("What's not in here yet (gaps, not oversights)", HeadingLevel.HEADING_2),
      p("The baseline's full specification also calls for population, unemployment, construction costs, and immigration data at district level. These were searched for and could not be found broken down by district — Portugal's official statistics (INE, PORDATA) publish by municipality or NUTS region, not by the \"distrito\" labels idealista uses — so no numbers were approximated or guessed. This is documented as an explicit limitation in Section 6 of baseline_model_section.docx, with suggested sources to pursue next. No result in the baseline depends on these missing series."),

      h("Bottom line", HeadingLevel.HEADING_2),
      p("Everything the baseline regression uses is national- or district-level, real, and traceable to the sources above."),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("../outputs/DATA_SOURCES.docx", buf);
  console.log("written");
});
