// ===================== STATE =====================
const STORAGE_KEY = 'crickscore_state_v2';

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const s = JSON.parse(raw);
      if(!s.matchHistory) s.matchHistory = [];
      if(!s.places) s.places = [];
      if(!s.fields) s.fields = [];
      return s;
    }
  }catch(e){}
  return { teams: [], match: null, matchHistory: [], places: [], fields: [] };
}
let state = loadState();
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function uid(){ return Math.random().toString(36).slice(2,9); }
function getTeam(id){ return state.teams.find(t => t.id === id); }
function getMatchById(id){ return state.matchHistory.find(x => x.id === id); }
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = String(str == null ? '' : str);
  return div.innerHTML;
}
function formatOvers(legalBalls){ return Math.floor(legalBalls/6) + '.' + (legalBalls%6); }

function emptyMatch(){
  return {
    id: uid(),
    teamAId: null, teamBId: null,
    overs: null, place: '', field: '', custom: [],
    lastManBats: false,
    tossWonBy: null, decision: null,
    battingFirstTeam: null,
    innings: [], currentInningsIndex: 0,
    result: null, awards: null,
    status: 'draft',
    createdAt: Date.now()
  };
}
function getMatchTeamName(m, side){ const id = side==='A' ? m.teamAId : m.teamBId; const t = getTeam(id); return t ? t.name : 'Team ' + side; }
function matchStage(m){
  if(!m) return 'teams';
  if(!m.teamAId || !m.teamBId) return 'teams';
  if(!m.overs || !m.place || !m.field) return 'details';
  if(!m.tossWonBy || !m.decision) return 'toss';
  return 'summary';
}
function currentInnings(){ return state.match.innings[state.match.currentInningsIndex]; }

// ===================== NAVIGATION =====================
function navigate(screen, push){
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById('screen-' + screen);
  if(el) el.classList.remove('hidden');
  if(push !== false) history.pushState({ screen }, '', '#' + screen);
  onEnterScreen(screen);
  window.scrollTo(0,0);
}
window.addEventListener('popstate', (e) => {
  const screen = (e.state && e.state.screen) || 'home';
  navigate(screen, false);
});
document.querySelectorAll('[data-back]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.back)));

function onEnterScreen(screen){
  if(screen === 'home') renderHome();
  if(screen === 'teams') renderTeamsScreen();
  if(screen === 'add-team') renderAddTeamScreen();
  if(screen === 'details') renderDetailsScreen();
  if(screen === 'toss') renderTossScreen();
  if(screen === 'summary') renderSummaryScreen();
  if(screen === 'innings-setup') renderInningsSetup();
  if(screen === 'live') renderLive();
  if(screen === 'scorecard') renderScorecardScreen();
  if(screen === 'result') renderResultScreen();
  if(screen === 'history') renderHistory();
  if(screen === 'stats') renderStats();
}

// ===================== TOAST =====================
let toastTimer;
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2400);
}

// ===================== SPLIT-FLAP TITLE =====================
function buildFlapTitle(){
  const el = document.querySelector('[data-flap-text]');
  if(!el) return;
  const text = el.dataset.flapText;
  el.innerHTML = '';
  [...text].forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'flap';
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    span.style.animationDelay = (i * 45) + 'ms';
    el.appendChild(span);
  });
}

// ===================== MODAL HELPERS =====================
function showModal(id){ document.getElementById(id).classList.remove('hidden'); }
function hideModal(id){ document.getElementById(id).classList.add('hidden'); }

// ===================== HOME =====================
function renderHome(){
  const empty = document.getElementById('home-empty');
  const resume = document.getElementById('home-resume');
  const resumeBtn = document.getElementById('btn-resume');
  const scoreBox = document.getElementById('resume-score');
  const prevCard = document.getElementById('home-prev-match');

  if(state.match){
    empty.classList.add('hidden');
    resume.classList.remove('hidden');
    prevCard.classList.add('hidden');
    const a = getTeam(state.match.teamAId), b = getTeam(state.match.teamBId);
    document.getElementById('resume-teamA').textContent = a ? a.name : 'Team A';
    document.getElementById('resume-teamB').textContent = b ? b.name : 'Team B';
    document.getElementById('resume-overs').textContent = state.match.overs ? state.match.overs + ' overs' : 'Overs not set';
    document.getElementById('resume-place').textContent = state.match.place || 'Venue not set';

    const inn = state.match.innings[state.match.currentInningsIndex];
    if(state.match.status === 'live' && inn){
      document.getElementById('resume-label').textContent = 'Match live';
      scoreBox.classList.remove('hidden');
      scoreBox.textContent = `${inn.totalRuns}/${inn.totalWickets} (${formatOvers(inn.legalBalls)})`;
      resumeBtn.textContent = 'Resume Scoring';
      resumeBtn.onclick = () => navigate('live');
    } else if(state.match.status === 'live' && !inn){
      document.getElementById('resume-label').textContent = `Between innings (${state.match.currentInningsIndex + 1} of 2)`;
      scoreBox.classList.add('hidden');
      resumeBtn.textContent = 'Set Up Next Innings';
      resumeBtn.onclick = () => navigate('innings-setup');
    } else {
      document.getElementById('resume-label').textContent = 'Match in progress';
      scoreBox.classList.add('hidden');
      resumeBtn.textContent = 'Resume setup';
      resumeBtn.onclick = () => navigate(matchStage(state.match));
    }
  } else {
    empty.classList.remove('hidden');
    resume.classList.add('hidden');
    if(state.matchHistory.length > 0){
      const last = state.matchHistory[0];
      prevCard.classList.remove('hidden');
      const inn2 = last.innings[1];
      document.getElementById('prev-match-teams').textContent = `${getMatchTeamName(last,'A')} vs ${getMatchTeamName(last,'B')}`;
      document.getElementById('btn-prev-match').onclick = () => { state.viewingMatchId = last.id; navigate('result'); };
    } else {
      prevCard.classList.add('hidden');
    }
  }
}

document.getElementById('btn-start-match').addEventListener('click', () => {
  if(!state.match) state.match = emptyMatch();
  saveState();
  navigate('teams');
});
document.getElementById('btn-discard').addEventListener('click', () => {
  if(!confirm('Discard this match? This can\u2019t be undone.')) return;
  state.match = null;
  saveState();
  renderHome();
  toast('Match discarded');
});
document.getElementById('btn-go-history').addEventListener('click', () => navigate('history'));
document.getElementById('btn-go-stats').addEventListener('click', () => navigate('stats'));

// ===================== SELECT TEAMS =====================
function renderTeamsScreen(){
  if(!state.match) state.match = emptyMatch();
  const list = document.getElementById('team-list');
  const emptyMsg = document.getElementById('team-list-empty');
  list.innerHTML = '';
  if(state.teams.length === 0){
    emptyMsg.classList.remove('hidden');
  } else {
    emptyMsg.classList.add('hidden');
    state.teams.forEach(team => {
      const card = document.createElement('div');
      card.className = 'team-card';
      if(state.match.teamAId === team.id) card.classList.add('selected-a');
      if(state.match.teamBId === team.id) card.classList.add('selected-b');
      card.innerHTML = `
        <div>
          <div class="tname">${escapeHtml(team.name)}</div>
          <div class="tcount">${team.players.length} player${team.players.length===1?'':'s'}</div>
        </div>
        <div class="team-card-actions">
          <span class="tcount" style="align-self:center; margin-right:4px;">${state.match.teamAId===team.id ? 'TEAM A' : state.match.teamBId===team.id ? 'TEAM B' : 'Tap to pick'}</span>
          <button class="team-icon-btn" data-action="edit" aria-label="Edit team">✏️</button>
          <button class="team-icon-btn" data-action="delete" aria-label="Delete team">🗑️</button>
        </div>
      `;
      card.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
        e.stopPropagation();
        editingTeamId = team.id;
        draftTeam = { name: team.name, players: JSON.parse(JSON.stringify(team.players)) };
        navigate('add-team');
      });
      card.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
        e.stopPropagation();
        if(!confirm(`Delete "${team.name}"? This can't be undone.`)) return;
        state.teams = state.teams.filter(t => t.id !== team.id);
        if(state.match.teamAId === team.id) state.match.teamAId = null;
        if(state.match.teamBId === team.id) state.match.teamBId = null;
        saveState();
        renderTeamsScreen();
        toast('Team deleted');
      });
      card.addEventListener('click', () => pickTeam(team.id));
      list.appendChild(card);
    });
  }
  updateTeamSlots();
}
function pickTeam(teamId){
  const m = state.match;
  if(m.teamAId === teamId){ m.teamAId = null; }
  else if(m.teamBId === teamId){ m.teamBId = null; }
  else if(!m.teamAId){ m.teamAId = teamId; }
  else if(!m.teamBId && m.teamAId !== teamId){ m.teamBId = teamId; }
  else { toast('Both slots filled — tap a selected team to swap it out'); return; }
  saveState();
  renderTeamsScreen();
}
function updateTeamSlots(){
  const slotA = document.getElementById('slotA'), slotB = document.getElementById('slotB');
  const a = getTeam(state.match.teamAId), b = getTeam(state.match.teamBId);
  slotA.querySelector('.slot-value').textContent = a ? a.name : 'Tap a team below';
  slotB.querySelector('.slot-value').textContent = b ? b.name : 'Tap a team below';
  slotA.classList.toggle('filled', !!a);
  slotB.classList.toggle('filled', !!b);
  document.getElementById('btn-teams-continue').disabled = !(a && b);
}
document.getElementById('btn-add-team').addEventListener('click', () => { draftTeam = { name:'', players:[] }; editingTeamId = null; navigate('add-team'); });
document.getElementById('btn-teams-continue').addEventListener('click', () => { saveState(); navigate('details'); });

// ===================== ADD TEAM =====================
let draftTeam = { name: '', players: [] };
let editingTeamId = null;
function renderAddTeamScreen(){
  document.getElementById('input-team-name').value = draftTeam.name;
  document.getElementById('input-player-name').value = '';
  document.querySelector('#screen-add-team h1').textContent = editingTeamId ? 'Edit Team' : 'Create Team';
  document.getElementById('btn-save-team').textContent = editingTeamId ? 'Save Changes' : 'Save Team';
  renderPlayerList();
  const hint = document.getElementById('contacts-hint');
  hint.textContent = ('contacts' in navigator && 'ContactsManager' in window)
    ? '' : 'Contact picker isn\u2019t available in this browser — add players manually instead.';
}
function renderPlayerList(){
  const list = document.getElementById('player-list');
  list.innerHTML = '';
  draftTeam.players.forEach(p => {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `
      <div><div class="pname">${escapeHtml(p.name)}</div>
      ${p.source === 'contact' ? '<div class="ptag">from contacts</div>' : ''}</div>
      <button class="remove-btn" aria-label="Remove">✕</button>`;
    row.querySelector('.remove-btn').addEventListener('click', () => {
      draftTeam.players = draftTeam.players.filter(pl => pl.id !== p.id);
      renderPlayerList();
    });
    list.appendChild(row);
  });
  document.getElementById('player-count').textContent = draftTeam.players.length + ' added';
}
document.getElementById('input-team-name').addEventListener('input', (e) => { draftTeam.name = e.target.value; });
document.getElementById('btn-add-player').addEventListener('click', addManualPlayer);
document.getElementById('input-player-name').addEventListener('keydown', (e) => { if(e.key === 'Enter') addManualPlayer(); });
function addManualPlayer(){
  const input = document.getElementById('input-player-name');
  const name = input.value.trim();
  if(!name) return;
  draftTeam.players.push({ id: uid(), name, source: 'manual' });
  input.value = '';
  renderPlayerList();
}
document.getElementById('btn-from-contacts').addEventListener('click', async () => {
  if(!('contacts' in navigator && 'ContactsManager' in window)){ toast('Contact picker not supported on this browser/device'); return; }
  try{
    const contacts = await navigator.contacts.select(['name'], { multiple: true });
    contacts.forEach(c => draftTeam.players.push({ id: uid(), name: (c.name && c.name[0]) || 'Unnamed', source: 'contact' }));
    renderPlayerList();
    toast(`Added ${contacts.length} from contacts`);
  }catch(err){ toast('Couldn\u2019t open contacts'); }
});
document.getElementById('btn-save-team').addEventListener('click', () => {
  const name = document.getElementById('input-team-name').value.trim();
  if(!name){ toast('Give your team a name first'); return; }
  if(editingTeamId){
    const team = getTeam(editingTeamId);
    if(team){ team.name = name; team.players = draftTeam.players; }
    editingTeamId = null;
    saveState();
    toast('Team updated');
  } else {
    state.teams.push({ id: uid(), name, players: draftTeam.players, createdAt: Date.now() });
    saveState();
    toast('Team saved');
  }
  navigate('teams');
});

// ===================== MATCH DETAILS =====================
function renderDetailsScreen(){
  const m = state.match;
  document.getElementById('details-teamA').textContent = getMatchTeamName(m,'A');
  document.getElementById('details-teamB').textContent = getMatchTeamName(m,'B');
  document.getElementById('input-overs').value = m.overs || '';
  document.getElementById('input-place').value = m.place || '';
  document.getElementById('input-field').value = m.field || '';
  document.getElementById('input-last-man-bats').checked = !!m.lastManBats;
  renderChipList('place-chip-list', state.places, 'input-place', 'place');
  renderChipList('field-chip-list', state.fields, 'input-field', 'field');
  renderCustomFields();
}
function renderChipList(containerId, list, inputId, matchKey){
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  list.forEach((val, idx) => {
    const chip = document.createElement('span');
    chip.className = 'chip-pill';
    chip.innerHTML = `<span class="chip-pill-text">${escapeHtml(val)}</span><button class="chip-pill-remove" aria-label="Remove">✕</button>`;
    chip.querySelector('.chip-pill-text').addEventListener('click', () => {
      document.getElementById(inputId).value = val;
      state.match[matchKey] = val;
      saveState();
    });
    chip.querySelector('.chip-pill-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      list.splice(idx, 1);
      saveState();
      renderChipList(containerId, list, inputId, matchKey);
    });
    container.appendChild(chip);
  });
}
document.getElementById('btn-add-place').addEventListener('click', () => {
  const val = document.getElementById('input-place').value.trim();
  if(!val){ toast('Type a place first'); return; }
  if(!state.places.includes(val)) state.places.push(val);
  saveState();
  renderChipList('place-chip-list', state.places, 'input-place', 'place');
  toast('Place saved — tap it next time instead of typing');
});
document.getElementById('btn-add-field').addEventListener('click', () => {
  const val = document.getElementById('input-field').value.trim();
  if(!val){ toast('Type a field name first'); return; }
  if(!state.fields.includes(val)) state.fields.push(val);
  saveState();
  renderChipList('field-chip-list', state.fields, 'input-field', 'field');
  toast('Field saved — tap it next time instead of typing');
});
document.getElementById('input-last-man-bats').addEventListener('change', (e) => {
  state.match.lastManBats = e.target.checked;
  saveState();
});
['input-overs','input-place','input-field'].forEach(id => {
  document.getElementById(id).addEventListener('input', (e) => {
    const m = state.match;
    if(id === 'input-overs') m.overs = e.target.value ? Number(e.target.value) : null;
    if(id === 'input-place') m.place = e.target.value;
    if(id === 'input-field') m.field = e.target.value;
    saveState();
  });
});
document.getElementById('more-details-toggle').addEventListener('click', () => {
  document.getElementById('more-details-body').classList.toggle('hidden');
  document.getElementById('more-details-toggle').classList.toggle('open');
});
function renderCustomFields(){
  const list = document.getElementById('custom-field-list');
  list.innerHTML = '';
  state.match.custom.forEach((f, idx) => {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `<div><div class="pname">${escapeHtml(f.label)}</div><div class="ptag">${escapeHtml(f.value)}</div></div>
      <button class="remove-btn" aria-label="Remove">✕</button>`;
    row.querySelector('.remove-btn').addEventListener('click', () => { state.match.custom.splice(idx,1); saveState(); renderCustomFields(); });
    list.appendChild(row);
  });
}
document.getElementById('btn-add-custom-field').addEventListener('click', () => {
  const labelEl = document.getElementById('input-custom-label'), valueEl = document.getElementById('input-custom-value');
  const label = labelEl.value.trim(), value = valueEl.value.trim();
  if(!label || !value){ toast('Fill in both fields'); return; }
  state.match.custom.push({ label, value });
  labelEl.value=''; valueEl.value='';
  saveState();
  renderCustomFields();
});
document.getElementById('btn-details-continue').addEventListener('click', () => {
  const m = state.match;
  if(!m.overs || !m.place || !m.field){ toast('Fill in overs, place and field name'); return; }
  saveState();
  navigate('toss');
});

// ===================== TOSS =====================
function renderTossScreen(){
  const m = state.match;
  document.getElementById('toss-pick-A').textContent = getMatchTeamName(m,'A');
  document.getElementById('toss-pick-B').textContent = getMatchTeamName(m,'B');
  document.getElementById('toss-pick-A').classList.toggle('active', m.tossWonBy === 'A');
  document.getElementById('toss-pick-B').classList.toggle('active', m.tossWonBy === 'B');
  const decisionBlock = document.getElementById('toss-decision-block');
  if(m.tossWonBy){
    decisionBlock.classList.remove('hidden');
    document.getElementById('toss-decision-label').textContent = `${getMatchTeamName(m, m.tossWonBy)} chooses to`;
  } else decisionBlock.classList.add('hidden');
  document.getElementById('decision-bat').classList.toggle('active', m.decision === 'bat');
  document.getElementById('decision-bowl').classList.toggle('active', m.decision === 'bowl');
  document.getElementById('btn-toss-continue').disabled = !(m.tossWonBy && m.decision);
}
document.getElementById('coin-flip').addEventListener('click', (e) => {
  const coin = e.currentTarget;
  coin.classList.remove('spin');
  document.getElementById('coin-hint').textContent = 'Flipping...';
  requestAnimationFrame(() => coin.classList.add('spin'));
  setTimeout(() => {
    const m = state.match;
    const winner = Math.random() < 0.5 ? 'A' : 'B';
    m.tossWonBy = winner;
    m.decision = null;
    saveState();
    document.getElementById('coin-hint').textContent = `${getMatchTeamName(m, winner)} won the toss! Tap again to re-flip, or pick below.`;
    renderTossScreen();
  }, 700);
});
document.getElementById('toss-pick-A').addEventListener('click', () => { state.match.tossWonBy='A'; saveState(); renderTossScreen(); });
document.getElementById('toss-pick-B').addEventListener('click', () => { state.match.tossWonBy='B'; saveState(); renderTossScreen(); });
document.getElementById('decision-bat').addEventListener('click', () => { state.match.decision='bat'; saveState(); renderTossScreen(); });
document.getElementById('decision-bowl').addEventListener('click', () => { state.match.decision='bowl'; saveState(); renderTossScreen(); });
document.getElementById('btn-toss-continue').addEventListener('click', () => { saveState(); navigate('summary'); });

// ===================== SUMMARY =====================
function renderSummaryScreen(){
  const m = state.match;
  document.getElementById('summary-teamA').textContent = getMatchTeamName(m,'A');
  document.getElementById('summary-teamB').textContent = getMatchTeamName(m,'B');
  document.getElementById('summary-overs').textContent = m.overs;
  document.getElementById('summary-place').textContent = m.place;
  document.getElementById('summary-field').textContent = m.field;
  document.getElementById('summary-toss').textContent = `${getMatchTeamName(m, m.tossWonBy)} won, chose to ${m.decision}`;
  const battingFirstSide = m.decision === 'bat' ? m.tossWonBy : (m.tossWonBy === 'A' ? 'B' : 'A');
  document.getElementById('summary-batting').textContent = getMatchTeamName(m, battingFirstSide);
  const customWrap = document.getElementById('summary-custom-fields');
  customWrap.innerHTML = '';
  m.custom.forEach(f => {
    const row = document.createElement('div');
    row.className = 'summary-row';
    row.innerHTML = `<span>${escapeHtml(f.label)}</span><strong>${escapeHtml(f.value)}</strong>`;
    customWrap.appendChild(row);
  });
}
document.getElementById('btn-summary-home').addEventListener('click', () => { state.match.status='ready'; saveState(); navigate('home'); });
document.getElementById('btn-start-innings').addEventListener('click', () => {
  const m = state.match;
  m.battingFirstTeam = m.decision === 'bat' ? m.tossWonBy : (m.tossWonBy === 'A' ? 'B' : 'A');
  m.currentInningsIndex = 0;
  m.innings = [];
  saveState();
  navigate('innings-setup');
});

// ===================== INNINGS SETUP =====================
function squadFor(teamId, minCount){
  const team = getTeam(teamId);
  const players = team ? team.players.map(p => ({ id: p.id, name: p.name })) : [];
  while(players.length < minCount){
    players.push({ id: 'pad_' + teamId + '_' + players.length, name: 'Player ' + (players.length + 1) });
  }
  return players;
}
let inningsDraft = { battingTeam:null, bowlingTeam:null, squadBatting:[], squadBowling:[], openers:[], bowlerId:null };

function inningsSides(){
  const m = state.match, idx = m.currentInningsIndex;
  const firstBats = m.battingFirstTeam;
  const battingTeamSide = idx === 0 ? firstBats : (firstBats === 'A' ? 'B' : 'A');
  const bowlingTeamSide = battingTeamSide === 'A' ? 'B' : 'A';
  return {
    battingTeamSide, bowlingTeamSide,
    battingTeamId: battingTeamSide === 'A' ? m.teamAId : m.teamBId,
    bowlingTeamId: bowlingTeamSide === 'A' ? m.teamAId : m.teamBId
  };
}

function renderInningsSetup(){
  const m = state.match, idx = m.currentInningsIndex;
  const sides = inningsSides();
  document.getElementById('innings-setup-title').textContent = 'Innings ' + (idx+1);
  document.getElementById('innings-setup-pill').textContent =
    `${getMatchTeamName(m, sides.battingTeamSide)} batting · ${getMatchTeamName(m, sides.bowlingTeamSide)} bowling`;

  const minBatters = 2;
  document.getElementById('opener-list-label').textContent = 'Opening batsmen';
  document.getElementById('opener-list-hint').textContent = 'pick 2, mark striker';

  inningsDraft = {
    battingTeamSide: sides.battingTeamSide, bowlingTeamSide: sides.bowlingTeamSide,
    squadBatting: squadFor(sides.battingTeamId, minBatters),
    squadBowling: squadFor(sides.bowlingTeamId, 1),
    openers: [], bowlerId: null
  };

  const openerList = document.getElementById('opener-list');
  openerList.innerHTML = '';
  inningsDraft.squadBatting.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'select-item';
    btn.innerHTML = `<span>${escapeHtml(p.name)}</span><span class="tag"></span>`;
    btn.addEventListener('click', () => {
      const maxOpeners = 2;
      const i = inningsDraft.openers.indexOf(p.id);
      if(i > -1) inningsDraft.openers.splice(i,1);
      else if(inningsDraft.openers.length < maxOpeners) inningsDraft.openers.push(p.id);
      else { toast('Two openers already picked — tap one to swap'); return; }
      renderOpenerTags();
      checkInningsStartReady();
    });
    btn.dataset.pid = p.id;
    openerList.appendChild(btn);
  });

  const bowlerList = document.getElementById('bowler-pick-list');
  bowlerList.innerHTML = '';
  inningsDraft.squadBowling.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'select-item';
    btn.innerHTML = `<span>${escapeHtml(p.name)}</span><span class="tag"></span>`;
    btn.addEventListener('click', () => {
      inningsDraft.bowlerId = p.id;
      bowlerList.querySelectorAll('.select-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      checkInningsStartReady();
    });
    bowlerList.appendChild(btn);
  });
  renderOpenerTags();
}
function renderOpenerTags(){
  document.querySelectorAll('#opener-list .select-item').forEach(btn => {
    const pid = btn.dataset.pid;
    const pos = inningsDraft.openers.indexOf(pid);
    btn.classList.toggle('active', pos > -1);
    btn.querySelector('.tag').textContent = pos === 0 ? 'striker' : pos === 1 ? 'non-striker' : '';
  });
}
function checkInningsStartReady(){
  const needed = 2;
  document.getElementById('btn-innings-start').disabled = !(inningsDraft.openers.length === needed && inningsDraft.bowlerId);
}
document.getElementById('btn-innings-start').addEventListener('click', () => {
  const m = state.match, idx = m.currentInningsIndex;
  const strikerId = inningsDraft.openers[0];
  const nonStrikerId = inningsDraft.openers[1];
  const inn = {
    battingTeam: inningsDraft.battingTeamSide, bowlingTeam: inningsDraft.bowlingTeamSide,
    squadBatting: inningsDraft.squadBatting, squadBowling: inningsDraft.squadBowling,
    maxWickets: m.lastManBats ? inningsDraft.squadBatting.length : Math.max(inningsDraft.squadBatting.length - 1, 1),
    totalRuns: 0, totalWickets: 0, legalBalls: 0,
    extras: { wide:0, noball:0, bye:0, legbye:0 },
    battingStats: {}, bowlingStats: {},
    battingOrder: [strikerId, nonStrikerId],
    strikerId, nonStrikerId,
    bowlerId: inningsDraft.bowlerId, previousBowlerId: null,
    ballLog: [], thisOver: [],
    isComplete: false, completionReason: null
  };
  const nameOf = (id, list) => (list.find(p => p.id === id) || {}).name || '?';
  inn.battingStats[strikerId] = { name: nameOf(strikerId, inn.squadBatting), runs:0, balls:0, fours:0, sixes:0, out:false, howOut:null };
  inn.battingStats[nonStrikerId] = { name: nameOf(nonStrikerId, inn.squadBatting), runs:0, balls:0, fours:0, sixes:0, out:false, howOut:null };
  inn.bowlingStats[inn.bowlerId] = { name: nameOf(inn.bowlerId, inn.squadBowling), balls:0, runs:0, wickets:0 };

  m.innings[idx] = inn;
  m.status = 'live';
  saveState();
  undoStack = [];
  navigate('live');
});

// ===================== LIVE SCORING =====================
let undoStack = [];
let pendingExtra = null;

function snapshotInnings(){
  undoStack.push(JSON.stringify(currentInnings()));
  if(undoStack.length > 60) undoStack.shift();
}

function renderLive(){
  const m = state.match, inn = currentInnings();
  document.getElementById('live-title').textContent = `Innings ${m.currentInningsIndex+1} · ${getMatchTeamName(m, inn.battingTeam)}`;
  document.getElementById('live-score').textContent = `${inn.totalRuns}/${inn.totalWickets}`;
  document.getElementById('live-overs').textContent = `(${formatOvers(inn.legalBalls)}/${m.overs})`;

  const targetEl = document.getElementById('live-target'), rrEl = document.getElementById('live-rr');
  if(m.currentInningsIndex === 1){
    const target = m.innings[0].totalRuns + 1;
    const need = Math.max(target - inn.totalRuns, 0);
    const ballsLeft = Math.max(m.overs*6 - inn.legalBalls, 0);
    targetEl.textContent = `Target ${target} · need ${need} off ${ballsLeft} balls`;
    const rrr = ballsLeft > 0 ? (need / (ballsLeft/6)).toFixed(2) : '—';
    rrEl.textContent = `Required RR: ${rrr}`;
  } else {
    targetEl.textContent = '';
    const crr = inn.legalBalls > 0 ? (inn.totalRuns / (inn.legalBalls/6)).toFixed(2) : '0.00';
    rrEl.textContent = `Run rate: ${crr}`;
  }

  const sB = inn.battingStats[inn.strikerId], nB = inn.nonStrikerId ? inn.battingStats[inn.nonStrikerId] : null, bB = inn.bowlingStats[inn.bowlerId];
  document.getElementById('striker-name').textContent = sB.name + ' *';
  document.getElementById('striker-stat').textContent = `${sB.runs} (${sB.balls})`;
  const nsLine = document.getElementById('nonstriker-name').closest('.player-line');
  if(nB){
    nsLine.classList.remove('hidden');
    document.getElementById('nonstriker-name').textContent = nB.name;
    document.getElementById('nonstriker-stat').textContent = `${nB.runs} (${nB.balls})`;
  } else {
    nsLine.classList.add('hidden');
  }
  document.getElementById('bowler-name').textContent = bB.name;
  document.getElementById('bowler-stat').textContent = `${formatOvers(bB.balls)}-${bB.runs}-${bB.wickets}`;

  const chipsEl = document.getElementById('this-over-chips');
  chipsEl.innerHTML = '';
  inn.thisOver.forEach(c => {
    const span = document.createElement('span');
    span.className = 'chip ' + (c.cls || '');
    span.textContent = c.label;
    chipsEl.appendChild(span);
  });

  clearPending();
}

function clearPending(){
  pendingExtra = null;
  document.getElementById('pending-banner').classList.add('hidden');
}
function setPending(kind, label){
  pendingExtra = kind;
  const b = document.getElementById('pending-banner');
  b.textContent = label;
  b.classList.remove('hidden');
}

function recordBallCore(d){
  const inn = currentInnings();
  const legal = !['wide','noball'].includes(d.type);
  const cls = d.isWicket ? 'chip-wicket' : d.batRuns===4 ? 'chip-four' : d.batRuns===6 ? 'chip-six' : (d.type!=='normal' ? 'chip-extra' : '');
  let label;
  if(d.isWicket) label = 'W';
  else if(d.type==='wide') label = 'Wd';
  else if(d.type==='noball') label = 'Nb' + (d.batRuns>0?'+'+d.batRuns:'');
  else if(d.type==='bye') label = 'B'+d.extraRuns;
  else if(d.type==='legbye') label = 'Lb'+d.extraRuns;
  else label = String(d.batRuns);
  inn.thisOver.push({ label, cls });

  inn.totalRuns += d.batRuns + d.extraRuns;
  if(d.type==='wide') inn.extras.wide += d.extraRuns;
  if(d.type==='noball') inn.extras.noball += d.extraRuns;
  if(d.type==='bye') inn.extras.bye += d.extraRuns;
  if(d.type==='legbye') inn.extras.legbye += d.extraRuns;

  const striker = inn.battingStats[inn.strikerId];
  if(d.type==='normal' || d.type==='noball' || d.type==='wicket'){
    striker.runs += d.batRuns;
    if(d.batRuns===4) striker.fours++;
    if(d.batRuns===6) striker.sixes++;
  }
  if(d.type!=='wide') striker.balls += 1;

  const bowler = inn.bowlingStats[inn.bowlerId];
  if(legal) bowler.balls += 1;
  if(d.type!=='bye' && d.type!=='legbye') bowler.runs += d.batRuns + d.extraRuns;

  if(d.isWicket){
    inn.totalWickets += 1;
    const dismissedId = (d.wicketType === 'Run Out' && d.dismissedEnd === 'nonStriker' && inn.nonStrikerId) ? inn.nonStrikerId : inn.strikerId;
    const dismissedPlayer = inn.battingStats[dismissedId];
    dismissedPlayer.out = true;
    dismissedPlayer.howOut = d.wicketType;
    if(d.wicketType !== 'Run Out' && d.wicketType !== 'Retired') bowler.wickets += 1;
  }

  if(legal) inn.legalBalls += 1;
  inn.ballLog.push(d);

  const rotateRuns = (d.type==='bye'||d.type==='legbye') ? d.extraRuns : d.batRuns;
  if(!d.isWicket && rotateRuns % 2 === 1) swapStrike(inn);

  saveState();
}
function swapStrike(inn){ if(!inn.nonStrikerId) return; const t = inn.strikerId; inn.strikerId = inn.nonStrikerId; inn.nonStrikerId = t; }

function checkInningsEnd(){
  const m = state.match, inn = currentInnings();
  let ended = false, reason = '';
  if(m.currentInningsIndex === 1 && inn.totalRuns > m.innings[0].totalRuns){ ended = true; reason = 'target'; }
  else if(inn.legalBalls >= m.overs*6){ ended = true; reason = 'overs'; }
  else if(inn.totalWickets >= inn.maxWickets){ ended = true; reason = 'allout'; }
  if(ended){ inn.completionReason = reason; inn.isComplete = true; saveState(); endInnings(); }
  return ended;
}

function endInnings(){
  const m = state.match;
  if(m.currentInningsIndex === 0){
    m.currentInningsIndex = 1;
    saveState();
    navigate('innings-setup');
  } else {
    finishMatch();
  }
}

function computeMatchAwards(m){
  const battingAgg = {}, bowlingAgg = {};
  m.innings.forEach(inn => {
    Object.keys(inn.battingStats).forEach(pid => {
      const b = inn.battingStats[pid];
      if(!battingAgg[pid]) battingAgg[pid] = { name: b.name, runs:0, balls:0, fours:0, sixes:0 };
      battingAgg[pid].runs += b.runs;
      battingAgg[pid].balls += b.balls;
      battingAgg[pid].fours += b.fours;
      battingAgg[pid].sixes += b.sixes;
    });
    Object.keys(inn.bowlingStats).forEach(pid => {
      const bw = inn.bowlingStats[pid];
      if(!bowlingAgg[pid]) bowlingAgg[pid] = { name: bw.name, wickets:0, runs:0, balls:0 };
      bowlingAgg[pid].wickets += bw.wickets;
      bowlingAgg[pid].runs += bw.runs;
      bowlingAgg[pid].balls += bw.balls;
    });
  });

  let topScorer = null;
  Object.keys(battingAgg).forEach(pid => {
    const b = battingAgg[pid];
    if(!topScorer || b.runs > topScorer.runs) topScorer = { id: pid, name: b.name, runs: b.runs, balls: b.balls };
  });

  let topBowler = null;
  Object.keys(bowlingAgg).forEach(pid => {
    const bw = bowlingAgg[pid];
    if(!topBowler || bw.wickets > topBowler.wickets || (bw.wickets === topBowler.wickets && bw.runs < topBowler.runs)){
      topBowler = { id: pid, name: bw.name, wickets: bw.wickets, runs: bw.runs };
    }
  });

  const points = {};
  Object.keys(battingAgg).forEach(pid => {
    const b = battingAgg[pid];
    if(!points[pid]) points[pid] = { name: b.name, score: 0 };
    points[pid].score += b.runs + b.fours + b.sixes*2;
  });
  Object.keys(bowlingAgg).forEach(pid => {
    const bw = bowlingAgg[pid];
    if(!points[pid]) points[pid] = { name: bw.name, score: 0 };
    points[pid].score += bw.wickets * 20;
  });
  let motm = null;
  Object.keys(points).forEach(pid => {
    if(!motm || points[pid].score > motm.score) motm = { id: pid, name: points[pid].name, score: points[pid].score };
  });

  return { topScorer, topBowler, motm };
}

function finishMatch(){
  const m = state.match;
  const inn1 = m.innings[0], inn2 = m.innings[1];
  if(inn2.totalRuns > inn1.totalRuns){
    const w = inn2.maxWickets - inn2.totalWickets;
    m.result = { winnerSide: inn2.battingTeam, margin: `${w} wicket${w===1?'':'s'}` };
  } else if(inn2.totalRuns < inn1.totalRuns){
    const r = inn1.totalRuns - inn2.totalRuns;
    m.result = { winnerSide: inn1.battingTeam, margin: `${r} run${r===1?'':'s'}` };
  } else {
    m.result = { winnerSide: null, margin: null };
  }
  m.awards = computeMatchAwards(m);
  m.status = 'completed';
  state.matchHistory.unshift(JSON.parse(JSON.stringify(m)));
  state.viewingMatchId = m.id;
  state.match = null;
  saveState();
  navigate('result');
}

function processDelivery(d){
  snapshotInnings();
  recordBallCore(d);
  if(checkInningsEnd()) return;
  if(d.isWicket){
    const inn = currentInnings();
    if(inn.battingOrder.length < inn.squadBatting.length){
      openNextBatsmanModal();
    } else if(inn.nonStrikerId){
      // No fresh batsman left, but maxWickets not reached yet (lastManBats mode):
      // the surviving not-out partner carries on alone.
      const lastBall = inn.ballLog[inn.ballLog.length - 1];
      const nonStrikerWasOut = lastBall && lastBall.wicketType === 'Run Out' && lastBall.dismissedEnd === 'nonStriker';
      if(!nonStrikerWasOut){ inn.strikerId = inn.nonStrikerId; }
      inn.nonStrikerId = null;
      saveState();
      hideModal('modal-wicket');
      if(inn.legalBalls > 0 && inn.legalBalls % 6 === 0) openNextBowlerModal();
      else renderLive();
    } else {
      hideModal('modal-wicket');
      checkInningsEnd();
      renderLive();
    }
    return;
  }
  const inn = currentInnings();
  if(inn.legalBalls > 0 && inn.legalBalls % 6 === 0){
    openNextBowlerModal();
    return;
  }
  renderLive();
}

// pad: run buttons
document.querySelectorAll('.pad-btn[data-run]').forEach(btn => {
  btn.addEventListener('click', () => {
    const run = Number(btn.dataset.run);
    if(pendingExtra === 'noball'){ processDelivery({ type:'noball', batRuns:run, extraRuns:1, isWicket:false }); }
    else if(pendingExtra === 'bye'){ processDelivery({ type:'bye', batRuns:0, extraRuns: Math.max(run,1), isWicket:false }); }
    else if(pendingExtra === 'legbye'){ processDelivery({ type:'legbye', batRuns:0, extraRuns: Math.max(run,1), isWicket:false }); }
    else { processDelivery({ type:'normal', batRuns:run, extraRuns:0, isWicket:false }); }
  });
});
document.getElementById('pad-wide').addEventListener('click', () => processDelivery({ type:'wide', batRuns:0, extraRuns:1, isWicket:false }));
document.getElementById('pad-noball').addEventListener('click', () => setPending('noball', 'No ball — now tap runs scored off the bat (0–6)'));
document.getElementById('pad-bye').addEventListener('click', () => setPending('bye', 'Bye — now tap runs taken (1–6)'));
document.getElementById('pad-legbye').addEventListener('click', () => setPending('legbye', 'Leg bye — now tap runs taken (1–6)'));

document.getElementById('pad-undo').addEventListener('click', () => {
  if(undoStack.length === 0){ toast('Nothing to undo'); return; }
  const snap = JSON.parse(undoStack.pop());
  state.match.innings[state.match.currentInningsIndex] = snap;
  saveState();
  renderLive();
  toast('Last ball undone');
});

// ---- wicket modal ----
function openNextBatsmanModal(){
  document.getElementById('wicket-step-type').classList.add('hidden');
  document.getElementById('wicket-step-batsman').classList.add('hidden');
  document.getElementById('wicket-step-next').classList.remove('hidden');
  const inn = currentInnings();
  const list = document.getElementById('wicket-next-batsman-list');
  list.innerHTML = '';
  inn.squadBatting.filter(p => !inn.battingOrder.includes(p.id)).forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'select-item';
    btn.textContent = p.name;
    btn.addEventListener('click', () => confirmNextBatsman(p.id));
    list.appendChild(btn);
  });
  showModal('modal-wicket');
}
function confirmNextBatsman(playerId){
  const inn = currentInnings();
  const lastBall = inn.ballLog[inn.ballLog.length - 1];
  const nonStrikerWasOut = lastBall && lastBall.wicketType === 'Run Out' && lastBall.dismissedEnd === 'nonStriker';
  if(nonStrikerWasOut){
    inn.nonStrikerId = playerId;
  } else {
    inn.strikerId = playerId;
  }
  inn.battingOrder.push(playerId);
  const nameObj = inn.squadBatting.find(p => p.id === playerId);
  inn.battingStats[playerId] = { name: nameObj ? nameObj.name : '?', runs:0, balls:0, fours:0, sixes:0, out:false, howOut:null };
  saveState();
  hideModal('modal-wicket');
  if(inn.legalBalls > 0 && inn.legalBalls % 6 === 0) openNextBowlerModal();
  else renderLive();
}
document.getElementById('pad-wicket').addEventListener('click', () => {
  document.getElementById('wicket-step-type').classList.remove('hidden');
  document.getElementById('wicket-step-batsman').classList.add('hidden');
  document.getElementById('wicket-step-next').classList.add('hidden');
  document.getElementById('wicket-step-runout-who').classList.add('hidden');
  showModal('modal-wicket');
});
document.getElementById('btn-wicket-cancel').addEventListener('click', () => hideModal('modal-wicket'));
document.getElementById('btn-runout-cancel').addEventListener('click', () => hideModal('modal-wicket'));
document.querySelectorAll('#wicket-type-list .select-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.out;
    if(type === 'Run Out'){
      const inn = currentInnings();
      if(inn.nonStrikerId){
        openRunOutWhoStep();
        return;
      }
      // no non-striker on the field (lastManBats solo phase) — only one possible person to be out
      processDelivery({ type:'wicket', batRuns:0, extraRuns:0, isWicket:true, wicketType:type, dismissedEnd:'striker' });
      return;
    }
    processDelivery({ type:'wicket', batRuns:0, extraRuns:0, isWicket:true, wicketType:type, dismissedEnd:'striker' });
  });
});
function openRunOutWhoStep(){
  document.getElementById('wicket-step-type').classList.add('hidden');
  document.getElementById('wicket-step-runout-who').classList.remove('hidden');
  const inn = currentInnings();
  const list = document.getElementById('wicket-runout-who-list');
  list.innerHTML = '';
  const striker = inn.battingStats[inn.strikerId];
  const nonStriker = inn.battingStats[inn.nonStrikerId];
  const strikerBtn = document.createElement('button');
  strikerBtn.className = 'select-item';
  strikerBtn.textContent = `${striker.name} (striker)`;
  strikerBtn.addEventListener('click', () => processDelivery({ type:'wicket', batRuns:0, extraRuns:0, isWicket:true, wicketType:'Run Out', dismissedEnd:'striker' }));
  list.appendChild(strikerBtn);
  const nonStrikerBtn = document.createElement('button');
  nonStrikerBtn.className = 'select-item';
  nonStrikerBtn.textContent = `${nonStriker.name} (non-striker)`;
  nonStrikerBtn.addEventListener('click', () => processDelivery({ type:'wicket', batRuns:0, extraRuns:0, isWicket:true, wicketType:'Run Out', dismissedEnd:'nonStriker' }));
  list.appendChild(nonStrikerBtn);
}

// ---- next bowler modal ----
function openNextBowlerModal(){
  const inn = currentInnings();
  const list = document.getElementById('next-bowler-list');
  list.innerHTML = '';
  inn.squadBowling.filter(p => p.id !== inn.bowlerId).forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'select-item';
    btn.textContent = p.name;
    btn.addEventListener('click', () => confirmNextBowler(p.id));
    list.appendChild(btn);
  });
  showModal('modal-bowler');
}
function confirmNextBowler(playerId){
  const inn = currentInnings();
  inn.previousBowlerId = inn.bowlerId;
  inn.bowlerId = playerId;
  if(!inn.bowlingStats[playerId]){
    const nameObj = inn.squadBowling.find(p => p.id === playerId);
    inn.bowlingStats[playerId] = { name: nameObj ? nameObj.name : '?', balls:0, runs:0, wickets:0 };
  }
  inn.thisOver = [];
  swapStrike(inn);
  saveState();
  hideModal('modal-bowler');
  renderLive();
}

// ---- live menu ----
document.getElementById('btn-live-menu').addEventListener('click', () => showModal('modal-live-menu'));
document.getElementById('btn-menu-close').addEventListener('click', () => hideModal('modal-live-menu'));
document.getElementById('btn-menu-scorecard').addEventListener('click', () => { hideModal('modal-live-menu'); openScorecard(state.match, 'live'); });
document.getElementById('btn-live-scorecard').addEventListener('click', () => openScorecard(state.match, 'live'));
document.getElementById('btn-menu-end-innings').addEventListener('click', () => {
  hideModal('modal-live-menu');
  if(!confirm('End this innings right now?')) return;
  const inn = currentInnings();
  inn.completionReason = 'manual';
  inn.isComplete = true;
  saveState();
  endInnings();
});

// ===================== SCORECARD =====================
let scorecardSourceId = null; // 'live' or a match id from history/result
let scorecardReturnTo = 'home';
function openScorecard(matchObj, returnTo){
  scorecardSourceId = matchObj === state.match ? 'live' : matchObj.id;
  scorecardReturnTo = returnTo;
  navigate('scorecard');
}
function resolveScorecardMatch(){
  if(scorecardSourceId === 'live') return state.match;
  return getMatchById(scorecardSourceId) || state.match;
}
function renderScorecardScreen(){
  const m = resolveScorecardMatch();
  const body = document.getElementById('scorecard-body');
  body.innerHTML = '';
  if(!m || m.innings.length === 0){
    body.innerHTML = '<p class="muted">No innings played yet.</p>';
    return;
  }
  m.innings.forEach((inn, i) => {
    body.appendChild(renderInningsBlock(m, inn, i));
  });
}
function renderInningsBlock(m, inn, i){
  const wrap = document.createElement('div');
  wrap.className = 'innings-block';
  const teamName = getMatchTeamName(m, inn.battingTeam);
  const totalExtras = inn.extras.wide + inn.extras.noball + inn.extras.bye + inn.extras.legbye;

  let topScorerId = null, topScorerRuns = -1;
  Object.keys(inn.battingStats).forEach(pid => {
    if(inn.battingStats[pid].runs > topScorerRuns){ topScorerRuns = inn.battingStats[pid].runs; topScorerId = pid; }
  });
  let topBowlerId = null, topBowlerWkts = -1, topBowlerRuns = Infinity;
  Object.keys(inn.bowlingStats).forEach(pid => {
    const bw = inn.bowlingStats[pid];
    if(bw.wickets > topBowlerWkts || (bw.wickets === topBowlerWkts && bw.runs < topBowlerRuns)){
      topBowlerWkts = bw.wickets; topBowlerRuns = bw.runs; topBowlerId = pid;
    }
  });

  let battingRows = '';
  inn.battingOrder.forEach(pid => {
    const b = inn.battingStats[pid];
    const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0';
    const status = b.out ? `<span class="howout">${escapeHtml(b.howOut)}</span>` : '<span class="howout">not out</span>';
    const nameCls = pid === topScorerId && topScorerRuns > 0 ? 'top-performer' : '';
    battingRows += `<tr><td><span class="${nameCls}">${escapeHtml(b.name)}</span>${status}</td><td class="num">${b.runs}</td><td class="num">${b.balls}</td><td class="num">${b.fours}</td><td class="num">${b.sixes}</td><td class="num">${sr}</td></tr>`;
  });

  let bowlingRows = '';
  Object.keys(inn.bowlingStats).forEach(pid => {
    const bw = inn.bowlingStats[pid];
    const overs = formatOvers(bw.balls);
    const econ = bw.balls > 0 ? (bw.runs / (bw.balls/6)).toFixed(2) : '0.00';
    const nameCls = pid === topBowlerId && topBowlerWkts > 0 ? 'top-performer' : '';
    bowlingRows += `<tr><td><span class="${nameCls}">${escapeHtml(bw.name)}</span></td><td class="num">${overs}</td><td class="num">${bw.runs}</td><td class="num">${bw.wickets}</td><td class="num">${econ}</td></tr>`;
  });

  wrap.innerHTML = `
    <div class="innings-heading"><span>${escapeHtml(teamName)}</span><span>${inn.totalRuns}/${inn.totalWickets} (${formatOvers(inn.legalBalls)})</span></div>
    <table class="score-table">
      <thead><tr><th>Batsman</th><th class="num">R</th><th class="num">B</th><th class="num">4s</th><th class="num">6s</th><th class="num">SR</th></tr></thead>
      <tbody>${battingRows}</tbody>
    </table>
    <div class="extras-line">Extras: ${totalExtras} (wd ${inn.extras.wide}, nb ${inn.extras.noball}, b ${inn.extras.bye}, lb ${inn.extras.legbye})</div>
    <table class="score-table">
      <thead><tr><th>Bowler</th><th class="num">O</th><th class="num">R</th><th class="num">W</th><th class="num">Econ</th></tr></thead>
      <tbody>${bowlingRows}</tbody>
    </table>
  `;
  return wrap;
}
document.getElementById('btn-scorecard-back').addEventListener('click', () => navigate(scorecardReturnTo));
document.getElementById('btn-scorecard-share').addEventListener('click', async () => {
  const m = resolveScorecardMatch();
  if(!m || m.innings.length === 0){ toast('Nothing to share yet'); return; }
  let text = `🏏 CrickScore — Full Scorecard\n${m.place || ''} ${m.field ? '· '+m.field : ''}\n\n`;
  m.innings.forEach(inn => {
    text += `${getMatchTeamName(m, inn.battingTeam)}: ${inn.totalRuns}/${inn.totalWickets} (${formatOvers(inn.legalBalls)})\n`;
    inn.battingOrder.forEach(pid => {
      const b = inn.battingStats[pid];
      text += `  ${b.name} — ${b.runs} (${b.balls}b)${b.out ? ' ' + b.howOut : ' not out'}\n`;
    });
    text += `  Extras: ${inn.extras.wide + inn.extras.noball + inn.extras.bye + inn.extras.legbye}\n`;
    Object.keys(inn.bowlingStats).forEach(pid => {
      const bw = inn.bowlingStats[pid];
      text += `  ${bw.name} — ${formatOvers(bw.balls)}-${bw.runs}-${bw.wickets}\n`;
    });
    text += '\n';
  });
  text += 'Scored with CrickScore 🏏';
  if(navigator.share){
    try{ await navigator.share({ text }); }catch(e){}
  } else {
    try{ await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
    catch(e){ toast('Could not share or copy'); }
  }
});

// ===================== RESULT =====================
function renderResultScreen(){
  const m = getMatchById(state.viewingMatchId);
  if(!m) return;
  const inn1 = m.innings[0], inn2 = m.innings[1];
  const rowB = document.getElementById('result-row-B');

  rowB.classList.remove('hidden');
  document.getElementById('result-teamA-name').textContent = getMatchTeamName(m, inn1.battingTeam);
  document.getElementById('result-teamA-score').textContent = `${inn1.totalRuns}/${inn1.totalWickets} (${formatOvers(inn1.legalBalls)})`;
  document.getElementById('result-teamB-name').textContent = getMatchTeamName(m, inn2.battingTeam);
  document.getElementById('result-teamB-score').textContent = `${inn2.totalRuns}/${inn2.totalWickets} (${formatOvers(inn2.legalBalls)})`;
  const r = m.result;
  document.getElementById('result-text').textContent = r.winnerSide ? `${getMatchTeamName(m, r.winnerSide)} won by ${r.margin}` : 'Match tied!';

  const aw = m.awards || computeMatchAwards(m);
  document.getElementById('result-motm').textContent = aw.motm ? aw.motm.name : '—';
  document.getElementById('result-topscorer').textContent = aw.topScorer ? `${aw.topScorer.name} (${aw.topScorer.runs})` : '—';
  document.getElementById('result-topbowler').textContent = aw.topBowler ? `${aw.topBowler.name} (${aw.topBowler.wickets} wkts)` : '—';
}
document.getElementById('btn-result-scorecard').addEventListener('click', () => {
  const m = getMatchById(state.viewingMatchId);
  openScorecard(m, 'result');
});
document.getElementById('btn-result-home').addEventListener('click', () => navigate('home'));
document.getElementById('btn-result-newmatch').addEventListener('click', () => {
  state.match = emptyMatch();
  saveState();
  navigate('teams');
});
document.getElementById('btn-result-share').addEventListener('click', async () => {
  const m = getMatchById(state.viewingMatchId);
  if(!m) return;
  const inn1 = m.innings[0], inn2 = m.innings[1];
  const aw = m.awards || computeMatchAwards(m);
  const awardsLines = `🏅 Man of the Match: ${aw.motm ? aw.motm.name : '—'}\n` +
    `🏏 Top Scorer: ${aw.topScorer ? aw.topScorer.name + ' (' + aw.topScorer.runs + ')' : '—'}\n` +
    `🎯 Top Bowler: ${aw.topBowler ? aw.topBowler.name + ' (' + aw.topBowler.wickets + ' wkts)' : '—'}\n`;
  const r = m.result;
  const resultLine = r.winnerSide ? `${getMatchTeamName(m, r.winnerSide)} won by ${r.margin}` : 'Match tied!';
  const text = `🏏 ${getMatchTeamName(m,'A')} vs ${getMatchTeamName(m,'B')}\n` +
    `${getMatchTeamName(m, inn1.battingTeam)}: ${inn1.totalRuns}/${inn1.totalWickets} (${formatOvers(inn1.legalBalls)})\n` +
    `${getMatchTeamName(m, inn2.battingTeam)}: ${inn2.totalRuns}/${inn2.totalWickets} (${formatOvers(inn2.legalBalls)})\n` +
    `${resultLine}\n` + awardsLines +
    `📍 ${m.place || ''} ${m.field ? '· '+m.field : ''}\n\nScored with CrickScore 🏏`;
  if(navigator.share){
    try{ await navigator.share({ text }); }catch(e){}
  } else {
    try{ await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
    catch(e){ toast('Could not share or copy'); }
  }
});

// ===================== HISTORY =====================
function renderHistory(){
  const body = document.getElementById('history-body');
  if(state.matchHistory.length === 0){
    body.innerHTML = '<div class="empty-state"><div class="empty-ball">📜</div><h2>No matches yet</h2><p>Completed matches will show up here.</p></div>';
    return;
  }
  body.innerHTML = '';
  state.matchHistory.forEach(m => {
    const inn1 = m.innings[0], inn2 = m.innings[1];
    const r = m.result;
    const resultLine = r.winnerSide ? `${getMatchTeamName(m, r.winnerSide)} won by ${r.margin}` : 'Match tied';
    const scoreLine = `${inn1.totalRuns}/${inn1.totalWickets} · ${inn2.totalRuns}/${inn2.totalWickets}`;
    const motmName = (m.awards && m.awards.motm) ? m.awards.motm.name : null;
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <button class="history-delete" aria-label="Delete match">✕</button>
      <div class="history-teams">${escapeHtml(getMatchTeamName(m,'A'))} vs ${escapeHtml(getMatchTeamName(m,'B'))}</div>
      <div class="history-meta">${escapeHtml(scoreLine)} — ${escapeHtml(resultLine)}</div>
      <div class="history-meta">${escapeHtml(m.place || '')} ${m.field ? '· '+escapeHtml(m.field) : ''} · ${new Date(m.createdAt).toLocaleDateString()}${motmName ? ' · 🏅 ' + escapeHtml(motmName) : ''}</div>
    `;
    div.querySelector('.history-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      if(!confirm('Delete this match from history? This also removes it from stats.')) return;
      state.matchHistory = state.matchHistory.filter(x => x.id !== m.id);
      saveState();
      renderHistory();
      toast('Match deleted');
    });
    div.addEventListener('click', () => { state.viewingMatchId = m.id; openScorecard(m, 'history'); });
    body.appendChild(div);
  });
}

// ===================== STATS =====================
let statsMonthFilter = 'all';
function renderStats(){
  const body = document.getElementById('stats-body');
  if(state.matchHistory.length === 0){
    body.innerHTML = '<div class="empty-state"><div class="empty-ball">📊</div><h2>No stats yet</h2><p>Play your first match to see team and player stats here.</p></div>';
    return;
  }

  const monthKey = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'); };
  const monthLabel = (key) => { const [y,mo] = key.split('-'); return new Date(Number(y), Number(mo)-1, 1).toLocaleString(undefined, { month:'long', year:'numeric' }); };
  const months = [...new Set(state.matchHistory.map(m => monthKey(m.createdAt)))].sort().reverse();

  const filtered = statsMonthFilter === 'all' ? state.matchHistory : state.matchHistory.filter(m => monthKey(m.createdAt) === statsMonthFilter);

  let filterHtml = '<div class="stats-filter-row"><select id="stats-month-select"><option value="all">All time</option>';
  months.forEach(key => { filterHtml += `<option value="${key}" ${statsMonthFilter===key?'selected':''}>${escapeHtml(monthLabel(key))}</option>`; });
  filterHtml += '</select></div>';

  if(filtered.length === 0){
    body.innerHTML = filterHtml + '<p class="muted">No matches in this period.</p>' +
      '<button class="btn btn-outline btn-big" id="btn-reset-stats" style="margin-top:20px;">🗑️ Reset All Stats &amp; History</button>';
    wireStatsControls();
    return;
  }

  const teamRecord = {};
  state.teams.forEach(t => teamRecord[t.id] = { name: t.name, played:0, won:0, lost:0, tied:0 });
  const runs = {}, wickets = {}, motmCount = {};

  filtered.forEach(m => {
    const idA = m.teamAId, idB = m.teamBId;
    [idA, idB].forEach(id => { if(teamRecord[id]) teamRecord[id].played++; });
    const r = m.result;
    if(m.innings[1]){
      if(r.winnerSide){
        const winnerId = r.winnerSide === 'A' ? idA : idB;
        const loserId = r.winnerSide === 'A' ? idB : idA;
        if(teamRecord[winnerId]) teamRecord[winnerId].won++;
        if(teamRecord[loserId]) teamRecord[loserId].lost++;
      } else {
        if(teamRecord[idA]) teamRecord[idA].tied++;
        if(teamRecord[idB]) teamRecord[idB].tied++;
      }
    }
    m.innings.forEach(inn => {
      Object.keys(inn.battingStats).forEach(pid => {
        const b = inn.battingStats[pid];
        if(!runs[pid]) runs[pid] = { name: b.name, runs:0 };
        runs[pid].runs += b.runs;
      });
      Object.keys(inn.bowlingStats).forEach(pid => {
        const bw = inn.bowlingStats[pid];
        if(!wickets[pid]) wickets[pid] = { name: bw.name, wickets:0 };
        wickets[pid].wickets += bw.wickets;
      });
    });
    if(m.awards && m.awards.motm){
      const pid = m.awards.motm.id;
      if(!motmCount[pid]) motmCount[pid] = { name: m.awards.motm.name, count: 0 };
      motmCount[pid].count += 1;
    }
  });

  const topRuns = Object.values(runs).sort((a,b) => b.runs - a.runs).slice(0,10);
  const topWickets = Object.values(wickets).sort((a,b) => b.wickets - a.wickets).slice(0,10);
  const topMotm = Object.values(motmCount).sort((a,b) => b.count - a.count).slice(0,10);

  let html = filterHtml;
  html += '<div class="stats-section"><div class="list-header"><span>Team record</span></div>';
  Object.values(teamRecord).forEach(t => {
    html += `<div class="stats-row"><span>${escapeHtml(t.name)}</span><strong>${t.played} P · ${t.won} W · ${t.lost} L${t.tied?' · '+t.tied+' T':''}</strong></div>`;
  });
  html += '</div>';

  html += '<div class="stats-section"><div class="list-header"><span>🏅 Man of the Match</span></div>';
  if(topMotm.length === 0) html += '<p class="muted">No awards yet.</p>';
  topMotm.forEach(p => html += `<div class="stats-row"><span>${escapeHtml(p.name)}</span><strong>${p.count} award${p.count===1?'':'s'}</strong></div>`);
  html += '</div>';

  html += '<div class="stats-section"><div class="list-header"><span>🏏 Top Scorers</span></div>';
  topRuns.forEach(p => html += `<div class="stats-row"><span>${escapeHtml(p.name)}</span><strong>${p.runs} runs</strong></div>`);
  html += '</div>';

  html += '<div class="stats-section"><div class="list-header"><span>🎯 Top Bowlers</span></div>';
  topWickets.forEach(p => html += `<div class="stats-row"><span>${escapeHtml(p.name)}</span><strong>${p.wickets} wkts</strong></div>`);
  html += '</div>';

  html += '<button class="btn btn-outline btn-big" id="btn-reset-stats">🗑️ Reset All Stats &amp; History</button>';

  body.innerHTML = html;
  wireStatsControls();
}
function wireStatsControls(){
  const sel = document.getElementById('stats-month-select');
  if(sel) sel.addEventListener('change', (e) => { statsMonthFilter = e.target.value; renderStats(); });
  const resetBtn = document.getElementById('btn-reset-stats');
  if(resetBtn) resetBtn.addEventListener('click', () => {
    if(!confirm('Reset ALL stats and match history? This deletes every completed match permanently and can\u2019t be undone.')) return;
    state.matchHistory = [];
    statsMonthFilter = 'all';
    saveState();
    renderStats();
    toast('Stats and history reset');
  });
}

// ===================== INIT =====================
buildFlapTitle();
const validScreens = ['home','teams','add-team','details','toss','summary','innings-setup','live','scorecard','result','history','stats'];
const startScreen = (location.hash || '#home').slice(1);
navigate(validScreens.includes(startScreen) ? startScreen : 'home', false);
history.replaceState({ screen: startScreen }, '', '#' + startScreen);

if('serviceWorker' in navigator){
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(()=>{}); });
}
