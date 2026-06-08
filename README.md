# EA Scheduler

A shift scheduling app for teams. Members visit the app, mark which shifts they're available for, and a project lead computes the team assignments. Everything is stored in a Google Sheet that you own — no accounts, no subscriptions.

**Live app:** https://bopde.github.io/EA-Scheduler/

---

## Roles at a glance

| Role | What they can do |
|------|-----------------|
| **Member** | Mark their own shift availability · See which team they've been assigned to |
| **Coordinator** | Everything a member can do · View all computed team assignments |
| **Project Lead** | View and edit *anyone's* availability · View all teams · Recompute assignments · Manually adjust teams via drag and drop |

Roles are set in the **Members** sheet in Google Sheets (see setup below).

---

## One-time setup (Project Lead)

### 1. Create the Google Sheet

Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet. Give it any name you like.

### 2. Add the Apps Script

1. In the spreadsheet, click **Extensions → Apps Script**
2. Delete any existing code in the editor
3. You'll need to add two files:
   - The default file is called `Code.gs` — replace its contents with the code from [`apps-script/Code.gs`](apps-script/Code.gs) in this repo
   - Click the **+** button next to "Files", choose **Script**, name it `SheetHelpers`, and paste in the contents of [`apps-script/SheetHelpers.gs`](apps-script/SheetHelpers.gs)
4. Click the gear icon (**Project Settings**) and tick **"Show `appsscript.json` manifest file in editor"**
5. Click `appsscript.json` in the file list and replace its contents with the code from [`apps-script/appsscript.json`](apps-script/appsscript.json)
6. Click **Save** (the floppy disk icon)

### 3. Initialise the sheets

1. In the Apps Script editor, click the function dropdown at the top (it may say "myFunction") and select **setupSheets**
2. Click **Run**
3. You'll be asked to approve permissions — click through and allow access (it only ever touches this one spreadsheet)
4. You should see a popup: *"Setup complete! All required sheets have been created."*

This creates four tabs in your spreadsheet: **Config**, **Members**, **Availability**, and **Teams**.

### 4. Add your team

Open the **Members** sheet and add a row for each person:

| name | role | active |
|------|------|--------|
| Alice | member | TRUE |
| Bob | coordinator | TRUE |
| Carol | project_lead | TRUE |
| Dave | member | FALSE |

- **name** — exactly as people will see themselves in the app dropdown
- **role** — `member`, `coordinator`, or `project_lead` (see the roles table above)
- **active** — `TRUE` to include them, `FALSE` to hide them without deleting their data

### 5. Deploy as a Web App

1. In the Apps Script editor, click **Deploy → New deployment**
2. Click the gear icon next to "Select type" and choose **Web app**
3. Fill in the settings:
   - **Description:** anything, e.g. `EA Scheduler v1`
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**, then copy the **Web App URL** that appears

> **Keep this URL safe** — it's the key to your team's data. Anyone with it can read and write your schedule.

### 6. Share with your team

Send the Web App URL to your team members. That's what they paste into the app to connect.

---

## For team members

1. Go to **https://bopde.github.io/EA-Scheduler/**
2. Paste the Web App URL your project lead gave you and click **Connect**
3. Select your name from the dropdown and click **Continue**
4. You'll land on your personal calendar. Click any shift slot to mark yourself as **available** (it turns green). Click again to mark yourself unavailable.
5. Use the **← →** arrows to move between weeks and fill in as many weeks as you can
6. Your changes save automatically as you click — you'll see a brief "Saving…" then "Saved" confirmation

The app remembers your connection in your browser, so next time you visit you'll go straight to your calendar.

**My Teams tab** — once your project lead has run Recompute Teams, switch to this tab to see which team and shift you've been assigned to each day.

---

## For coordinators

Coordinators see the same **My Schedule** and **My Teams** tabs as regular members, plus an **All Teams** tab that shows every computed team for the full scheduling window.

The All Teams view is read-only for coordinators — if you need to adjust assignments, ask your project lead to do it.

---

## For project leads

Project leads see two tabs:

### Team Availability

A grid showing every team member's availability for the current week, one week at a time. Use the **← →** arrows to move between weeks.

- Each row is a team member, each column pair is a day's two shifts
- **Green dot** = available, **blank** = not available
- Click any cell to toggle that person's availability on their behalf — useful when someone texts you a last-minute change
- Changes save automatically about a second after you click
- The **Available** row at the bottom counts how many people are available per shift — shown in green when healthy, amber when low

### All Teams

Shows every computed team assignment for the full scheduling window.

**Recompute Teams** — click this button after availability has been updated to regenerate all team assignments. This covers from today through the number of weeks set in your Config sheet.

**Adjusting teams manually** — you can drag and drop any team member or coordinator between teams. You can also:
- Drag a coordinator to another team's coordinator slot to promote them as leader (the previous leader moves to the member list as "filling in")
- Drag anyone to the **Available but not assigned** pool to remove them from a team
- Click **Add Team** (the + card) to manually create a new team, then drag people into it
- Click **✕** on a team to remove it (everyone returns to the unassigned pool)

Changes are saved automatically a moment after each drag.

---

## How team assignments work

When you click **Recompute Teams**, the app works through each day and each shift to build teams:

### How many teams form

A team only forms if there's at least one available coordinator *and* enough total people to meet the minimum team size (set in Config). So if 10 people are available but only 1 coordinator, you get 1 team — not 2.

### Who leads and who fills in

Coordinators who marked themselves available are assigned in the order they submitted their availability. The first coordinator gets Team 1, the second gets Team 2, and so on. Any coordinators beyond the number of teams join a team as regular members — they appear with an **amber "filling in"** badge. There is no manual priority ordering.

### Keeping teams together through the day

When a day has two shifts, the app tries to keep the same people on the same team for both. If you were on Team 2 for shift 1, the app will try to put you on Team 2 for shift 2 as well. New people (only available for shift 2) fill any remaining gaps.

### Who sits out

Remaining members are distributed across teams in a rotating order. Each team can hold up to `max_team_size` people total (including the coordinator). If every team is at capacity, any remaining available people will appear in the **"Available but not assigned"** section — they're not lost, just unassigned, and a project lead can drag them in manually.

---

## Adjusting shift times and settings

Edit the **Config** sheet directly in Google Sheets. Changes take effect immediately — no redeployment needed.

| Setting | Default | What it controls |
|---------|---------|-----------------|
| `weekday_shift_1_start` | 10:30 | Weekday morning shift start time |
| `weekday_shift_1_end` | 13:30 | Weekday morning shift end time |
| `weekday_shift_2_start` | 14:30 | Weekday afternoon shift start time |
| `weekday_shift_2_end` | 17:30 | Weekday afternoon shift end time |
| `weekend_shift_1_start` | 10:30 | Weekend first shift start time |
| `weekend_shift_1_end` | 13:30 | Weekend first shift end time |
| `weekend_shift_2_start` | 13:30 | Weekend second shift start time |
| `weekend_shift_2_end` | 16:30 | Weekend second shift end time |
| `scheduling_weeks_ahead` | 4 | How many weeks ahead the calendar shows and Recompute covers |
| `min_team_size` | 4 | Minimum number of people (including coordinator) needed to form a team |
| `max_team_size` | 6 | Maximum people per team; anyone beyond this is left unassigned |

---

## Project structure

```
EA-Scheduler/
├── src/                        React frontend (Vite + TypeScript + Tailwind)
│   ├── api/gasClient.ts        All API calls to the Apps Script
│   ├── components/
│   │   ├── setup/              Login flow (URL input + name selector)
│   │   ├── scheduler/          Member calendar grid and shift cells
│   │   └── coordinator/        Team views, availability grid, drag-and-drop
│   ├── hooks/                  useAvailability, useTeams, useRoleMap
│   ├── store/sessionStore.ts   Zustand session state (persisted to localStorage)
│   └── utils/                  Date helpers, team assignment algorithm
└── apps-script/
    ├── Code.gs                 doGet/doPost handlers + server-side team algorithm
    ├── SheetHelpers.gs         Sheet/column name constants and helper functions
    └── appsscript.json         OAuth scopes and web app configuration
```

## Deploying frontend changes

The app rebuilds and deploys to GitHub Pages automatically whenever changes are pushed to `main`, via the Actions workflow at `.github/workflows/deploy.yml`.
