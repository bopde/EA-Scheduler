// Sheet names
var SHEET_CONFIG = 'Config';
var SHEET_MEMBERS = 'Members';
var SHEET_AVAILABILITY = 'Availability';
var SHEET_TEAMS = 'Teams';

// Config sheet columns (1-indexed)
var COL_CONFIG_KEY = 1;
var COL_CONFIG_VAL = 2;

// Members sheet columns
var COL_MEM_NAME = 1;
var COL_MEM_ROLE = 2;
var COL_MEM_ACTIVE = 3;

// Availability sheet columns
var COL_AVAIL_NAME = 1;
var COL_AVAIL_DATE = 2;
var COL_AVAIL_SHIFT = 3;
var COL_AVAIL_AVAIL = 4;
var COL_AVAIL_TS = 5;

// Teams sheet columns
var COL_TEAM_DATE = 1;
var COL_TEAM_SHIFT = 2;
var COL_TEAM_NUM = 3;
var COL_TEAM_COORD = 4;
var COL_TEAM_MEMBERS = 5;
var COL_TEAM_FILLED = 6;
var COL_TEAM_TS = 7;

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function err(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Read entire Config sheet as key-value object
function readConfig() {
  var sheet = getSheet(SHEET_CONFIG);
  var data = sheet.getDataRange().getValues();
  var config = {};
  for (var i = 0; i < data.length; i++) {
    var key = String(data[i][COL_CONFIG_KEY - 1]).trim();
    var val = data[i][COL_CONFIG_VAL - 1];
    if (key) config[key] = val;
  }
  return config;
}

// Returns rows from a sheet as array of arrays (skips header row 1)
function readSheetData(sheetName) {
  var sheet = getSheet(sheetName);
  var all = sheet.getDataRange().getValues();
  return all.length > 1 ? all.slice(1) : [];
}

// Find row index (1-based) matching predicate, or -1
function findRow(data, predicate) {
  for (var i = 0; i < data.length; i++) {
    if (predicate(data[i])) return i + 2; // +1 for header, +1 for 1-based
  }
  return -1;
}
