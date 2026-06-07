# EA Scheduler

A team scheduling app where members select shift availability across multiple weeks. Built on a React frontend with a Google Sheets backend via Apps Script — no separate server required.

**Live app:** https://bopde.github.io/EA-Scheduler/

---

## How it works

- Team members visit the app, paste in the Apps Script URL (provided by the coordinator), pick their name, and click shifts to mark availability.
- Coordinators manage the team list and config directly in Google Sheets, and use the Teams view in the app to see assignments.
- All data is stored in Google Sheets. The Apps Script URL acts as the connection point between the app and the sheet.

---

## Coordinator setup (do this once)

### 1. Create the Google Sheet

Open [Google Sheets](https://sheets.google.com) and create a new spreadsheet.

### 2. Add the Apps Script

1. In the spreadsheet, click **Extensions → Apps Script**
2. Delete any existing code in the editor
3. Create two script files and paste in the contents from this repo:
   - Rename `Code.gs` (the default file) — paste the contents of [`apps-script/Code.gs`](apps-script/Code.gs)
   - Click **+** to add a new file, name it `SheetHelpers` — paste the contents of [`apps-script/SheetHelpers.gs`](apps-script/SheetHelpers.gs)
4. Click the gear icon (Project Settings) and check **"Show `appsscript.json` manifest file in editor"**
5. Click on `appsscript.json` and replace its contents with the contents of [`apps-script/appsscript.json`](apps-script/appsscript.json)

### 3. Initialise the sheets

1. In the Apps Script editor, select the `setupSheets` function from the dropdown at the top
2. Click **Run**
3. Approve the permissions prompt (it will only request access to this spreadsheet)
4. You should see an alert: *"Setup complete! All required sheets have been created."*

This creates four sheets: `Config`, `Members`, `Availability`, and `Teams`.

### 4. Add team members

Open the **Members** sheet and fill in your team:

| name | role | active |
|------|------|--------|
| Alice | member | TRUE |
| Bob | coordinator | TRUE |
| Carol | project_lead | TRUE |
| Dave | member | FALSE |

- `role`: use `member` for regular team members, `coordinator` for team leads, `project_lead` for senior leads (see roles below)
- `active`: set to `FALSE` to hide someone from the app without deleting them — their existing availability data is ignored when computing teams

### 5. Deploy as a Web App

1. In the Apps Script editor, click **Deploy → New deployment**
2. Click the gear icon next to "Select type" and choose **Web app**
3. Set:
   - **Description:** e.g. `EA Scheduler v1`
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy** and copy the Web App URL

### 6. Share the URL

Send the Web App URL to your team. This is what they paste into the app to connect.

---

## Team member usage

1. Go to https://bopde.github.io/EA-Scheduler/
2. Paste the Web App URL from your coordinator and click **Connect**
3. Select your name from the dropdown and click **Continue**
4. Click shift slots on the calendar to mark yourself as available (green = available)
5. Use the **Prev / Next** arrows to navigate weeks
6. Changes save automatically — you can return at any time to update your availability

The URL is remembered in your browser, so you won't need to re-enter it on future visits.

---

## Roles

There are three roles:

| Role | Description |
|------|-------------|
| `member` | Can view and edit their own availability and see their team assignments |
| `coordinator` | Same as member, plus can view the **All Teams** tab |
| `project_lead` | Same as coordinator, plus can click **Recompute Teams** and **drag and drop** members between teams manually |

---

## Coordinator and Project Lead usage

Once logged in as a coordinator or project lead, you'll see **My Schedule**, **My Teams**, and **All Teams** tabs.

- **My Schedule** — same as any team member; set your own availability here
- **My Teams** — shows the shifts you're personally assigned to (as leader or fill-in)
- **All Teams** — shows every computed team assignment across the current scheduling window

### Recomputing teams (Project Leads only)

Click **Recompute Teams** in the All Teams view after availability has been updated. This regenerates all assignments for the current scheduling window (from today's Monday through `scheduling_weeks_ahead` weeks ahead). Dates outside that window are left untouched.

### Manual drag and drop (Project Leads only)

In the All Teams view, project leads can drag any team member or coordinator from one team to another, or to/from the "Available but not assigned" pool. Changes are saved automatically a moment after you finish dragging.

### How coordinators are assigned (leading vs filling in)

1. All coordinators who marked availability for a shift are collected in the order they submitted it (Availability sheet row order).
2. The number of teams is `min(available coordinators, floor(total available people / min_team_size))` — you need at least one coordinator *and* enough people to fill a minimum-size team.
3. The **first N coordinators** (where N = number of teams) each lead a team. They appear with an indigo badge.
4. Any **remaining coordinators** are treated as regular members and distributed into existing teams. They appear with an amber "filling in" badge.

There is no manual priority — whoever submitted availability first is most likely to lead.

### Shift continuity within a day

When there are two shifts in a day, the algorithm tries to keep team members together across both shifts. If someone was in Team 2 for shift 1, the algorithm will try to place them in Team 2 for shift 2. New members (only available for shift 2) are distributed round-robin to fill any remaining gaps. This continuity only applies within the same day — teams are recomputed independently for each new day.

### Who sits out when teams are full

The remaining pool (`regular members` first, then `spare coordinators`) is distributed round-robin across teams. Each team accepts at most `max_team_size − 1` members (plus coordinator = `max_team_size` total). If a team is already full when someone's round-robin turn comes around, **that person is skipped** — they are not reassigned to another team with available space.

This means the people appearing latest in the Availability sheet who land on a full team in their round-robin slot will sit out. They'll appear in the "Available but not assigned" section under each shift in the All Teams view.

---

## Adjusting shift times and settings

Edit the **Config** sheet directly in Google Sheets:

| Key | Default | Description |
|-----|---------|-------------|
| `weekday_shift_1_start` | 10:30 | Weekday morning shift start |
| `weekday_shift_1_end` | 13:30 | Weekday morning shift end |
| `weekday_shift_2_start` | 14:30 | Weekday afternoon shift start |
| `weekday_shift_2_end` | 17:30 | Weekday afternoon shift end |
| `weekend_shift_1_start` | 10:30 | Weekend first shift start |
| `weekend_shift_1_end` | 13:30 | Weekend first shift end |
| `weekend_shift_2_start` | 13:30 | Weekend second shift start |
| `weekend_shift_2_end` | 16:30 | Weekend second shift end |
| `scheduling_weeks_ahead` | 4 | How many weeks the calendar and recompute window covers |
| `min_team_size` | 4 | Minimum people (including coordinator) needed to form a team |
| `max_team_size` | 6 | Maximum people per team (including coordinator); anyone beyond this sits out |

Changes take effect immediately — no redeployment needed.

---

## Project structure

```
EA-Scheduler/
├── src/                        React frontend (Vite + TypeScript + Tailwind)
│   ├── api/gasClient.ts        All API calls to the Apps Script
│   ├── components/
│   │   ├── setup/              URL input and name selector
│   │   ├── scheduler/          Calendar grid and shift cells
│   │   └── coordinator/        Team assignment views
│   ├── hooks/                  useAvailability, useTeams
│   ├── store/sessionStore.ts   Zustand session (persisted to localStorage)
│   └── utils/                  Date helpers, team algorithm
└── apps-script/
    ├── Code.gs                 doGet/doPost handlers + team algorithm
    ├── SheetHelpers.gs         Sheet/column constants and helpers
    └── appsscript.json         OAuth scopes and webapp config
```

---

## Deploying changes

The app deploys automatically to GitHub Pages whenever changes are pushed to `main` via the Actions workflow at `.github/workflows/deploy.yml`.
