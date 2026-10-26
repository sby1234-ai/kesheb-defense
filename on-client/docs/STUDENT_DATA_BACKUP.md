# 학생 데이터 백업·복원 절차 · 보안 Agent 「케셰브」

학생이 새로 만든 문서입니다. 제공 문서(`docs/STARTER_UPDATE.md` 등)는 고치지 않았습니다.
각 절차 옆에 **확인함**(실제로 해 봄) / **미실행**(명령만 적음)을 표시합니다.

---

## 1. 보존 범위 — 무엇이 학생 데이터이고 어떻게 지키는가

| 데이터 | 위치 | 백업 방법 | 복원 방법 | 비고 |
|---|---|---|---|---|
| 학생 구현 코드 | `on-client/student/extension.mjs` | Git 커밋 → GitHub 푸시 | `git clone` 또는 특정 파일만 `git checkout` | **백업 대상** |
| 학생 영역 어댑터 | `on-client/student/engine-adapter.mjs` | 〃 | 〃 | 이번 과정에서 고치지 않았지만 같이 보존됨 |
| 학생 문서 | `on-client/docs/STUDENT_GUIDE.md`, `REPRODUCTION_RECORD.md`, `STUDENT_DATA_BACKUP.md`, `docs/evidence/` | 〃 | 〃 | **백업 대상** |
| Git 기록 | 저장소 `.git` | GitHub 원격 저장소 (https://github.com/sby1234-ai/kesheb-defense) | `git clone` 이 전체 기록을 받아 옴 | 강제 푸시·기록 삭제는 하지 않음 |
| 제공 파일 | `public/`, `src/`, `tools/`, `vendor/`, 제공 `docs/` | 학생 데이터 아님 (커밋에 포함돼 같이 받아짐) | 같은 커밋을 clone | 원본 기준은 `.on-starter-manifest.json` |
| 비밀 설정 | `.env`, 계정 연결 정보 | **백업하지 않음** (커밋 금지) | 복원하지 않음 → 17단계 「계정 연결 시작」「AI 연결 시작」 절차를 새로 진행 | 계정 연결 정보는 `tools/app-credentials.ps1` 이 Windows 사용자 보호(DPAPI, CurrentUser)로 암호화해 보관하므로 다른 PC·다른 사용자로 옮겨도 풀리지 않음 |
| 앱 실행 데이터 | 없음 (기본 실행) | 해당 없음 | 해당 없음 | 제공 화면 `public/` 은 브라우저 저장소(localStorage 등)를 쓰지 않음. 조치 기록 DB(`src/actions/store.mjs`)는 운영 측이 기존 SQLite 파일을 명시적으로 지정할 때만 쓰며, 기본 실행에서는 쓰지 않음 |
| 작업 보조 파일 | `C:\kesheb-defense\_kesheb_*.cmd/.ps1/.txt` | 백업하지 않음 (커밋하지 않는 로컬 보조 파일) | 필요하면 다시 만듦 | 재현 로그 원본만 `docs/evidence/` 에 복사해 커밋함 |

**보존 원칙**
- 기존 학생 파일·기록은 지우거나 덮어쓰지 않습니다. 고칠 때는 새 커밋을 쌓습니다.
- 원래 작업 폴더 `C:\kesheb-defense` 에는 재현 전부터 있던 **커밋되지 않은 제공 파일 변경**(`README.md`, `package.json`, `src/server.mjs` 등)이 있습니다. 학생 데이터가 아니고 제출 커밋에도 들어가지 않으며, 이 절차의 백업 대상이 아닙니다. 지우거나 되돌리지 않고 그대로 둡니다.

---

## 2. 백업 절차

PowerShell 을 Git 최상위 폴더 `C:\kesheb-defense` 에서 엽니다.

### 2-1. 백업 대상 (1장의 "백업 대상"과 같은 목록)

| 경로 | 내용 |
|---|---|
| `on-client/student/` | `extension.mjs`, `engine-adapter.mjs` (학생 영역 전체) |
| `on-client/docs/STUDENT_GUIDE.md` | 21단계 학생 설명서 |
| `on-client/docs/REPRODUCTION_RECORD.md` | 22단계 재현 기록 |
| `on-client/docs/STUDENT_DATA_BACKUP.md` | 이 문서 |
| `on-client/docs/evidence/` | 재현 로그 원본 |

### 2-2. 백업 전 변경 범위 확인

```powershell
# 1) 백업 대상 안에서 바뀐 파일만 보기
git status --short -- on-client/student on-client/docs/STUDENT_GUIDE.md on-client/docs/REPRODUCTION_RECORD.md on-client/docs/STUDENT_DATA_BACKUP.md on-client/docs/evidence

# 2) 전체 변경 보기 (대상 밖 변경이 섞여 있는지 확인)
git status --short
```

- 1) 에 나온 파일만 이번 백업에 넣습니다.
- 2) 에만 나오고 1) 에 없는 파일(예: 원래 폴더에 남아 있는 커밋되지 않은 제공 파일 변경 `README.md`, `src/server.mjs` 등)은 학생 데이터가 아니므로 **넣지 않고 그대로 둡니다**. `git add .` 이나 `git add -A` 는 쓰지 않습니다.
- `.env` 등 비밀 파일이 1)·2) 에 보이면 커밋하지 않습니다.

### 2-3. 저장점 만들기와 원격 백업

```powershell
# 3) 백업 대상 전체를 경로로 지정해 담기 (바뀌지 않은 파일은 담겨도 변화 없음)
git add -- on-client/student on-client/docs/STUDENT_GUIDE.md on-client/docs/REPRODUCTION_RECORD.md on-client/docs/STUDENT_DATA_BACKUP.md on-client/docs/evidence

# 4) 담긴 파일이 백업 대상 안에만 있는지 확인
git diff --cached --name-only

# 5) 저장점(커밋) 만들기
git commit -m "보안 Agent 저장점"

# 6) 원격(GitHub)에 백업
git push

# 7) 백업 확인: 대상 안에 남은 변경이 없어야 하고, 로컬과 원격 커밋 번호가 같아야 함
git status --short -- on-client/student on-client/docs/STUDENT_GUIDE.md on-client/docs/REPRODUCTION_RECORD.md on-client/docs/STUDENT_DATA_BACKUP.md on-client/docs/evidence
git rev-parse HEAD
git ls-remote origin HEAD
```

**확인함**: 13~21단계 결과를 학생 파일을 경로로 지정해 add → commit → push → 커밋 번호 확인하는 방식으로 GitHub 에 저장하고, 원격에 올라간 커밋 번호로 ALEPH 에 제출했습니다(예: 21단계 `c31ed8b409da09ca81b74ad67ffd372dbb075c26`, 22단계 문서 `39aa727e3b5c4e03c4fc76d2cad3f337d1e14d67`). 위 목록 전체를 한 번에 지정하는 3)·4)·7) 명령 그대로는 **미실행**입니다(지금까지는 단계마다 바뀐 학생 파일만 지정했음).

---

## 3. 복원 절차

### 3-1. 전체 복원 (새 폴더)

```powershell
# 1) 기존 폴더는 그대로 두고 새 빈 폴더에 받기
git clone https://github.com/sby1234-ai/kesheb-defense.git C:\kesheb-restore
cd C:\kesheb-restore

# 2) 특정 커밋이 필요하면 그 커밋으로 이동 (예: 21단계 통과 커밋)
git checkout c31ed8b409da09ca81b74ad67ffd372dbb075c26

# 3) 복원 확인: 커밋 번호와 학생 코드 지문 대조
git rev-parse HEAD
Get-FileHash .\on-client\student\extension.mjs -Algorithm SHA256

# 4) 실행 확인 (docs/STUDENT_GUIDE.md 2장)
cd on-client
node --check student/extension.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
```

**확인함 (1·3·4)**: 22단계 재현에서 `C:\kesheb-repro-20261026-151025` 로 clone 해 커밋 `c31ed8b…`, `student/extension.mjs` SHA256 `6B5955947D8B054F32F5FCBA11CBE028AD5B60376BB40E387C121A3FEB30BE38` 를 확인하고 실행·종료·재실행까지 했습니다(`docs/REPRODUCTION_RECORD.md`, 로그 원본 `docs/evidence/repro-log-20261026-151025.txt`).
**미실행 (2)**: `git checkout <커밋>` 으로 과거 커밋 이동은 이번에 하지 않았습니다(clone 직후 HEAD 가 이미 대상 커밋이었음).

### 3-2. 학생 파일 하나만 되돌리기

```powershell
# 원래 작업 폴더에서, 지정한 커밋의 학생 파일만 꺼내기
git checkout c31ed8b409da09ca81b74ad67ffd372dbb075c26 -- on-client/student/extension.mjs
git status
```

**미실행**: 명령만 적었습니다. 실행하면 그 파일의 커밋되지 않은 변경이 덮어써지므로, 먼저 2장 백업(커밋)을 한 뒤에 씁니다.

### 3-3. 복원 뒤 다시 해야 하는 것

- 계정 연결·AI 연결: 비밀 설정은 복원되지 않으므로 17단계 화면 절차로 새로 연결합니다.
- 회사 시스템(SDP) 연결: 담당자가 안내한 외부 설정 파일이 있을 때만 `-SdpHostConfig` 로 지정합니다. 이 저장소에는 그 파일이 없습니다.

---

## 4. 복원 한계

| 한계 | 이유 |
|---|---|
| 커밋하지 않은 변경은 복원되지 않음 | Git 백업은 커밋·푸시한 내용만 보존 |
| 비밀 설정·계정 연결 정보는 복원되지 않음 | 커밋하지 않으며, DPAPI 보호라 다른 PC·사용자에서 풀리지 않음 |
| GitHub 에 접속할 수 없으면 원격 복원 불가 | 로컬 번들(`git bundle`) 같은 별도 사본은 만들지 않았음 |
| 운영 측이 지정한 조치 기록 DB 는 이 절차 밖 | 학생 프로젝트 밖의 운영 측 파일 |
| 원래 폴더의 커밋되지 않은 제공 파일 변경은 복원 대상 아님 | 학생 데이터가 아니며 제출 커밋에 없음 |
