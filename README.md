# 오목 웹게임

브라우저에서 바로 플레이할 수 있는 15x15 오목 게임입니다. 2인 대전, 승리 판정, 마지막 수 취소, 디바이스 반응형 UI를 갖춘 정적 웹 애플리케이션으로 제작했습니다.

## 주요 기능

- 15x15 오목판
- 흑돌/백돌 2인 대전
- 가로/세로/대각선 승리 판정
- 무승부 판정
- 마지막 수 하이라이트
- 마지막 수 취소
- 새 게임 시작
- PC, 태블릿, 모바일 반응형 화면

## 로컬 실행

```bash
npm install
npm start
```

브라우저에서 `http://localhost:3000` 으로 접속하면 게임을 플레이할 수 있습니다.

## Render 배포

이 프로젝트는 Express 정적 서버를 사용하므로 Render에 바로 배포할 수 있습니다.

### 방법 1: Render 웹 서비스 생성

1. Render 대시보드에서 New > Web Service 선택
2. GitHub 저장소 연결
3. 다음 설정을 입력
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
4. 배포 완료 후 생성된 URL에서 게임 접속

### 방법 2: render.yaml 사용

저장소 루트에 `render.yaml` 파일을 두면 배포 설정을 코드로 관리할 수 있습니다.

## 프로젝트 구조

```text
.
├── index.html
├── style.css
├── script.js
├── server.js
├── package.json
├── README.md
└── render.yaml
```

## 게임 규칙

- 흑돌이 먼저 시작합니다.
- 같은 색 돌이 연속 5개 이상 놓이면 승리입니다.
- 이미 돌이 있는 자리에 놓을 수 없습니다.
- 빈 자리가 없고 승자가 없으면 무승부입니다.

## 배포 확인 포인트

- 서버가 `PORT` 환경 변수를 활용하도록 구성되어 있어 Render에서 정상 실행됩니다.
- 정적 파일 경로가 루트 디렉터리 기준으로 제공됩니다.
- 브라우저에서 새로고침 및 직접 URL 접속이 가능하도록 설정되어 있습니다.
