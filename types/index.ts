export type TierLevel = '1' | '2' | '3'; // 1: Rising, 2: Partner, 3: Icon

export type ChannelType = '인스타' | '블로그' | '유튜브';

// CHANGED: 로그인 소스를 크리에이터 명단 테이블로 전환 — creatorId/premiumId 분리
export interface Influencer {
  creatorId: string;
  channelName: string;
  tier: TierLevel;
  channelTypes: ChannelType[];
  premiumId: string | null; // 프리미엄 협찬 신청 테이블 record ID (미등록이면 null)
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
  };
}

export interface CampaignTierData {
  price: number;
  totalCount: number;
  availableCount: number;
}

export interface Campaign {
  id: string;
  accommodationName: string;
  location: string;
  deadline: string;
  detailUrl: string;
  applicationUrl: string;
  tierData: CampaignTierData;
  isClosed: boolean;
  siteTypes?: string[]; // CHANGED: 제공 가능한 사이트 종류 추가
  highlights?: string; // CHANGED: 숙소의 특장점 필드 추가
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
}

// ──────────────────────────────────────────────
// 파트너 협찬 전용 타입
// ──────────────────────────────────────────────

export type PartnerRecruitmentStatus = '오픈전' | '모집중' | '마감';
export type PartnerStayType = '평일전용' | '평일+주말(금토)' | '평일+주말+공휴일';

export interface PartnerCampaign {
  id: string;
  accommodationName: string;
  packageType: string;
  stayType: PartnerStayType;
  weekdayDiscount: number;
  weekendDiscount: number;
  holidayCouponApplied: boolean;
  accommodationDescription: string;
  recruitmentStatus: PartnerRecruitmentStatus;
  availableCount: number;
  followerCouponCount: number;
  creatorCouponCode: string;
  followerCouponCode: string;
  visitStartDate: string;
  visitEndDate: string;
  couponStartDate: string;
  couponEndDate: string;
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

export interface AirtablePartnerCampaignRecord {
  id: string;
  fields: {
    '캠핑장명': string;
    '패키지 유형': string;
    '숙박 타입': string;
    '평일 할인 금액': number;
    '주말 할인 금액': number;
    '공휴일 쿠폰 적용'?: boolean;
    '숙소 소개': string;
    '모집 상태': string;
    '신청가능인원': number;
    '팔로워쿠폰수': number;
    '크리에이터 쿠폰 코드'?: string;
    '팔로워 쿠폰 코드'?: string;
    '파트너 신청'?: string[];
    '크리에이터 방문 가능 시작일': string;
    '크리에이터 방문 가능 종료일': string;
    '쿠폰 유효 시작일': string;
    '쿠폰 유효 종료일': string;
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
    // CHANGED: Lookup 필드명을 실제 Airtable 필드명과 일치시킴
    '크리에이터 쿠폰 코드 (from 캠페인)'?: string[];
    '팔로워 쿠폰 코드 (from 캠페인)'?: string[];
    '방문 가능 시작일 (from 캠페인)'?: string[];
    '방문 가능 종료일 (from 캠페인)'?: string[];
    '쿠폰 유효 시작일 (from 캠페인)'?: string[];
    '쿠폰 유효 종료일 (from 캠페인)'?: string[];
  };
}
