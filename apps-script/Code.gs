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
    if (action === 'saveTeamSlot') return handleSaveTeamSlot(body);
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
      var normalizedRole = 'member';
      if (role === 'coordinator') normalizedRole = 'coordinator';
      if (role === 'project_lead' || role === 'project lead') normalizedRole = 'project_lead';
      members.push({ name: name, role: normalizedRole });
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

  // Only return availability for currently active members
  var memberRows = readSheetData(SHEET_MEMBERS);
  var activeMembers = {};
  for (var i = 0; i < memberRows.length; i++) {
    var mName = String(memberRows[i][COL_MEM_NAME - 1]).trim();
    var active = memberRows[i][COL_MEM_ACTIVE - 1];
    if (mName && active === true) activeMembers[mName] = true;
  }

  var rows = readSheetData(SHEET_AVAILABILITY);
  var slots = [];
  for (var j = 0; j < rows.length; j++) {
    var row = rows[j];
    var memberName = String(row[COL_AVAIL_NAME - 1]).trim();
    if (!activeMembers[memberName]) continue;
    var date = formatDateValue(row[COL_AVAIL_DATE - 1]);
    if (date < from || date > to) continue;
    slots.push({
      memberName: memberName,
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
      var normalizedRole = 'member';
      if (role === 'coordinator') normalizedRole = 'coordinator';
      if (role === 'project_lead' || role === 'project lead') normalizedRole = 'project_lead';
      members.push({ name: name, role: normalizedRole });
    }
  }

  // Build active member set to filter out deactivated members' old availability rows
  var activeMemberSet = {};
  for (var am = 0; am < members.length; am++) activeMemberSet[members[am].name] = true;

  var availRows = readSheetData(SHEET_AVAILABILITY);
  var allSlots = [];
  for (var j = 0; j < availRows.length; j++) {
    var row = availRows[j];
    var memberName = String(row[COL_AVAIL_NAME - 1]).trim();
    if (!activeMemberSet[memberName]) continue;
    var date = formatDateValue(row[COL_AVAIL_DATE - 1]);
    if (date < from || date > to) continue;
    allSlots.push({
      memberName: memberName,
      date: date,
      shiftIndex: Number(row[COL_AVAIL_SHIFT - 1]),
      available: row[COL_AVAIL_AVAIL - 1] === true,
    });
  }

  // Process each day: compute shift 0, then shift 1 with shift-0 results for continuity
  var allTeams = [];
  var cur = new Date(from);
  var end = new Date(to);
  while (cur <= end) {
    var iso = cur.toISOString().split('T')[0];
    var shift0 = computeTeamsForSlot(iso, 0, allSlots, members, minTeamSize, maxTeamSize, null);
    var shift1 = computeTeamsForSlot(iso, 1, allSlots, members, minTeamSize, maxTeamSize, shift0);
    allTeams = allTeams.concat(shift0).concat(shift1);
    cur.setDate(cur.getDate() + 1);
  }

  // Overwrite Teams sheet
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

function handleSaveTeamSlot(body) {
  var date = body.date;
  var shiftIndex = Number(body.shiftIndex);
  var teams = body.teams;

  var sheet = getSheet(SHEET_TEAMS);
  var rows = readSheetData(SHEET_TEAMS);

  // Collect row numbers for this date+shift, then delete bottom-up
  var rowsToDelete = [];
  for (var i = 0; i < rows.length; i++) {
    var rowDate = formatDateValue(rows[i][COL_TEAM_DATE - 1]);
    var rowShift = Number(rows[i][COL_TEAM_SHIFT - 1]);
    if (rowDate === date && rowShift === shiftIndex) {
      rowsToDelete.push(i + 2); // +1 for header row, +1 for 1-based index
    }
  }
  for (var d = rowsToDelete.length - 1; d >= 0; d--) {
    sheet.deleteRow(rowsToDelete[d]);
  }

  var ts = new Date().toISOString();
  for (var t = 0; t < teams.length; t++) {
    var team = teams[t];
    sheet.appendRow([
      team.date,
      team.shiftIndex,
      team.teamNumber,
      team.coordinatorName,
      Array.isArray(team.members) ? team.members.join(', ') : String(team.members),
      team.coordinatorFilledIn,
      ts,
    ]);
  }

  return ok({ saved: teams.length });
}

// ===== TEAM ASSIGNMENT ALGORITHM =====

function computeTeamsForSlot(date, shiftIndex, allSlots, members, minTeamSize, maxTeamSize, prevShiftTeams) {
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
    if (role === 'coordinator' || role === 'project_lead') availCoords.push(mName);
    else availMembers.push(mName);
  }

  var total = availCoords.length + availMembers.length;
  var numTeams = Math.min(availCoords.length, Math.floor(total / minTeamSize));
  if (numTeams === 0) return [];

  // For shift 1: sort coordinators so those who led in shift 0 come first
  // (same order), keeping team composition stable across both shifts.
  if (shiftIndex === 1 && prevShiftTeams && prevShiftTeams.length > 0) {
    var prevLeaderOrder = {};
    for (var pt = 0; pt < prevShiftTeams.length; pt++) {
      prevLeaderOrder[prevShiftTeams[pt].coordinatorName] = pt;
    }
    availCoords.sort(function(a, b) {
      var ai = prevLeaderOrder.hasOwnProperty(a) ? prevLeaderOrder[a] : 9999;
      var bi = prevLeaderOrder.hasOwnProperty(b) ? prevLeaderOrder[b] : 9999;
      return ai - bi;
    });
  }

  var leaders = availCoords.slice(0, numTeams);
  var spareCoords = availCoords.slice(numTeams);
  var spareSet = {};
  for (var sc = 0; sc < spareCoords.length; sc++) spareSet[spareCoords[sc]] = true;

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

  var pool = availMembers.concat(spareCoords);
  var assigned = {};

  // For shift 1: pre-populate teams with their shift-0 members who are
  // also available for shift 1, keeping the same people together.
  if (shiftIndex === 1 && prevShiftTeams && prevShiftTeams.length > 0) {
    var availNow = {};
    for (var a = 0; a < available.length; a++) availNow[available[a].memberName] = true;

    var leaderToIdx = {};
    for (var li = 0; li < teams.length; li++) leaderToIdx[teams[li].coordinatorName] = li;

    for (var pi = 0; pi < prevShiftTeams.length; pi++) {
      var prevTeam = prevShiftTeams[pi];
      var teamIdx = leaderToIdx[prevTeam.coordinatorName];
      if (teamIdx === undefined) continue;
      for (var pm = 0; pm < prevTeam.members.length; pm++) {
        var prevMember = prevTeam.members[pm];
        if (availNow[prevMember] && !assigned[prevMember] && teams[teamIdx].members.length < maxTeamSize - 1) {
          teams[teamIdx].members.push(prevMember);
          assigned[prevMember] = true;
          if (spareSet[prevMember]) teams[teamIdx].coordinatorFilledIn = true;
        }
      }
    }
  }

  // Distribute remaining available people round-robin; if the next team is full,
  // try the next rather than skipping the person entirely
  var remaining = [];
  for (var r = 0; r < pool.length; r++) {
    if (!assigned[pool[r]]) remaining.push(pool[r]);
  }
  var teamPointer = 0;
  for (var rp = 0; rp < remaining.length; rp++) {
    for (var attempt = 0; attempt < numTeams; attempt++) {
      var ti = (teamPointer + attempt) % numTeams;
      if (teams[ti].members.length < maxTeamSize - 1) {
        teams[ti].members.push(remaining[rp]);
        if (spareSet[remaining[rp]]) teams[ti].coordinatorFilledIn = true;
        teamPointer = (ti + 1) % numTeams;
        break;
      }
    }
  }

  return teams;
}

// ===== SETUP FUNCTION (run once by project lead) =====

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
    ];
    configSheet.getRange(2, 1, defaults.length, 2).setValues(defaults);
  }

  ensureSheet(SHEET_MEMBERS, ['name', 'role', 'active']);

  var availSheet = ensureSheet(SHEET_AVAILABILITY, ['member_name', 'date', 'shift_index', 'available', 'submitted_at']);
  availSheet.getRange('B:B').setNumberFormat('@');

  var teamsSheet = ensureSheet(SHEET_TEAMS, ['date', 'shift_index', 'team_number', 'coordinator_name', 'members', 'coordinator_filled_in', 'computed_at']);
  teamsSheet.getRange('A:A').setNumberFormat('@');

  configSheet.getRange('B:B').setNumberFormat('@');

  SpreadsheetApp.getUi().alert('Setup complete! All required sheets have been created.');
}
