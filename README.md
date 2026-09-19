# ⚡ Pulse — 스마트폰 개인 클라우드 & 가상 컴퓨터 OS

안 쓰는 안드로이드/갤럭시 스마트폰을 24시간 개인 클라우드와 가상 컴퓨터로 활용하는 웹 서비스 플랫폼 **Pulse**입니다.  
- ☁️ **Pulse Cloud**: 사진, 동영상, 텍스트 문서, 압축파일을 안전하게 보관하고 실시간 스트리밍 및 다운로드 없는 미리보기를 제공하는 개인 드라이브
- 🖥️ **Pulse OS**: 브라우저 속 완성형 가상 컴퓨터 GUI (멀티 윈도우 OS, 대화형 쉘 터미널, 파일 탐색기, 코드 에디터, 활동 모니터)
- ⚡ **서버 모니터링 대시보드**: 스마트폰 CPU, RAM, 배터리, 24시간 Uptime 종합 점검

---

## 📱 스마트폰(Termux) 초간단 원클릭 시작

스마트폰의 **Termux** 앱에서 아래 한 줄 명령어를 복사하여 붙여넣으면 끝납니다!  
(필수 패키지 설치부터 환경 구성, 단축 명령어 등록까지 자동으로 완료됩니다.)

```bash
pkg update -y && pkg install -y git && git clone https://github.com/leesunkwon/termux-cloud.git && cd termux-cloud && ./install.sh
```

설치가 완료되면 이후에는 스마트폰 터미널 어디서든 아래 단축 명령어로 제어할 수 있습니다:

```bash
termux-cloud          # 서버 시작 (기본 포그라운드)
termux-cloud --bg     # 24시간 백그라운드(데몬) 실행
termux-cloud status   # 서버 상태 및 접속 주소 확인
termux-cloud stop     # 서버 안전 종료
termux-cloud update   # 최신 버전으로 깃 업데이트
```

---

## ✨ 주요 기능
- **Pulse 브랜딩 & 전용 3D 펄스 아이콘**: Apple 스타일 스쿼클 디자인과 글래스모피즘 UI
- **Pulse Cloud (개인 드라이브)**: 사진, 비디오, 문서, 오디오 등 모든 확장자 지원 및 다운로드 없는 즉시 미리보기
- **Pulse OS (가상 컴퓨터 Web OS)**: 실제 쉘 터미널 명령어 실행, 파일 탐색기(Finder), 코드 에디터(Code Studio), 실시간 자원 모니터
- **드래그 앤 드롭 업로드**: 웹 브라우저 창 어디로든 끌어다 놓아 업로드, 실시간 업로드 진행률 표시
- **다운로드 및 안전 삭제**: 원클릭 다운로드 및 Apple 스타일 블러 확인 모달을 통한 안전한 파일 삭제
- **실시간 검색 및 정렬**: 파일명 실시간 필터링, 최신순/이름순/용량순 정렬
- **저장 공간 모니터링**: 사진, 동영상, 문서 등 파일 종류별 실시간 용량 분석 바 제공
- **로컬 IP 자동 안내**: 서버 구동 시 같은 Wi-Fi 내 다른 기기(PC, 아이폰 등)에서 접속할 주소를 자동으로 화면에 출력

---

## 📁 디렉토리 구조
```
├── app.py              # Flask 백엔드 서버 (Termux 경량 추천)
├── server.js           # Node.js Express 백엔드 서버
├── package.json        # Node.js 설정 및 의존성
├── requirements.txt    # Python 의존성
├── install.sh          # Termux 원스텝 자동 설치 스크립트
├── start.sh            # 로컬 IP 감지 및 서버 실행 스크립트 (--bg 지원)
├── stop.sh             # 실행 중인 서버 안전 종료 스크립트
├── status.sh           # 서버 상태, 메모리/로그 점검 스크립트
├── update.sh           # 최신 코드 자동 Git pull 및 재시작 스크립트
├── guide_termux.md     # 갤럭시 폰 Termux 설치 및 24시간 세팅 완벽 가이드
├── uploads/            # 파일 저장 디렉토리 (기본)
└── public/             # 프론트엔드 정적 파일 (HTML/CSS/JS/Assets)
```

---

## 💻 접속 방법

서버가 실행되면 터미널에 접속 주소 안내 상자가 표시됩니다:

```text
┌────────────────────────────────────────────────────────┐
│  ⚡  Pulse (Pulse Cloud & Pulse OS) Server             │
├────────────────────────────────────────────────────────┤
│  📱 스마트폰 자체 접속 : http://localhost:3000              │
│  💻 동일 와이파이 접속 : http://192.168.X.X:3000           │
└────────────────────────────────────────────────────────┘
```

1. **스마트폰 자체 브라우저**: `http://localhost:3000` 접속
2. **동일 Wi-Fi 내 PC/노트북/아이폰**: 스마트폰에 표시된 `http://192.168.X.X:3000` 주소로 접속

---

## 🛠️ PC / 로컬 개발 환경에서 실행

### 1) Python으로 실행 (권장)
```bash
pip install -r requirements.txt
./start.sh
```

### 2) Node.js로 실행
```bash
npm install
node server.js
```

---

## 📖 갤럭시 폰 24시간 세팅 가이드
화면 꺼짐 방지, 배터리 최적화 예외, 외부 LTE 접속(Cloudflare Tunnel / Tailscale) 등 자세한 내용은 **[`guide_termux.md`](./guide_termux.md)** 문서를 참고하세요.
