# 새 환경 실행 기록과 버전 표시 · 보안 Agent 「케셰브」 (22단계)

학생이 새로 만든 문서입니다. 제공 문서는 고치지 않았습니다. 이 기록은 **학생 진술**이며, 서버가 새 환경에서 실행해 확인했다는 뜻이 아닙니다.

## 0. 버전 표시

| 항목 | 값 |
|---|---|
| 학생 버전 표시 | **v0.9 · 검증 중인 버전 (v1.0 아님)** |
| v1.0 이 아닌 이유 | 19단계 실제 조치 집행 연결, 접근 제어·XDR 시스템 실제 연결, CLCO 수업용 AI 실제 설명, OSV 실제 조회가 미확인(7장 UNV) |
| 시작 틀 버전 | 0.2.11 (제출 커밋의 `package.json` `version`, `README.md` 제목) · 서버가 응답에 싣는 `starterVersion`/`version` 값은 `0.1.0` (`/api/diagnostics` 응답 원문) |
| 저장소 | https://github.com/sby1234-ai/kesheb-defense |
| 브랜치 | `master` |
| 재현한 커밋 | `c31ed8b409da09ca81b74ad67ffd372dbb075c26` (21단계 통과 커밋) |
| 재현한 학생 코드 지문 | `student/extension.mjs` SHA256 `6B5955947D8B054F32F5FCBA11CBE028AD5B60376BB40E387C121A3FEB30BE38` |

**같은 최종 소스 기준**: 22단계 제출 커밋은 위 재현 커밋에서 **문서만** 바뀌었습니다. 코드·설정·실행 도구(`student/`, `src/`, `public/`, `tools/`, `package.json`, `.env.example`)는 바뀌지 않았습니다. 바뀐 문서: 이 문서(`docs/REPRODUCTION_RECORD.md`), 재현 로그 원본(`docs/evidence/repro-log-20261026-151025.txt`), 학생 데이터 백업·복원 절차(`docs/STUDENT_DATA_BACKUP.md`), 21단계 설명서의 시작 틀 버전 표기 정정(`docs/STUDENT_GUIDE.md`, 0.2.14 → 실제 원문 값 0.2.11). 확인 명령: `git diff --stat c31ed8b HEAD -- on-client/student on-client/src on-client/public on-client/tools on-client/package.json` → 출력 없음이어야 합니다. 서로 다른 커밋의 결과를 합쳐 쓰지 않았습니다.

**증거**: 2·3장의 명령 결과와 시각은 재현 스크립트가 남긴 로그 원본 `docs/evidence/repro-log-20261026-151025.txt` 에 있습니다(비밀 값 없음). 4장의 화면 문구는 같은 앱 화면을 브라우저에서 읽은 기록입니다.

---

## 1. 실행 환경 (실제로 확인한 값)

| 항목 | 값 | 근거 |
|---|---|---|
| 운영체제 | Windows (PowerShell 5.1.26100.9711) | 재현 로그 `script version` 줄 |
| PowerShell 경로 | `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe` | 재현 로그 |
| Node.js | **v24.21.0** (`C:\Program Files\nodejs\node.exe`) | `node --version` |
| 기준 버전과의 차이 | 수업·검사 기준 24.19.0 과 다르지만, 실행 도구 허용 범위(22~24) 안이라 실행됨 | `tools/start-alekov.ps1` 버전 검사 |
| 포트 | 5199 (기존 작업 폴더의 앱과 겹치지 않게 `-Port 5199`) | 21단계 설명서 2장 "포트 충돌" 방법 |
| 확인 일시 | 2026-10-26 15:10:25 ~ 15:12 (KST) | 재현 로그 시각 |

---

## 2. 재현 절차 (실제로 실행한 순서)

1. **원래 작업 폴더 보존 확인**: `C:\kesheb-defense` 는 읽기만 했습니다. HEAD `c31ed8b…` 확인.
2. **새 빈 폴더에 받기**: `git clone https://github.com/sby1234-ai/kesheb-defense.git C:\kesheb-repro-20261026-151025` (실행 전 폴더 없음 확인) → 브랜치 `master`, 커밋 `c31ed8b…`.
3. **설정 파일 복사 안 함**: 새 폴더에 `.env` 없음(`False`). 기존 폴더의 인증·설정 파일을 옮기지 않았습니다.
4. **런타임 확인**: `node --version` → `v24.21.0`, `node --check student/extension.mjs` → 종료코드 0, 출력 없음.
5. **첫 실행**: `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1 -Port 5199 -Background` → 종료코드 0, 포트 5199 대기 확인.
6. **HTTP 확인**: 아래 3장 표.
7. **종료**: 포트 5199 의 node 프로세스 종료 → 포트 대기 없음(`False`) 확인.
8. **재실행**: 5번과 같은 명령 → 종료코드 0, 포트 대기 확인 → 6번과 같은 확인.
9. **화면 확인**: 브라우저로 `http://127.0.0.1:5199/` 를 열고 「보호 현황」「업무 앱」「보안 기록」 화면과 「설치 패키지 조회」「현재 API 연결 점검」 버튼 결과를 읽었습니다(4장).

---

## 3. HTTP 응답 (첫 실행과 재실행 결과가 같음)

| 주소 | 첫 실행 (15:10:32) | 재실행 (15:10:37) | 해석 |
|---|---|---|---|
| `GET /` | 200 (제목 `케셰브 · ZTNA & XDR`) | 200 | 앱 화면 응답 |
| `GET /student/extension.mjs` | 200 (학생 코드 원문) | 200 | 학생 파일 제공 |
| `GET /api/me` | 503 `ENGINE_NOT_CONNECTED`, `mode: disconnected` | 같음 | 회사 시스템 미연결 |
| `GET /api/devices` | 503 `ENGINE_NOT_CONNECTED` | 같음 | 〃 |
| `GET /api/sessions` | 503 `ENGINE_NOT_CONNECTED` | 같음 | 〃 |
| `GET /api/apps` | 503 `ENGINE_NOT_CONNECTED` | 같음 | 〃 |
| `GET /api/events` | 503 `ENGINE_NOT_CONNECTED` | 같음 | 〃 |
| `GET /api/diagnostics` | 200 `engine.mode: disconnected`, `ai.configured: false` | 같음 | 진단 응답 정상, AI 미설정 |
| `GET /api/vulnerabilities` | 200 `status: not_configured`, `PROJECT_NOT_CONFIGURED`, `packages: []` | 같음 | 프로젝트 조회 미설정 |

---

## 4. 단계별 결과 (같은 커밋 `c31ed8b…`, 새 폴더)

결과 구분: **재현됨**(설명서대로 동작이 다시 나옴) · **재현 안 됨** · **연결 없음**(기본 실행이 회사 시스템에 연결되지 않아 실제 데이터로는 확인 못 함) · **확인 불가**(결과를 확인할 수 없음).
예제(demo) 모드는 이번 재현에서 실행하지 않았으며, 아래 어떤 결과도 예제 자료가 아닙니다.

| 단계 | 확인한 기능 (학생 함수) | 결과 | 확인 시각 | 근거 (화면에 실제로 나온 문구) | 미확인 원인·비고 |
|---|---|---|---|---|---|
| 13 | 로그인·기기·세션 (`renderIdentity`) | 연결 없음 | 15:11 | `연결 없음 (disconnected)`, `로그인 정보 연결 실패: …`, `기기 목록 연결 실패: …`, `세션 목록 연결 실패: …` | 실패를 정상·빈 목록으로 보이지 않게 표시하는 동작은 재현됨. 실제 로그인 데이터는 회사 시스템 미연결로 미확인 |
| 14 | 업무 앱 접속 판정 (`renderDecision`) | 연결 없음 | 15:11 | `앱을 골라 접속을 요청하세요. 아직 판정을 요청하지 않았습니다.` | 앱 목록이 `ENGINE_NOT_CONNECTED` 라 판정 요청 불가. allow/deny/challenge 실제 판정 미확인 |
| 15 | 보안 기록 (`renderEvents`) | 연결 없음 | 15:11 | `기록을 불러오지 못했습니다: … (ENGINE_NOT_CONNECTED)`, `이 화면은 빈 기록 목록이 아니라 불러오기 실패입니다.` | 불러오기 실패와 빈 목록 구분은 재현됨. 실제 access·xdr 기록 미확인 |
| 16 | 상태·알림 요약 (`renderStatus`) | 연결 없음 | 15:11 | 알림 5건 `코드 ENGINE_NOT_CONNECTED`, `기기 목록 불러오기 실패`, `세션 불러오기 실패`, `자동으로 다시 요청하지 않습니다.` | 실제 기기·세션 상태 미확인 |
| 17 | AI 연결 점검 (`renderAiConnection`) | 확인 불가 | 15:12경 | 점검 전 `AI 연결 점검 전` → 「현재 API 연결 점검」 누른 뒤 `AI 연결 점검 실패 · 권한 준비 중·확인 불가`, `오류 코드: AI_REQUEST_UNVERIFIED`, `사건 설명은 실행하지 않았습니다.` | 원인별 실패 안내는 재현됨. 계정 연결·AI 앱 승인을 하지 않아(`ai.configured: false`) 실제 모델 응답 미확인 |
| 18 | AI 사건 설명 (`renderExplanation`) | 연결 없음 | 15:11 | `사건 설명 전: 보안 기록에서 기록을 먼저 고르세요. AI 설명은 참고 정보입니다.` | 고를 기록이 없어 설명 요청 불가. 근거 인용·거부 동작은 실제 데이터로 미확인 |
| 19 | 조치 상태 (`renderAction`) | 연결 없음 | 15:11 | `조치: 아직 미실행(idle).`, 제공 집행 버튼 비활성 | 실제 조치 집행 연결은 준비되지 않음(UNV). ACK·effectApplied 판정은 실제 데이터로 미확인 |
| 20 | 라이브러리·취약점 (`renderVulnerabilities`) | 연결 없음 | 15:11:33 | 「설치 패키지 조회」 뒤 `조회 상태: 조회 준비 미완료(not_configured)`, `"취약점 없음"이 아닙니다.`, `lockfileVersion: 확인 불가` | 승인 패키지 목록·프로젝트 미설정으로 OSV 조회 안 함. 실제 OSV 결과 미확인 |
| 21 | 설명서 절차 (`docs/STUDENT_GUIDE.md`) | 재현됨 | 15:10:25~15:10:37 | 버전 확인 → 문법 확인 → 실행 도구로 실행 → HTTP 200 → 종료 → 재실행 → HTTP 200 | Node 가 기준(24.19.0)이 아닌 v24.21.0 에서 확인함 |

**끄고 다시 켠 뒤 결과**: 3장의 9개 주소 응답 코드·오류 코드가 첫 실행과 재실행에서 모두 같았습니다.

---

## 5. 데이터 보존

| 대상 | 한 일 | 결과 |
|---|---|---|
| 원래 작업 폴더 `C:\kesheb-defense` | 읽기만 함 (`git status`, `git rev-parse HEAD`) | HEAD `c31ed8b…` 그대로. 재현 전부터 있던 커밋되지 않은 제공 파일 변경 표시(`README.md`, `src/server.mjs`, `public/app.js` 등)는 손대지 않았고, 제출 커밋에도 포함되지 않음 |
| Git 기록 | 새 커밋을 쌓기만 함 | 강제 푸시·기록 삭제 없음 |
| 인증·설정 파일 | `.env`·계정 연결 정보를 새 폴더로 복사하지 않음 | 새 폴더 `.env` 없음 확인 |
| 앱 데이터 | 기본 실행은 조치 기록 DB 를 쓰지 않음 (`src/actions/store.mjs` 는 명시적으로 지정한 기존 SQLite 파일에만 표를 추가) | 이번 재현에서 지정하지 않음 → 기록·삭제된 앱 데이터 없음 |
| 재현 폴더 | `C:\kesheb-repro-20261026-151025` 를 새로 만듦 | 원래 폴더와 분리. 지워도 원래 작업에 영향 없음 |

학생 데이터의 **보존 범위, 백업 절차, 복원 순서, 복원 한계**는 별도 문서 `docs/STUDENT_DATA_BACKUP.md` 에 정리했습니다. 이번 재현의 새 폴더 clone 은 그 문서 3-1 「전체 복원」 절차를 실제로 한 기록이기도 합니다.

---

## 6. 확인 방법별 구분

| 구분 | 항목 |
|---|---|
| 실제 화면에서 확인 | 4장 13~20단계 문구 (새 폴더 앱, `http://127.0.0.1:5199/`) |
| 실제 명령으로 확인 | `git clone`, `node --version`, `node --check`, 실행 도구 실행·종료·재실행, HTTP 응답(3장) |
| 모의 데이터로만 점검 (이번 재현과 별개, 이전 단계에서) | 13~20단계 함수의 정상 데이터 표시(허용 판정, 기록 목록, 근거 인용, 조치 성공·결과 불명, 취약점 목록) |
| 코드 원문으로만 확인 | 21단계 설명서의 경로·명령과 원문 대조 |

---

## 7. 기다림(UNV) · 재현 완료로 적지 않는 항목

- 접근 제어·XDR 시스템(SDP) 실제 연결과 실제 로그인·기기·세션·기록 데이터 (13~16, 18).
- 19단계 실제 조치 집행 연결 (원천 집행 준비 안 됨).
- CLCO 수업용 AI 계정 연결·앱 승인 뒤 실제 모델 응답과 사건 설명 (17, 18).
- OSV 공개 취약점 실제 조회 결과 (20).
- 수업·검사 기준 Node.js 24.19.0 에서의 재현 (이번은 v24.21.0).
- 예제(demo) 모드 화면 (이번 재현에서 실행하지 않음).

위 항목이 남아 있으므로 이 버전은 **검증 중인 버전(v0.9)** 이며, 22단계 통과는 원문 검토 기준의 수료이지 실제 운영 인증이나 v1.0 인증이 아닙니다.
