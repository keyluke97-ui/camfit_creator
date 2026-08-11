export type TierLevel = '1' | '2' | '3'; // 1: Rising, 2: Partner, 3: Icon

export type ChannelType = '인스타' | '블로그' | '유튜브';

// CHANGED: 로그인 소스를 크리에이터 명단 테이블로 전환 — creatorId/premiumId 분리
export interface Influencer {
  creatorId: string;
  channelName: string;
  tier: TierLevel;
  channelTypes: ChannelType[];
  premiumId: string | null; // 프리미엄 협찬 신청 테이블 record ID (미등록이면 null)
  notificationEnabled: boolean; // CHANGED: 캠페인 알림 상태 추가
}

// CHANGED: 크리에이터 명단 테이블(tblkuPln7nquA3dLA) Airtable 레코드 타입
export interface AirtableCreatorRecord {
  id: string;
  fields: {
    '크리에이터 채널명': string;
    '연락처': string;
    '채널 종류': string[];
    '등급화': number; // rating 1~3
    '휴먼 상태 '?: boolean; // CHANGED: Airtable 필드명 끝에 공백 포함
    '프리미엄 협찬 신청 인플루언서'?: string[]; // multipleRecordLinks → tblDOC7jcmeuQzNJY
    '캠페인 알림'?: boolean; // CHANGED: 캠페인 알림 토글 필드 추가
  };
}

export interface CampaignTierData {
  price: number;
  totalCount: number;
  availableCount: number;
}

// CHANGED: 쿠폰 적용 요일 정식 타입 — 프리미엄·파트너 통합으로 PartnerStayType는 이 타입의 별칭
export type CouponApplyDays = '평일전용' | '평일+주말(금토)' | '평일+주말+공휴일';

// CHANGED: 프리미엄·파트너 통합 — 프리미엄 캠페인이 쿠폰 이벤트를 함께 진행할 때의 조건 블록.
// 쿠폰이벤트희망=true인 캠페인에만 존재. (브리프 2026-05 통합)
export interface CouponEvent {
  discount: number;              // 할인 금액 (1장당, 원)
  couponApplyDays: CouponApplyDays;
  couponPerCreator: number;      // 인당 팔로워 쿠폰
  totalFollowerCoupon: number;   // 총 팔로워 쿠폰 수 (Formula)
  visitStartDate: string;        // 크리에이터 방문 가능 시작일
  visitEndDate: string;          // 크리에이터 방문 가능 종료일
  couponStartDate: string;       // 쿠폰 유효 시작일
  couponEndDate: string;         // 쿠폰 유효 종료일
  // CHANGED: 팔로워 쿠폰 사용 박수 조건 — 발행된 쿠폰의 minBookingDays/maxBookingDays와 동일.
  //          미설정(0/누락)이면 undefined → 메시지에 미노출. 1박 예약엔 할인 미적용 문의 방지용.
  minBookingNights?: number;     // 사용가능 최소 예약 박수
  maxBookingNights?: number;     // 사용가능 최대 예약 박수
}

// CHANGED: 캠페인 목록 정렬 키 — 대시보드 정렬 메뉴와 sortCampaigns()가 공유
export type CampaignSortKey = 'recent' | 'priceDesc' | 'availableDesc' | 'deadlineAsc';

export interface Campaign {
  id: string;
  accommodationName: string;
  location: string;
  deadline: string;
  // CHANGED: D-day 계산용 date 필드. deadline(문자열)은 표시 전용이라 비교가 불가능하다.
  deadlineDate?: string;
  createdTime: string; // CHANGED: Airtable 'Created' 필드 — 최신등록순 정렬용 (ISO 문자열)
  detailUrl: string;
  applicationUrl: string;
  tierData: CampaignTierData;
  isClosed: boolean;
  siteTypes?: string[]; // CHANGED: 제공 가능한 사이트 종류 추가
  highlights?: string; // CHANGED: 숙소의 특장점 필드 추가
  hostInstagram?: string; // CHANGED: 캠지기 인스타그램 계정 필드 추가
  couponEvent?: CouponEvent; // CHANGED: 통합 — 쿠폰이벤트희망=true이면 채워짐. "팔로워 쿠폰 협찬" 뱃지 트리거.
}

export interface AirtableUserRecord {
  id: string;
  fields: {
    '크리에이터 채널명': string | string[];
    '크리에이터 채널명 (크리에이터 명단)': string | string[]; // CHANGED: Link to Another Record 필드 추가
    '생년월일': string;
    '연락처': string;
    '등급화 (from 크리에이터 채널명 (크리에이터 명단))': TierLevel | TierLevel[];
    '채널 종류 (from 크리에이터 채널명 (크리에이터 명단))'?: string[] | string[][]; // CHANGED: 파트너 접근 제어용 Lookup 필드 추가
  };
}

export interface AirtableCampaignRecord {
  id: string;
  fields: {
    '숙소 이름을 적어주세요.': string;
    '숙소 위치': string;
    '⏰ 콘텐츠 제작 기한': string;
    // CHANGED: 같은 수식의 date 타입 쌍둥이 필드(fldMp3ZWeMq9Xnnpv). 문자열 필드는 날짜 비교가 안 된다.
    '콘텐츠 제작 기한 (날짜)'?: string;
    'Created'?: string; // CHANGED: 레코드 생성 시각(ISO) — 최신등록순 정렬용
    '숙소 링크 (캠핏 내 상세페이지만 삽입 가능)': string;
    '신청 링크': string;
    '쿠폰코드'?: string;
    '유료 오퍼 신청 인플루언서'?: string[];

    // Tier 3
    '⭐️ 협찬 제안 금액'?: number;
    '⭐️ 모집 희망 인원'?: number;
    '⭐️ 신청 가능 인원'?: number;

    // Tier 2
    '✔️ 협찬 제안 금액'?: number;
    '✔️ 모집 인원'?: number;
    '✔️ 신청 가능 인원'?: number;

    // Tier 1
    '🔥 협찬 제안 금액'?: number;
    '🔥 모집 인원'?: number;
    '🔥 신청 가능 인원'?: number;

    // CHANGED: 사이트 종류 Multiple Select 필드 추가
    '제공 가능한 사이트 종류'?: string[];
    // CHANGED: 숙소의 특장점 Long Text 필드 추가
    '숙소의 특장점'?: string;
    // CHANGED: 캠지기 인스타그램 계정 필드 추가
    '캠지기인스타그램'?: string;

    // CHANGED: 통합 — 쿠폰 이벤트 필드 (캠지기 모집 폼에 직접 적재). 쿠폰이벤트희망=true일 때 의미.
    '쿠폰이벤트희망'?: boolean;
    '할인 금액'?: number;
    '인당 팔로워 쿠폰'?: number;
    '쿠폰 적용 요일'?: string;
    '총 팔로워 쿠폰 수'?: number;
    '크리에이터 방문 가능 시작일'?: string;
    '크리에이터 방문 가능 종료일'?: string;
    '쿠폰 유효 시작일'?: string;
    '쿠폰 유효 종료일'?: string;
    // CHANGED: 팔로워 쿠폰 사용 박수 조건 (발행 쿠폰 minBookingDays/maxBookingDays 소스)
    '사용가능 최소 예약 박수'?: number;
    '사용가능 최대 예약 박수'?: number;
    // CHANGED: 통합 분배 — 어드민 자동 발행이 N줄로 채우는 풀(applyCampaign 신청 시 첫 줄 슬라이싱)
    '팔로워 쿠폰 코드'?: string;
    // CHANGED: 분배된 코드 이력 누적 (Long text, race 검증 소스)
    '배포 완료된 쿠폰'?: string;
  };
}

export interface AirtableApplicationRecord {
  id: string;
  fields: {
    '크리에이터 채널명': string;
    '크리에이터 채널명(프리미엄 협찬 신청)': string[]; // Linked Record
    '이메일': string;
    '숙소 이름 (유료 오퍼)': string[]; // Linked Record
    '입실일'?: string;
    '입실 사이트'?: string;
    'Status'?: string;
    '예약 취소/변경'?: string; // New
    '입금내역 확인'?: boolean; // New
    // CHANGED: 통합 — 신청 시 분배된 본인 팔로워 쿠폰 코드 (자체 single line, lookup 아님)
    '팔로워 쿠폰 코드'?: string;
  };
}

// Frontend Application Type
export interface Application {
  id: string; // Record ID
  campaignId: string;
  accommodationName: string;
  checkInDate: string;
  checkInSite: string;
  status: string;
  couponCode?: string;     // New
  reservationStatus?: string; // New
  isDepositConfirmed?: boolean; // New
  detailUrl?: string; // CHANGED: 협찬 조건 복사용 숙소 링크
  highlights?: string; // CHANGED: 협찬 조건 복사용 캠지기 포인트
  deadline?: string; // CHANGED: 제작 기한
  deadlineDate?: string; // CHANGED: D-day 계산용 date 필드
  followerCouponCode?: string; // CHANGED: 통합 — 신청 시 분배된 본인 팔로워 쿠폰 코드 (couponEvent 캠페인만)
  couponEvent?: CouponEvent; // CHANGED: 통합 — 신청 내역 화면에서 쿠폰 조건 재확인용 (enrich 단계에서 캠페인 조인)
}

// ──────────────────────────────────────────────
// 파트너 협찬 전용 타입
// ──────────────────────────────────────────────

export type PartnerRecruitmentStatus = '오픈전' | '모집중' | '마감';
// v3: '쿠폰 적용 요일' 필드 옵션 — CHANGED: 통합으로 CouponApplyDays의 별칭 (레거시 호환)
export type PartnerStayType = CouponApplyDays;

export interface PartnerCampaign {
  id: string;
  accommodationName: string;
  location: string;
  couponApplyDays: PartnerStayType; // v3: 숙박 타입 → 쿠폰 적용 요일
  discount: number;                 // v3: 단일 할인 금액
  accommodationDescription: string;
  recruitmentStatus: PartnerRecruitmentStatus;

  // v3: 등급별 모집 & 잔여
  iconRecruitCount: number;
  partnerRecruitCount: number;
  risingRecruitCount: number;
  iconAvailable: number;
  partnerAvailable: number;
  risingAvailable: number;

  // v3: 쿠폰
  couponPerCreator: number;         // 인당 팔로워 쿠폰 (10/20/30)
  totalFollowerCoupon: number;      // Formula: 등급별 모집 희망 인원 × 인당 팔로워 쿠폰

  creatorCouponCode: string;
  // CHANGED: 캠페인 풀 전체 노출 차단 — 신청 안 한 사람도 N개 코드를 받게 되는 보안 이슈 방지.
  // 캠페인 단계에서는 항상 빈 string. 신청자 본인 코드는 PartnerApplication.followerCouponCode 사용.
  followerCouponCode: string;
  visitStartDate: string;
  visitEndDate: string;
  couponStartDate: string;
  couponEndDate: string;
  camfitLink: string;
  siteTypes: string[];
  creatorStayNights: number;
  isClosed: boolean;
}

export interface PartnerApplication {
  id: string;
  campaignId: string;
  accommodationName: string;
  checkInDate: string;
  checkInSite: string;
  applicationStatus: string;
  reservationStatus: string;
  creatorCouponCode: string;
  followerCouponCode: string;
  visitStartDate: string;
  visitEndDate: string;
  couponStartDate: string;
  couponEndDate: string;

  // v3: 캠페인 상세 조인 (enrichPartnerApplications에서 채워짐)
  discount: number;
  couponApplyDays: string;
  siteTypes: string[];
  accommodationDescription: string;
  couponPerCreator: number;
  totalFollowerCoupon: number;
  creatorStayNights: number;
}

// ──────────────────────────────────────────────
// 프리미엄 협찬 신청 폼 타입
// ──────────────────────────────────────────────

/** 은행 singleSelect 옵션 — Airtable 실제 값과 정확히 일치해야 함 */
export type BankOption =
  | '국민은행' | '신한은행' | '우리은행' | '농협' | '하나은행'
  | '카카오뱅크' | '토스뱅크' | '기업은행' | 'sc제일은행' | '기타(직접입력)';

/** 개인/사업자 singleSelect 옵션 */
export type BusinessType = '개인' | '사업자';

/** 프리미엄 협찬 신청 폼 데이터 (크리에이터 입력) */
export interface PremiumRegisterFormData {
  name: string;
  birthDate: string;           // YYYY-MM-DD
  phone: string;
  bank: BankOption | '';
  customBank: string;          // 은행 = '기타(직접입력)' 시
  accountHolder: string;
  accountNumber: string;
  residentNumber: string;
  address: string;
  businessType: BusinessType | '';
  taxEmail: string;            // 사업자 선택 시
  businessNumber: string;      // 사업자 선택 시
  consentPrivacy: boolean;
  consentContent: boolean;
  consentPayment: boolean;     // CHANGED: 원천징수 동의(consentTax) 제거 — 지급 조건 동의에 통합
}

/** API 요청 시 JWT 자동 설정 필드 포함 */
export interface PremiumRegisterPayload extends PremiumRegisterFormData {
  creatorId: string;
  channelName: string;
}

// ──────────────────────────────────────────────
// 콘텐츠 업로드 타입
// ──────────────────────────────────────────────

// CHANGED: 콘텐츠 전달 탭 — 협찬 종류 (캠핑 용품 제외)
export type SponsorshipType = '캠핑장 예약' | '프리미엄 협찬';

// CHANGED: 콘텐츠 제출 요청 페이로드
export interface ContentSubmitPayload {
    creatorListRecordId: string;          // 크리에이터 명단 linked record (로그인 자동)
    sponsorshipType: SponsorshipType;
    uploadDate: string;
    contentLink: string;
    // CHANGED: 콘텐츠2/3/4 다중 채널 링크 — 인덱스 순서대로 콘텐츠2/3/4에 매핑, 빈 값 제외, 최대 3
    additionalContentLinks?: string[];
    // 숙소 협찬 (캠핑장 예약)
    accommodationRecordId?: string;       // 캠핑장목록 linked record
    camfitLoungeUrl?: string;             // 캠핏 라운지 콘텐츠 업로드 URL
    officialCollabRequest?: boolean;      // 캠핏 오피셜 공동작업 요청
    // 프리미엄 협찬
    premiumCampaignRecordId?: string;     // 캠지기 모집 폼 linked record
    premiumRegistrationRecordId?: string; // 프리미엄 협찬 신청 인플루언서 linked record (premiumId 자동)
    // CHANGED: 채널명 + 제출 경로 필드 추가
    channelName?: string;                 // 인플루언서 컨텐츠 업로드 프라이머리 필드(채널명) 채우기
    submissionSource?: string;            // 제출 경로 표시 (포털: "크리에이터 포털 통해서 진행")
}

// CHANGED: 콘텐츠 업로드 조회 도메인 타입
export interface ContentUpload {
    id: string;
    channelName: string;                  // 크리에이터 채널명 (lookup)
    sponsorshipType: string;
    uploadDate: string;
    contentLink: string;
    // CHANGED: 콘텐츠2/3/4 다중 채널 링크 (조회 시 non-empty만)
    additionalContentLinks?: string[];
    accommodationName?: string;
    camfitLoungeUrl?: string;
    officialCollabRequest?: boolean;
    premiumCampaignName?: string;
    createdAt: string;
}

export interface AirtablePartnerCampaignRecord {
  id: string;
  fields: {
    '캠핑장명': string;
    '할인 금액': number;
    '쿠폰 적용 요일': string;
    '숙소 소개': string;
    '모집 상태': string;

    // v3 등급별 6필드 (쿠폰 수량은 어드민 자동 발행 도입으로 삭제됨)
    '⭐️ 모집 희망 인원'?: number;
    '✔️ 모집 희망 인원'?: number;
    '🔥 모집 희망 인원'?: number;
    '⭐️ 신청 가능 인원'?: number;
    '✔️ 신청 가능 인원'?: number;
    '🔥 신청 가능 인원'?: number;

    // v3 쿠폰
    '인당 팔로워 쿠폰'?: number;
    '총 팔로워 쿠폰 수'?: number;

    '크리에이터 쿠폰 코드'?: string;
    // CHANGED: 어드민 자동 발행이 N줄로 채우는 풀. 신청 시 첫 줄을 슬라이싱해 분배.
    '팔로워 쿠폰 코드'?: string;
    // CHANGED: 분배된 코드 이력 누적 (Long text)
    '배포 완료된 쿠폰'?: string;
    '파트너 신청'?: string[];
    '크리에이터 방문 가능 시작일': string;
    '크리에이터 방문 가능 종료일': string;
    '쿠폰 유효 시작일': string;
    '쿠폰 유효 종료일': string;
    '소재 권역'?: string;
    '캠핏링크'?: string;
    '제공 가능한 사이트 종류'?: string[];
    '숙박박수(크리에이터 사이드)'?: number;
  };
}

export interface AirtablePartnerApplicationRecord {
  id: string;
  fields: {
    '크리에이터': string[];
    '캠페인': string[];
    '신청 상태'?: string;
    '입실일'?: string;
    '입실 사이트'?: string;
    '예약 취소/변경'?: string;
    '정책 확인 동의'?: boolean;
    '크리에이터 채널명'?: string[];
    // CHANGED: Lookup 필드 — 파트너 신청 테이블의 실제 필드명
    '크리에이터 채널명 (from 크리에이터)'?: string[];
    '채널 종류'?: string[];
    '등급'?: string[];
    // CHANGED: 신청 시 분배되는 본인 팔로워 쿠폰 코드 (자체 single line text — 캠페인 lookup이 아님)
    '팔로워 쿠폰 코드'?: string;
    // CHANGED: Lookup 필드명을 실제 Airtable 필드명과 일치시킴
    '크리에이터 쿠폰 코드 (from 캠페인)'?: string[];
    '방문 가능 시작일 (from 캠페인)'?: string[];
    '방문 가능 종료일 (from 캠페인)'?: string[];
    '쿠폰 유효 시작일 (from 캠페인)'?: string[];
    '쿠폰 유효 종료일 (from 캠페인)'?: string[];
    // v3: 신규 Lookup 필드
    '할인 금액 (from 캠페인)'?: number[];
    '쿠폰 적용 요일 (from 캠페인)'?: string[];
    '인당 팔로워 쿠폰 (from 캠페인)'?: number[];
    '총 팔로워 쿠폰 수 (from 캠페인)'?: number[];
  };
}

// ──────────────────────────────────────────────
// 지명형 협찬 1a — 크리에이터 포트폴리오 / 수락 조건 / 원정 / 정산 (SDD v4 A′)
// 스펙: specs/2026-07-16-지명형협찬-1a-*.md
// ──────────────────────────────────────────────

/** 정산정보 요약(마스킹 — 유저 테이블 READ only) */
export interface SettlementSummary {
  registered: boolean;      // premiumId 존재 여부
  bank: string;             // 은행 (없으면 '')
  accountLast4: string;     // 계좌번호 뒤 4자리
  accountHolder: string;    // 예금주
  // CHANGED: 원정 §6.4 — 정산 주소에서 파싱한 기준 지역 후보. baseRegion 미설정 시 프리필용. 못 뽑으면 ''
  baseRegionPrefill: string;
}

/** 운영 채널 키 — lib/constants.ts CHANNEL_TYPES와 대응 */
export type ChannelKey = '유튜브' | '인스타' | '블로그';

/** 프로필 심사 상태. ''는 아직 공개 신청을 안 한 상태 (1a-v2 §4) */
export type ReviewStatus = '' | '심사대기' | '승인' | '반려';

/**
 * 채널 하나의 자기신고 정보.
 * follower/engagement는 0이면 미입력, blogIndex는 ''이면 미입력.
 * blogIndex는 블로그에만, engagement는 유튜브·인스타에만 쓴다(CHANNEL_FIELD_MAP 참조).
 */
export interface ChannelDetail {
  url: string;
  follower: number;
  engagement: number;
  blogIndex: string;
  strength: string;
}

/** 편집 화면이 읽어오는 크리에이터 프로필 전체 상태 (getCreatorProfile 반환) */
export interface CreatorProfile {
  // 포트폴리오
  profileImageUrl: string;   // 첫 첨부의 (만료성) URL. 없으면 ''
  hasProfileImage: boolean;
  representativeLink: string; // 대표 콘텐츠 링크
  // 협찬 수락 조건
  minSponsorAmount: number;   // 협찬 희망 금액 (= 최소 단가/기본가). 미설정 0
  visitRegions: string[];     // 방문 가능 지역 (기본가)
  visitDays: string[];        // 방문 가능 요일
  acceptSiteTypes: string[];  // 수용 사이트 종류
  // 원정 인센티브 (§6.4)
  baseRegion: string;         // 기준 지역 (거주). 미설정 ''
  wonjeongRegions: string[];  // 원정 가능 지역 (+유류비 10만)
  // 공개 (CHANGED: 1a-v2 D1 — autoAcceptActive 제거. 무응답 자동확정이 이미 전원 기본값이라 토글이 불필요)
  isPublic: boolean;          // 프로필 공개 (가시성)
  // CHANGED: 1a-v2 — 채널 포트폴리오
  channelTypes: string[];                   // 운영 채널 (크리에이터 편집 가능으로 승격)
  representativeChannel: string;            // 대표 채널. 미설정 ''
  channels: Record<string, ChannelDetail>;  // 키 = ChannelKey. 3채널 모두 채워서 반환
  representativeLink2: string;
  representativeLink3: string;
  contentFormats: string[];                 // 제작 콘텐츠 형식
  contentStandard: string;                  // 콘텐츠 제작 기준 (자유 서술)
  creatorEmail: string;
  // CHANGED: 1a-v2 §4 — 심사 (서버 전용. 크리에이터 payload로 바꿀 수 없다)
  reviewStatus: ReviewStatus;
  reviewRejectReason: string;
  // 표시 전용 (운영자 관리, 편집 불가)
  channelName: string;
  tier: TierLevel;            // 등급화 1~3
  followerRange: string;      // 팔로워 구간
  // 정산 요약 (마스킹)
  settlement: SettlementSummary;
}

/**
 * 저장 페이로드 (편집 가능 필드만 — PATCH body).
 * ⚠️ 심사 필드(reviewStatus·reviewRejectReason)는 의도적으로 없다.
 *    크리에이터가 자기 프로필을 스스로 '승인'으로 바꿀 수 없어야 한다(1a-v2 §6-9).
 */
export interface CreatorProfileUpdate {
  representativeLink: string;
  minSponsorAmount: number;
  visitRegions: string[];
  visitDays: string[];
  acceptSiteTypes: string[];
  baseRegion: string;
  wonjeongRegions: string[];
  isPublic: boolean;
  // CHANGED: 1a-v2 — 채널 포트폴리오·콘텐츠
  channelTypes: string[];
  representativeChannel: string;
  channels: Record<string, ChannelDetail>;
  representativeLink2: string;
  representativeLink3: string;
  contentFormats: string[];
  contentStandard: string;
  creatorEmail: string;
}
