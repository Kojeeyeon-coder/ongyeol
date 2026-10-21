# 온결 · 8체질 식단 일기

선택 사진 식단 기록, 8개 체질별 섭생표, 두 사용자의 공통 음식 가이드와 일간·주간·월간 분석을 제공하는 로컬 우선 웹앱입니다.

## 기술 스택

- React 19 + TypeScript + Vite
- 브라우저 IndexedDB: 사용자·식사·사진 저장
- Vitest: 도메인 계산 단위 테스트
- Firebase Authentication: 선택적 이메일·Google 로그인
- 공공데이터포털 영양 API: Node 동기화 스크립트로 정적 캐시 생성

지원 기준은 최신 Chrome, Edge, Safari, Firefox의 최근 안정 버전입니다.

## 실행

### 바로 열기

패키지 설치 없이 [정적 MVP 미리보기](./dist/index.html)를 일반 브라우저에서 직접 열 수 있습니다. 온보딩, 선택 사진 식사 기록, 섭생표, 함께 먹기와 분석 데이터는 해당 브라우저의 로컬 저장소에만 보관됩니다.

자동화된 브라우저 이동은 보안 정책상 `file://` 주소를 직접 열 수 없습니다. 현재 작업에서는 로컬 파일을 별도 미리보기 탭으로 열었으며, 다시 열 때는 파일 탐색기에서 `dist/index.html`을 더블클릭하거나 Chrome/Edge로 여세요.

### React 개발 버전

```powershell
npm install
npm run dev
```

현재 실행 환경에서 npm과 Sites 소스 저장소 네트워크가 차단될 수 있습니다. 이 경우 위 정적 MVP를 사용하면 됩니다.

설치 후 전체 검증 명령은 다음과 같습니다.

```powershell
npm run typecheck
npm test
npm run build
```

## Firebase 로그인 설정

Firebase Console에서 Web 앱을 등록하고 Authentication의 이메일/비밀번호 및 Google 제공자를 활성화한 뒤 `.env.example`을 `.env.local`로 복사해 `VITE_FIREBASE_*` 값을 채웁니다. 설정값이 없으면 앱은 로그인 화면 없이 기존 로컬 모드로 동작합니다. 로그인하더라도 식사·사진 데이터는 현재 브라우저에만 저장되며 클라우드 동기화하지 않습니다.

로컬 개발 주소에서 인증하려면 Firebase Console의 **Authentication → Settings → Authorized domains**에 `localhost`를 추가합니다. GitHub Pages 배포 후에는 같은 목록에 `<GitHub 사용자명>.github.io`를 추가해야 Google 팝업 로그인이 동작합니다.

## GitHub Pages 배포

`.github/workflows/deploy-pages.yml`은 `main` 브랜치가 갱신될 때 타입 검사·테스트·Vite 빌드를 실행하고 결과물 `dist/`를 GitHub Pages에 배포합니다. 실제 Firebase 설정은 저장소에 커밋하지 않고 GitHub 저장소의 **Settings → Secrets and variables → Actions**에 다음 Repository secret 여섯 개로 등록합니다.

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

그다음 **Settings → Pages → Build and deployment → Source**를 `GitHub Actions`로 선택합니다. 첫 푸시 또는 Actions 화면의 수동 실행이 성공하면 `https://<GitHub 사용자명>.github.io/<저장소명>/`에서 앱을 열 수 있습니다. Firebase 설정값이 하나라도 빠지면 로그인 없는 빌드가 실수로 배포되지 않도록 작업이 실패하게 되어 있습니다.

## 영양 데이터 동기화

공공데이터포털 인증키는 브라우저 코드에 넣지 않습니다. 노출된 기존 키는 먼저 재발급한 뒤 `.env.local`에 저장하세요.

```text
NUTRI_API_KEY=재발급한_인증키
```

기본 실행은 8개 체질 섭생표에서 음식·음료로 분류된 1,087개 항목을 읽고, 중복을 제거한 132개 음식명을 통합 영양 DB와 대조합니다.

```powershell
node scripts\sync-nutrition.mjs
```

특정 음식만 다시 확인하거나 시험용 9개만 동기화할 수도 있습니다.

```powershell
node scripts\sync-nutrition.mjs --food=쌀,쇠고기,돼지고기,닭고기,우유
node scripts\sync-nutrition.mjs --sample
```

스크립트는 통합 API 전체 목록을 페이지 단위로 받아 품종·조리상태가 붙은 식품명을 부분·별칭 검색하고 `src/data/nutrition-cache.json`을 원자적으로 갱신합니다. 성공·미매칭 음식명도 함께 저장하며 실패하면 기존 캐시를 보존합니다.

사과·달걀·밥은 식약처 공개 자료의 보통 중량을 우선 적용하며, 사용자는 작음·보통·큼 또는 실제 g으로 보정할 수 있습니다. 검증된 기본 중량이 없는 음식만 실제 g 입력이 필요합니다.

## 8개 체질 섭생표 데이터

사용자가 제공한 이레한의원 8개 체질 페이지 HTML에서 총 1,343개 항목을 추출해 `src/data/*-guide.json`에 저장합니다. 음식 기록 검색에는 음식·음료로 분류한 총 1,087개만 사용하고, 약재·광물·활동은 전체 섭생표에서만 보여줍니다.

```powershell
node scripts\extract-regimen-html.mjs '원문 HTML 경로' 'src\data\체질-slug-guide.json'
node scripts\build-preview-regimen.mjs
```

추출 결과는 `source-extracted-unverified` 상태이며 전문가 검수와 자료 이용 허가 확인 전에는 의료적 사실이나 섭취 지침으로 사용할 수 없습니다.

## 주의

- 이 앱은 의료 진단·치료·섭취 지침을 제공하지 않습니다.
- 8개 체질 표는 원문 총 1,343개 항목을 담았지만 아직 기계 추출·검증 전 데이터입니다.
- 외부 상세 섭생표의 전체 등록은 저작권과 재배포 허가 확인 후 진행해야 합니다.
- kcal는 선택한 영양 항목과 사용자가 입력한 양으로 계산한 예상치입니다.
