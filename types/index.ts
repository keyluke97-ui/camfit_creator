export type TierLevel = '1' | '2' | '3'; // 1: Rising, 2: Partner, 3: Icon

export interface Influencer {
  id: string;
  channelName: string;
  birthDate: string;
  phone: string;
  tier: TierLevel;
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
