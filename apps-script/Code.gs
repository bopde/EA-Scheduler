// ===== ENTRY POINTS =====

function doGet(e) {
  try {
    var action = e.parameter.action;
    if (action === 'getConfig') return handleGetConfig();
    if (action === 'getMembers') return handleGetMembers();
    if (action === 'getAvailability') return handleGetAvailability(e);
    if (action === 'getAllAvailability') return handleGetAllAvailability(e);
    if (action === 'getTeams') return handleGetTeams(e);
    if (action === 'recomputeTeams') return handleRecomputeTeams(e);
    return err('Unknown action: ' + action);
  } catch (ex) {
    return err(ex.message || String(ex));
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    if (action === 'saveAvailability') return handleSaveAvailability(body);
    return err('Unknown action: ' + action);
  } catch (ex) {
    return err(ex.message || String(ex));
  }
}

// ===== HANDLERS =====

function handleGetConfig() {
  return ok(readConfig());
}

function handleGetMembers() {
  var rows = readSheetData(SHEET_MEMBERS);
  var members = [];
  for (var i = 0; i < rows.length; i++) {
    var name = String(rows[i][COL_MEM_NAME - 1]).trim();
    var role = String(rows[i][COL_MEM_ROLE - 1]).trim().toLowerCase();
    var active = rows[i][COL_MEM_ACTIVE - 1];
    if (name && active === true) {
      members.push({ name: name, role: role === 'coordinator' ? 'coordinator' : 'member' });
    }
  }
  return ok(members);
}

function handleGetAvailability(e) {
  var member = e.parameter.member;
  var from = e.parameter.from;
  var to = e.parameter.to;
  var rows = readSheetData(SHEET_AVAILABILITY);
  var slots = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var name = String(row[COL_AVAIL_NAME - 1]).trim();
    var date = formatDateValue(row[COL_AVAIL_DATE - 1]);
    if (name !== member) continue;
    if (date < from || date > to) continue;
    slots.push({
      memberName: name,
      date: date,
      shiftIndex: Number(row[COL_AVAIL_SHIFT - 1]),
      available: row[COL_AVAIL_AVAIL - 1] === true,
    });
  }
  return ok(slots);
}

function handleGetAllAvailability(e) {
  var from = e.parameter.from;
  var to = e.parameter.to;
  var rows = readSheetData(SHEET_AVAILABILITY);
  var slots = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var date = formatDateValue(row[COL_AVAIL_DATE - 1]);
    if (date < from || date > to) continue;
    slots.push({
      memberName: String(row[COL_AVAIL_NAME - 1]).trim(),
      date: date,
      shiftIndex: Number(row[COL_AVAIL_SHIFT - 1]),
      available: row[COL_AVAIL_AVAIL - 1] === true,
    });
  }
  return ok(slots);
}

function handleSaveAvailability(body) {
  var memberName = body.memberName;
  var slots = body.slots;
  var sheet = getSheet(SHEET_AVAILABILITY);
  var rows = readSheetData(SHEET_AVAILABILITY);
  var saved = 0;

  for (var i = 0; i < slots.length; i++) {
    var slot = slots[i];
    var date = slot.date;
    var shiftIndex = slot.shiftIndex;
    var available = slot.available;
    var ts = new Date().toISOString();

    var rowIdx = findRow(rows, function(r) {
      return String(r[COL_AVAIL_NAME - 1]).trim() === memberName &&
             formatDateValue(r[COL_AVAIL_DATE - 1]) === date &&
             Number(r[COL_AVAIL_SHIFT - 1]) === shiftIndex;
    });

    if (rowIdx > 0) {
      sheet.getRange(rowIdx, COL_AVAIL_AVAIL).setValue(available);
      sheet.getRange(rowIdx, COL_AVAIL_TS).setValue(ts);
    } else {
      sheet.appendRow([memberName, date, shiftIndex, available, ts]);
    }
    saved++;
  }

  return ok({ saved: saved });
}

function handleGetTeams(e) {
  var from = e.parameter.from;
  var to = e.parameter.to;
  var rows = readSheetData(SHEET_TEAMS);
  var teams = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var date = formatDateValue(row[COL_TEAM_DATE - 1]);
    if (date < from || date > to) continue;
    var membersStr = String(row[COL_TEAM_MEMBERS - 1]).trim();
    teams.push({
      date: date,
      shiftIndex: Number(row[COL_TEAM_SHIFT - 1]),
      teamNumber: Number(row[COL_TEAM_NUM - 1]),
      coordinatorName: String(row[COL_TEAM_COORD - 1]).trim(),
      members: membersStr ? membersStr.split(',').map(function(s) { return s.trim(); }) : [],
      coordinatorFilledIn: row[COL_TEAM_FILLED - 1] === true,
    });
  }
  return ok(teams);
}

function handleRecomputeTeams(e) {
  var from = e.parameter.from;
  var to = e.parameter.to;
  var config = readConfig();
  var minTeamSize = Number(config.min_team_size) || 4;
  var maxTeamSize = Number(config.max_team_size) || 6;

  var memberRows = readSheetData(SHEET_MEMBERS);
  var members = [];
  for (var i = 0; i < memberRows.length; i++) {
    var name = String(memberRows[i][COL_MEM_NAME - 1]).trim();
    var role = String(memberRows[i][COL_MEM_ROLE - 1]).trim().toLowerCase();
    var active = memberRows[i][COL_MEM_ACTIVE - 1];
    if (name && active === true) {
      members.push({ name: name, role: role === 'coordinator' ? 'coordinator' : 'member' });
    }
  }

  var availRows = readSheetData(SHEET_AVAILABILITY);
  var allSlots = [];
  for (var j = 0; j < availRows.length; j++) {
    var row = availRows[j];
    var date = formatDateValue(row[COL_AVAIL_DATE - 1]);
    if (date < from || date > to) continue;
    allSlots.push({
      memberName: String(row[COL_AVAIL_NAME - 1]).trim(),
      date: date,
      shiftIndex: Number(row[COL_AVAIL_SHIFT - 1]),
      available: row[COL_AVAIL_AVAIL - 1] === true,
    });
  }

  // Build list of all (date, shiftIndex) pairs in range
  var slotPairs = [];
  var cur = new Date(from);
  var end = new Date(to);
  while (cur <= end) {
    var iso = cur.toISOString().split('T')[0];
    slotPairs.push({ date: iso, shiftIndex: 0 });
    slotPairs.push({ date: iso, shiftIndex: 1 });
    cur.setDate(cur.getDate() + 1);
  }

  var allTeams = [];
  for (var k = 0; k < slotPairs.length; k++) {
    var pair = slotPairs[k];
    var computed = computeTeamsForSlot(pair.date, pair.shiftIndex, allSlots, members, minTeamSize, maxTeamSize);
    allTeams = allTeams.concat(computed);
  }

  // Write to Teams sheet: delete all data rows then append fresh
  var teamsSheet = getSheet(SHEET_TEAMS);
  var lastRow = teamsSheet.getLastRow();
  if (lastRow > 1) {
    teamsSheet.deleteRows(2, lastRow - 1);
  }

  var ts = new Date().toISOString();
  for (var t = 0; t < allTeams.length; t++) {
    var team = allTeams[t];
    teamsSheet.appendRow([
      team.date,
      team.shiftIndex,
      team.teamNumber,
      team.coordinatorName,
      team.members.join(', '),
      team.coordinatorFilledIn,
      ts,
    ]);
  }

  return ok({ computed: allTeams.length });
}

// ===== TEAM ASSIGNMENT ALGORITHM =====

function computeTeamsForSlot(date, shiftIndex, allSlots, members, minTeamSize, maxTeamSize) {
  var roleMap = {};
  for (var i = 0; i < members.length; i++) {
    roleMap[members[i].name] = members[i].role;
  }

  var available = allSlots.filter(function(s) {
    return s.date === date && s.shiftIndex === shiftIndex && s.available;
  });

  var availCoords = [];
  var availMembers = [];
  var seen = {};
  for (var j = 0; j < available.length; j++) {
    var mName = available[j].memberName;
    if (seen[mName]) continue;
    seen[mName] = true;
    var role = roleMap[mName];
    if (role === 'coordinator') availCoords.push(mName);
    else availMembers.push(mName);
  }

  var total = availCoords.length + availMembers.length;
  var numTeams = Math.min(availCoords.length, Math.floor(total / minTeamSize));
  if (numTeams === 0) return [];

  var leaders = availCoords.slice(0, numTeams);
  var spareCoords = availCoords.slice(numTeams);

  var teams = [];
  for (var n = 0; n < numTeams; n++) {
    teams.push({
      date: date,
      shiftIndex: shiftIndex,
      teamNumber: n + 1,
      coordinatorName: leaders[n],
      members: [],
      coordinatorFilledIn: false,
    });
  }

  var spareSet = {};
  for (var sc = 0; sc < spareCoords.length; sc++) spareSet[spareCoords[sc]] = true;

  // Distribute everyone round-robin: regular members first, spare coordinators after.
  // Spare coordinators land wherever they land — all available people get assigned.
  var pool = availMembers.concat(spareCoords);
  for (var p = 0; p < pool.length; p++) {
    var teamIdx = p % numTeams;
    if (teams[teamIdx].members.length < maxTeamSize - 1) {
      teams[teamIdx].members.push(pool[p]);
      if (spareSet[pool[p]]) teams[teamIdx].coordinatorFilledIn = true;
    }
  }

  return teams;
}

// ===== SETUP FUNCTION (run once by coordinator) =====

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  function ensureSheet(name, headers) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
    return sheet;
  }

  // Config sheet
  var configSheet = ensureSheet(SHEET_CONFIG, ['Key', 'Value']);
  if (configSheet.getLastRow() < 2) {
    var defaults = [
      ['weekday_shift_1_start', '10:30'],
      ['weekday_shift_1_end', '13:30'],
      ['weekday_shift_2_start', '14:30'],
      ['weekday_shift_2_end', '17:30'],
      ['weekend_shift_1_start', '10:30'],
      ['weekend_shift_1_end', '13:30'],
      ['weekend_shift_2_start', '13:30'],
      ['weekend_shift_2_end', '16:30'],
      ['scheduling_weeks_ahead', 4],
      ['min_team_size', 4],
      ['max_team_size', 6],
      ['max_teams', 3],
    ];
    configSheet.getRange(2, 1, defaults.length, 2).setValues(defaults);
  }

  ensureSheet(SHEET_MEMBERS, ['name', 'role', 'active']);

  var availSheet = ensureSheet(SHEET_AVAILABILITY, ['member_name', 'date', 'shift_index', 'available', 'submitted_at']);
  // Force date column to plain text so Sheets doesn't convert ISO strings to serials
  availSheet.getRange('B:B').setNumberFormat('@');

  var teamsSheet = ensureSheet(SHEET_TEAMS, ['date', 'shift_index', 'team_number', 'coordinator_name', 'members', 'coordinator_filled_in', 'computed_at']);
  teamsSheet.getRange('A:A').setNumberFormat('@');

  // Force Config value column to plain text to prevent time strings becoming serials
  configSheet.getRange('B:B').setNumberFormat('@');

  SpreadsheetApp.getUi().alert('Setup complete! All required sheets have been created.');
}
