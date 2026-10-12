# Class & event calendar: Google Sheet setup

The "Cookie classes & events" section on the site reads from a Google Sheet.
Krystyn adds a row, and the class shows up on the website. No code or developer needed.

## One-time setup

The Classes tab lives in the same Google Sheet as orders, and the website reads it through the sheet's script.
Setup steps: **order-form-setup.md**.

## For Krystyn: how to add or change a class

One row = one class or event. Keep the first row (the column names) exactly as it is.

| Column | What to put | Example |
|---|---|---|
| `date` | The day of the class | `12/6/2026` |
| `time` | Start time, or a time range | `1:00 pm` |
| `title` | Class name | `Holiday Cheer` |
| `venue` | Where it is | `Rugged & Refined, Greencastle` |
| `description` | One or two sentences about the set | `Sweaters, a snowy cottage and a gingerbread friend.` |
| `price` | Number per seat, or words | `55` or `Free to attend` |
| `seats_left` | Seats still open (optional) | `14` |
| `seats_total` | Total seats (optional, adds a progress bar) | `20` |
| `ticket_link` | Link to the TicketStripe / Eventbrite / Square ticket page (optional) | `https://ticketstripe.com/...` |
| `status` | Leave blank, or type `sold out` or `hidden` | `sold out` |

How the site uses it:

- **Ticket link filled in** → the button says **Get tickets** and opens that page.
- **No ticket link** → the button says **Reserve a seat** and fills in the website's order form for the customer.
- **`sold out`, or `seats_left` is 0** → the class shows as full with a **Join the waitlist** button.
- **`hidden`** → the row stays in the sheet but doesn't show on the site (good for drafts).
- **Past dates disappear on their own.** No need to delete old rows.
- The weekday ("Saturday") is added automatically from the date.

Changes show up on the site within a few seconds.
