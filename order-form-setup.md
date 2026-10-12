# Connecting the site to Google (classes, orders, photos)

Everything lives in **one Google Sheet** (tabs: Classes, Orders, Booked dates) with a small script inside it.
The website needs **one link**: the script's Web app URL. It serves the class list and takes order inquiries.

## A. Build the template sheet (Matthew, once)

1. Go to [sheets.new](https://sheets.new). **File → Import → Upload** `handoff/Cookie Cottage Sheets (example).xlsx`,
   choose **Replace spreadsheet** so you get all four tabs. Name it *Cookie Cottage*.
2. Delete the sample rows on Classes, Orders and Booked dates (keep each header row exactly as it is).
3. **Extensions → Apps Script**, delete what's there, paste in all of `apps-script/Code.gs`, **Save**.
   Check these two lines near the top are **blank**:
   - `const SPREADSHEET_ID = '';` (if it holds an ID, every copy would write into that one sheet)
   - `const NOTIFY_EMAIL = '';` (blank = order emails go to whoever owns the copy)
4. **Share → General access → Anyone with the link → Viewer** (or add Krystyn's email as Viewer).
5. Copy the sheet's address and change the end from `/edit…` to **`/copy`**:
   `https://docs.google.com/spreadsheets/d/LONG-ID/copy`. That's the link you send her.
6. Test it in a private window signed into another account: you should see **Make a copy**, and the copy should
   have the script under Extensions → Apps Script.

## B. Turn it on (Krystyn, in her own Google account)

1. Open the `/copy` link → **Make a copy**.
2. In her copy: **Extensions → Apps Script**.
3. **Deploy → New deployment →** gear icon → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. **Deploy → Authorize access →** pick her account → *"Google hasn't verified this app"* →
   **Advanced → Go to (project name) → Allow**.
   (Normal for a script that lives in your own sheet. It needs Sheets, Drive and send-email access.)
5. Copy the **Web app URL** (ends in `/exec`) and send it to Matthew.

## C. Point the website at it (Matthew)

1. Paste the URL into `config.js` after `googleScript:` (between the quotes).
2. Bump `config.js?v=` in `index.html`, commit and push. The host redeploys on its own.

## Test it

1. Open the site (or http://localhost:5391 locally).
2. **Classes:** the "Sample dates" note disappears and the Classes tab rows show. Edit a row, refresh: it shows
   within a few seconds (the script keeps a copy for at most 60 seconds, and any edit to the sheet clears it).
3. **Booked dates:** pick a date from the Booked dates tab in the order form. It should say the date is fully booked.
4. **Order:** send the form with a photo. Within a few seconds:
   - a new row on the **Orders** tab, Status = New, with an *Open photos* link
   - a folder in Drive: **Order Photos → (name) (date)** holding the photos
   - an email titled *New cookie inquiry: …* (hitting Reply answers the customer)
5. Delete the test row and its photo folder.

## Testing with your own Google account

Same as A + B in your own account, then put your `/exec` link in your **local** `config.js` only.
Keep git from picking it up:

```bash
git update-index --skip-worktree config.js
```

Undo that (`--no-skip-worktree`) before committing a real change to `config.js`.

## "Sorry, unable to open the file at this time"

The browser is signed into more than one Google account and Apps Script opened under the wrong one.

- **Easiest:** a private/incognito window signed into only the account that owns the sheet.
- **Or:** on the error page, change `/u/0/` in the address to `/u/1/` (or `/u/2/`) until it opens.
- **Or create the script on its own:** [script.google.com](https://script.google.com) → **New project**, paste in `Code.gs`,
  and put the sheet's ID in `const SPREADSHEET_ID = '';` (the long part of the sheet's address between `/d/` and `/edit`).

A work or school Google account may block Apps Script entirely. Use a personal Gmail account.

## If Code.gs changes later

Paste the new code, Save, then **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
The URL stays the same (a brand-new deployment would get a new URL). Opening the `/exec` link in a browser
shows `"version"`, so you can confirm which code is live.

## Limits (free Google account)

- About 100 order emails a day. Plenty for a cookie business.
- Up to 5 photos per order, shrunk in the customer's browser to about 300 KB each before upload.
- Customers don't need a Google account.

## Older setup (not needed now)

The class list can also come from a sheet's **File → Share → Publish to web → Classes tab → CSV** link, set as
`eventsSheetCsv:` in `config.js`. If set, it takes priority over the script for classes. It updates every ~5 minutes.
