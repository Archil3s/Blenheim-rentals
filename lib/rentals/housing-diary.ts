import JSZip from "jszip";
import type { Rental } from "./types";

const TEMPLATE_PATH = "public/templates/Blenheim rental housing diary.docx";
const DATA_ROW_INDEXES = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16];

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function compact(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function checked(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
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

function notes(rental: Rental) {
  const facts = [
    rental.bedrooms != null ? `${rental.bedrooms} bed` : "",
    rental.bathrooms != null ? `${rental.bathrooms} bath` : "",
    compact(rental.notes),
    `Source: ${rental.source}`,
  ].filter(Boolean);
  return facts.join("; ");
}

function result(rental: Rental) {
  const outcome = compact(rental.outcome) || "Available at last check";
  const followUp = compact(rental.followUpAction) || "Open listing and contact property manager";
  return `${outcome}\nFollow up: ${followUp}`;
}

function rowValues(rental: Rental) {
  return [
    checked(rental.checkedAt),
    compact(rental.contactType) || "Online",
    `${compact(rental.propertyType) || "Private rental"}\n${money(rental.rent)}`,
    rental.address,
    compact(rental.contactName) || compact(rental.propertyManager) || rental.source,
    contactDetails(rental),
    notes(rental),
    result(rental),
  ];
}

function paragraphXml(text: string) {
  const pieces = text.split(/\r?\n/);
  const body = pieces
    .map((piece, index) => {
      const run = `<w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t xml:space="preserve">${xmlEscape(piece)}</w:t></w:r>`;
      return index === pieces.length - 1 ? run : `${run}<w:r><w:br/></w:r>`;
    })
    .join("");
  return `<w:p>${body}</w:p>`;
}

function replaceCellText(rowXml: string, cellIndex: number, text: string) {
  const matches = [...rowXml.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)];
  const match = matches[cellIndex];
  if (!match || match.index == null) return rowXml;

  const original = match[0];
  const replacement = original.replace(
    /(<w:tcPr>[\s\S]*?<\/w:tcPr>)[\s\S]*?(<\/w:tc>)/,
    `$1${paragraphXml(text)}$2`,
  );

  return `${rowXml.slice(0, match.index)}${replacement}${rowXml.slice(match.index + original.length)}`;
}

function fillTable(documentXml: string, rentals: Rental[]) {
  const tableMatch = documentXml.match(/<w:tbl\b[\s\S]*?<\/w:tbl>/);
  if (!tableMatch || tableMatch.index == null) {
    throw new Error("Housing diary table was not found in the template");
  }

  const table = tableMatch[0];
  const rows = [...table.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)];
  let filledTable = table;
  let offset = 0;

  DATA_ROW_INDEXES.forEach((rowIndex, exportIndex) => {
    const row = rows[rowIndex];
    if (!row || row.index == null) return;

    let rowXml = row[0];
    const values = rentals[exportIndex] ? rowValues(rentals[exportIndex]) : Array(8).fill("");
    values.forEach((value, cellIndex) => {
      rowXml = replaceCellText(rowXml, cellIndex, value);
    });

    const start = row.index + offset;
    filledTable = `${filledTable.slice(0, start)}${rowXml}${filledTable.slice(start + row[0].length)}`;
    offset += rowXml.length - row[0].length;
  });

  return `${documentXml.slice(0, tableMatch.index)}${filledTable}${documentXml.slice(
    tableMatch.index + table.length,
  )}`;
}

function fillClientName(headerXml: string, clientName: string) {
  const safe = xmlEscape(clientName.trim());
  return headerXml.replace(
    /<w:t>Name:\s*_*<\/w:t>/,
    `<w:t xml:space="preserve">Name: ${safe}</w:t>`,
  );
}

export async function generateHousingDiary(
  templateBytes: Uint8Array,
  clientName: string,
  rentals: Rental[],
) {
  const zip = await JSZip.loadAsync(templateBytes);
  const documentFile = zip.file("word/document.xml");
  const headerFile = zip.file("word/header2.xml");
  if (!documentFile || !headerFile) throw new Error("Housing diary template is incomplete");

  const documentXml = await documentFile.async("string");
  const headerXml = await headerFile.async("string");

  zip.file("word/document.xml", fillTable(documentXml, rentals.slice(0, 15)));
  zip.file("word/header2.xml", fillClientName(headerXml, clientName));

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export { TEMPLATE_PATH };
