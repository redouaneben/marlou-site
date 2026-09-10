/**
 * Les Bons Plats de Marlou — Mise en forme Google Sheets
 *
 * 1. Ouvrez votre feuille menu-semaine importée
 * 2. Extensions → Apps Script
 * 3. Collez ce fichier, enregistrez
 * 4. Lancez « applyMarlouTheme » (autoriser l'accès la 1re fois)
 * 5. Revenez sur la feuille : tout est mis en forme automatiquement
 */

const COLORS = {
  cream: "#F5EBE0",
  creamLight: "#FFFCF8",
  chocolate: "#4E2A21",
  terracotta: "#BC5A38",
  white: "#FFFFFF",
};

function applyMarlouTheme() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = 8;

  sheet.getRange(1, 1, lastRow, lastCol).setFontFamily("Arial").setFontColor(COLORS.chocolate);

  formatTitleBlock_(sheet);
  formatPlatsTable_(sheet);
  formatConfigBlock_(sheet);
  formatCreneauxBlock_(sheet);

  sheet.setColumnWidth(1, 50);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 60);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(5, 280);
  sheet.setColumnWidth(6, 220);
  sheet.setColumnWidth(7, 260);
  sheet.setColumnWidth(8, 60);

  SpreadsheetApp.getActiveSpreadsheet().toast("Mise en forme Marlou appliquée ✓", "Les Bons Plats de Marlou", 4);
}

function formatTitleBlock_(sheet) {
  sheet.getRange("A1:H1").merge()
    .setValue(sheet.getRange("A1").getValue())
    .setBackground(COLORS.chocolate)
    .setFontColor(COLORS.white)
    .setFontWeight("bold")
    .setFontSize(14)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheet.getRange("A2:H2").merge()
    .setBackground(COLORS.terracotta)
    .setFontColor(COLORS.white)
    .setFontSize(10)
    .setFontStyle("italic")
    .setHorizontalAlignment("center");

  sheet.setRowHeight(1, 42);
  sheet.setRowHeight(2, 28);
}

function findRowByColumnA_(sheet, pattern) {
  const values = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
  for (let i = 0; i < values.length; i++) {
    const cell = String(values[i][0]);
    if (pattern.test(cell)) return i + 1;
  }
  return -1;
}

function formatPlatsTable_(sheet) {
  const headerRow = findRowByColumnA_(sheet, /^id$/i);
  if (headerRow === -1) return;

  const dataStart = headerRow;
  const configRow = findRowByColumnA_(sheet, /^——— Réglages/i);
  const lastDataRow = configRow > 0 ? configRow - 2 : sheet.getLastRow();

  const headerRange = sheet.getRange(headerRow, 1, 1, 8);
  headerRange
    .setBackground(COLORS.chocolate)
    .setFontColor(COLORS.white)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setWrap(true);

  if (lastDataRow > headerRow) {
    const bodyRange = sheet.getRange(headerRow + 1, 1, lastDataRow - headerRow, 8);
    bodyRange.setBackground(COLORS.cream).setWrap(true).setVerticalAlignment("top");

    for (let r = headerRow + 1; r <= lastDataRow; r++) {
      if ((r - headerRow) % 2 === 0) {
        sheet.getRange(r, 1, 1, 8).setBackground(COLORS.creamLight);
      }
    }

    sheet.getRange(headerRow + 1, 3, lastDataRow - headerRow, 1).setNumberFormat("#,##0.0");
    sheet.getRange(headerRow + 1, 8, lastDataRow - headerRow, 1).setHorizontalAlignment("center");
  }

  sheet.setFrozenRows(headerRow);
}

function formatConfigBlock_(sheet) {
  const startRow = findRowByColumnA_(sheet, /^——— Réglages/i);
  if (startRow === -1) return;

  const creneauxRow = findRowByColumnA_(sheet, /^——— Créneaux/i);
  const endRow = creneauxRow > 0 ? creneauxRow - 1 : startRow + 8;

  sheet.getRange(startRow, 1, 1, 8).merge()
    .setBackground(COLORS.terracotta)
    .setFontColor(COLORS.white)
    .setFontWeight("bold");

  for (let r = startRow + 1; r <= endRow; r++) {
    sheet.getRange(r, 1).setBackground(COLORS.terracotta).setFontColor(COLORS.white).setFontWeight("bold");
    sheet.getRange(r, 2, 1, 7).setBackground(COLORS.creamLight).setWrap(true);
  }
}

function formatCreneauxBlock_(sheet) {
  const startRow = findRowByColumnA_(sheet, /^——— Créneaux/i);
  if (startRow === -1) return;

  const headerRow = startRow + 1;
  const lastRow = sheet.getLastRow();

  sheet.getRange(startRow, 1, 1, 8).merge()
    .setBackground(COLORS.terracotta)
    .setFontColor(COLORS.white)
    .setFontWeight("bold");

  sheet.getRange(headerRow, 1, 1, 2)
    .setBackground(COLORS.chocolate)
    .setFontColor(COLORS.white)
    .setFontWeight("bold");

  if (lastRow > headerRow) {
    sheet.getRange(headerRow + 1, 1, lastRow - headerRow, 2)
      .setBackground(COLORS.cream)
      .setWrap(true);
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Marlou")
    .addItem("Appliquer la mise en forme", "applyMarlouTheme")
    .addToUi();
}
