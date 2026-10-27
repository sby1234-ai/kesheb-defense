// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
// ---- 13단계: 로그인·기기·세션 상태 (renderIdentity) ----
const MODE_LABEL = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };
const DEVICE_LABEL = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
const SESSION_LABEL = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = String(text);
  if (className) element.className = className;
  return element;
}

// 알 수 없는 값은 정상으로 보이지 않게 "확인 불가"로 바꾼다.
function labelOf(table, value) {
  return Object.hasOwn(table, value) ? table[value] : '확인 불가';
}

// 정상(compliant, active)이 아니면 눈에 띄게 표시한다. 색뿐 아니라 글자로도 구분한다.
function statusLine(title, table, value, okValue) {
  const needsAttention = value !== okValue;
  const line = node('p', `${title}: ${labelOf(table, value)} (${String(value)})${needsAttention ? ' ⚠ 주의' : ''}`);
  if (needsAttention) line.dataset.attention = 'true';
  return line;
}

function modeNotes(resources) {
  const modes = new Set();
  for (const resource of resources) {
    const mode = resource && resource.mode;
    if (mode === 'connected') continue;
    modes.add(Object.hasOwn(MODE_LABEL, mode) ? mode : 'unknown');
  }
  return [...modes].map(mode => node('p', `${MODE_LABEL[mode]} (${mode})`, 'student-mode'));
}

function resourceFailure(name, resource) {
  const message = resource && resource.error && resource.error.message ? resource.error.message : '서버가 오류를 알려 주지 않았습니다.';
  return node('p', `${name} 연결 실패: ${message}`);
}

function renderMe(me) {
  const box = node('div');
  if (!me || me.status === 'loading') { box.append(node('p', '로그인 정보 불러오는 중')); return box; }
  if (me.status === 'error') { box.append(resourceFailure('로그인 정보', me)); return box; }
  const data = me.status === 'ok' ? me.data : null;
  if (!data || !data.user || !data.device || !data.session) { box.append(node('p', '로그인 정보 확인 불가')); return box; }
  box.append(
    node('p', `사용자: ${data.user.label || data.user.id} (id: ${String(data.user.id)})`),
    node('p', `내 기기: ${data.device.label || data.device.id} (id: ${String(data.device.id)})`),
    statusLine('기기 상태', DEVICE_LABEL, data.device.status, 'compliant'),
    node('p', `세션 id: ${String(data.session.id)}`),
    statusLine('세션 상태', SESSION_LABEL, data.session.status, 'active'),
  );
  return box;
}

function renderList(name, resource, table, okValue) {
  const box = node('div');
  box.append(node('h4', name));
  if (!resource || resource.status === 'loading') { box.append(node('p', `${name} 불러오는 중`)); return box; }
  if (resource.status === 'error') { box.append(resourceFailure(name, resource)); return box; }
  if (resource.status !== 'ok' || !Array.isArray(resource.data)) { box.append(node('p', `${name} 확인 불가`)); return box; }
  if (resource.data.length === 0) { box.append(node('p', `${name} 없음`)); return box; }
  const list = node('ul');
  for (const item of resource.data) {
    const row = node('li', `${item.label ? item.label + ' ' : ''}(id: ${String(item.id)}): ${labelOf(table, item.status)} (${String(item.status)})${item.status !== okValue ? ' ⚠ 주의' : ''}`);
    if (item.status !== okValue) row.dataset.attention = 'true';
    list.append(row);
  }
  box.append(list);
  return box;
}

function renderIdentityView(input) {
  const { me, devices, sessions } = input || {};
  const root = node('div', undefined, 'student-identity-view');
  for (const note of modeNotes([me, devices, sessions])) root.append(note);
  root.append(renderMe(me));
  // 로그인 정보를 불러오지 못했으면 이전 값은 남기지 않고, 기기·세션 목록은 각자 상태대로 보여 준다.
  root.append(renderList('기기 목록', devices, DEVICE_LABEL, 'compliant'));
  root.append(renderList('세션 목록', sessions, SESSION_LABEL, 'active'));
  return root;
}

// ---- 14단계: 업무 앱 접속 판정 (renderDecision) ----
// 서버가 돌려준 판정만 보여 준다. 네 값 밖의 값과 요청 실패는 허용으로 보이지 않게 한다.
const DECISION_LABEL = { allow: '접근 허용', deny: '접근 거부', challenge: '추가 인증 또는 확인 필요', unknown: '판정 확인 불가' };

function renderDecisionView(input) {
  const { status, mode, data, error, appId } = input || {};
  const root = node('div', undefined, 'student-decision-view');
  if (status !== 'idle' && status !== undefined) for (const note of modeNotes([{ mode }])) root.append(note);

  if (status === 'idle' || status === undefined) {
    root.append(node('p', '앱을 골라 접속을 요청하세요. 아직 판정을 요청하지 않았습니다.'));
    return root;
  }
  if (status === 'loading') {
    root.append(node('p', `판정 확인 중${appId ? ` (앱: ${String(appId)})` : ''}. 결과가 오기 전에는 허용되지 않은 상태입니다.`));
    return root;
  }
  if (status === 'error') {
    const message = error && error.message ? error.message : '서버가 오류 내용을 알려 주지 않았습니다.';
    const code = error && error.code ? ` (${String(error.code)})` : '';
    const box = node('div');
    box.dataset.decision = 'request-failed';
    box.append(
      node('p', `요청 실패: ${message}${code}`),
      node('p', '서버의 판정을 받지 못했습니다. 이것은 접근 거부 판정이 아니며, 접근이 허용된 것도 아닙니다.'),
      node('p', '다시 시도하려면 앱 버튼을 직접 다시 누르세요.'),
    );
    if (appId) box.append(node('p', `요청한 앱: ${String(appId)}`));
    root.append(box);
    return root;
  }
  if (status !== 'ok' || !data) {
    root.append(node('p', '확인 불가(unknown): 판정 결과를 확인할 수 없습니다. 허용되지 않은 상태로 봅니다.'));
    return root;
  }

  const known = Object.hasOwn(DECISION_LABEL, data.decision);
  // 목록에 없는 값은 unknown 으로 다룬다. 허용으로 바꾸지 않는다.
  const decision = known ? data.decision : 'unknown';
  const box = node('div');
  box.dataset.decision = decision;
  const headline = node('p', `판정: ${DECISION_LABEL[decision]}(${decision})`);
  box.append(headline);
  if (!known) box.append(node('p', `서버가 알 수 없는 값(${String(data.decision)})을 보냈습니다. 판정 확인 불가(unknown)로 표시하며 허용되지 않음으로 봅니다.`));
  if (decision === 'unknown') box.append(node('p', '판정을 확인할 수 없어 접근이 허용되지 않았습니다. 허용으로 보지 마세요.'));
  if (decision === 'challenge') box.append(node('p', '추가 인증 또는 확인이 필요합니다. 이 앱은 추가 인증을 대신 수행하지 않습니다. 아직 허용되지 않았습니다.'));
  if (decision === 'deny') box.append(node('p', '서버가 정책에 따라 접근을 거부했습니다.'));
  if (decision === 'allow') box.append(node('p', '서버가 정책상 접근을 허용했습니다. 실제 앱 접속 성공을 보장하지는 않습니다.'));
  box.append(
    node('p', `앱: ${String(data.appId ?? appId ?? '확인 불가')}`),
    node('p', `이유: ${data.reason ? String(data.reason) : '서버가 이유를 보내지 않았습니다.'}`),
    node('p', `판정 시각: ${data.checkedAt ? String(data.checkedAt) : '확인 불가'}`),
  );
  root.append(box);
  return root;
}

// ---- 15단계: 내 접속 기록과 XDR 경보 (renderEvents) ----
// 목록·걸러 보기·상세는 돌려주는 DOM 안에서만 동작한다. 서버에 다시 묻지 않는다.
// 다시 불러오면 앱이 이 함수를 새로 부르므로, 이전 목록·상세·걸러 보기 상태는 모두 새 DOM으로 바뀐다.
const KIND_LABEL = { access: '접속 기록', xdr: 'XDR 경보' };
const ACCESS_LABEL = { allowed: '접근 허용됨', denied: '접근 거부됨', unknown: '확인 불가' };
const NO_APP = '__none__';

function stateText(table, value) {
  return `${labelOf(table, value)}(${String(value)})`;
}

function timeText(at) {
  const ms = Date.parse(at);
  if (!Number.isFinite(ms)) return `${String(at)} (시각 확인 불가)`;
  const kst = new Date(ms).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
  return `${kst} (한국 시각) · 원래 값 ${String(at)}`;
}

function appText(appId) {
  return appId == null || appId === '' ? '앱 확인 불가(appId 없음)' : String(appId);
}

function filterSelect(id, labelText, values, describe) {
  const wrap = node('div', undefined, 'student-filter');
  const label = node('label', labelText);
  label.htmlFor = id;
  const select = node('select');
  select.id = id;
  select.setAttribute('aria-label', labelText);
  const all = node('option', '전체');
  all.value = 'all';
  select.append(all);
  for (const value of values) {
    const option = node('option', describe(value));
    option.value = value;
    select.append(option);
  }
  wrap.append(label, select);
  return { wrap, select };
}

function renderEventDetail(event) {
  const detail = node('div', undefined, 'student-event-detail');
  detail.setAttribute('data-student-event-detail', String(event.id));
  detail.hidden = true;
  detail.append(
    node('p', `사건 ID: ${String(event.id)}`),
    node('p', `앱: ${appText(event.appId)}`),
    node('h5', '근거(evidence)'),
  );
  const evidence = node('ul');
  const evidenceRows = Array.isArray(event.evidence) ? event.evidence : [];
  if (evidenceRows.length === 0) evidence.append(node('li', '근거 없음'));
  for (const row of evidenceRows) evidence.append(node('li', `${String(row.id)}: ${String(row.text)}`));
  detail.append(evidence, node('h5', '규칙(rules)'));
  const rules = node('ul');
  const ruleRows = Array.isArray(event.rules) ? event.rules : [];
  if (ruleRows.length === 0) rules.append(node('li', '규칙 없음'));
  for (const row of ruleRows) rules.append(node('li', `${String(row.id)}: ${String(row.text)}`));
  detail.append(rules, node('h5', '상태(state)'));
  const state = event.state || {};
  const states = node('ul');
  states.append(
    node('li', `접근(access): ${stateText(ACCESS_LABEL, state.access)}`),
    node('li', `세션(session): ${stateText(SESSION_LABEL, state.session)}`),
    node('li', `기기(device): ${stateText(DEVICE_LABEL, state.device)}`),
  );
  detail.append(states);
  const actions = unsupportedActions(event);
  if (actions) detail.append(actions);
  return detail;
}

function renderEventsView(input) {
  const { status, mode, data, error } = input || {};
  const root = node('div', undefined, 'student-events-view');
  for (const note of modeNotes([{ mode }])) root.append(note);

  if (!input || status === 'loading') {
    root.append(node('p', '보안 기록 불러오는 중'));
    return root;
  }
  if (status === 'error') {
    const code = error && error.code ? String(error.code) : '';
    const message = error && error.message ? error.message : '서버가 오류 내용을 알려 주지 않았습니다.';
    if (code === 'CONTRACT_MISMATCH' || code === 'ENGINE_RESULT_UNVERIFIED') {
      root.append(node('p', `확인 불가(${code}): 받은 기록의 형식을 확인할 수 없어 목록을 표시하지 않습니다. ${message}`));
    } else {
      root.append(node('p', `기록을 불러오지 못했습니다: ${message}${code ? ` (${code})` : ''}`));
    }
    root.append(node('p', '이 화면은 빈 기록 목록이 아니라 불러오기 실패입니다. 다시 시도하려면 위쪽 다시 불러오기 버튼을 직접 누르세요.'));
    return root;
  }
  if (status !== 'ok' || !Array.isArray(data)) {
    root.append(node('p', '확인 불가: 기록 목록을 확인할 수 없습니다.'));
    return root;
  }

  root.append(node('p', '관측 범위: 앱 서버가 확인한 내 접속 기록(access)과 이미 저장된 XDR 경보(xdr)입니다. 최근 40건까지이며, 전체 로그나 다른 사람의 기록이 아닙니다. 화면을 열 때 새로 탐지하지 않습니다.'));

  if (data.length === 0) {
    root.append(node('p', '표시할 기록이 없습니다. 불러오기는 성공했고, 내 범위에 저장된 접속 기록과 XDR 경보가 0건입니다.'));
    return root;
  }

  const events = [...data].sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0));
  // 받은 값에 없는 종류·상태도 고를 수 있게 계약상의 값을 함께 둔다.
  const kinds = [...new Set(['access', 'xdr', ...events.map(e => String(e.kind))])];
  const apps = [...new Set(events.map(e => (e.appId == null || e.appId === '' ? NO_APP : String(e.appId))))];
  const accesses = [...new Set(['allowed', 'denied', 'unknown', ...events.map(e => String(e.state && e.state.access))])];

  const kindFilter = filterSelect('student-filter-kind', '기록 종류', kinds, v => `${labelOf(KIND_LABEL, v)}(${v})`);
  const appFilter = filterSelect('student-filter-app', '업무 앱', apps, v => (v === NO_APP ? '앱 확인 불가(appId 없음)' : v));
  const accessFilter = filterSelect('student-filter-access', '접속 상태', accesses, v => stateText(ACCESS_LABEL, v));
  const filters = node('div', undefined, 'student-filters');
  filters.append(kindFilter.wrap, appFilter.wrap, accessFilter.wrap);
  root.append(filters);

  const count = node('p');
  const empty = node('p', '선택한 조건에 맞는 기록이 없습니다. 걸러 보기를 전체로 바꾸면 다시 보입니다.');
  empty.hidden = true;
  const list = node('ul', undefined, 'student-event-list');
  const rows = [];
  for (const event of events) {
    const row = node('li');
    row.setAttribute('data-student-event-id', String(event.id));
    row.append(
      node('p', `사건 ID: ${String(event.id)}`),
      node('p', `시각: ${timeText(event.at)}`),
      node('p', `종류: ${labelOf(KIND_LABEL, event.kind)}(${String(event.kind)})`),
      node('p', `앱: ${appText(event.appId)}`),
      node('p', `요약: ${String(event.summary)}`),
    );
    const detail = renderEventDetail(event);
    const button = node('button', `${String(event.id)} 상세`);
    button.type = 'button';
    button.setAttribute('aria-label', `${String(event.id)} 상세`);
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => {
      detail.hidden = !detail.hidden;
      button.setAttribute('aria-expanded', String(!detail.hidden));
    });
    row.append(button, detail);
    list.append(row);
    rows.push({ row, event });
  }

  const applyFilters = () => {
    let shown = 0;
    for (const { row, event } of rows) {
      const app = event.appId == null || event.appId === '' ? NO_APP : String(event.appId);
      const visible = (kindFilter.select.value === 'all' || kindFilter.select.value === String(event.kind))
        && (appFilter.select.value === 'all' || appFilter.select.value === app)
        && (accessFilter.select.value === 'all' || accessFilter.select.value === String(event.state && event.state.access));
      row.hidden = !visible;
      if (visible) shown += 1;
    }
    count.textContent = `표시 중 ${shown}건 / 받은 기록 ${rows.length}건 (최신순)`;
    empty.hidden = shown !== 0;
  };
  for (const filter of [kindFilter, appFilter, accessFilter]) filter.select.addEventListener('change', applyFilters);
  applyFilters();

  root.append(count, empty, list);
  return root;
}

// ---- 16단계: 알림·기기·세션·오류·빈 화면 (renderStatus) ----
// 다시 시도는 사용자가 위쪽 「다시 불러오기」를 직접 누를 때만 일어난다. 이 함수는 어떤 요청도 보내지 않는다.
const RESOURCE_LABEL = { me: '로그인 정보', apps: '업무 앱', events: '보안 기록', devices: '기기', sessions: '세션', access: '접속 판정', diagnostics: '도움정보', vulnerabilities: '설치 패키지 조회' };
const TIMEOUT_CODES = new Set(['TIMEOUT', 'ENGINE_TIMEOUT', 'REQUEST_TIMEOUT', 'WB_CLCO_TIMEOUT']);
const RETRY_GUIDE = '다시 시도는 위쪽 「다시 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.';

function failureLines(name, resource) {
  const code = resource && resource.error && resource.error.code ? String(resource.error.code) : 'UNKNOWN';
  const message = resource && resource.error && resource.error.message ? resource.error.message : '서버가 오류 내용을 알려 주지 않았습니다.';
  const lines = [];
  if (TIMEOUT_CODES.has(code)) lines.push(node('p', `시간 초과: ${name} 불러오기가 제한 시간을 넘었습니다. (${code}) ${message}`));
  else lines.push(node('p', `${name} 불러오기 실패: ${message} (${code})`));
  lines.push(node('p', RETRY_GUIDE));
  return lines;
}

function statusDevices(devices) {
  const box = node('div');
  box.append(node('h4', '등록 기기'));
  if (!devices || devices.status === 'loading') { box.append(node('p', '기기 목록 불러오는 중')); return box; }
  if (devices.status === 'error') { box.append(...failureLines('기기 목록', devices)); return box; }
  if (devices.status !== 'ok' || !Array.isArray(devices.data)) { box.append(node('p', '기기 목록 확인 불가')); return box; }
  if (devices.data.length === 0) { box.append(node('p', '등록된 기기가 없습니다. (불러오기는 성공했습니다)')); return box; }
  const list = node('ul');
  for (const device of devices.data) {
    const attention = device.status !== 'compliant';
    const row = node('li', `${String(device.label || device.id)}: ${stateText(DEVICE_LABEL, device.status)}${attention ? ' ⚠ 주의 필요' : ''}`);
    if (attention) row.dataset.attention = 'true';
    list.append(row);
  }
  box.append(list, node('p', '내 이름으로 등록되고 회수되지 않은 기기입니다. 지금 쓰는 기기가 맨 앞에 옵니다.'));
  return box;
}

function statusSessions(sessions) {
  const box = node('div');
  box.append(node('h4', '현재 세션'));
  if (!sessions || sessions.status === 'loading') { box.append(node('p', '세션 불러오는 중')); return box; }
  if (sessions.status === 'error') { box.append(...failureLines('세션', sessions)); return box; }
  if (sessions.status !== 'ok' || !Array.isArray(sessions.data)) { box.append(node('p', '세션 확인 불가')); return box; }
  if (sessions.data.length === 0) { box.append(node('p', '현재 연결 없음: 지금 검증된 세션이 없습니다. (불러오기는 성공했습니다)')); return box; }
  const list = node('ul');
  for (const session of sessions.data) {
    const attention = session.status !== 'active';
    const row = node('li', `세션 ${String(session.id)}: ${stateText(SESSION_LABEL, session.status)}${attention ? ' ⚠ 주의 필요' : ''}`);
    if (attention) row.dataset.attention = 'true';
    list.append(row);
  }
  box.append(list, node('p', '세션은 지금 검증된 연결 하나만 표시합니다. 지난 세션 목록이 아닙니다.'));
  return box;
}

function statusNotifications(notifications) {
  const box = node('div');
  box.append(node('h4', '알림'));
  const rows = Array.isArray(notifications) ? notifications : [];
  if (rows.length === 0) { box.append(node('p', '알림 없음: 주의할 알림이 없습니다.')); return box; }
  const list = node('ul');
  for (const item of rows) {
    const resource = String(item.resource);
    const name = Object.hasOwn(RESOURCE_LABEL, resource) ? RESOURCE_LABEL[resource] : resource;
    const timeout = TIMEOUT_CODES.has(String(item.code)) ? ' · 시간 초과' : '';
    list.append(node('li', `[${name}(${resource})] 코드 ${String(item.code)}${timeout}: ${String(item.message)}`));
  }
  box.append(list);
  if (rows.some(item => ['me', 'apps', 'events', 'devices', 'sessions', 'access', 'diagnostics'].includes(String(item.resource)) && !['noncompliant', 'unknown', 'expired', 'revoked', 'xdr', 'access'].includes(String(item.code)))) {
    box.append(node('p', RETRY_GUIDE));
  }
  return box;
}

// 도움정보에는 비밀이 없는 값만 고른다. 열쇠·토큰·원문 오류는 넣지 않는다.
function safeDiagnostics(diagnostics) {
  if (!diagnostics || diagnostics.status !== 'ok' || !diagnostics.data) return null;
  const d = diagnostics.data;
  const engine = d.engine || {};
  return {
    requestId: String(d.requestId ?? '확인 불가'),
    component: String(d.component ?? '확인 불가'),
    version: String(d.version ?? '확인 불가'),
    checkedAt: String(d.checkedAt ?? '확인 불가'),
    engineMode: String(engine.mode ?? '확인 불가'),
    engineCode: String(engine.code ?? '확인 불가'),
  };
}

function statusDiagnostics(diagnostics) {
  const box = node('div');
  box.append(node('h4', '도움정보'));
  const safe = safeDiagnostics(diagnostics);
  if (!diagnostics || diagnostics.status === 'idle') box.append(node('p', '도움정보를 아직 불러오지 않았습니다. 아래 「도움정보 불러오기」를 누르면 점검 결과가 여기에 표시됩니다.'));
  else if (diagnostics.status === 'loading') box.append(node('p', '도움정보 불러오는 중'));
  else if (diagnostics.status === 'error') box.append(...failureLines('도움정보', diagnostics));
  else if (safe) {
    const list = node('ul');
    list.append(
      node('li', `requestId: ${safe.requestId}`),
      node('li', `component: ${safe.component}`),
      node('li', `version: ${safe.version}`),
      node('li', `checkedAt: ${safe.checkedAt}`),
      node('li', `engine.mode: ${safe.engineMode}`),
      node('li', `engine.code: ${safe.engineCode}`),
    );
    box.append(list);
  }

  // 복사 내용은 진단 결과의 여섯 값으로만 만든다.
  const copyText = safe ? [
    `requestId: ${safe.requestId}`,
    `component: ${safe.component}`,
    `version: ${safe.version}`,
    `checkedAt: ${safe.checkedAt}`,
    `engine.mode: ${safe.engineMode}`,
    `engine.code: ${safe.engineCode}`,
  ].join('\n') : '';
  const note = node('p', safe
    ? '「도움정보 복사」는 담당자에게 도움을 요청할 때 붙여 넣을 비밀 없는 진단 값(requestId·component·version·checkedAt·engine.mode·engine.code)만 복사합니다. 누를 때만 복사하며 어디에도 전송하지 않습니다.'
    : '「도움정보 복사」는 진단 결과를 불러온 뒤 사용할 수 있습니다. 아래 「도움정보 불러오기」를 먼저 누르세요.');
  const result = node('p');
  const button = node('button', '도움정보 복사');
  button.type = 'button';
  button.setAttribute('aria-label', '도움정보 복사');
  button.disabled = !safe;
  button.addEventListener('click', async () => {
    if (!copyText) return;
    try {
      if (!globalThis.navigator || !navigator.clipboard) throw new Error('clipboard');
      await navigator.clipboard.writeText(copyText);
      result.textContent = '도움정보를 클립보드에 복사했습니다.';
    } catch {
      const fallback = node('pre', copyText);
      result.textContent = '자동 복사를 사용할 수 없습니다. 아래 내용을 직접 선택해 복사하세요.';
      result.append(fallback);
    }
  });
  box.append(note, button, result);
  return box;
}

function renderStatusView(input) {
  const { devices, sessions, notifications, diagnostics, mode } = input || {};
  const root = node('div', undefined, 'student-status-view');
  for (const note of modeNotes([{ mode }])) root.append(note);
  root.append(
    statusNotifications(notifications),
    statusDevices(devices),
    statusSessions(sessions),
    statusDiagnostics(diagnostics),
  );
  return root;
}

// 연결되지 않은 조치는 요청을 보내지 않는 비활성 안내 버튼으로만 보여 준다.
function unsupportedActions(event) {
  const actions = Array.isArray(event.supportedActions) ? event.supportedActions : [];
  if (actions.length === 0) return null;
  const box = node('div', undefined, 'student-unsupported-actions');
  box.append(node('h5', '조치'));
  for (const action of actions) {
    const button = node('button', `${String(action)} 미지원`);
    button.type = 'button';
    button.disabled = true;
    button.setAttribute('aria-label', `${String(action)} 미지원`);
    box.append(button);
  }
  box.append(node('p', '아직 지원하지 않는 조치입니다. 조치 실행 연결은 준비 중이며, 이 버튼은 어떤 요청도 보내지 않습니다. 조치가 실행된 것이 아닙니다.'));
  return box;
}

// ---- 17단계: 앱 내부 AI 연결 상태 (renderAiConnection) · 사건 설명 기초 (renderExplanation) ----
// 연결 점검(모델 목록 확인)과 사건 설명 실행은 서로 다른 일이다. 점검 성공을 설명 성공처럼 쓰지 않는다.
// 이 함수들은 요청을 보내지 않는다. 다시 점검·설명 요청은 사용자가 제공 화면의 버튼을 직접 누를 때만 일어난다.
const AI_CAUSES = [
  { codes: ['ON_AI_PROVISIONING_PENDING', 'AI_REQUEST_UNVERIFIED', 'ON_AI_AUTHORIZATION_CHANGED', 'SUBJECT_SCOPE_UNVERIFIED'], title: '권한 준비 중·확인 불가', guide: '운영 측 계정·앱 권한이 아직 준비되지 않았거나 확인할 수 없습니다. 학생 잘못이 아니며, 담당자에게 계정 연결과 앱 권한 확인을 요청하세요.' },
  { codes: ['WB_CLCO_AUTH_REQUIRED'], title: '인증 실패', guide: '계정 연결을 다시 확인하고, 해결되지 않으면 담당자에게 확인하세요. 열쇠를 복사해 붙이지 마세요.' },
  { codes: ['WB_CLCO_ACCESS_BLOCKED'], title: '접근 제한', guide: '학생 앱의 이용 권한이 제한됐습니다. 계정 연결을 다시 확인하고 담당자에게 확인하세요.' },
  { codes: ['WB_CLCO_COHORT_BUDGET_EXHAUSTED', 'WB_CLCO_LIMIT_REACHED'], title: '사용량·이용 한도', guide: '반 사용량 또는 이용 한도에 도달했습니다. 담당자에게 확인하세요.' },
  { codes: ['WB_CLCO_SESSION_CLOSED'], title: '이용 시간 아님', guide: '지금은 AI 이용 시간이 아닙니다. 이용 시간을 확인하세요.' },
  { codes: ['WB_CLCO_RATE_LIMITED', 'WB_CLCO_TIMEOUT', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT', 'TIMEOUT', 'NETWORK', 'NETWORK_ERROR'], title: '요청 제한·시간 초과·네트워크', guide: '잠시 뒤 「현재 API 연결 점검」을 직접 다시 누르세요. 자동으로 다시 점검하지 않습니다.' },
  { codes: ['WB_CLCO_CANCELLED', 'CANCELLED', 'REQUEST_CANCELLED'], title: '취소됨', guide: '점검을 취소했습니다. 이전 결과는 현재 결과가 아닙니다. 필요하면 직접 다시 점검하세요.' },
  { codes: ['ON_AI_MODEL_LIST_EMPTY', 'MODEL_NOT_CONFIGURED'], title: '쓸 수 있는 모델 없음', guide: '현재 앱 권한으로 쓸 수 있는 AI 모델이 없습니다. 담당자에게 모델 허용 설정 확인을 요청하세요.' },
];

function aiCause(code) {
  return AI_CAUSES.find(cause => cause.codes.includes(code))
    || { title: '확인 불가', guide: 'AI 연결 결과를 확인할 수 없습니다. 담당자에게 계정 연결과 앱 권한 확인을 요청하세요.' };
}

function renderAiConnectionView(input) {
  const { status, data, error, checkedAt } = input || {};
  // 매번 새 요소를 만들어 돌려주므로, 새 상태가 오면 이전 점검 결과·오류 안내는 화면에 남지 않는다.
  const root = node('div', undefined, 'student-ai-connection-view');
  if (!input || status === 'idle') {
    root.append(
      node('p', 'AI 연결 점검 전'),
      node('p', '아직 점검하지 않았습니다. 계정 연결과 AI 연결을 마친 뒤 「현재 API 연결 점검」을 직접 누르세요.'),
    );
    return root;
  }
  if (status === 'loading') {
    root.append(node('p', 'AI 연결 점검 중'), node('p', '점검을 멈추려면 제공 화면의 취소 버튼을 누르세요. 취소하면 늦게 온 응답은 현재 결과로 쓰지 않습니다.'));
    return root;
  }
  if (status === 'error') {
    const code = error && error.code ? String(error.code) : 'AI_REQUEST_UNVERIFIED';
    const message = error && error.message ? String(error.message) : 'AI 연결 결과를 확인할 수 없습니다.';
    const cause = aiCause(code);
    root.dataset.aiCause = code;
    root.append(
      node('p', cause.title === '취소됨' ? 'AI 연결 점검 취소됨' : `AI 연결 점검 실패 · ${cause.title}`),
      node('p', `오류 코드: ${code}`),
      node('p', `안내: ${message}`),
      node('p', cause.guide),
      node('p', '사건 설명은 실행하지 않았습니다. 다시 점검은 「현재 API 연결 점검」을 직접 누를 때만 일어납니다.'),
    );
    return root;
  }
  if (status === 'ok' && data && data.transportChecked === true) {
    const auth = data.audienceAuthorization;
    const authText = auth === 'verified' ? '앱 권한 확인 후 점검(verified)' : auth === 'test' ? '시험 연결 점검(test)' : `확인 불가(${String(auth)})`;
    root.append(
      node('p', `AI 연결 점검 결과: ${authText}`),
      node('p', `사용할 수 있는 모델 수: ${Number.isInteger(data.modelCount) ? data.modelCount : '확인 불가'}`),
      node('p', `점검 시각: ${checkedAt ? String(checkedAt) : '확인 불가'}`),
      node('p', '연결만 점검했습니다. 사건 설명은 아직 실행하지 않았습니다. 모델 목록 응답은 사건 설명 결과가 아닙니다.'),
      node('p', '사건 설명은 보안 기록에서 기록을 골라 따로 요청하고 확인합니다.'),
    );
    if (auth === 'test') root.append(node('p', '시험 연결은 실제 앱 권한 확인이 아닙니다.'));
    return root;
  }
  root.append(node('p', '확인 불가: AI 연결 점검 결과를 확인할 수 없습니다.'));
  return root;
}

// ---- 18단계: 근거가 있는 AI 사건 설명 (renderExplanation 완성) ----
// AI 설명은 해석일 뿐이다. 사실 판단은 근거 글과 원천이 알려 준 상태로 한다.
// 인용한 근거가 이 사건의 근거에 없으면 지어내지 않고 거부한다. unknown은 정상·안전으로 바꾸지 않는다.
// 사람 확인 전에는 어떤 조치도 실행하지 않으며, 실행 버튼을 만들지 않는다. 매번 새 DOM을 돌려줘 이전 설명은 남지 않는다.
function renderExplanationView(input) {
  const { event, explanation, checkedAt } = input || {};
  const status = explanation && explanation.status;

  // 기록을 고르지 않았으면 먼저 고르라고 안내한다(성공 표식을 붙이지 않는다).
  if (!event) {
    return node('p', '사건 설명 전: 보안 기록에서 기록을 먼저 고르세요. AI 설명은 참고 정보입니다.');
  }
  if (!explanation || status === 'idle') {
    return node('p', `사건 ${String(event.id)}의 AI 설명 전: 보안 기록에서 AI 설명을 직접 요청하세요. AI 설명은 참고 정보입니다.`);
  }
  if (status === 'loading') {
    return node('p', `사건 ${String(event.id)} AI 설명 요청 중`);
  }

  // 실패·거부 화면 공통: data-student-explanation-event 를 붙이지 않는다.
  const failView = (lines) => {
    const box = node('div', undefined, 'student-explanation-view');
    for (const line of lines) box.append(node('p', line));
    box.append(node('p', `사건 ${String(event.id)}의 기록은 그대로입니다. AI 설명 실패는 기록 삭제나 변경이 아닙니다.`));
    return box;
  };

  if (status === 'error') {
    const code = explanation.error && explanation.error.code ? String(explanation.error.code) : 'AI_REQUEST_UNVERIFIED';
    const message = explanation.error && explanation.error.message ? String(explanation.error.message) : 'AI 설명을 확인할 수 없습니다.';
    return failView([`AI 설명 실패: ${message} (${code})`]);
  }

  const data = explanation.data;
  if (status !== 'ok' || !data) {
    return failView(['AI 설명을 확인할 수 없습니다. (AI_REQUEST_UNVERIFIED)']);
  }

  // AI가 이미 실행했다고 답한 설명은 쓰지 않는다(사람 확인 전 실행 금지).
  if (data.executed === true) {
    return failView(['AI가 이미 조치를 실행했다고 답했습니다. 사람 확인 전 실행은 허용하지 않으므로 이 설명은 쓸 수 없습니다. (PROPOSAL_EXECUTED_REJECTED)']);
  }

  // 근거 대조: AI가 인용한 근거 ID가 모두 이 사건의 근거(event.evidence)에 있어야 한다. 없으면 지어내지 않고 거부한다.
  const evidenceRows = Array.isArray(event.evidence) ? event.evidence : [];
  const evidenceById = new Map(evidenceRows.map(row => [String(row.id), row]));
  const citedIds = Array.isArray(data.evidenceIds) ? data.evidenceIds.map(String) : [];
  const missing = citedIds.filter(id => !evidenceById.has(id));
  if (missing.length > 0) {
    const code = explanation.error && explanation.error.code ? String(explanation.error.code) : 'INSUFFICIENT_EVIDENCE';
    return failView([
      `이 AI 설명은 이 사건의 근거와 맞지 않아 쓸 수 없습니다(근거가 맞지 않음). 사건에 없는 근거 ID: ${missing.join(', ')} (${code})`,
      '없는 근거로 내용을 지어내지 않습니다.',
    ]);
  }

  // 여기부터 성공: 바깥 요소에만 성공 표식을 붙인다.
  const root = node('div', undefined, 'student-explanation-view');
  root.setAttribute('data-student-explanation-event', String(event.id));
  root.append(
    node('p', `사건 ID: ${String(event.id)}`),
    node('h4', 'AI 설명(참고용)'),
    node('p', `AI 요약: ${String(data.summary)}`),
    node('p', `설명 시각: ${checkedAt ? String(checkedAt) : '확인 불가'}`),
    node('p', 'AI 설명은 해석입니다. 사실 판단은 아래 근거 글과 원천이 알려 준 상태로 하세요.'),
  );

  // 인용한 근거 ID와 근거 글
  root.append(node('h5', '인용한 근거(evidence)'));
  const evidenceList = node('ul');
  if (citedIds.length === 0) {
    evidenceList.append(node('li', '인용한 근거가 없습니다.'));
  } else {
    for (const id of citedIds) evidenceList.append(node('li', `${id} — ${String(evidenceById.get(id).text)}`));
  }
  root.append(evidenceList);

  // 사건의 규칙 글(id와 text를 함께)
  root.append(node('h5', '규칙(rules)'));
  const ruleRows = Array.isArray(event.rules) ? event.rules : [];
  const ruleList = node('ul');
  if (ruleRows.length === 0) ruleList.append(node('li', '규칙 없음'));
  for (const row of ruleRows) ruleList.append(node('li', `${String(row.id)} — ${String(row.text)}`));
  root.append(ruleList);

  // 확인 불가(unknown) 상태만 접속·세션·기기별로 나눠 적는다. unknown을 정상·안전으로 바꾸지 않는다.
  root.append(node('h5', '확인 불가 상태(unknown)'));
  const state = event.state || {};
  const unknownList = node('ul');
  const unknowns = [['접속', 'access'], ['세션', 'session'], ['기기', 'device']].filter(([, key]) => state[key] === 'unknown');
  if (unknowns.length === 0) {
    unknownList.append(node('li', '없음'));
  } else {
    for (const [title] of unknowns) unknownList.append(node('li', `${title}: 확인 불가(unknown)`));
  }
  root.append(unknownList);

  // 제안(proposals): 없으면 까닭을, 있으면 사람 확인 필요·미실행을 함께 적는다.
  root.append(node('h5', '조치 제안(proposals)'));
  const proposals = Array.isArray(data.proposals) ? data.proposals : [];
  const supported = Array.isArray(event.supportedActions) ? event.supportedActions : [];
  if (proposals.length === 0) {
    root.append(node('p', supported.length === 0
      ? '원천이 지원하는 조치가 없어 제안이 없습니다(정상).'
      : 'AI가 제안한 조치가 없습니다.'));
  } else {
    const proposalList = node('ul');
    for (const proposal of proposals) {
      const item = node('li');
      item.append(
        node('p', `조치: ${String(proposal.action)}`),
        node('p', `까닭: ${String(proposal.reason)}`),
        node('p', '사람 확인이 필요하며 실행되지 않았습니다.'),
      );
      const pcited = Array.isArray(proposal.evidenceIds) ? proposal.evidenceIds.map(String) : [];
      if (pcited.length > 0) item.append(node('p', `제안 근거: ${pcited.join(', ')}`));
      proposalList.append(item);
    }
    root.append(proposalList);
  }
  root.append(node('p', '제안은 사람이 확인해야 실행되며, 이 화면은 어떤 조치도 실행하지 않습니다. 실행 버튼은 없습니다.'));

  return root;
}

// ---- 19단계: AI 조치 제안과 서버 처리 결과 (renderAction) ----
// 제안(prepared)과 실제 처리(executing·pending·succeeded 등)를 나눈다. 서버가 받았다는 것(ACK=pending)은 효과가 아니다.
// 효과 확인은 observation.effectApplied === true 일 때만 성공으로 본다. unknown은 성공으로도 실패로도 보지 않는다.
// 확인 번호 같은 값은 입력에 없으면 만들지 않는다. 버튼은 만들지 않고 제공 화면 버튼을 쓰게 안내한다. 매번 새 DOM으로 다시 그린다.
function renderActionView(input) {
  const { status, event, actionId, target, receipt, observation, message, confirmationExpiresAt, error } = input || {};
  const root = node('div', undefined, 'student-action-view');

  if (!input || status === 'idle' || status === undefined) {
    root.append(
      node('p', '조치: 아직 미실행(idle). 조치는 제공 화면의 버튼으로만 준비·집행합니다.'),
      node('p', '지금 기록은 원천이 지원하는 조치가 없으면(supportedActions 비어 있음) 조치 준비 버튼이 나오지 않는 것이 정상입니다.'),
    );
    return root;
  }
  if (status === 'loading') {
    root.append(node('p', '조치 상태 불러오는 중(loading)'));
    return root;
  }
  if (status === 'error') {
    const code = error && error.code ? String(error.code) : 'ACTION_REQUEST_UNVERIFIED';
    const msg = error && error.message ? String(error.message) : '조치 요청을 처리하지 못했습니다.';
    root.append(
      node('p', `조치 요청 처리 안 됨(error): ${msg} (${code})`),
      node('p', '서버에 조치가 전달되지 않았습니다. 이것은 결과가 아닙니다.'),
    );
    return root; // 실패 화면에는 성공 식별자를 붙이지 않는다.
  }

  // 상태별 문장(원래 값과 함께). 끝났거나 성공했다고 오해할 문장은 쓰지 않는다.
  if (status === 'prepared') {
    root.append(node('p', '조치 상태: 준비됨 · 미실행(prepared). 사람이 대상과 조치를 확인해야 집행되며 아직 실행되지 않았습니다.'));
    if (confirmationExpiresAt != null) root.append(node('p', `확인 기한: ${String(confirmationExpiresAt)}`));
  } else if (status === 'executing') {
    root.append(node('p', '조치 상태: 서버에 전달 중(executing). 결과는 아직 확인되지 않았습니다(완료 아님).'));
  } else if (status === 'pending') {
    root.append(node('p', '조치 상태: 서버 접수 · 처리 중(pending). 서버가 받았다는 것(ACK)은 효과가 아니며 결과는 아직 확인되지 않았습니다(완료 아님).'));
  } else if (status === 'succeeded') {
    if (observation && observation.effectApplied === true) {
      root.append(node('p', '조치 상태: 효과 확인(succeeded). effectApplied: true'));
      if (observation.observedAt != null) root.append(node('p', `효과 관측 시각: ${String(observation.observedAt)}`));
    } else {
      root.append(node('p', '조치 상태: 결과 불명(succeeded 로 왔으나 effectApplied 가 true 가 아님). 효과가 확인되지 않았으므로 성공으로 보지 말고 원천 결과를 다시 조회하세요.'));
    }
  } else if (status === 'denied') {
    root.append(node('p', `조치 상태: 거절(denied).${message != null ? ` 사유: ${String(message)}` : ''}`));
  } else if (status === 'failed') {
    root.append(node('p', `조치 상태: 실패(failed).${message != null ? ` 사유: ${String(message)}` : ''}`));
  } else if (status === 'unknown') {
    root.append(node('p', '조치 상태: 결과 불명(unknown). 효과 없음으로도 성공으로도 판단하지 말고 원천 결과만 다시 조회하세요.'));
  } else if (status === 'expired') {
    root.append(node('p', '조치 상태: 확인 기한 지남(expired). 조치를 처음부터 다시 준비하세요.'));
  } else {
    root.append(node('p', `조치 상태: 확인 불가(${String(status)}).`));
  }

  // 현재 사건·근거·대상·접수 식별자(있는 것만 글자로). 입력에 없는 값은 만들지 않는다.
  if (event && event.id != null) root.append(node('p', `사건 ID: ${String(event.id)}`));
  const evidenceRows = event && Array.isArray(event.evidence) ? event.evidence : [];
  if (evidenceRows.length > 0) root.append(node('p', `근거 ID: ${evidenceRows.map(row => String(row.id)).join(', ')}`));
  if (actionId != null) root.append(node('p', `조치 ID(actionId): ${String(actionId)}`));
  if (target && target.id != null) {
    root.append(node('p', `실제 대상 ID: ${String(target.id)}${target.generation != null ? ` (generation: ${String(target.generation)})` : ''}`));
  }
  if (receipt && receipt.requestId != null) root.append(node('p', `요청 번호(requestId): ${String(receipt.requestId)}`));
  if (receipt && receipt.receiptId != null) root.append(node('p', `접수 번호(receiptId): ${String(receipt.receiptId)}`));
  if (receipt && receipt.version != null) root.append(node('p', `버전(version): ${String(receipt.version)}`));
  if (receipt && receipt.replayed === true) root.append(node('p', '이미 접수된 요청입니다(replayed: true). 같은 요청을 다시 실행한 것으로 세지 않습니다.'));

  root.append(node('p', '조치 준비·확인·집행은 제공 화면의 버튼으로만 합니다. 이 칸은 버튼을 만들지 않고 상태만 보여 줍니다.'));

  // 상태를 아는 화면에만 현재 사건·요청 식별자를 붙여, 지금 고른 사건·요청과 묶는다.
  if (event && event.id != null) root.setAttribute('data-student-action-event', String(event.id));
  if (receipt && receipt.requestId != null) root.setAttribute('data-student-action-request', String(receipt.requestId));

  return root;
}

// ---- 20단계: 사용 라이브러리와 취약점 정보 대조 (renderVulnerabilities) ----
// 실제 설치 버전(lock)과 OSV 조회 결과를 출처·확인 시각과 함께 보여 준다.
// 조회 실패·미조회는 "취약점 없음"이 아니다. 일부 조회에서 받은 취약점 ID는 지우지 않는다. 매번 새 DOM으로 그린다. textContent만 쓴다.
const VULN_OVERALL = {
  complete: '모두 조회', partial: '일부 조회 실패', not_checked: '아직 조회 안 함',
  not_configured: '조회 준비 미완료', unverifiable: 'lock 파일 확인 불가',
};
const VULN_PKG = { known_vulnerabilities: '알려진 항목 있음', none_found: '알려진 항목 없음', unverifiable: '조회 확인 불가' };

function renderVulnerabilitiesView(input) {
  const { status, mode, data, error } = input || {};
  const root = node('div', undefined, 'student-vulnerabilities-view');
  for (const note of modeNotes([{ mode }])) root.append(note);

  if (!input || status === 'idle') {
    root.append(node('p', '설치 패키지 취약점 조회 전(idle). 보호 현황의 조회 버튼을 직접 누르세요.'));
    return root;
  }
  if (status === 'loading') {
    root.append(node('p', '설치 패키지 취약점 조회 중(loading)'));
    return root;
  }
  if (status === 'error') {
    const code = error && error.code ? ` (${String(error.code)})` : '';
    const message = error && error.message ? String(error.message) : '조회를 완료하지 못했습니다.';
    root.append(
      node('p', `조회 실패: ${message}${code}`),
      node('p', '이것은 "취약점 없음"이 아닙니다. 이전 결과는 현재 결과가 아니며, 다시 조회하려면 조회 버튼을 직접 누르세요.'),
    );
    return root;
  }
  if (status !== 'ok' || !data) {
    root.append(node('p', '확인 불가: 조회 결과를 확인할 수 없습니다. "취약점 없음"이 아닙니다.'));
    return root;
  }

  const overall = Object.hasOwn(VULN_OVERALL, data.status) ? VULN_OVERALL[data.status] : '확인 불가';
  root.append(node('p', `조회 상태: ${overall}(${String(data.status)})`));
  if (data.status === 'partial') root.append(node('p', '일부 패키지는 조회하지 못했습니다. 조회하지 못한 항목은 "취약점 없음"이 아닙니다. 이미 받은 취약점은 그대로 둡니다.'));
  if (data.status === 'not_checked' || data.status === 'not_configured') {
    root.append(node('p', '허용된 공개 패키지 목록이 없으면 이 상태가 정상입니다. 아직 조회하지 않았다는 뜻이며 "취약점 없음"이 아닙니다.'));
  }
  root.append(
    node('p', `lock 파일 버전(lockfileVersion): ${data.lockfileVersion != null ? String(data.lockfileVersion) : '확인 불가'}`),
    node('p', `lock 파일 지문(lockfileHash): ${data.lockfileHash != null ? String(data.lockfileHash) : '확인 불가'}`),
    node('p', `조회 시각(checkedAt): ${data.checkedAt != null ? String(data.checkedAt) : '확인 불가'}`),
  );

  const packages = Array.isArray(data.packages) ? data.packages : [];
  if (packages.length === 0) {
    root.append(node('p', '표시할 패키지가 없습니다. 설정·확인 불가일 때는 비어 있는 것이 정상이며 "취약점 없음"이 아닙니다.'));
    return root;
  }

  const list = node('ul', undefined, 'student-package-list');
  for (const pkg of packages) {
    const item = node('li');
    item.setAttribute('data-student-package-name', String(pkg && pkg.name != null ? pkg.name : ''));
    item.setAttribute('data-student-package-version', String(pkg && pkg.version != null ? pkg.version : ''));
    const pkgStatus = pkg && Object.hasOwn(VULN_PKG, pkg.status) ? VULN_PKG[pkg.status] : '확인 불가';
    item.append(
      node('p', `패키지: ${String(pkg && pkg.name)} @ ${String(pkg && pkg.version)} (설치된 정확한 버전)`),
      node('p', `상태: ${pkgStatus}(${String(pkg && pkg.status)})`),
      node('p', `출처(source): ${pkg && pkg.source != null ? String(pkg.source) : '확인 불가'}`),
      node('p', `조회 시각(checkedAt): ${pkg && pkg.checkedAt != null ? String(pkg.checkedAt) : '확인 불가'}`),
    );
    const vulns = pkg && Array.isArray(pkg.vulnerabilities) ? pkg.vulnerabilities : [];
    if (pkg && pkg.status === 'unverifiable' && vulns.length > 0) {
      item.append(node('p', '일부 확인 · 전체 조회 확인 불가. 아래 받은 취약점 ID는 지우지 않고 그대로 둡니다.'));
    }
    if (vulns.length > 0) {
      item.append(node('p', '알려진 취약점:'));
      const vulnList = node('ul');
      for (const vuln of vulns) {
        vulnList.append(node('li', `${String(vuln && vuln.id)} · 수정 시각(modified): ${vuln && vuln.modified != null ? String(vuln.modified) : '확인 불가'}`));
      }
      item.append(vulnList);
    } else if (pkg && pkg.status === 'none_found') {
      item.append(node('p', '알려진 취약점을 찾지 못했습니다(none_found). 조회는 됐고 결과가 없음입니다.'));
    } else if (pkg && pkg.status === 'unverifiable') {
      item.append(node('p', '이 패키지는 조회를 확인할 수 없습니다(unverifiable). "취약점 없음"이 아닙니다.'));
    }
    list.append(item);
  }
  root.append(list);
  return root;
}

// ---- 마지막 총공세 2일차: 내 PC 관제 대시보드 (renderStatus 맨 위) ----
// 측정은 제공 기능(src/pc-status.mjs)이 한다. 학생 코드는 허용된 같은 경로(/api/pc/status)로 받은 실측값에
// 상태 판단(정상·주의·확인 불가·오래됨)·추이·기록을 더할 뿐, 측정 코드를 새로 만들지 않는다.
// 조회는 버튼이나 사용자가 켠 10초 기록에서만 한다. 그리는 함수(render)에서는 요청하지 않는다.
// 기록은 앱을 켠 뒤 모은 값만 메모리에 최대 30개 두며, 새로고침하면 지워진다. 파일·브라우저 저장소에 쓰지 않는다.
const PC_PATH = '/api/pc/status';
const PC_HISTORY_MAX = 30;
const PC_STALE_MS = 60000;
const PC_AUTO_MS = 10000;
const PC_LIMITS = { cpuPercent: 85, memoryPercent: 85, diskFreePercent: 10 };
const PC_REASON = {
  permission_denied: '읽기 권한이 없습니다(permission_denied). 관리자 권한으로 바꾸지 말고 담당자에게 확인하세요.',
  unsupported: '이 운영체제에서는 조회하지 않는 항목입니다(unsupported).',
  timeout: '조회 시간이 초과됐습니다(timeout). 잠시 뒤 다시 기록하세요.',
  cancelled: '조회가 취소됐습니다(cancelled).',
  query_failed: '조회에 실패했습니다(query_failed).',
  invalid_response: '응답 값을 확인할 수 없습니다(invalid_response).',
  invalid_sample: 'CPU 측정 표본을 확인할 수 없습니다(invalid_sample).',
};
const GB = 1024 ** 3;
const isNum = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isCount = v => Number.isSafeInteger(v) && v >= 0;
const fmtGb = v => `${(v / GB).toFixed(1)} GB`;
const fmtTime = iso => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? d.toLocaleString('ko-KR') : '확인 불가'; };
const pcReason = metric => PC_REASON[metric && metric.reason] || '이번 조회에서 값을 확인하지 못했습니다.';

// 응답이 제공 기능의 실측 형식인지 확인한다. 형식이 다르면 값을 쓰지 않는다.
function pcSampleFrom(result) {
  if (!result || result.ok !== true) return null;
  const data = result.data;
  if (!data || data.schema !== 'aleph.on.pc-status.v1' || data.source !== 'local-pc') return null;
  if (!Number.isFinite(Date.parse(data.measuredAt)) || !data.metrics || typeof data.metrics !== 'object') return null;
  return { measuredAt: data.measuredAt, metrics: data.metrics };
}

// 카드마다 { title, state: 정상|주의|확인 불가, value(단위 포함), percent(추이용), detail } 을 만든다.
function pcCards(metrics) {
  const m = metrics || {};
  const unavailable = (title, metric) => ({ title, state: '확인 불가', value: '확인 불가', percent: null, detail: pcReason(metric) });
  const cards = [];

  const cpu = m.cpu;
  if (cpu && cpu.state === 'ok' && isNum(cpu.usagePercent) && cpu.usagePercent <= 100) {
    const warn = cpu.usagePercent >= PC_LIMITS.cpuPercent;
    cards.push({ title: 'CPU', state: warn ? '주의' : '정상', value: `${cpu.usagePercent.toFixed(1)}% 사용`, percent: cpu.usagePercent,
      detail: `${isNum(cpu.sampleMs) ? cpu.sampleMs : 200}ms 구간 실측. 기준: ${PC_LIMITS.cpuPercent}% 이상이면 주의.` });
  } else cards.push(unavailable('CPU', cpu));

  const mem = m.memory;
  if (mem && mem.state === 'ok' && isNum(mem.usedBytes) && isNum(mem.totalBytes) && mem.totalBytes > 0 && mem.usedBytes <= mem.totalBytes) {
    const pct = (mem.usedBytes / mem.totalBytes) * 100;
    const warn = pct >= PC_LIMITS.memoryPercent;
    cards.push({ title: '메모리', state: warn ? '주의' : '정상', value: `${fmtGb(mem.usedBytes)} / ${fmtGb(mem.totalBytes)} (${pct.toFixed(1)}% 사용)`, percent: pct,
      detail: `기준: 사용률 ${PC_LIMITS.memoryPercent}% 이상이면 주의.` });
  } else cards.push(unavailable('메모리', mem));

  const disk = m.disk;
  if (disk && disk.state === 'ok' && isNum(disk.freeBytes) && isNum(disk.totalBytes) && disk.totalBytes > 0 && disk.freeBytes <= disk.totalBytes) {
    const freePct = (disk.freeBytes / disk.totalBytes) * 100;
    const warn = freePct < PC_LIMITS.diskFreePercent;
    cards.push({ title: '디스크', state: warn ? '주의' : '정상', value: `${fmtGb(disk.freeBytes)} 여유 / ${fmtGb(disk.totalBytes)} (여유 ${freePct.toFixed(1)}%)`, percent: null,
      detail: `앱이 있는 디스크 기준. 기준: 여유 ${PC_LIMITS.diskFreePercent}% 미만이면 주의.` });
  } else cards.push(unavailable('디스크', disk));

  const fw = m.firewall;
  const names = ['Domain', 'Private', 'Public'];
  if (fw && fw.state === 'ok' && Array.isArray(fw.profiles) && fw.profiles.length === 3
      && names.every(n => fw.profiles.some(p => p && p.name === n && typeof p.enabled === 'boolean'))) {
    const off = names.filter(n => fw.profiles.find(p => p.name === n).enabled === false);
    cards.push({ title: '방화벽', state: off.length ? '주의' : '정상',
      value: names.map(n => `${n} ${fw.profiles.find(p => p.name === n).enabled ? '켜짐' : '꺼짐'}`).join(' · '), percent: null,
      detail: off.length ? `꺼진 프로필: ${off.join(', ')}. 앱은 설정을 읽기만 하고 바꾸지 않습니다.` : '세 프로필 모두 켜짐. 보호 전체의 안전 판정은 아닙니다.' });
  } else cards.push(unavailable('방화벽', fw));

  return cards;
}

function pcEventsText(metrics) {
  const e = metrics && metrics.events;
  if (e && e.state === 'ok' && isCount(e.warningCount) && isCount(e.errorCount)) {
    return `경고 ${e.warningCount}건 · 오류 ${e.errorCount}건${e.truncated ? ' (일부 집계)' : ''}`;
  }
  return `확인 불가 — ${pcReason(e)}`;
}

// CPU·메모리 사용률 추이(0~100%). 색만으로 구분하지 않게 선 모양(실선·점선)과 글자 범례를 함께 둔다.
function pcTrendChart(history) {
  const SVG = 'http://www.w3.org/2000/svg';
  const w = 320, h = 120, pad = 6;
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(h));
  svg.setAttribute('role', 'img');
  const frame = document.createElementNS(SVG, 'rect');
  frame.setAttribute('x', '0'); frame.setAttribute('y', '0'); frame.setAttribute('width', String(w)); frame.setAttribute('height', String(h));
  frame.setAttribute('fill', 'none'); frame.setAttribute('stroke', 'currentColor'); frame.setAttribute('stroke-opacity', '0.3');
  svg.append(frame);
  const series = [{ title: 'CPU', dash: '' }, { title: '메모리', dash: '4 3' }];
  const n = history.length;
  for (const s of series) {
    const pts = [];
    history.forEach((sample, i) => {
      const card = sample.cards.find(c => c.title === s.title);
      if (!card || card.percent == null) return;
      const x = n === 1 ? w / 2 : pad + (i * (w - pad * 2)) / (n - 1);
      const y = h - pad - (card.percent / 100) * (h - pad * 2);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    });
    if (!pts.length) continue;
    const line = document.createElementNS(SVG, 'polyline');
    line.setAttribute('points', pts.join(' '));
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', '2');
    if (s.dash) line.setAttribute('stroke-dasharray', s.dash);
    svg.append(line);
  }
  svg.setAttribute('aria-label', `CPU·메모리 사용률 추이, 측정 ${n}회`);
  return svg;
}

function pcDelta(history, title) {
  if (history.length < 2) return null;
  const pick = s => { const c = s.cards.find(x => x.title === title); return c && c.percent != null ? c.percent : null; };
  const now = pick(history[history.length - 1]);
  const before = pick(history[history.length - 2]);
  if (now == null || before == null) return `${title}: 직전 측정과 비교할 수 없음(확인 불가 포함)`;
  const d = now - before;
  return `${title}: 직전 측정 대비 ${d >= 0 ? '+' : ''}${d.toFixed(1)}%p`;
}

function createPcDashboard({ api, onChange }) {
  const state = { history: [], pending: false, lastError: null, auto: false, timer: null, staleTimer: null };
  const changed = () => { if (typeof onChange === 'function') onChange(); };

  function stopAuto() { if (state.timer !== null) clearTimeout(state.timer); state.timer = null; }
  function scheduleAuto() {
    stopAuto();
    if (!state.auto) return;
    state.timer = setTimeout(() => {
      state.timer = null;
      if (!state.auto) return;
      if (typeof document !== 'undefined' && document.hidden) { scheduleAuto(); return; }
      void record();
    }, PC_AUTO_MS);
  }
  // 마지막 실측이 60초를 넘으면 화면이 「오래됨」으로 바뀌도록 한 번 다시 그린다.
  function scheduleStale() {
    if (state.staleTimer !== null) clearTimeout(state.staleTimer);
    state.staleTimer = setTimeout(() => { state.staleTimer = null; changed(); }, PC_STALE_MS + 1000);
  }

  async function record() {
    if (state.pending) return;
    if (!api || typeof api.get !== 'function') {
      state.lastError = { code: 'NO_STUDENT_API', message: '학생 API를 받지 못했습니다. 이 앱 판에서는 지원하지 않습니다.', at: new Date().toISOString() };
      changed(); return;
    }
    state.pending = true; changed();
    let result;
    try { result = await api.get(PC_PATH); } catch { result = { ok: false, error: { code: 'CLIENT_ERROR', message: '요청 중 오류가 발생했습니다.' } }; }
    state.pending = false;
    const sample = pcSampleFrom(result);
    if (sample) {
      state.lastError = null;
      state.history.push({ measuredAt: sample.measuredAt, cards: pcCards(sample.metrics), events: pcEventsText(sample.metrics) });
      if (state.history.length > PC_HISTORY_MAX) state.history.shift();
      scheduleStale();
    } else {
      const err = result && result.ok === false && result.error ? result.error : { code: 'INVALID_PC_STATUS', message: '응답이 내 PC 실측 형식이 아닙니다.' };
      state.lastError = { code: String(err.code || 'UNKNOWN_ERROR'), message: String(err.message || ''), at: new Date().toISOString() };
    }
    changed();
    scheduleAuto();
  }

  function render() {
    const box = node('section', undefined, 'student-pc-dashboard');
    box.append(node('h4', '내 PC 관제 대시보드 (학생 구현)'));
    box.append(node('p', '값은 제공 「내 PC 상태」와 같은 실측 경로(/api/pc/status, 출처 local-pc)에서 읽습니다. 예시 값은 쓰지 않습니다. 상태 판단·추이·기록은 학생이 더한 부분입니다.'));

    const controls = node('div', undefined, 'student-pc-controls');
    const button = node('button', state.pending ? '실측 중…' : '내 PC 실측 기록');
    button.type = 'button';
    button.disabled = state.pending;
    button.addEventListener('click', () => { void record(); });
    const label = node('label');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = state.auto;
    check.addEventListener('change', () => {
      state.auto = check.checked;
      if (state.auto) void record(); else stopAuto();
      changed();
    });
    label.append(check, document.createTextNode(' 10초마다 기록 (앱 탭이 보이는 동안)'));
    controls.append(button, label);
    box.append(controls);

    if (state.lastError) {
      const fail = node('p', `조회 실패: ${state.lastError.code}${state.lastError.message ? ` — ${state.lastError.message}` : ''} (${fmtTime(state.lastError.at)}). 이전 값은 현재 값이 아닙니다.`);
      fail.dataset.pcState = 'failed';
      box.append(fail);
    }

    const latest = state.history[state.history.length - 1];
    if (!latest) {
      box.append(node('p', '아직 실측하지 않았습니다. 「내 PC 실측 기록」을 누르면 이 PC의 값을 읽습니다.'));
      return box;
    }

    const age = Date.now() - Date.parse(latest.measuredAt);
    const stale = age > PC_STALE_MS;
    const when = node('p', `마지막 실측: ${fmtTime(latest.measuredAt)} (${Math.max(0, Math.round(age / 1000))}초 전)${stale ? ' · 오래됨: 60초가 지난 값이라 현재 상태로 보지 마세요.' : ''}`);
    if (stale) when.dataset.pcState = 'stale';
    box.append(when);

    const grid = node('div', undefined, 'student-pc-cards');
    for (const card of latest.cards) {
      const shown = stale && card.state !== '확인 불가' ? '오래됨' : card.state;
      const article = node('article', undefined, 'student-pc-card');
      article.dataset.pcState = shown;
      const mark = shown === '정상' ? '● ' : shown === '주의' ? '▲ ' : shown === '오래됨' ? '◷ ' : '? ';
      article.append(
        node('h5', card.title),
        node('p', `${mark}${shown}`),
        node('p', card.value),
        node('p', card.detail),
        node('p', `측정 시각: ${fmtTime(latest.measuredAt)}`),
      );
      grid.append(article);
    }
    box.append(grid);

    const trend = node('div', undefined, 'student-pc-trend');
    trend.append(node('h5', `추이 (앱을 켠 뒤 측정 ${state.history.length}회, 최대 ${PC_HISTORY_MAX}회)`));
    trend.append(pcTrendChart(state.history));
    trend.append(node('p', '범례: 실선 = CPU 사용률, 점선 = 메모리 사용률. 세로축 0~100%.'));
    for (const t of ['CPU', '메모리']) { const d = pcDelta(state.history, t); if (d) trend.append(node('p', d)); }
    if (state.history.length < 2) trend.append(node('p', '비교하려면 한 번 더 기록하세요.'));
    box.append(trend);

    const log = node('div', undefined, 'student-pc-log');
    log.append(node('h5', '최근 기록 (새 기록이 위)'));
    const list = node('ul');
    for (const sample of [...state.history].reverse()) {
      const parts = sample.cards.map(c => `${c.title} ${c.state === '확인 불가' ? '확인 불가' : c.value} [${c.state}]`);
      list.append(node('li', `${fmtTime(sample.measuredAt)} · ${parts.join(' · ')} · Windows 기록(최근 24시간) ${sample.events}`));
    }
    log.append(list);
    box.append(log);
    return box;
  }

  return { render };
}

export function createStudentView({ api, onChange } = {}) {
  const pcDashboard = createPcDashboard({ api, onChange });
  return {
    renderIdentity(input) { return renderIdentityView(input); },
    renderDecision(input) { return renderDecisionView(input); },
    renderEvents(input) { return renderEventsView(input); },
    renderStatus(input) {
      const wrap = node('div', undefined, 'student-status-with-pc');
      wrap.append(pcDashboard.render(), renderStatusView(input));
      return wrap;
    },
    renderVulnerabilities(input) { return renderVulnerabilitiesView(input); },
    renderAiConnection(input) { return renderAiConnectionView(input); },
    renderExplanation(input) { return renderExplanationView(input); },
    renderAction(input) { return renderActionView(input); },
  };
}
