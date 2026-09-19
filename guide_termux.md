# 📱 갤럭시 스마트폰(Termux)을 나만의 iCloud 서버로 만드는 완벽 가이드

남는 갤럭시 스마트폰에 **Termux**를 설치하여 24시간 가동되는 개인용 **iCloud 스타일 웹 클라우드 서버**를 구축하는 단계별 안내서입니다.

---

## 🚀 1단계: 갤럭시 폰에 Termux 설치하기

> [!IMPORTANT]
> **구글 플레이스토어의 Termux는 구버전으로 업데이트가 중단**되어 패키지 설치 시 오류가 발생합니다.  
> 반드시 아래의 **F-Droid** 또는 **GitHub 공식 배포판**을 설치해야 합니다.

1. 갤럭시 폰의 삼성 인터넷 또는 크롬 브라우저를 엽니다.
2. [F-Droid Termux 다운로드 페이지](https://f-droid.org/packages/com.termux/)에 접속합니다.
3. 아래로 스크롤하여 **"APK 다운로드"**를 눌러 설치합니다.
4. (또는 [Termux 공식 GitHub Releases](https://github.com/termux/termux-app/releases)에서 최신 `termux-app_v...-apt-android-7-github-debug_arm64-v8a.apk` 다운로드)

---

## 🔋 2단계: 갤럭시 스마트폰 백그라운드 유지 설정 (필수)

스마트폰은 화면이 꺼지면 배터리 절약을 위해 백그라운드 앱을 강제로 종료합니다. 이를 방지해야 24시간 안정적인 서버가 됩니다.

1. **배터리 제한 없음 설정**:
   - 갤럭시 `설정` > `애플리케이션` > `Termux` 선택
   - `배터리` 메뉴 클릭 > **"제한 없음(Unrestricted)"**으로 변경
2. **배터리 및 디바이스 케어 설정**:
   - `설정` > `배터리 및 디바이스 케어` > `배터리` > `백그라운드 사용 제한`
   - **"절전 예외 앱"**에 `Termux`를 추가
3. **Termux 화면 꺼짐 방지(Wake Lock)**:
   - Termux 앱을 실행한 후 아래 명령어를 입력합니다:
     ```bash
     termux-wake-lock
     ```
   - 알림창에 "Termux: wake lock held" 표시가 뜨면 화면이 꺼져도 정상 가동됩니다.

---

## 📂 3단계: 파일 접근 권한 및 환경 구축

Termux 앱을 열고 아래 명령어를 순서대로 실행합니다.

### 1) 저장소 접근 허용
```bash
termux-setup-storage
```
- 팝업창으로 "Termux에서 기기의 사진 및 미디어에 액세스하도록 허용하시겠습니까?"가 뜨면 **[허용]**을 누릅니다.
- 이제 `~/storage/shared/`를 통해 갤럭시 폰의 실제 다운로드 폴더, DCIM(사진첩) 등에 접근할 수 있습니다.

### 2) 패키지 업데이트 및 필수 도구 설치
```bash
pkg update && pkg upgrade -y
pkg install python git -y
```

---

## ☁️ 4단계: 원클릭 자동 설치 및 서버 실행

Termux 터미널에 아래 한 줄 명령어를 복사하여 붙여넣고 엔터를 누릅니다:

```bash
pkg update -y && pkg install -y git && git clone https://github.com/leesunkwon/termux-cloud.git && cd termux-cloud && ./install.sh
```

- 스크립트가 실행되면 파이썬 환경, 절전 방지(Wake-lock), 저장소 권한 및 전역 명령어 등록까지 자동으로 처리합니다.
- 설치가 끝나면 즉시 서버를 실행할지 물어봅니다.

성공적으로 실행되면 다음과 같은 컬러 접속 박스가 나타납니다:

```text
┌────────────────────────────────────────────────────────┐
│  ☁️   iCloud-Style Galaxy Cloud Server                 │
├────────────────────────────────────────────────────────┤
│  📱 스마트폰 자체 접속 : http://localhost:3000              │
│  💻 동일 와이파이 접속 : http://192.168.X.X:3000           │
└────────────────────────────────────────────────────────┘
```

---

## ⚡ 5단계: 편리한 터미널 단축 명령어 (언제 어디서든 사용)

`install.sh`를 완료하면 어느 위치에서든 `termux-cloud` 명령어로 서버를 조작할 수 있습니다:

```bash
termux-cloud          # 포그라운드로 서버 실행
termux-cloud --bg     # 백그라운드로 24시간 실행 (추천!)
termux-cloud status   # 현재 서버 가동 여부 및 접속 주소 확인
termux-cloud stop     # 서버 안전 종료
termux-cloud update   # GitHub 최신 코드로 자동 업데이트 및 재시작
```

> [!TIP]
> **스마트폰의 실제 사진 폴더나 대용량 SD 카드를 저장소로 쓰고 싶다면?**  
> 실행할 때 `STORAGE_PATH` 환경변수를 지정해주시면 됩니다:  
> `STORAGE_PATH=~/storage/shared/DCIM termux-cloud --bg`

---

## 🌐 6단계: 집 안(와이파이)에서 접속하기

스마트폰과 동일한 Wi-Fi 공유기에 연결된 PC, 노트북, 태블릿, 아이폰 등에서 접속할 수 있습니다.

1. **갤럭시 스마트폰의 공유기 내부 IP 확인**:
   - `start.sh` 실행 시 터미널 화면에 뜨는 와이파이 주소(`http://192.168.X.X:3000`)를 확인합니다.
2. **PC / 아이폰 / 타 기기 브라우저에서 접속**:
   - 주소창에 `http://<갤럭시IP>:3000` 입력  
     *(예: `http://192.168.0.25:3000`)*
3. **iCloud 스타일 웹페이지**가 열리며 사진 뷰어, 드래그 앤 드롭 업로드, 다운로드가 정상 작동합니다!

---

## 🌍 7단계 (선택): 집 밖(LTE / 외부)에서도 접속하는 법

공유기 포트포워딩 설정이 어렵거나 외부 어디서든 보안 접속을 하고 싶다면 아래 두 가지 방법 중 하나를 추천합니다:

### 1) Cloudflare Tunnel (가장 추천: 무료 HTTPS + 나만의 도메인)
공유기 포트를 열 필요 없이 전 세계 어디서나 안전한 HTTPS 암호화 접속이 가능합니다.
```bash
pkg install cloudflared -y
cloudflared tunnel --url http://localhost:3000
```
- 터미널에 생성되는 `https://xxxxxx.trycloudflare.com` 주소로 접속하면 외부에서도 무료로 접속 가능합니다.

### 2) Tailscale (개인 기기 간 안전한 가상 사설망)
1. 구글 플레이스토어에서 갤럭시 폰과 접속할 노트북/폰에 **Tailscale** 앱 설치
2. 동일 계정으로 로그인 후 갤럭시 폰의 Tailscale IP(예: `100.x.x.x:3000`)로 접속
