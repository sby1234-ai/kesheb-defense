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
  for (const note of modeNotes([{ mode }])) root.append(note);

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
  const kinds = [...new Set(events.map(e => String(e.kind)))];
  const apps = [...new Set(events.map(e => (e.appId == null || e.appId === '' ? NO_APP : String(e.appId))))];
  const accesses = [...new Set(events.map(e => String(e.state && e.state.access)))];

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

export function createStudentView() {
  return {
    renderIdentity(input) { return renderIdentityView(input); },
    renderDecision(input) { return renderDecisionView(input); },
    renderEvents(input) { return renderEventsView(input); },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
