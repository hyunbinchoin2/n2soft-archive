# N2SOFT Archive

N2SOFT 임직원 전용 내부 지식 아카이브 시스템입니다.  
문서 업로드, 검색, Q&A를 통해 팀의 지식을 체계적으로 관리합니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 🔐 인증 | Google OAuth — `@n2soft.co.kr` 도메인만 접근 허용 |
| 🔍 검색 | Google 스타일 홈 화면 + 문서/Q&A 통합 검색 |
| 📤 업로드 | 파일 업로드 + 업로더 이력 자동 기록 |
| 💬 Q&A | 질문 등록 / 답변 / 채택 기능 |
| 📋 이력 | 문서별 업로드 이력 (누가, 언제) 추적 |

---

## 기술 스택

- **Frontend**: React 18 + Vite + React Router v6
- **Auth**: Firebase Authentication (Google OAuth)
- **Database**: Cloud Firestore
- **Storage**: Firebase Storage (파일 원본)
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions

---

## 설치 및 로컬 실행

### 1. 저장소 클론

```bash
git clone https://github.com/YOUR_ORG/n2soft-archive.git
cd n2soft-archive
npm install
```

### 2. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com) 접속
2. **새 프로젝트 생성** → 프로젝트 이름: `n2soft-archive`
3. **Authentication** 활성화
   - Sign-in method → **Google** 활성화
   - 승인된 도메인에 `YOUR_ORG.github.io` 추가
4. **Firestore Database** 생성 (프로덕션 모드)
5. **Storage** 활성화
6. **웹 앱 추가** → 설정값 복사

### 3. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열고 Firebase 설정값 입력:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=n2soft-archive.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=n2soft-archive
VITE_FIREBASE_STORAGE_BUCKET=n2soft-archive.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
```

### 4. Firebase Security Rules 설정

**Firestore Rules** (`Firebase Console > Firestore > Rules`):
- `firestore.rules` 파일 내용을 붙여넣고 게시

**Storage Rules** (`Firebase Console > Storage > Rules`):
- `storage.rules` 파일 내용을 붙여넣고 게시

### 5. 로컬 개발 서버 실행

```bash
npm run dev
# http://localhost:5173/n2soft-archive
```

---

## GitHub Pages 배포

### 방법 1: GitHub Actions 자동 배포 (권장)

1. GitHub 저장소 생성 후 코드 Push

2. **GitHub Secrets 등록**  
   `Settings > Secrets and variables > Actions > New repository secret`
   
   아래 6개를 모두 등록:
   ```
   VITE_FIREBASE_API_KEY
   VITE_FIREBASE_AUTH_DOMAIN
   VITE_FIREBASE_PROJECT_ID
   VITE_FIREBASE_STORAGE_BUCKET
   VITE_FIREBASE_MESSAGING_SENDER_ID
   VITE_FIREBASE_APP_ID
   ```

3. **GitHub Pages 설정**  
   `Settings > Pages > Source: GitHub Actions`

4. `main` 브랜치에 Push하면 자동 배포됩니다.

### 방법 2: 수동 배포

```bash
npm run build
# dist/ 폴더를 gh-pages 브랜치에 Push
```

---

## Firebase 도메인 승인 설정

Firebase Authentication에 배포 도메인 추가 필수:

1. `Firebase Console > Authentication > Settings > 승인된 도메인`
2. `YOUR_ORG.github.io` 추가

---

## vite.config.js 수정 (저장소 이름 변경 시)

```js
// vite.config.js
export default defineConfig({
  base: '/YOUR_REPO_NAME/', // ← 실제 GitHub 저장소 이름으로 변경
})
```

`src/main.jsx`의 `basename`도 동일하게 변경:
```jsx
<BrowserRouter basename="/YOUR_REPO_NAME">
```

---

## 폴더 구조

```
n2soft-archive/
├── .github/workflows/deploy.yml   # GitHub Actions CI/CD
├── public/
│   └── 404.html                   # SPA 라우팅 지원
├── src/
│   ├── contexts/
│   │   └── AuthContext.jsx        # 인증 상태 관리
│   ├── pages/
│   │   ├── LoginPage.jsx          # 로그인 페이지
│   │   ├── HomePage.jsx           # 메인 검색 홈
│   │   ├── SearchResultsPage.jsx  # 검색 결과
│   │   ├── UploadPage.jsx         # 문서 업로드
│   │   ├── DocumentDetailPage.jsx # 문서 상세 + 이력
│   │   ├── QAPage.jsx             # Q&A 목록
│   │   ├── AskQuestionPage.jsx    # 질문 작성
│   │   └── QuestionDetailPage.jsx # 질문 상세 + 답변
│   ├── services/
│   │   ├── firebase.js            # Firebase 초기화
│   │   └── archiveService.js      # Firestore/Storage CRUD
│   ├── components/
│   │   └── Navbar.jsx             # 네비게이션 바
│   ├── App.jsx                    # 라우팅
│   ├── main.jsx                   # 진입점
│   └── index.css                  # 전역 스타일
├── firestore.rules                # Firestore 보안 규칙
├── storage.rules                  # Storage 보안 규칙
├── .env.example                   # 환경변수 예시
├── vite.config.js
└── package.json
```

---

## 추후 개선 권장 사항

| 기능 | 설명 |
|------|------|
| 전문 검색 | Algolia 또는 Firebase Extension (Search) 연동 |
| 알림 | 새 답변 시 이메일 알림 (Firebase Cloud Functions) |
| 권한 등급 | 관리자 / 일반 직원 역할 분리 |
| 문서 미리보기 | PDF.js로 브라우저 내 미리보기 |
| 북마크 | 개인 즐겨찾기 기능 |
| 통계 대시보드 | 업로드 현황, 인기 문서 등 |

---

## 문의

관리자: admin@n2soft.co.kr
