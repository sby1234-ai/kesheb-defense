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

export function createStudentView() {
  return {
    renderIdentity(input) { return renderIdentityView(input); },
    renderDecision(input) { return renderDecisionView(input); },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
