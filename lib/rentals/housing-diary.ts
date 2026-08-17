import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  Packer,
  PageBreak,
  PageOrientation,
  Paragraph,
  ShadingType,
  TabStopType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { Rental } from "./types";

const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const PAGE_MARGIN = 720;
const COLUMN_WIDTHS = [1129, 1560, 1984, 2299, 1744, 1744, 3002, 1701];
const TABLE_WIDTH = COLUMN_WIDTHS.reduce((sum, width) => sum + width, 0);
const HEADER_FILL = "8E0000";
const HEADING_RED = "C00000";
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

const LONG_HEADERS = [
  "Date",
  "Contact type – How did you find the property, face to face, online",
  "Property type/price E.G hostel, Private rental",
  "Property address",
  "Contact Person – Who did you speak to?",
  "Phone or email – What is their contact details",
  "Notes.",
  "Result or follow up action – add star for rating",
];

const SHORT_HEADERS = [
  "Date",
  "Contact type",
  "Property type/price",
  "Property address",
  "Contact Person",
  "Phone or email",
  "Notes",
  "Result or follow up action",
];

function compact(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function checkedDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function money(rent: number | null) {
  return rent == null ? "Rent TBC" : `$${Math.round(rent)} pw`;
}

function contactDetails(rental: Rental) {
  const values = [compact(rental.contactPhone), compact(rental.contactEmail)].filter(
    (value) => value && value.toLowerCase() !== "see original listing",
  );
  return values.length ? values.join("\n") : "See original listing";
}

function listingNotes(rental: Rental) {
  const values = [
    rental.bedrooms != null ? `${rental.bedrooms} bed` : "",
    rental.bathrooms != null ? `${rental.bathrooms} bath` : "",
    compact(rental.notes),
    `Source: ${rental.source}`,
  ].filter(Boolean);
  return values.join("; ");
}

function resultAndFollowUp(rental: Rental) {
  const outcome = compact(rental.outcome) || "Available at last check";
  const followUp = compact(rental.followUpAction) || "Open listing and contact property manager";
  const rating = rental.rating ? ` ${"★".repeat(Math.min(5, rental.rating))}` : "";
  return `${outcome}${rating}\nFollow up: ${followUp}`;
}

function rentalValues(rental?: Rental) {
  if (!rental) return Array(8).fill("");
  return [
    checkedDate(rental.checkedAt),
    compact(rental.contactType) || "Online",
    `${compact(rental.propertyType) || "Private rental"}\n${money(rental.rent)}`,
    rental.address,
    compact(rental.contactName) || compact(rental.propertyManager) || rental.source,
    contactDetails(rental),
    listingNotes(rental),
    resultAndFollowUp(rental),
  ];
}

function cellParagraphs(value: string, options?: { bold?: boolean; color?: string; size?: number }) {
  const lines = value.split(/\r?\n/);
  return (lines.length ? lines : [""]).map(
    (line) =>
      new Paragraph({
        spacing: { after: 0, before: 0 },
        children: [
          new TextRun({
            text: line,
            bold: options?.bold,
            color: options?.color,
            size: options?.size ?? 16,
            font: "Arial",
          }),
        ],
      }),
  );
}

function tableCell(value: string, index: number, header = false) {
  return new TableCell({
    width: { size: COLUMN_WIDTHS[index], type: WidthType.DXA },
    borders: BORDERS,
    margins: { top: 70, bottom: 70, left: 80, right: 80 },
    verticalAlign: VerticalAlign.TOP,
    ...(header
      ? { shading: { fill: HEADER_FILL, type: ShadingType.CLEAR } }
      : {}),
    children: cellParagraphs(value, {
      bold: header,
      color: header ? "FFFFFF" : "000000",
      size: header ? 18 : 16,
    }),
  });
}

function headerRow(headers: string[]) {
  return new TableRow({
    tableHeader: true,
    children: headers.map((value, index) => tableCell(value, index, true)),
  });
}

function dataRow(rental?: Rental) {
  const values = rentalValues(rental);
  return new TableRow({
    height: { value: 850, rule: HeightRule.ATLEAST },
    children: values.map((value, index) => tableCell(value, index, false)),
  });
}

function diaryTable(rentals: Array<Rental | undefined>, headers: string[]) {
  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: COLUMN_WIDTHS,
    layout: TableLayoutType.FIXED,
    alignment: AlignmentType.CENTER,
    rows: [headerRow(headers), ...rentals.map(dataRow)],
  });
}

function pageHeading(clientName: string) {
  return [
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: TABLE_WIDTH }],
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: "CMM Emergency Housing Navigator – Housing Search Diary",
          color: HEADING_RED,
          font: "Arial",
          size: 30,
        }),
        new TextRun({
          text: `\tKaewa/Client Name: ${clientName}`,
          color: HEADING_RED,
          font: "Arial",
          size: 30,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 55 },
      children: [
        new TextRun({ text: "____________________________", color: HEADING_RED, size: 18 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 95 },
      children: [
        new TextRun({
          text: "Whilst you are in Emergency/Transitional Housing you are required to fill this diary in weekly and present to your EH/TH Support Worker every Friday before 12noon by text msg ",
          font: "Arial",
          size: 20,
        }),
        new TextRun({ text: "027 330 5252", color: "4472C4", font: "Arial", size: 20 }),
        new TextRun({ text: " or call ", font: "Arial", size: 20 }),
        new TextRun({ text: "0800432 536", color: "4472C4", font: "Arial", size: 20 }),
        new TextRun({ text: "or via email: ", font: "Arial", size: 20 }),
        new TextRun({
          text: "[Daniel.dutoit@mmsi.org,nz]",
          color: "4472C4",
          font: "Arial",
          size: 20,
        }),
        new TextRun({
          text: ". Failing to do so is failing to meet EH/TH obligations to CMM and WINZ.",
          font: "Arial",
          size: 20,
        }),
      ],
    }),
  ];
}

function blankRentalSlots(rentals: Rental[], start: number, count: number) {
  return Array.from({ length: count }, (_, index) => rentals[start + index]);
}

export async function generateHousingDiary(clientName: string, rentals: Rental[]) {
  const selected = rentals.slice(0, 15);
  const children = [
    ...pageHeading(clientName),
    diaryTable(blankRentalSlots(selected, 0, 7), LONG_HEADERS),
    new Paragraph({ children: [new PageBreak()] }),
    ...pageHeading(clientName),
    diaryTable(blankRentalSlots(selected, 7, 7), SHORT_HEADERS),
    new Paragraph({ children: [new PageBreak()] }),
    ...pageHeading(clientName),
    diaryTable(blankRentalSlots(selected, 14, 1), SHORT_HEADERS),
  ];

  const document = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 20 },
          paragraph: { spacing: { after: 0, before: 0 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: {
              top: PAGE_MARGIN,
              right: PAGE_MARGIN,
              bottom: PAGE_MARGIN,
              left: PAGE_MARGIN,
              header: 708,
              footer: 708,
            },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(document);
  return new Uint8Array(buffer);
}
