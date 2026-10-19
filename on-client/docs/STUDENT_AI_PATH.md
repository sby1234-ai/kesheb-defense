# 케셰브 AI 연결 점검과 사건 설명 호출 경로 (17단계 학생 설명)

이 문서는 17단계에서 학생이 작성한 설명 문서입니다. 제공 파일(`public/app.js`, `src/`, `vendor/`)은 수정하지 않았습니다. 아래 발췌는 이 커밋에 그대로 들어 있는 제공 원문에서 줄 번호와 함께 옮긴 것이며, 판정 시 원문과 대조할 수 있습니다.

학생 코드는 `student/extension.mjs`의 `renderAiConnection`, `renderExplanation`입니다. 학생 함수는 요청을 보내지 않고, 제공 화면이 넘겨준 결과만 표시합니다.

## 1. 두 요청은 서로 다른 경로입니다

| 구분 | 제공 화면 요청 | 서버 경로 | 서비스 호출 | 전송 모듈 호출 |
|---|---|---|---|---|
| 연결 점검 | `POST /api/ai/check` | `src/server.mjs` 603행 | `src/ai/service.mjs` 296행 `activeClient.listModels` | `vendor/clco-http.mjs` 114행 `listModels` → `GET /models` |
| 사건 설명 | `POST /api/ai/explain` | `src/server.mjs` 527~545행 | `src/ai/service.mjs` 386행 `activeClient.chat` | `vendor/clco-http.mjs` 119~124행 `chat` → `POST /chat/completions` |

연결 점검은 모델 목록만 받아 오며 생성 모델을 호출하지 않습니다. 사건 설명은 생성 모델(`/chat/completions`)을 실제로 호출합니다. 그래서 학생 화면은 점검 성공을 사건 설명 성공처럼 쓰지 않습니다(`renderAiConnectionView`의 "사건 설명은 아직 실행하지 않았습니다" 문구).

## 2. 사건 설명 호출 경로 원문 발췌

### 2-1. 제공 화면이 서버에 요청 (`public/app.js` 996행)

```js
const result = safeEvent ? await aiRequest('/api/ai/explain', { body: { eventId: event.id }, signal: controller.signal })
```

브라우저는 사건 ID만 보냅니다. AI 열쇠는 브라우저에 없습니다.

### 2-2. 서버가 본인 기록의 근거를 읽어 서비스에 전달 (`src/server.mjs` 527~545행)

```js
if(req.method==='POST'&&url.pathname==='/api/ai/explain'){
  const {eventId}=await bounded(()=>jsonBody(req,['eventId']));
  const identity=assertData('identity',await call('readIdentity'));
  ...
  const events=assertData('events',rawEvents);const event=events.find(row=>row.id===eventId);
  if(!event)throw engineError('EVENT_NOT_FOUND','본인 기록에서 사건을 찾을 수 없습니다.',404);
  ...
  const output=await bounded(()=>mappedService().explainIncident({incidentId:event.id,evidence:event.evidence.map(e=>({id:e.id,summary:e.text})),rules:event.rules.map(r=>({id:r.id,description:r.text})),currentState:event.state,supportedActions:event.supportedActions},authOptions(binding)));
  ...
  if(!output?.ok){send(503,{ok:false,error:aiFailure(output)});return;}
  send(200,{ok:true,data:{explanation:assertExplanation(output.explanation,event,aiSecrets)}});return;
}
```

### 2-3. 서비스가 생성 모델을 호출 (`src/ai/service.mjs` 386행)

```js
const result = await activeClient.chat({ model, stream: false, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: JSON.stringify(incident) }] }, { signal });guard(authorization,signal);
```

앱 권한 확인(verified) 경로에서는 같은 파일의 `Reflect.apply(method.value,activeClient,[body,{signal}])`로 같은 `chat` 메서드를 부릅니다.

### 2-4. 전송 모듈이 AI 게이트(CLCO)에 실제 요청 (`vendor/clco-http.mjs` 65행, 119~124행)

```js
const response = await fetch(base.href.replace(/\/$/, '') + endpoint, {
  method: body ? 'POST' : 'GET',
  ...
});
```

```js
async chat(body, options = {}) {
  if (!body || typeof body.model !== 'string' || !body.model || !Array.isArray(body.messages) || !body.messages.length || (body.stream !== undefined && typeof body.stream !== 'boolean')) throw fail('WB_CLCO_INVALID_REQUEST');
  if (body.stream && typeof options.readStream !== 'function') throw fail('WB_CLCO_STREAM_READER_REQUIRED');
  const result = await request('/chat/completions', body, options);
  if (!body.stream && (!Array.isArray(result?.choices) || !result.choices.length)) throw fail('WB_CLCO_INVALID_RESPONSE', 200);
  return result;
},
```

열쇠는 서버 쪽 전송 모듈이 `authorization` 머리말로만 붙이며, 학생 코드·화면·도움정보·이 문서에는 들어가지 않습니다.

## 3. 학생 화면이 결과를 다루는 방식

- 사건 설명 성공(`explanation.status === 'ok'`)일 때만 `data-student-explanation-event`를 붙이고 사건 ID와 `explanation.data.summary`를 보여 줍니다.
- 실패면 안전한 `code`·`message`와 "기록은 그대로"라는 안내만 보여 주고 성공 표식을 붙이지 않습니다.
- 연결 점검 오류는 권한 준비 중·인증·접근 제한·사용량·이용 시간·요청 제한/시간 초과/네트워크·취소·모델 없음으로 나눠 안내합니다.
- 자동 재시도는 없습니다. 다시 점검·설명은 사용자가 제공 화면 버튼을 직접 누를 때만 일어납니다.

## 4. 직접 확인한 것과 확인하지 못한 것

| 항목 | 상태 |
|---|---|
| 학생 함수의 상태별 표시(idle·loading·ok·error, test/verified, 원인별 안내) | 모의 데이터와 데모 모드 브라우저에서 확인 |
| 위 호출 경로(화면 → 서버 → 서비스 → 전송 모듈) | 이 커밋의 제공 원문을 읽어 확인 |
| 실제 계정의 AI 연결 점검과 사건 설명 응답 | **미확인**. 운영 측 학생 계정·앱 권한 발급이 끝나야 연결되며(시작 틀 안내의 "운영자가 먼저 준비해야 하는 것"), 그 전에는 권한 준비 중으로 나옵니다. 성공으로 적지 않았습니다. |
