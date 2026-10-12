/**
 * Krystyn's Cookie Cottage: order form backend.
 *
 * Lives inside the Google Sheet (Extensions > Apps Script). The website's order form posts here:
 *   - each inquiry becomes a row on the "Orders" tab
 *   - inspiration photos go into Drive: "Order Photos" > "<Name> <M-D>"
 *   - an email goes to NOTIFY_EMAIL
 *   - dates on the "Booked dates" tab are refused
 *
 * Setup: order-form-setup.md
 */

// Where order emails go. Blank = the Google account that owns this script.
const NOTIFY_EMAIL = '';
// Only needed if this script was created on its own at script.google.com (not from the sheet's
// Extensions menu): paste the sheet's ID, the long part of its address between /d/ and /edit.
const SPREADSHEET_ID = '';
const VERSION = '2026-10-12 dates-fix-2';
const ORDERS_TAB = 'Orders';
const BOOKED_TAB = 'Booked dates';
const PHOTOS_FOLDER = 'Order Photos';
const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
const ORDER_HEADERS = ['Received', 'Name', 'Email', 'Phone', 'Date needed', 'Occasion', 'How many dozen', 'Flavors',
  'Theme, colors and details', 'Inspiration photos', 'Status', 'Quote', 'Notes'];

/** Run once from the editor (select "setup", then Run) to approve access. */
function setup() {
  ordersSheet_();
  photosRoot_();
  Logger.log('Ready. Order emails go to: ' + notifyEmail_());
}

/** GET ?action=booked -> {"booked":["2026-12-24", ...]} for the date picker. */
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'booked') {
    return json_({ booked: bookedDates_() });
  }
  return json_({ ok: true, service: "Krystyn's Cookie Cottage orders", version: VERSION });
}

/** POST (JSON body sent as text/plain) -> {"ok":true} | {"ok":false,"booked":true} | {"ok":false,"error":"..."} */
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad request' });
  }

  // Spam trap: real people never see or fill the "website" field
  if (data.website) return json_({ ok: true });

  const order = {
    name: clean_(data.name, 120),
    email: clean_(data.email, 200),
    phone: clean_(data.phone, 40),
    date: clean_(data.date, 10),
    occasion: clean_(data.occasion, 80),
    quantity: clean_(data.quantity, 40),
    flavors: clean_(data.flavors, 200),
    theme: clean_(data.theme, 4000)
  };
  if (!order.name || !/^\S+@\S+\.\S+$/.test(order.email) || !/^\d{4}-\d{2}-\d{2}$/.test(order.date) ||
      !order.occasion || !order.quantity || !order.theme) {
    return json_({ ok: false, error: 'missing fields' });
  }
  if (bookedDates_().indexOf(order.date) !== -1) {
    return json_({ ok: false, booked: true });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const folderUrl = savePhotos_(order, Array.isArray(data.photos) ? data.photos : []);
    const sheet = ordersSheet_();
    const [y, m, d] = order.date.split('-').map(Number);
    sheet.appendRow([
      new Date(), order.name, order.email, order.phone, '=DATE(' + y + ',' + m + ',' + d + ')', order.occasion,
      order.quantity, order.flavors, order.theme, '', 'New', '', ''
    ]);
    const row = sheet.getLastRow();
    sheet.getRange(row, 1).setNumberFormat('m/d/yyyy h:mm am/pm');
    sheet.getRange(row, 5).setNumberFormat('m/d/yyyy');
    if (folderUrl) {
      sheet.getRange(row, 10).setRichTextValue(linkText_('Open photos', folderUrl));
    }
    sendEmail_(order, folderUrl);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

// ---------- helpers ----------

function book_() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

function notifyEmail_() {
  return NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
}

function ordersSheet_() {
  const ss = book_();
  let sheet = ss.getSheetByName(ORDERS_TAB);
  if (!sheet) sheet = ss.insertSheet(ORDERS_TAB);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(ORDER_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Booked dates as "YYYY-MM-DD" strings, from the first column of the Booked dates tab. */
function bookedDates_() {
  const sheet = book_().getSheetByName(BOOKED_TAB);
  if (!sheet || sheet.getLastRow() < 2) return [];
  // Read dates exactly as the sheet shows them ("12/24/2026"), so no time zone can shift them
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues()
    .map(r => isoDate_(r[0]))
    .filter(Boolean);
}

/** "12/24/2026", "12/24/26" or "2026-12-24" -> "2026-12-24"; anything else -> '' */
function isoDate_(text) {
  const t = String(text).trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return m[1] + '-' + pad2_(m[2]) + '-' + pad2_(m[3]);
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + pad2_(m[1]) + '-' + pad2_(m[2]);
  return '';
}

function pad2_(n) {
  return ('0' + Number(n)).slice(-2);
}

function timeZone_() {
  return book_().getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'America/New_York';
}

function photosRoot_() {
  const it = DriveApp.getFoldersByName(PHOTOS_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(PHOTOS_FOLDER);
}

/** Saves up to MAX_PHOTOS images into a folder for this order; returns the folder URL, or '' if none. */
function savePhotos_(order, photos) {
  const usable = photos.slice(0, MAX_PHOTOS).filter(p => p && typeof p.data === 'string' && /^image\//.test(String(p.type)));
  if (!usable.length) return '';
  const [, m, d] = order.date.split('-');
  const today = Utilities.formatDate(new Date(), timeZone_(), 'M-d');
  const folder = photosRoot_().createFolder(order.name + ' ' + today + ' (for ' + Number(m) + '/' + Number(d) + ')');
  usable.forEach((p, i) => {
    const bytes = Utilities.base64Decode(p.data);
    if (bytes.length > MAX_PHOTO_BYTES) return;
    const name = clean_(p.name, 80) || 'photo-' + (i + 1) + '.jpg';
    folder.createFile(Utilities.newBlob(bytes, String(p.type), name));
  });
  return folder.getUrl();
}

function linkText_(text, url) {
  return SpreadsheetApp.newRichTextValue().setText(text).setLinkUrl(url).build();
}

function sendEmail_(order, folderUrl) {
  const lines = [
    'New custom cookie inquiry from your website:',
    '',
    'Name: ' + order.name,
    'Email: ' + order.email,
    'Phone: ' + (order.phone || '(not given)'),
    'Date needed: ' + order.date,
    'Occasion: ' + order.occasion,
    'How many dozen: ' + order.quantity,
    'Flavors: ' + (order.flavors || '(none picked)'),
    '',
    'Theme, colors and details:',
    order.theme,
    '',
    folderUrl ? 'Inspiration photos: ' + folderUrl : 'No photos attached.',
    '',
    'Reply to this email to answer ' + order.name.split(' ')[0] + ' directly.',
    'All orders: ' + book_().getUrl()
  ];
  MailApp.sendEmail({
    to: notifyEmail_(),
    replyTo: order.email,
    subject: 'New cookie inquiry: ' + order.name + ', ' + order.occasion + ' (' + order.date + ')',
    body: lines.join('\n')
  });
}
