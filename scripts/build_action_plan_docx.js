const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, AlignmentType, Footer, PageNumber, ExternalHyperlink,
  LevelFormat, convertInchesToTwip,
} = require("docx");
const fs = require("fs");

const FULL_W = 9360;

function cell(text, { width, bold = false, shade = null, align = AlignmentType.LEFT, color = null, size = 18 } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { type: ShadingType.CLEAR, color: "auto", fill: shade } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold, size, color: color || undefined })],
    })],
  });
}

function statusCell(status, width) {
  const have = status === "HAVE";
  const mid = status === "PARTIAL";
  const fill = have ? "E3F5EC" : mid ? "FDF3D9" : "FDEEE8";
  const col = have ? "0F7A4C" : mid ? "9A7B0A" : "B8471C";
  return cell(status, { width, bold: true, shade: fill, align: AlignmentType.CENTER, color: col });
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
          if (c && c.status) return statusCell(c.status, scaled[i]);
          if (c && c.lines) return multiCell(c.lines, scaled[i]);
          return cell(String(c), { width: scaled[i] });
        }),
      })),
    ],
  });
}

function h(text, level) {
  return new Paragraph({ text, heading: level, spacing: { before: 320, after: 140 } });
}

function p(runsOrText, opts = {}) {
  const children = Array.isArray(runsOrText) ? runsOrText : [new TextRun({ text: runsOrText, size: 20 })];
  return new Paragraph({ spacing: { after: 160, ...(opts.spacing || {}) }, children });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "plan-bullets", level },
    spacing: { after: 60 },
    children: Array.isArray(text) ? text : [new TextRun({ text, size: 20 })],
  });
}

const doc = new Document({
  numbering: {
    config: [{
      reference: "plan-bullets",
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 260 } } } },
      ],
    }],
  },
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
        children: [new TextRun({ text: "Two-Week Action Plan", bold: true, size: 32 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [new TextRun({
          text: "Foreign Investment section — Lisbon Housing Field Lab, Nova SBE — Sept 6–20, 2026",
          italics: true, size: 20, color: "595959",
        })],
      }),

      p("This covers your individual deliverable (§2.3, §3, §4.2.2, §5/6.3 — foreign investment) and what still needs to happen on the shared baseline. Built from the Field Lab brief, thesis_project_context.md, and a past Work Project from your program used as a structural example."),

      // =========================================================
      h("1. Where things stand — baseline model (shared)", HeadingLevel.HEADING_1),
      table(
        ["Item", "Status", "Note"],
        [
          [{ lines: ["TWFE pipeline (7 specs)"] }, { status: "HAVE" }, { lines: ["run_baseline.py, R² = 0.927, fully reproducible via setup.sh + one command"] }],
          [{ lines: ["Merged data file"] }, { status: "HAVE" }, { lines: ["district_quarter_full_dataset.csv — price, transactions, mortgage rate, FDI, unemployment, construction costs, population all in one table"] }],
          [{ lines: ["Pipeline re-run on merged data"] }, { status: "NEED" }, { lines: ["Old results still reflect the version without unemployment/construction costs/population. Quick to do — say the word."] }],
          [{ lines: ["Unit of analysis"] }, { status: "PARTIAL" }, { lines: ["Spec calls for freguesia × quarter; what's built is district × quarter (freguesia data isn't available as a time series — see §5 below). Needs to be stated explicitly as a scoping decision in §3.4/§6.1, not left implicit."] }],
          [{ lines: ["Immigration inflow variable"] }, { status: "NEED" }, { lines: ["Teammate's subtopic — confirm status with them this week"] }],
          [{ lines: ["Infrastructure investment proxy"] }, { status: "NEED" }, { lines: ["Teammate's subtopic"] }],
          [{ lines: ["Supply-constraint proxy"] }, { status: "NEED" }, { lines: ["Teammate's subtopic"] }],
        ],
        [26, 12, 62],
      ),

      // =========================================================
      h("2. Where things stand — your part (foreign investment)", HeadingLevel.HEADING_1),
      table(
        ["Item", "Status", "Note"],
        [
          [{ lines: ["FDI series (BdP)"] }, { status: "HAVE" }, { lines: ["Transactions, stock, total — full history 2008–2026, quarterly, national"] }],
          [{ lines: ["Golden Visa historical data"] }, { status: "HAVE" }, { lines: ["2012–2024, approvals/routes/investment/nationality, primary vs. secondary years flagged"] }],
          [{ lines: ["Lisbon freguesia prices (INE, primary)"] }, { status: "PARTIAL" }, { lines: ["Q1 2025 official INE release — 15 of 24 freguesias with exact €/m² figures, in the PDF already in your folder (16PreçosHabLocal_1T2025). One real snapshot, not a time series."] }],
          [{ lines: ["Lisbon freguesia prices (secondary)"] }, { status: "PARTIAL" }, { lines: ["Q1 2026, all 24 freguesias, third-party compilation of INE data — cite as secondary"] }],
          [{ lines: ["Foreign buyer price gap (tax residence)"] }, { status: "PARTIAL" }, { lines: ["Same INE PDF: Grande Lisboa transactions by foreign vs. domestic tax residence buyers, with a real €/m² gap — this is the exact 'buyer by tax residence' variable your context doc flagged as unsourced. Only at Grande Lisboa/sub-region level, not freguesia."] }],
          [{ lines: ["Geographic unit for the causal model"] }, { status: "NEED" }, { lines: ["Undecided: freguesia (data too thin for a real panel) vs. city-level comparison (Lisboa vs. Porto vs. 5 others, real quarterly data 2016–2021). Gates everything below — decide first."] }],
          [{ lines: ["Airbnb / tourism density"] }, { status: "NEED" }, { lines: ["Source identified (Inside Airbnb, Lisbon) — not downloaded"] }],
          [{ lines: ["Local-exposure (Bartik) construction"] }, { status: "NEED" }, { lines: ["Converts the national FDI series into something that varies geographically — depends on the unit decision above"] }],
          [{ lines: ["Heterogeneity covariates"] }, { status: "NEED" }, { lines: ["Distance to center, foreign-population share, housing stock age — none sourced yet"] }],
          [{ lines: ["Confidencial Imobiliário access"] }, { status: "NEED" }, { lines: ["Richest freguesia-level data — pending advisor/NOVA IMS protocol, don't wait on it"] }],
          [{ lines: ["DML + Causal Forest code"] }, { status: "NEED" }, { lines: ["Not started — baseline TWFE is built, the causal model isn't"] }],
          [{ lines: ["Literature review (§2.3)"] }, { status: "NEED" }, { lines: ["Source list and target journals identified; no reading/writing done yet"] }],
          [{ lines: ["The 25 pages"] }, { status: "NEED" }, { lines: ["Not started"] }],
        ],
        [26, 12, 62],
      ),

      // =========================================================
      h("3. What the guidelines actually require", HeadingLevel.HEADING_1),
      p("From the Field Lab brief and the one full example Work Project available (a completed Nova SBE Business Analytics thesis, different topic, used here only for structure/format):"),
      bullet("Deliverables: final academic thesis report, replicable ML pipeline documentation, and (optional, worth including) a dashboard tab."),
      bullet("Individual work: “Causal ML implementation (DML / Causal Forests)” is explicitly one of the four individual roles — that's your role, matched to your subtopic."),
      bullet("Collective work: research design, data collection/cleaning, model integration, policy interpretation, final presentation — coordinate these with the group, don't duplicate effort."),
      bullet("Advisor's role: methodological guidance on the causal ML, code review, feedback on drafts — use Prof. Matos for exactly this, not for data-hunting questions."),
      bullet("Structure (from the example thesis): title page → abstract → keywords → contents → shared Introduction/Data/Baseline chapters → one substantial method section per student → shared Results chapter with one subsection per student → shared Discussion/Conclusion → references → appendix. Your §5/6.3 is that “one substantial section.”"),
      bullet("Citation style in the example: author–year, references alphabetical by surname (“Lastname, First, ‘Title,’ Journal, Year, vol(issue), pages”) — use this for consistency across the group document."),
      p([new TextRun({ text: "Not found in your files: ", bold: true, size: 20 }), new TextRun({ text: "an exact page count, margin/font spec, or submission deadline. The “25 pages” figure isn't in the Field Lab brief or the example thesis — it's presumably in Nova SBE's general Work Project formatting guidelines, a separate document from the program office. Worth a 2-minute check on the program portal before you format anything, so you're not reformatting later.", size: 20 })]),

      // =========================================================
      h("4. Sources — how to move fast without losing rigor", HeadingLevel.HEADING_1),
      table(
        ["For", "Use", "Notes"],
        [
          [{ lines: ["Academic literature"] }, { lines: ["Google Scholar (primary search) → RePEc/IDEAS → BdP Working Papers → RCAAP → Nova SBE library (EBSCO/ScienceDirect/JSTOR)"] }, { lines: ["Target journals: Journal of Housing Economics, Journal of Urban Economics, Regional Science and Urban Economics. I can run this search and draft a first-pass literature synthesis for you to edit — faster than reading 20 papers cold."] }],
          [{ lines: ["Reference management"] }, { lines: ["Zotero (free)"] }, { lines: ["Matches the author–year style in the example thesis; browser plug-in saves a citation in one click while you search"] }],
          [{ lines: ["Data already sourced"] }, { lines: ["See tables above + prior deliverables this session"] }, { lines: ["Don't re-search these — Golden Visa CSV, FDI series, freguesia snapshots, district panel are all done"] }],
          [{ lines: ["Causal ML method background"] }, { lines: ["econml / DoubleML documentation + the original Chernozhukov et al. (2018) DML paper and Wager & Athey (2018) causal forests paper"] }, { lines: ["These two papers are close to mandatory citations for §4.2.2/§5 — read them first, everything else builds on them"] }],
        ],
        [18, 40, 42],
      ),

      // =========================================================
      h("5. The one decision that unblocks everything", HeadingLevel.HEADING_1),
      p("Freguesia-level Lisbon prices exist (confirmed — INE tracks all 24) but only as two disconnected snapshots (Q1 2025, Q1 2026), not a quarterly panel. A causal forest needs many time-varying observations to split on; two points can't support that. Two honest paths:"),
      bullet([new TextRun({ text: "City comparison (recommended given the timeline): ", bold: true, size: 20 }), new TextRun({ text: "Lisboa vs. Porto vs. 5 other cities, real quarterly data 2016–2021 already in hand. Use DiD / panel regression rather than a causal forest — more standard, matches the data you actually have, and is defensible to write up in the time left.", size: 20 })]),
      bullet([new TextRun({ text: "Freguesia (higher risk): ", bold: true, size: 20 }), new TextRun({ text: "Use the two snapshots as a descriptive/motivating exhibit only (e.g. “prices diverged 12% between high- and low-FDI-exposure freguesias in one year”), not as the panel the causal model runs on. Only worth pursuing further if Confidencial Imobiliário access comes through soon — don't wait on it.", size: 20 })]),
      p([new TextRun({ text: "Decide this in the next 1–2 days ", bold: true, size: 20 }), new TextRun({ text: "— the Bartik instrument, the heterogeneity covariates, and the DML/Causal Forest code all depend on which unit you pick.", size: 20 })]),

      // =========================================================
      h("6. Day-by-day (Sept 6 – 20)", HeadingLevel.HEADING_1),
      h("Week 1 — decide, finish data, start literature", HeadingLevel.HEADING_2),
      table(
        ["Days", "Task", "Who"],
        [
          [{ lines: ["Sun–Mon (7–8)"] }, { lines: ["Decide geographic unit (§5). Check Nova SBE portal for formal page/format guidelines."] }, { lines: ["You"] }],
          [{ lines: ["Mon (8)"] }, { lines: ["Re-run baseline pipeline on the merged dataset; regenerate tables/figures/write-up"] }, { lines: ["Me, on request"] }],
          [{ lines: ["Tue–Wed (9–10)"] }, { lines: ["Literature search + first-draft synthesis for §2.3 (foreign investment lit review)"] }, { lines: ["Me first pass, you edit"] }],
          [{ lines: ["Tue–Wed (9–10)"] }, { lines: ["Download Airbnb data; extract remaining freguesia figures from the INE PDF you have (Porto too, if useful for city comparison)"] }, { lines: ["You / me"] }],
          [{ lines: ["Thu–Fri (11–12)"] }, { lines: ["Build treatment variables: Golden Visa indicator (have it), foreign-buyer-share proxy, local-exposure/Bartik conversion of the FDI series"] }, { lines: ["Me"] }],
          [{ lines: ["Weekend (12–13)"] }, { lines: ["Read Chernozhukov et al. (2018) and Wager & Athey (2018) — needed before writing §4.2.2/§5"] }, { lines: ["You"] }],
        ],
        [16, 60, 24],
      ),
      h("Week 2 — model, write, polish", HeadingLevel.HEADING_2),
      table(
        ["Days", "Task", "Who"],
        [
          [{ lines: ["Mon–Tue (14–15)"] }, { lines: ["Implement DML for the average treatment effect (econml or DoubleML)"] }, { lines: ["Me + you reviewing"] }],
          [{ lines: ["Wed (16)"] }, { lines: ["Causal Forest for heterogeneous effects; generate figures"] }, { lines: ["Me + you reviewing"] }],
          [{ lines: ["Thu (17)"] }, { lines: ["No-Golden-Visa counterfactual simulation"] }, { lines: ["Me"] }],
          [{ lines: ["Fri–Sat (18–19)"] }, { lines: ["Write §2.3, §3 (your part), §4.2.2, §5/6.3 — draft from results + lit synthesis, you add interpretation/voice"] }, { lines: ["Me draft, you rewrite in your voice"] }],
          [{ lines: ["Sun (20)"] }, { lines: ["Merge into shared group document, check formatting/citation consistency against the guidelines, send to Prof. Matos"] }, { lines: ["You"] }],
        ],
        [16, 60, 24],
      ),

      p([new TextRun({ text: "This is tight but doable if the unit decision happens now, not week 2. ", bold: true, size: 20 }), new TextRun({ text: "The literature review and the write-up are the two steps most likely to run long — hand me the drafting load on both and spend your own time on the parts that need your judgment: the geography decision, reading the two core methodology papers, and rewriting the draft into your own voice.", size: 20 })]),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/home/claude/work/lisbon_housing_baseline/outputs/two_week_action_plan.docx", buf);
  console.log("written");
});
