# 🤖 Pulse AI Developer & Agent Guide (AGENTS.md)

이 문서는 다른 AI 코딩 어시스턴트(Cursor, Claude Code, Windsurf, ChatGPT, Copilot 등)가 이 프로젝트의 아키텍처와 규칙을 100% 이해하고 일관성 있게 개발할 수 있도록 작성된 가이드라인입니다.

---

## ⚡ 1. 프로젝트 개요 (Overview)
- **프로젝트명**: Pulse (Pulse Cloud & Pulse OS)
- **목적**: 남는 안드로이드 스마트폰을 Termux 환경에서 24시간 가동되는 개인용 **iCloud 스타일 클라우드 및 가상 웹 데스크톱(Pulse OS)**으로 전환.
- **현재 버전**: `v2.0.0`
- **저장소**: [leesunkwon/termux-cloud](https://github.com/leesunkwon/termux-cloud)

---

## 🛠️ 2. 핵심 기술 스택 & 개발 원칙 (Tech Stack & Core Rules)

### 1) 기술 스택
- **Backend**: Python 3 (Flask)
  - 저사양 스마트폰 환경을 위해 단일 경량 프로세스로 구동.
  - 별도의 무거운 DB 없이 JSON 및 파일 시스템 기반 세션/계정 관리.
- **Frontend**: 100% **Vanilla JavaScript (ES6+) & CSS3 & HTML5**
  - Webpack, React, Vue 등 번들러 사용 금지.
  - **외부 CDN (FontAwesome, Bootstrap 등) 및 외부 NPM 런타임 의존성 추가 절대 금지** (오프라인/로컬 Wi-Fi 환경 및 Termux 자원 최적화).
  - SVG 아이콘 및 브라우저 표준 Web API(Canvas, HTML5 Audio/Video, CSS Transform)만 사용.

### 2) 🚨 엄격한 버전 관리 및 릴리즈 규칙 (Mandatory Rule)
새로운 기능 추가, UI 개선, 버그 수정 등을 진행할 때는 **반드시 아래 4개 파일의 버전을 동기화**하고 상세 업데이트 로그를 작성해야 합니다:
1. `app.py`: `APP_VERSION = 'vX.X.X'`
2. `package.json`: `"version": "X.X.X"`
3. `README.md`: `현재 버전은 **vX.X.X**입니다.` 및 기능 설명 갱신
4. `CHANGELOG.md`: `## [vX.X.X] - YYYY-MM-DD` 상세 릴리즈 노트 추가

### 3) 저장소 데이터 보존 규칙
- `uploads/` (사용자 업로드 파일) 및 `.pulse/` (계정 및 세션 서명 키)는 `.gitignore` 처리되어 있습니다.
- Git 강제 업데이트(`git reset --hard`) 시에도 사용자 데이터가 유실되지 않도록 디렉터리 경로를 준수해야 합니다.

---

## 📂 3. 디렉터리 구조 및 핵심 파일

```text
termux-cloud/
├── app.py                 # Flask 메인 애플리케이션 진입점 & 시스템 API
├── pulse_files.py         # 파일 탐색, 업로드, 폴더, 휴지통, 다운로드 API
├── pulse_auth.py          # 관리자(admin)/조회(viewer) 권한 및 세션 인증
├── pulse_metrics.py       # CPU, RAM, 저장소, 배터리 실시간 측정
├── setup-auth.py          # CLI 관리자 계정 생성/비밀번호 변경 도구
├── cli.sh / install-cli.sh# 전역 명령어 `termux-cloud` 등록 스크립트
├── start.sh / stop.sh     # 서버 시작/종료 셸 스크립트 (--bg 지원)
├── status.sh / update.sh  # 서버 상태 확인 및 자동 업데이트 스크립트
├── guide_termux.md        # 모바일(스마트폰) 사용자를 위한 상세 설정 가이드
├── README.md              # 프로젝트 공식 종합 설명서
├── CHANGELOG.md           # 전체 버전 릴리즈 노트
├── public/
│   ├── index.html         # 단일 페이지 메인 마크업
│   ├── css/style.css      # Apple HIG macOS 테마 및 반응형 스타일
│   └── js/
│       ├── app.js         # Pulse Cloud & Pulse OS 2.0 전체 프론트엔드 로직
│       ├── pulse.js       # 공통 API 클라이언트 및 모달 유틸리티
│       └── dashboard.js   # 관리자 시스템 모니터링 대시보드
└── uploads/               # 사용자 보관함 디렉터리 (Git 추적 제외)
```

---

## 📱 4. 스마트폰(Termux) 실행 및 제어 명령어

```bash
# 서버 시작 (백그라운드 24시간 가동)
termux-cloud --bg      # 또는 ./start.sh --bg

# 서버 상태 및 접속 주소 확인
termux-cloud status    # 또는 ./status.sh

# 서버 안전 종료
termux-cloud stop      # 또는 ./stop.sh

# 계정 관리
termux-cloud account   # 또는 python3 setup-auth.py

# 스마트폰 백그라운드 유지 (화면 꺼짐 방지)
termux-wake-lock
```
- 접속 주소:
  - 스마트폰 자체 접속: `http://localhost:3000`
  - 동일 Wi-Fi 접속: `http://스마트폰IP:3000`

---

## 🖥️ 5. Pulse OS 2.0 내장 기능 요약
1. **Spotlight (`Ctrl+Space`)**: 초고속 앱 런처, 인스턴트 계산기, 파일/명령 검색
2. **Quick Look (`Space`)**: Finder/바탕화면에서 미디어/코드 즉시 팝업 미리보기
3. **Mission Control (`F3`)**: 열려 있는 모든 창 3D 타일링 정렬 및 1클릭 전환
4. **Control Center**: 메뉴바 우측 Glassmorphism 팝오버 (IP, 볼륨, 테마, 하드웨어 요약)
5. **Stickies (스티커 메모)**: 파스텔 테마 포스트잇, `localStorage` 실시간 영구 자동 저장
6. **Pulse Music**: 보관함 오디오 트랙 자동 감지, 회전 바이닐 UI, 백그라운드 재생
7. **Window Management**: 윈도우 50% 분할 스냅 타일링, macOS 우클릭 컨텍스트 메뉴
8. **Finder & Cloud**: 상단 브레드크럼 경로 탐색 바, 폴더 카드 드래그 앤 드롭 업로드 지원
