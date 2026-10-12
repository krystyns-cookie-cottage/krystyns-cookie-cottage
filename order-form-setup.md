# Connecting the site to Google (classes, orders, photos)

Works the same with your own Google account (for testing) or Krystyn's (for launch).
Everything lives in **one Google Sheet** with three tabs: Classes, Orders, Booked dates.
About 15 minutes.

## 1. Make the sheet

1. Go to [sheets.new](https://sheets.new) (signed into the Google account you're testing with).
2. **File → Import → Upload** `handoff/Cookie Cottage Sheets (example).xlsx`.
   Choose **Replace spreadsheet** so you get all four tabs.
3. Rename the sheet, e.g. *Cookie Cottage* (top left).

## 2. Turn on the class list

1. **File → Share → Publish to web**.
2. Under *Link*, pick the **Classes** tab (not "Entire document") and **Comma-separated values (.csv)**. Click **Publish**.
3. Copy the link and paste it into `config.js` after `eventsSheetCsv:` (between the quotes).

Google refreshes a published sheet every few minutes, so edits can take ~5 minutes to show on the site.

## 3. Turn on the order form

1. In the sheet: **Extensions → Apps Script**. Delete whatever is in the editor.
2. Paste in everything from `apps-script/Code.gs`. Click **Save** (disk icon).
3. Optional: to send order emails somewhere other than this Google account, put the address in
   `const NOTIFY_EMAIL = '';` near the top.
4. In the toolbar's function dropdown, pick **setup**, then click **Run**.
   Google asks for permission: **Review permissions →** pick the account →
   **Advanced → Go to (project name) (unsafe) → Allow**.
   (The "unsafe" warning is normal for a script you wrote yourself. It needs Sheets, Drive and send-email access.)
   This creates the **Order Photos** folder in Drive.
5. **Deploy → New deployment →** gear icon → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy** and copy the **Web app URL** (ends in `/exec`).
6. Paste that URL into `config.js` after `orderEndpoint:`.

### "Sorry, unable to open the file at this time"

This means the browser is signed into more than one Google account and Apps Script opened under the wrong one.

- **Easiest:** open a private/incognito window, sign into only the account that owns the sheet, then Extensions → Apps Script.
- **Or:** on the error page, change `/u/0/` in the address to `/u/1/` (or `/u/2/`) until it opens.
- **Or create the script on its own:** go to [script.google.com](https://script.google.com) → **New project**, paste in `Code.gs`,
  and put the sheet's ID in `const SPREADSHEET_ID = '';` (the long part of the sheet's address between `/d/` and `/edit`).
  Then continue from step 4 above (run **setup**, deploy).

A work or school Google account may block Apps Script entirely. Use a personal Gmail account instead.

## 4. Test it locally

1. Start the local preview (`cookie-site` in `.claude/launch.json`, or `python -m http.server 5391` in this folder) and open http://localhost:5391.
2. **Classes:** the "Sample dates" note disappears and the classes from your sheet show.
   Change a row in the sheet, publish settles in a few minutes, refresh to see it.
3. **Booked dates:** pick 12/24/2026 in the order form's date box. It should say the date is fully booked.
4. **Order:** fill out the form with a photo or two and send it. Within a few seconds you should have:
   - a new row on the **Orders** tab, Status = New, with an *Open photos* link
   - a folder in Drive: **Order Photos → (name) (date)** holding the photos
   - an email titled *New cookie inquiry: …* (hitting Reply answers the customer)

## 5. Before committing

**Don't commit `config.js` with your test links.** Put the quotes back to empty (`''`) first,
or the review site will send orders to your Google account.
At launch, the same steps run in Krystyn's Google account and her links go into `config.js`.

## If you change Code.gs later

Paste the new code, Save, then **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
The URL stays the same. (A brand-new deployment would get a new URL.)

## Limits (free Google account)

- About 100 order emails a day. Plenty for a cookie business.
- Up to 5 photos per order, shrunk in the customer's browser to about 300 KB each before upload.
- Customers don't need a Google account.
