import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { SavedJob } from "./types";

const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const PAGE_MARGIN = 720;
const COLUMN_WIDTHS = [1200, 2200, 1900, 1800, 1300, 1700, 2500, 1900];
const TABLE_WIDTH = COLUMN_WIDTHS.reduce((sum, value) => sum + value, 0);
const HEADER_FILL = "173F2D";
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "B8C5BC" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const HEADERS = [
  "Date",
  "Job title",
  "Employer",
  "Location",
  "Source",
  "Salary",
  "Listing / notes",
  "Result / follow-up",
];

function clean(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function nzDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function textCell(text: string, index: number, header = false) {
  return new TableCell({
    width: { size: COLUMN_WIDTHS[index], type: WidthType.DXA },
    borders: BORDERS,
    margins: { top: 80, bottom: 80, left: 90, right: 90 },
    verticalAlign: VerticalAlign.TOP,
    ...(header ? { shading: { fill: HEADER_FILL, type: ShadingType.CLEAR } } : {}),
    children: [
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text,
            bold: header,
            color: header ? "FFFFFF" : "000000",
            size: header ? 18 : 17,
            font: "Arial",
          }),
        ],
      }),
    ],
  });
}

function listingCell(job: SavedJob) {
  const children: Paragraph[] = [];
  if (job.url) {
    children.push(
      new Paragraph({
        spacing: { before: 0, after: 40 },
        children: [
          new ExternalHyperlink({
            link: job.url,
            children: [new TextRun({ text: "Open job listing", style: "Hyperlink", size: 17 })],
          }),
        ],
      }),
    );
  }
  if (clean(job.notes)) {
    children.push(new Paragraph({ children: [new TextRun({ text: clean(job.notes), size: 17 })] }));
  }
  if (!children.length) children.push(new Paragraph({ children: [new TextRun({ text: "", size: 17 })] }));

  return new TableCell({
    width: { size: COLUMN_WIDTHS[6], type: WidthType.DXA },
    borders: BORDERS,
    margins: { top: 80, bottom: 80, left: 90, right: 90 },
    verticalAlign: VerticalAlign.TOP,
    children,
  });
}

function row(job?: SavedJob) {
  if (!job) {
    return new TableRow({ children: HEADERS.map((_, index) => textCell("", index)) });
  }
  return new TableRow({
    children: [
      textCell(nzDate(job.savedAt), 0),
      textCell(clean(job.title), 1),
      textCell(clean(job.employer), 2),
      textCell(clean(job.location), 3),
      textCell(clean(job.source), 4),
      textCell(clean(job.salary) || "Not listed", 5),
      listingCell(job),
      textCell("", 7),
    ],
  });
}

export async function generateJobSearchDiary(jobs: SavedJob[]) {
  const table = new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: COLUMN_WIDTHS,
    layout: TableLayoutType.FIXED,
    alignment: AlignmentType.CENTER,
    rows: [
      new TableRow({
        tableHeader: true,
        children: HEADERS.map((heading, index) => textCell(heading, index, true)),
      }),
      ...jobs.map((job) => row(job)),
      row(),
    ],
  });

  const document = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 20 } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: PAGE_HEIGHT, orientation: PageOrientation.LANDSCAPE },
            margin: {
              top: PAGE_MARGIN,
              right: PAGE_MARGIN,
              bottom: PAGE_MARGIN,
              left: PAGE_MARGIN,
            },
          },
        },
        children: [
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: "Job Search Diary", bold: true, size: 34, color: "173F2D" })],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: "Saved job opportunities and follow-up record. Add outcomes, applications, interviews and next steps in the final column.",
                size: 20,
              }),
            ],
          }),
          table,
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(document);
  return new Uint8Array(buffer);
}
