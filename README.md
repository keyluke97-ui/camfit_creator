# 캠핏 인플루언서 협찬 포털

Next.js 14 기반의 **모바일 퍼스트** 인플루언서 협찬 포털입니다. Airtable을 백엔드로 사용하며, 등급별 맞춤형 협찬 정보를 제공합니다.

## 🚀 주요 기능

- **2단계 인증**: 생년월일 + 연락처 기반 간편 로그인
- **등급별 맞춤 정보**: Icon/Partner/Rising 등급에 따른 동적 필드 매핑
- **모바일 최적화**: 90% 모바일 사용자를 위한 퍼스트 디자인
- **실시간 동기화**: Airtable 데이터 실시간 반영
- **다크 모드**: 캠핏 브랜드 컬러(네온 그린 #01DF82) 적용

## 📋 사전 요구사항

- Node.js 18 이상
- npm 또는 yarn
- Airtable 계정 및 API 액세스 토큰

## 🔧 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일을 프로젝트 루트에 생성하고 다음 내용을 입력하세요:

```env
AIRTABLE_ACCESS_TOKEN=your_personal_access_token_here
AIRTABLE_BASE_ID=your_base_id_here
AIRTABLE_USER_TABLE_ID=프리미엄 협찬 신청 인플루언서
AIRTABLE_CAMPAIGN_TABLE_ID=캠지기 모집 폼

NEXTAUTH_SECRET=your_random_secret_here_please_change_this
NEXTAUTH_URL=http://localhost:3000
```

### 3. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📦 Airtable 스키마

### 유저 테이블: `프리미엄 협찬 신청 인플루언서`
- `크리에이터 채널명` (Linked Record)
- `생년월일` (Date) - YYYY-MM-DD
- `연락처` (Phone)
- `등급화` (Lookup) - '3', '2', '1'

### 상품 테이블: `캠지기 모집 폼`
**공통 필드:**
- `숙소 이름을 적어주세요.`
- `숙소 위치`
- `콘텐츠 제작 기한`
- `숙소 특장점`
- `숙소 링크`
- `신청 링크`

**등급별 필드:**
- Tier 3: `⭐️ 협찬 제안 금액`, `⭐️ 모집 희망 인원`, `⭐️ 신청 가능 인원`
- Tier 2: `✔️ 협찬 제안 금액`, `✔️ 모집 인원`, `✔️ 신청 가능 인원`
- Tier 1: `🔥 협찬 제안 금액`, `🔥 모집 인원`, `🔥 신청 가능 인원`

## 🎨 디자인 가이드

### 브랜드 컬러
- Primary: `#01DF82` (네온 그린)
- Background: `#111111` (다크)
- Text: `#FFFFFF` (화이트)
- Secondary Text: `#B0B0B0` (회색)

### 모바일 퍼스트 원칙
- 터치 타겟 최소 **48px**
- 입력창 폰트 최소 **16px** (iOS 줌 방지)
- 1열 레이아웃 기본, 태블릿부터 2~3열 확장

## 📁 프로젝트 구조

```
influencer-portal/
├── app/
│   ├── login/page.tsx          # 로그인 페이지
│   ├── dashboard/page.tsx      # 대시보드
│   ├── api/
│   │   ├── auth/login/route.ts # 로그인 API
│   │   ├── campaigns/route.ts  # 캠페인 목록 API
│   │   └── channels/route.ts   # 채널명 목록 API
│   └── globals.css             # 글로벌 스타일
├── components/
│   └── CampaignCard.tsx        # 캠페인 카드 컴포넌트
├── lib/
│   └── airtable.ts             # Airtable 클라이언트
├── types/
│   └── index.ts                # 타입 정의
└── middleware.ts               # 인증 미들웨어
```

## 🚢 Vercel 배포

### 자동 배포 (권장)
1. GitHub 저장소에 코드 push
2. [Vercel](https://vercel.com)에 로그인
3. "New Project" → GitHub 저장소 연결
4. 환경 변수 입력 (`.env.local` 내용)
5. Deploy 클릭

### 수동 배포
```bash
npm install -g vercel
vercel
```

## 🔒 보안 고려사항

- ✅ API 키는 서버 사이드에서만 사용
- ✅ JWT 토큰은 HttpOnly 쿠키에 저장
- ✅ 미들웨어를 통한 라우트 보호
- ✅ 입력 검증 및 에러 처리

## 📞 문의

프로젝트 관련 문의사항은 캠핏 운영팀에 연락주세요.

## 📄 라이선스

이 프로젝트는 캠핏 전용 인플루언서 포털입니다.
