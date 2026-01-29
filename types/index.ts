// 등급 상수 정의
export const TIER = {
  ICON: 'Icon',      // Tier 3
  PARTNER: 'Partner', // Tier 2
  RISING: 'Rising'    // Tier 1
} as const;

export type TierType = typeof TIER[keyof typeof TIER];
export type TierLevel = '3' | '2' | '1';

// 인플루언서 타입
export interface Influencer {
  id: string;
  channelName: string;
  birthDate: string;    // YYYY-MM-DD 형식
  phone: string;        // 전화번호 전체
  tier: TierLevel;      // Airtable Lookup 값
}

// 캠페인 공통 필드
export interface CampaignBase {
  id: string;
  accommodationName: string;     // 숙소 이름
  location: string;              // 숙소 위치
  deadline: string;              // 콘텐츠 제작 기한
  detailUrl: string;             // 캠핏 상세페이지 링크
  applicationUrl: string;         // 신청 링크
}

// 등급별 필드 데이터
export interface CampaignTierData {
  price: number;           // 협찬 제안 금액
  totalCount: number;      // 모집 희망 인원
  availableCount: number;  // 신청 가능 인원
}

// 렌더링용 통합 타입
export interface Campaign extends CampaignBase {
  tierData: CampaignTierData;
  isClosed: boolean;  // 마감 여부
}

// Airtable 원시 레코드 타입
export interface AirtableUserRecord {
  id: string;
  fields: {
    '크리에이터 채널명': string | string[];  // Primary Field or Linked Record
    '생년월일': string;              // Date
    '연락처': string;                // Phone
    '등급화 (from 크리에이터 채널명 (크리에이터 명단))': string | string[];  // Lookup
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
    '유료 오퍼 신청 인플루언서'?: string[]; // Linked Record

    // Tier 3 (Icon) 필드
    '⭐️ 협찬 제안 금액'?: number;
    '⭐️ 모집 희망 인원'?: number;
    '⭐️ 신청 가능 인원'?: number;

    // Tier 2 (Partner) 필드
    '✔️ 협찬 제안 금액'?: number;
    '✔️ 모집 인원'?: number;
    '✔️ 신청 가능 인원'?: number;

    // Tier 1 (Rising) 필드
    '🔥 협찬 제안 금액'?: number;
    '🔥 모집 인원'?: number;
    '🔥 신청 가능 인원'?: number;
  };
}

export interface AirtableApplicationRecord {
  id: string;
  fields: {
    '크리에이터 채널명': string;
    '크리에이터 채널명(프리미엄 협찬 신청)': string[]; // Linked Record
    '이메일': string;
    '숙소 이름 (유료 오퍼)': string[]; // Linked Record
  };
}
