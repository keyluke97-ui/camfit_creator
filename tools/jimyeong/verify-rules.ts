// tools/jimyeong/verify-rules.ts
// 지명형 1a-v2 순수 판정 로직 재현 검증. 이 레포엔 테스트 러너가 없어 node로 직접 돌린다.
// 실행: npx tsx tools/jimyeong/verify-rules.ts
// 스펙: specs/2026-08-11-지명형협찬-1a-v2-포트폴리오-재설계.md §6

import {
    validateChannelPayload, collectMissingForPublish, needsReReview, isValidEmail,
    isFormatAvailable, pruneContentFormats, normalizeUploadDeadline, isAllowedUploadDeadline,
    VIOLATION_MESSAGES, violationMessage, matchesEmailPrefix, requiresEmailPrefix,
    parseBaseRegionFromAddress, validateWonjeongSelection, pruneWonjeongRegions, wonjeongMessage,
    WONJEONG_MESSAGES,
} from '../../lib/creatorProfileRules';
import { buildDeliverableSummary, buildVisitConditionSummary, withRo } from '../../lib/sponsorshipTerms';
import {
    deadlineMs, remainingMs, canRespond, formatRemaining, validateOfferResponse,
    OFFER_ERROR_MESSAGES, offerErrorMessage,
} from '../../lib/offerRules';
import { unseenIds } from '../../lib/offerSeen';
import { VISIT_REGIONS, getWonjeongCandidates } from '../../lib/constants';
import type { CreatorProfileUpdate } from '../../types';
import { resolveApplyTrack, resolveOfferTrack } from '../../lib/sponsorshipTrackRules';

let pass = 0;
let fail = 0;

function check(name: string, actual: unknown, expected: unknown) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) {
        pass++;
    } else {
        fail++;
        console.log(`FAIL ${name}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
    }
}

const base: CreatorProfileUpdate = {
    representativeLink: 'https://a',
    minSponsorAmount: 400000,
    visitRegions: ['강원도'],
    visitDays: ['월'],
    acceptSiteTypes: ['오토캠핑'],
    wonjeongRegions: [],
    isPublic: false,
    channelTypes: ['유튜브'],
    representativeChannel: '유튜브',
    channels: { '유튜브': { url: 'https://y', follower: 1000, engagement: 500, blogIndex: '', strength: '' } },
    representativeLink2: '',
    representativeLink3: '',
    contentFormats: ['유튜브 롱폼'],
    contentStandard: '',
    creatorEmail: 'a@b.com',
    uploadDeadlineDays: null,
    companions: 2,
    petAllowed: false,
    droneUsed: false,
    channelConcepts: ['캠핑'],
};

// ── validateChannelPayload ──
check('채널 0개', validateChannelPayload({ ...base, channelTypes: [] }), 'CHANNEL_REQUIRED');
check('알 수 없는 채널', validateChannelPayload({ ...base, channelTypes: ['틱톡'] }), 'CHANNEL_UNKNOWN');
check('대표채널 미보유', validateChannelPayload({ ...base, representativeChannel: '블로그' }), 'REPRESENTATIVE_NOT_OWNED');
check('형식 채널 불일치', validateChannelPayload({ ...base, contentFormats: ['블로그 포스팅'] }), 'FORMAT_CHANNEL_MISMATCH');
check('알 수 없는 형식', validateChannelPayload({ ...base, contentFormats: ['틱톡 영상'] }), 'FORMAT_UNKNOWN');
check('이메일 형식', validateChannelPayload({ ...base, creatorEmail: 'notanemail' }), 'EMAIL_INVALID');
check('음수 지표', validateChannelPayload({
    ...base, channels: { '유튜브': { url: 'https://y', follower: -1, engagement: 0, blogIndex: '', strength: '' } },
}), 'METRIC_INVALID');
check('정상 payload', validateChannelPayload(base), null);

// ── collectMissingForPublish ──
check('유튜브 URL 누락', collectMissingForPublish({
    ...base, channels: { '유튜브': { url: '', follower: 0, engagement: 0, blogIndex: '', strength: '' } },
}, true, true), ['유튜브 채널 주소']);
check('전부 충족', collectMissingForPublish(base, true, true), []);
check('이미지·정산 누락', collectMissingForPublish(base, false, false), ['프로필 이미지', '정산 정보']);
check('신규 3종 누락', collectMissingForPublish({
    ...base, representativeChannel: '', contentFormats: [], creatorEmail: '',
}, true, true), ['대표 채널', '제작 콘텐츠 형식', '이메일']);

// ── needsReReview ──
const before = {
    channelTypes: ['유튜브'],
    representativeChannel: '유튜브',
    channels: { '유튜브': { url: 'https://y', follower: 1000, engagement: 500, blogIndex: '', strength: '' } },
    representativeLink: 'https://a',
    representativeLink2: '',
    representativeLink3: '',
};
check('지표 변경 → 재검토', needsReReview(before, {
    ...base, channels: { '유튜브': { ...base.channels['유튜브'], follower: 99999 } },
}), true);
check('금액만 변경 → 재검토 없음', needsReReview(before, { ...base, minSponsorAmount: 500000 }), false);
check('지역만 변경 → 재검토 없음', needsReReview(before, { ...base, visitRegions: ['강원도', '충청남도'] }), false);
check('콘텐츠 형식만 변경 → 재검토 없음', needsReReview(before, { ...base, contentFormats: ['유튜브 롱폼', '유튜브 쇼츠'] }), false);
check('채널 추가 → 재검토', needsReReview(before, { ...base, channelTypes: ['유튜브', '블로그'] }), true);
check('대표 콘텐츠 링크 변경 → 재검토', needsReReview(before, { ...base, representativeLink: 'https://z' }), true);
check('채널 강점 변경 → 재검토', needsReReview(before, {
    ...base, channels: { '유튜브': { ...base.channels['유튜브'], strength: '가족 캠핑 위주' } },
}), true);

// ── 동반 인원은 공개 게이트가 아니다 (2026-08-25 E3 폐기) ──
// 크리에이터가 쿠폰으로 직접 예약하므로 캠지기가 인원에 맞춰 잡아둘 일이 없고,
// 방문마다 인원이 달라진다. 못박아 받으면 틀린 숫자가 캠지기 카드에 사실처럼 뜬다.
check(
    '인원 미입력이어도 공개 가능',
    collectMissingForPublish({ ...base, companions: 0 }, true, true),
    []
);
check('인원 입력해도 누락 없음', collectMissingForPublish({ ...base, companions: 2 }, true, true), []);
// 업로드 기한·반려동물·드론은 표준이 있으므로 게이트에 없어야 한다
check(
    '기한 미입력은 공개를 막지 않는다',
    collectMissingForPublish({ ...base, uploadDeadlineDays: null }, true, true),
    []
);

// ── 신규 5필드는 재검토 트리거가 아니다 (스펙 E7) ──
// 콘셉트 변경으로 재검토 큐를 채우면 진짜 지표 변경이 그 안에 묻힌다.
check(
    '콘셉트만 변경 → 재검토 없음',
    needsReReview(before, { ...base, channelConcepts: ['낚시', '백패킹'] }),
    false
);
check(
    '현장 조건만 변경 → 재검토 없음',
    needsReReview(before, { ...base, companions: 6, petAllowed: true, droneUsed: true }),
    false
);
check(
    '업로드 기한만 변경 → 재검토 없음',
    needsReReview(before, { ...base, uploadDeadlineDays: 30 }),
    false
);

// ── isFormatAvailable / pruneContentFormats (폼 필터 = 서버 규칙 4) ──
check('형식 노출 — 보유 채널', isFormatAvailable('유튜브 롱폼', ['유튜브']), true);
check('형식 미노출 — 미보유 채널', isFormatAvailable('블로그 포스팅', ['유튜브', '인스타']), false);
check('형식 미노출 — 채널 0개', isFormatAvailable('인스타 릴스', []), false);
check(
    '채널 해제 → 해당 형식만 정리',
    pruneContentFormats(['인스타'], ['유튜브 롱폼', '인스타 릴스', '블로그 포스팅']),
    ['인스타 릴스']
);
check('채널 유지 → 형식 그대로', pruneContentFormats(['유튜브', '인스타'], ['유튜브 쇼츠', '인스타 피드']), ['유튜브 쇼츠', '인스타 피드']);
check('채널 전부 해제 → 형식 전부 정리', pruneContentFormats([], ['유튜브 롱폼']), []);
// 정리 결과는 서버 검증을 반드시 통과해야 한다 — 이게 어긋나면 폼이 400을 유발한다
check(
    '정리 후 payload는 서버 검증 통과',
    validateChannelPayload({
        ...base,
        channelTypes: ['인스타'],
        representativeChannel: '인스타',
        channels: { '인스타': { url: 'https://i', follower: 10, engagement: 1, blogIndex: '', strength: '' } },
        contentFormats: pruneContentFormats(['인스타'], ['유튜브 롱폼', '인스타 릴스']),
    }),
    null
);

// ── buildDeliverableSummary (표준 문구 단일 출처) ──
check(
    '형식 2개 + 표준 기한',
    buildDeliverableSummary(['유튜브 롱폼', '인스타 릴스'], null),
    '유튜브 롱폼 1편 · 인스타 릴스 1편 — 퇴실 후 14일 안에 업로드'
);
check(
    '형식 1개 + 예외 기한',
    buildDeliverableSummary(['블로그 포스팅'], 21),
    '블로그 포스팅 1편 — 퇴실 후 21일 안에 업로드'
);
check(
    '형식 미선택 → 기한만',
    buildDeliverableSummary([], null),
    '퇴실 후 14일 안에 업로드'
);
check('형식 미선택 + 예외 기한', buildDeliverableSummary([], 30), '퇴실 후 30일 안에 업로드');
// 표준과 같은 값(14)이 실수로 들어와도 표준 문구가 나와야 한다
check('기한 14가 들어와도 표준 문구', buildDeliverableSummary([], 14), '퇴실 후 14일 안에 업로드');
// 허용 밖 값은 표준으로 렌더한다 — 포털·캠지기가 같은 기한을 말해야 한다(2026-08-25 캠지기측 지적)
check('허용 밖 7 → 표준 렌더', buildDeliverableSummary([], 7), '퇴실 후 14일 안에 업로드');
check('허용 밖 999 → 표준 렌더', buildDeliverableSummary([], 999), '퇴실 후 14일 안에 업로드');
check('음수 → 표준 렌더', buildDeliverableSummary([], -5), '퇴실 후 14일 안에 업로드');

// ── buildVisitConditionSummary (표준과 같은 항목은 생략) ──
check('표준 그대로', buildVisitConditionSummary(2, false, false), '2인 방문');
check('전부 예외', buildVisitConditionSummary(4, true, true), '4인 방문 · 반려동물 동반 · 드론 촬영');
check('반려동물만', buildVisitConditionSummary(1, true, false), '1인 방문 · 반려동물 동반');
check('드론만', buildVisitConditionSummary(3, false, true), '3인 방문 · 드론 촬영');
check('인원 미입력', buildVisitConditionSummary(0, false, false), '');
// 인원이 없어도 예외 항목은 알려야 한다 — 현장에서 알면 늦는 정보다
check('인원 미입력 + 반려동물', buildVisitConditionSummary(0, true, false), '반려동물 동반');

// ── normalizeUploadDeadline (표준과 같은 값은 null로 — 스펙 §9) ──
check('표준값 14 → null', normalizeUploadDeadline(14), null);
check('null → null', normalizeUploadDeadline(null), null);
check('0 → null', normalizeUploadDeadline(0), null);
check('예외 21 유지', normalizeUploadDeadline(21), 21);
check('예외 30 유지', normalizeUploadDeadline(30), 30);
check('허용 밖 7은 그대로 (검증이 잡는다)', normalizeUploadDeadline(7), 7);

// ── isAllowedUploadDeadline (읽기 경계) ──
check('null 허용', isAllowedUploadDeadline(null), true);
check('21 허용', isAllowedUploadDeadline(21), true);
check('30 허용', isAllowedUploadDeadline(30), true);
// 14는 "빈 값 = 표준"이라 저장돼 있으면 안 되는 값 → 읽기에서 눕힌다
check('표준 14는 저장값으로 불허', isAllowedUploadDeadline(14), false);
check('허용 밖 7 불허', isAllowedUploadDeadline(7), false);

// ── validateChannelPayload 신규 위반 3종 ──
check('기한 21 통과', validateChannelPayload({ ...base, uploadDeadlineDays: 21 }), null);
check('기한 null 통과', validateChannelPayload({ ...base, uploadDeadlineDays: null }), null);
check('기한 7 → 위반', validateChannelPayload({ ...base, uploadDeadlineDays: 7 }), 'UPLOAD_DEADLINE_INVALID');
check('기한 14 → 위반(정규화 전이면 안 들어와야 한다)', validateChannelPayload({ ...base, uploadDeadlineDays: 14 }), 'UPLOAD_DEADLINE_INVALID');

check('인원 0(미입력) 통과', validateChannelPayload({ ...base, companions: 0 }), null);
check('인원 10 통과', validateChannelPayload({ ...base, companions: 10 }), null);
check('인원 11 → 위반', validateChannelPayload({ ...base, companions: 11 }), 'COMPANION_INVALID');
check('인원 -1 → 위반', validateChannelPayload({ ...base, companions: -1 }), 'COMPANION_INVALID');
check('인원 소수 → 위반', validateChannelPayload({ ...base, companions: 2.5 }), 'COMPANION_INVALID');

check('콘셉트 빈 배열 통과', validateChannelPayload({ ...base, channelConcepts: [] }), null);
check('콘셉트 2개 통과', validateChannelPayload({ ...base, channelConcepts: ['캠핑', '차박'] }), null);
check('콘셉트 화이트리스트 밖 → 위반', validateChannelPayload({ ...base, channelConcepts: ['등산', '서핑'] }), 'CONCEPT_UNKNOWN');

// ── withRo (조사 로/으로) ──
check('받침 ㅇ → 으로', withRo('캠핑'), '캠핑으로');
check('받침 ㅇ → 으로 (여행)', withRo('여행'), '여행으로');
check('받침 ㄱ → 으로', withRo('가족'), '가족으로');
check('받침 ㄹ → 로', withRo('반려동물'), '반려동물로');
check('받침 없음 → 로', withRo('솔로'), '솔로로');
check('받침 없음 → 로 (낚시)', withRo('낚시'), '낚시로');
// 여러 개를 이어붙일 땐 마지막 단어가 조사를 결정한다
check('나열 마지막 기준', withRo(['캠핑', '낚시'].join(' · ')), '캠핑 · 낚시로');

// ── violationMessage (위반 코드 → 크리에이터가 읽을 문장) ──
// 11종 전부에 문장이 있어야 한다. 하나라도 비면 그 경우에 일반 문구로 떨어진다.
check('11종 전부 매핑', Object.keys(VIOLATION_MESSAGES).length, 11);
check('빈 문장 없음', Object.values(VIOLATION_MESSAGES).filter((m) => !m.trim()).length, 0);
check('동반 인원 범위를 문장에 노출', violationMessage('COMPANION_INVALID').includes('1~10명'), true);
check('기한 선택지를 문장에 노출', violationMessage('UPLOAD_DEADLINE_INVALID').includes('21·30'), true);
check('모르는 코드 → 일반 문구', violationMessage('WAT'), '입력 조건을 확인해주세요.');
check('undefined → 일반 문구', violationMessage(undefined), '입력 조건을 확인해주세요.');

// ── 제안 수신함 (offerRules) ──
// ⚠️ 확인 창 기산점은 `크리에이터 발송 일시`다. `만료 예정 일시`가 아니다 —
//    그건 캠지기 선입금 기한이고, 입금 대사가 수기라 크리에이터가 제안서를 받을 때쯤
//    이미 지나 있는 게 정상이다. 그걸 기준으로 잡으면 거의 모든 제안이 즉시 잠긴다.
const T0 = Date.parse('2026-08-25T12:00:00+09:00');
const H = 3_600_000;
const ago = (h: number) => new Date(T0 - h * H).toISOString();
const PENDING = '크리에이터확인중';
// CHANGED: 절대시간(48h) → 2영업일 (2026-08-26 사장님 확답).
//          마감은 **발송 다음 날부터 세어 2영업일째 되는 날의 KST 자정 직전**이다.
//          기대값을 endOfKstDay('YYYY-MM-DD')로 적어 "어느 날 끝인가"가 눈에 보이게 둔다.
const endOfKstDay = (isoDate: string) => Date.parse(`${isoDate}T00:00:00+09:00`) + 86_400_000 - 1;

// deadlineMs — 평일 (2026-08-25 화 → 수(1)·목(2))
check('화 낮 발송 → 목 자정 직전', deadlineMs('2026-08-25T12:00:00+09:00'), endOfKstDay('2026-08-27'));
check('화 밤 발송도 같은 목', deadlineMs('2026-08-25T23:30:00+09:00'), endOfKstDay('2026-08-27'));
check('UTC 표기도 KST 달력으로 (08-25T23:00Z = 08-26 08:00 KST → 목·금)',
    deadlineMs('2026-08-25T23:00:00Z'), endOfKstDay('2026-08-28'));

// deadlineMs — 주말 건너뛰기. 48h였다면 금요일 저녁 발송이 일요일 저녁에 잠겼다
check('금 저녁 발송 → 월(1)·화(2)', deadlineMs('2026-08-28T18:00:00+09:00'), endOfKstDay('2026-09-01'));
check('토 발송 → 월(1)·화(2)', deadlineMs('2026-08-29T10:00:00+09:00'), endOfKstDay('2026-09-01'));
check('목 발송 → 금(1)·월(2)', deadlineMs('2026-08-27T09:00:00+09:00'), endOfKstDay('2026-08-31'));

// deadlineMs — 공휴일. 추석(9/24~26) + 대체공휴일(9/28)을 전부 건너뛴다
check('추석 직전 수 발송 → 화(1)·수(2)', deadlineMs('2026-09-23T10:00:00+09:00'), endOfKstDay('2026-09-30'));
check('개천절 대체(10/5) 건너뛰기', deadlineMs('2026-10-02T10:00:00+09:00'), endOfKstDay('2026-10-07'));

// deadlineMs — 공휴일 테이블 커버리지 밖은 주말만 제외로 폴백 (설 연휴를 모른다)
check('커버리지 밖 → 주말만 제외', deadlineMs('2027-02-05T10:00:00+09:00'), endOfKstDay('2027-02-09'));

check('발송 일시 빈 값 → 마감 없음', deadlineMs(''), Infinity);
check('발송 일시 파싱 불가 → 마감 없음', deadlineMs('언젠가'), Infinity);

// remainingMs = 마감 − 지금
check('남은 시간 = 마감 − now', remainingMs('2026-08-25T12:00:00+09:00', T0), endOfKstDay('2026-08-27') - T0);
check('발송 일시 빈 값 → 마감 없음', remainingMs('', T0), Infinity);
check('발송 일시 파싱 불가 → 마감 없음', remainingMs('언젠가', T0), Infinity);

// canRespond — 경계는 KST 자정
const SENT_TUE = '2026-08-25T12:00:00+09:00';
check('마감 1분 전 → 가능', canRespond(PENDING, SENT_TUE, '', Date.parse('2026-08-27T23:59:00+09:00')), true);
check('마감 당일 자정 → 불가', canRespond(PENDING, SENT_TUE, '', Date.parse('2026-08-28T00:00:00+09:00')), false);
check('방금 발송 → 응답 가능', canRespond(PENDING, ago(0), '', T0), true);
check('금 발송 + 일요일 저녁 → 여전히 가능(48h였다면 잠겼다)',
    canRespond(PENDING, '2026-08-28T18:00:00+09:00', '', Date.parse('2026-08-30T20:00:00+09:00')), true);
// 운영자가 자동화 없이 상태만 수기로 옮긴 경우 — 캠지기 돈은 들어와 있다. 잠그면 제안이 갇힌다
check('발송 일시 빈 값 → 응답 가능', canRespond(PENDING, '', '', T0), true);
// 중복 응답 가드 — 버전 낙관적 잠금 대신 응답 일시로 막는다
check('이미 응답함 → 불가', canRespond(PENDING, ago(1), ago(0.5), T0), false);
// 상태 화이트리스트 — 크리에이터확인중 말고는 전부 불가
check('확정 → 불가', canRespond('확정', ago(1), '', T0), false);
check('거절 → 불가', canRespond('거절', ago(1), '', T0), false);
check('선입금대기 → 불가', canRespond('선입금대기', ago(1), '', T0), false);
check('입금확인 → 불가(제안서 발송 전)', canRespond('입금확인', ago(1), '', T0), false);

// formatRemaining
check('마감 없음 → 빈 문자열', formatRemaining(Infinity), '');
check('마감됨', formatRemaining(0), '마감됨');
check('30분', formatRemaining(30 * 60_000), '30분 남음');
check('5시간', formatRemaining(5 * H), '5시간 남음');
check('2일 3시간', formatRemaining(51 * H), '2일 3시간 남음');

// ── isValidEmail ──
check('이메일 유효', isValidEmail('a@b.co.kr'), true);
check('이메일 무효 — TLD 없음', isValidEmail('a@b'), false);
check('이메일 무효 — 공백', isValidEmail('a b@c.com'), false);

// ── validateOfferResponse (B2 쓰기 관문) ──
// UI가 막아도 서버가 다시 막는다. 실패 코드를 나눠 두는 이유는 크리에이터에게 보여줄 말이 다르기 때문이다.
const OK = { ok: true };
const offerBase = { status: PENDING, sentAt: SENT_TUE, respondedAt: '', now: Date.parse('2026-08-26T10:00:00+09:00') };

check('수락 → 통과', validateOfferResponse({ ...offerBase, action: 'accept' }), OK);
check('거절 + 사유 일정 → 통과', validateOfferResponse({ ...offerBase, action: 'reject', rejectReason: '일정' }), OK);
check('거절 + 사유 금액 → 통과', validateOfferResponse({ ...offerBase, action: 'reject', rejectReason: '금액' }), OK);
check('거절 + 사유 기타 → 통과', validateOfferResponse({ ...offerBase, action: 'reject', rejectReason: '기타' }), OK);

check('거절인데 사유 없음', validateOfferResponse({ ...offerBase, action: 'reject' }), { ok: false, code: 'INVALID_REASON' });
check('거절 사유가 화이트리스트 밖', validateOfferResponse({ ...offerBase, action: 'reject', rejectReason: '가격' }), { ok: false, code: 'INVALID_REASON' });
check('알 수 없는 action', validateOfferResponse({ ...offerBase, action: 'cancel' }), { ok: false, code: 'INVALID_ACTION' });
check('빈 action', validateOfferResponse({ ...offerBase, action: '' }), { ok: false, code: 'INVALID_ACTION' });

check('이미 확정된 건', validateOfferResponse({ ...offerBase, action: 'accept', status: '확정' }), { ok: false, code: 'NOT_PENDING' });
check('선입금대기 건', validateOfferResponse({ ...offerBase, action: 'accept', status: '선입금대기' }), { ok: false, code: 'NOT_PENDING' });
check('이미 응답함', validateOfferResponse({ ...offerBase, action: 'accept', respondedAt: '2026-08-26T09:00:00+09:00' }), { ok: false, code: 'ALREADY_RESPONDED' });
check('마감 지남', validateOfferResponse({ ...offerBase, action: 'accept', now: Date.parse('2026-08-28T00:00:00+09:00') }), { ok: false, code: 'EXPIRED' });
check('마감 1분 전은 통과', validateOfferResponse({ ...offerBase, action: 'accept', now: Date.parse('2026-08-27T23:59:00+09:00') }), OK);

// 발송 일시가 비면 마감 없음 — 운영자가 자동화 없이 상태만 수기로 옮긴 경우를 잠그지 않는다
check('발송 일시 빈 값 → 통과', validateOfferResponse({ ...offerBase, action: 'accept', sentAt: '' }), OK);

// 판정 순서 — 먼저 걸리는 것이 이긴다. 크리에이터에게 가장 정확한 이유를 보여주기 위해서다
check('사유 오류가 상태보다 먼저', validateOfferResponse({ ...offerBase, action: 'reject', rejectReason: '가격', status: '확정' }), { ok: false, code: 'INVALID_REASON' });
check('이미 응답함이 마감보다 먼저', validateOfferResponse({ ...offerBase, action: 'accept', respondedAt: '2026-08-26T09:00:00+09:00', now: Date.parse('2026-08-28T00:00:00+09:00') }), { ok: false, code: 'ALREADY_RESPONDED' });

// ── 응답 실패 코드 → 문장 (B3) ──
// 코드가 늘었는데 문장을 안 붙이면 화면이 빈 말을 하거나 일반 문구로 뭉개진다.
// validateOfferResponse가 낼 수 있는 코드 + respondToOffer가 내는 코드를 전부 덮는지 본다.
const ALL_CODES = [
    'NOT_FOUND', 'FORBIDDEN', 'INVALID_ACTION', 'INVALID_REASON',
    'NOT_PENDING', 'ALREADY_RESPONDED', 'EXPIRED', 'CONFLICT', 'WRITE_FAILED',
];
check('실패 코드 9종 전부 문장이 있다', ALL_CODES.filter((c) => !(c in OFFER_ERROR_MESSAGES)), []);
check('빈 문장인 코드는 없다', Object.values(OFFER_ERROR_MESSAGES).filter((m) => !m.trim()), []);
check('모르는 코드 → 일반 문구', offerErrorMessage('SOMETHING_ELSE'), '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.');
check('undefined → 일반 문구', offerErrorMessage(undefined), '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.');
check('기한 지남과 이미 응답은 다른 문장', OFFER_ERROR_MESSAGES.EXPIRED !== OFFER_ERROR_MESSAGES.ALREADY_RESPONDED, true);

// ── NEW 표시 (열어보지 않은 제안) ──
check('처음이면 전부 새 제안', unseenIds(['a', 'b'], []), ['a', 'b']);
check('열어본 건 빠진다', unseenIds(['a', 'b'], ['a']), ['b']);
check('전부 열어봤으면 없음', unseenIds(['a', 'b'], ['a', 'b']), []);
check('빈 id는 세지 않는다', unseenIds(['', 'a'], []), ['a']);
check('없어진 제안이 기록에 남아 있어도 무해', unseenIds(['a'], ['a', 'zzz']), []);

// ── 로그인 이메일 앞 3자리 (조건부 3요소) ──
// 등록된 이메일이 없는 계정은 이 관문을 적용하지 않는다 — 163명 중 83명이 여기 해당한다.
check('앞 3자리 일치', matchesEmailPrefix('lovecamp@naver.com', 'lov'), true);
check('대문자로 쳐도 통과', matchesEmailPrefix('lovecamp@naver.com', 'LOV'), true);
check('앞뒤 공백 무시', matchesEmailPrefix('lovecamp@naver.com', ' lov '), true);
check('3자리 넘게 쳐도 앞 3자리만 본다', matchesEmailPrefix('lovecamp@naver.com', 'lovec'), true);
check('틀리면 거부', matchesEmailPrefix('lovecamp@naver.com', 'abc'), false);
check('빈 입력은 거부', matchesEmailPrefix('lovecamp@naver.com', ''), false);
check('도메인은 보지 않는다', matchesEmailPrefix('lov@naver.com', 'lov'), true);
check('등록 이메일 없으면 무조건 통과', matchesEmailPrefix('', 'aaa'), true);
check('등록 이메일 없고 입력도 없으면 통과', matchesEmailPrefix('', ''), true);
check('공백뿐인 등록값도 통과', matchesEmailPrefix('   ', ''), true);
check('요구 대상 판정 — 있음', requiresEmailPrefix('lovecamp@naver.com'), true);
check('요구 대상 판정 — 없음', requiresEmailPrefix(''), false);

// ── 기준 지역 앵커 파싱 (2026-08-31) ──
// ⚠️ 이 함수가 원거리 할증 후보 집합 전체를 결정한다. 자기신고가 아니라 정산 주소가 앵커다.
//    아래 케이스는 전부 프로덕션 실데이터(크리에이터 349명 중 프리미엄 링크 86명)에서 뽑았다.
const KG = '경기도(서울, 인천 포함)';
check('정상 — 시/도로 시작', parseBaseRegionFromAddress('경기도 수원시 팔달구 1'), KG);
check('서울은 경기권으로 접는다', parseBaseRegionFromAddress('서울특별시 영등포구 도림천로19길 11'), KG);
check('광주는 전남권', parseBaseRegionFromAddress('광주광역시 서구 상무대로'), '전라남도');
check('대구는 경북권', parseBaseRegionFromAddress('대구광역시 수성구'), '경상북도');
check('부산은 경남권', parseBaseRegionFromAddress('부산광역시 해운대구'), '경상남도');
check('세종은 충남권', parseBaseRegionFromAddress('세종특별자치시 한누리대로'), '충청남도');

// 실측 실패 사례 — 선두 우편번호 4종. 전에는 전부 ''을 뱉어 원정이 잠겼다.
check('우편번호 괄호 접두', parseBaseRegionFromAddress('(07448) 서울특별시 영등포구 도림천로19길 11'), KG);
check('우편번호 + 개행', parseBaseRegionFromAddress('34423\n대전광역시 대덕구 송촌덩 486-4번지 30'), '충청남도');
check('(우편번호 NNNNN) 형태', parseBaseRegionFromAddress('(우편번호 18025) 경기도 평택시 신촌5로 20 동'), KG);
check('닫는 괄호만 남은 형태', parseBaseRegionFromAddress('14508) 경기도 부천시 도약로16 라일락마을 경남아'), KG);
check('구 6자리 우편번호', parseBaseRegionFromAddress('123-456 강원도 원주시'), '강원도');

// 여전히 못 뽑는 것 — 시/도를 생략하고 시 이름으로 시작하는 주소. 지어내지 않고 ''을 준다
// (앵커가 없으면 원거리 할증을 잠근다 — WONJEONG_NO_ANCHOR).
check('시 이름으로 시작하면 포기', parseBaseRegionFromAddress('창원시 진해구 진해대로 975번길 26'), '');
check('김포시도 포기', parseBaseRegionFromAddress('김포시 김포한강11로 37 103동 2401호'), '');
check('빈 주소', parseBaseRegionFromAddress(''), '');

// 부분일치 금지 회귀 — 상세주소 토큰이 도를 오분류하면 엉뚱한 지역이 앵커가 된다
check('세종아파트는 세종이 아니다', parseBaseRegionFromAddress('경상북도 안동시 세종아파트 101동'), '경상북도');
check('대구리는 대구가 아니다', parseBaseRegionFromAddress('강원도 양양군 대구리 12'), '강원도');

// ── 원거리 추가금 선택 (2026-08-31) ──
// 앵커는 정산 주소 파생값만 넘긴다. 경기 거주자의 후보는 전북·전남·경북·경남.
const KGG = '경기도(서울, 인천 포함)';
check('추가금 미선택은 항상 통과', validateWonjeongSelection('', [], []), null);
check('앵커 없으면 잠긴다', validateWonjeongSelection('', ['강원도'], ['전라남도']), 'WONJEONG_NO_ANCHOR');
check('방문가능 0개인데 추가금만', validateWonjeongSelection(KGG, [], ['전라남도']), 'WONJEONG_WITHOUT_VISIT');
check('방문가능과 겹침', validateWonjeongSelection(KGG, ['전라남도'], ['전라남도']), 'WONJEONG_OVERLAP');
check('근거리를 추가금으로(어뷰징)', validateWonjeongSelection(KGG, ['강원도'], ['충청남도']), 'WONJEONG_OUT_OF_RANGE');
check('자기 거주지를 추가금으로', validateWonjeongSelection(KGG, ['강원도'], [KGG]), 'WONJEONG_OUT_OF_RANGE');
check('정상 — 먼 지역', validateWonjeongSelection(KGG, ['강원도'], ['전라남도', '경상남도']), null);
check('제주 거주자는 후보 없음', validateWonjeongSelection('제주도', ['제주도'], ['전라남도']), 'WONJEONG_OUT_OF_RANGE');

// 대칭성 회귀 — 어느 지역이든 자기 거주지는 절대 자기 후보에 없어야 한다.
// (이 불변식이 깨지면 앵커를 정산 주소로 옮겨도 집 앞에 추가금이 붙는다)
for (const region of VISIT_REGIONS) {
    check(`자기 거주지가 후보에 없음 — ${region}`, getWonjeongCandidates(region).includes(region), false);
}

// 폼 정리 술어 — 서버 검증과 어긋나면 사용자가 화면에 없는 이유로 막힌다
check('방문가능 비우면 추가금도 비운다', pruneWonjeongRegions([], ['전라남도']), []);
check('겹치는 것만 걷어낸다', pruneWonjeongRegions(['전라남도'], ['전라남도', '경상남도']), ['경상남도']);
check('폼 정리 결과는 서버를 통과한다',
    validateWonjeongSelection(KGG, ['강원도', '전라남도'], pruneWonjeongRegions(['강원도', '전라남도'], ['전라남도', '경상남도'])), null);

// 메시지 — 위반마다 다른 문장이 나와야 "왜 막혔는지"가 전달된다
check('위반마다 다른 문장', new Set(Object.values(WONJEONG_MESSAGES)).size, 4);
check('모르는 코드는 일반 문구', wonjeongMessage('ZZZ'), WONJEONG_MESSAGES.WONJEONG_OUT_OF_RANGE);

// ── 협찬 2분기 진입 카드 (2026-09-02) ──
// 스펙 §3.2. 문구가 바뀌면 여기가 먼저 깨져야 한다 — 크리에이터에게 나가는 말이다.
// 라벨의 번호는 스펙 §3.2 표의 행 번호다. 표를 재번호하면 여기도 같이 고친다.
check('신청하기 — 정산정보 미등록',
    resolveApplyTrack({ hasPremiumId: false, openCampaignCount: 0 }),
    { state: 'NEEDS_SETTLEMENT', message: '정산 정보 등록 필요', destination: 'settlement' });
check('신청하기 — 열린 캠페인',
    resolveApplyTrack({ hasPremiumId: true, openCampaignCount: 12 }),
    { state: 'OPEN', message: '열린 캠페인에 지원 · 신청 가능 12개', destination: 'campaigns' });
check('신청하기 — 열린 캠페인 0개도 개수를 말한다',
    resolveApplyTrack({ hasPremiumId: true, openCampaignCount: 0 }),
    { state: 'OPEN', message: '열린 캠페인에 지원 · 신청 가능 0개', destination: 'campaigns' });

const OFFER_BASE = {
    reviewStatus: '' as const, isPublic: false,
    offerCount: 0, pendingCount: 0, newOfferCount: 0,
};
const OFFERS_2 = { offerCount: 2, pendingCount: 2 };

// ── 제안이 없을 때 (§3.2 표 1·3·4·5·6번) ──
check('제안받기 1 — 반려는 위험 톤',
    resolveOfferTrack({ ...OFFER_BASE, reviewStatus: '반려' }),
    { state: 'REJECTED', badge: '수정 필요', message: '반려 사유를 확인하고 다시 공개해주세요', destination: 'profile', tone: 'danger' });
check('제안받기 3 — 심사대기',
    resolveOfferTrack({ ...OFFER_BASE, reviewStatus: '심사대기', isPublic: true }),
    { state: 'UNDER_REVIEW', badge: '심사 중', message: '공개 신청 확인 중이에요', destination: 'profile', tone: 'brand' });
check('제안받기 4 — 승인·비공개',
    resolveOfferTrack({ ...OFFER_BASE, reviewStatus: '승인' }),
    { state: 'HIDDEN', badge: '비공개', message: '공개로 바꾸면 제안을 받을 수 있어요', destination: 'profile', tone: 'brand' });
check('제안받기 5 — 공개했고 제안 대기',
    resolveOfferTrack({ ...OFFER_BASE, reviewStatus: '승인', isPublic: true }),
    { state: 'WAITING', badge: '', message: '캠지기가 볼 수 있어요 · 제안을 기다리는 중', destination: 'profile', tone: 'brand' });
check('제안받기 6 — 미등록이면 NEW',
    resolveOfferTrack(OFFER_BASE),
    { state: 'UNREGISTERED', badge: 'NEW', message: '내가 정한 금액부터 제안이 시작됩니다', destination: 'profile', tone: 'brand' });

// ── 2번 행: 제안이 있을 때 ──
check('제안받기 2 — 대기 제안 + 안 읽은 제안',
    resolveOfferTrack({ reviewStatus: '승인', isPublic: true, offerCount: 3, pendingCount: 3, newOfferCount: 1 }),
    { state: 'HAS_OFFERS', badge: '새 제안 1', message: '받은 제안 3건 · 기한 안에 회신해주세요', destination: 'offers', tone: 'brand' });
check('제안받기 2 — 다 읽었으면 뱃지 없음',
    resolveOfferTrack({ reviewStatus: '승인', isPublic: true, offerCount: 3, pendingCount: 3, newOfferCount: 0 }),
    { state: 'HAS_OFFERS', badge: '', message: '받은 제안 3건 · 기한 안에 회신해주세요', destination: 'offers', tone: 'brand' });

// 회신 촉구는 pendingCount에만 건다. offerCount에는 이미 수락한 `확정`도 섞여 있어서
// (getCreatorOffers가 `크리에이터확인중`+`확정`을 함께 읽는다), 거기 걸면 할 일이
// 없는 사람에게 "기한 안에 회신해주세요"가 나간다.
check('제안받기 2 — 전부 수락했으면 회신을 재촉하지 않는다',
    resolveOfferTrack({ reviewStatus: '승인', isPublic: true, offerCount: 3, pendingCount: 0, newOfferCount: 0 }),
    { state: 'HAS_OFFERS', badge: '', message: '확정된 제안 3건 확인하기', destination: 'offers', tone: 'brand' });
check('제안받기 2 — 대기 1 + 확정 2면 대기 수만 재촉한다',
    resolveOfferTrack({ reviewStatus: '승인', isPublic: true, offerCount: 3, pendingCount: 1, newOfferCount: 0 }).message,
    '받은 제안 1건 · 기한 안에 회신해주세요');
check('제안받기 2 — 폴백에서 전부 확정',
    resolveOfferTrack({ ...OFFER_BASE, offerCount: 3, pendingCount: 0 }),
    { state: 'HAS_OFFERS', badge: '', message: '확정된 제안 3건 확인하기', destination: 'offers', tone: 'brand' });

// ⚠️ 아래 4건이 이 표의 핵심 불변식이다 — 제안이 있으면 수신함 링크를 잃지 않는다.
//    배너 제거 후 /dashboard/offers로 가는 링크는 이 카드 하나뿐이고 회신 기한은 2영업일이다.
check('제안받기 2 — 비공개여도 제안이 있으면 수신함으로',
    resolveOfferTrack({ reviewStatus: '승인', isPublic: false, ...OFFERS_2, newOfferCount: 2 }),
    { state: 'HIDDEN_WITH_OFFERS', badge: '비공개', message: '받은 제안 2건 · 기한 안에 회신해주세요', destination: 'offers', tone: 'brand' });
// 심사대기 × 제안 보유는 크리에이터가 직접 만든다: 운영자가 미등록자에게 제안 → 카드가
// 수신함으로 유도 → 크리에이터가 프로필 등록 후 공개 신청 → lib/airtable.ts의
// '' | '반려' → '심사대기' 전이. 여기서 링크를 가리면 우리가 시킨 행동이 제안을 만료시킨다.
check('제안받기 2 — 심사대기여도 제안이 있으면 수신함으로',
    resolveOfferTrack({ ...OFFER_BASE, reviewStatus: '심사대기', isPublic: true, ...OFFERS_2 }),
    { state: 'HAS_OFFERS', badge: '', message: '받은 제안 2건 · 기한 안에 회신해주세요', destination: 'offers', tone: 'brand' });
// 프로필 조회가 실패하면 승인·공개인 사람도 reviewStatus가 ''로 보인다(§3.3).
check('제안받기 2 — 심사상태를 몰라도 제안이 있으면 수신함으로',
    resolveOfferTrack({ ...OFFER_BASE, ...OFFERS_2 }),
    { state: 'HAS_OFFERS', badge: '', message: '받은 제안 2건 · 기한 안에 회신해주세요', destination: 'offers', tone: 'brand' });
check('제안받기 2 — 알 수 없는 심사상태여도 제안이 있으면 수신함으로',
    resolveOfferTrack({ ...OFFER_BASE, reviewStatus: '알수없음' as never, ...OFFERS_2 }).destination,
    'offers');

// `비공개`는 승인 상태에서만 참이라고 말할 수 있다. 심사대기는 isPublic이 true이고
// (공개 신청을 했으니), 폴백은 isPublic을 아예 모른다. 붙이면 거짓말이 된다.
check('제안받기 2 — 비공개 뱃지는 승인에서만 붙는다',
    (['', '심사대기'] as const).map((st) => resolveOfferTrack({ ...OFFER_BASE, reviewStatus: st, ...OFFERS_2, newOfferCount: 1 }).badge),
    ['새 제안 1', '새 제안 1']);

// ⚠️ 반려만 제안보다 위다. 확정 제안은 목록에서 사라지지 않으므로(getCreatorOffers가
//    `확정`도 읽는다), 제안을 앞세우면 "수정 필요"가 영구히 가려진다.
check('제안받기 1 — 반려는 제안이 있어도 프로필 조치가 먼저',
    resolveOfferTrack({ ...OFFER_BASE, reviewStatus: '반려', ...OFFERS_2 }),
    { state: 'REJECTED', badge: '수정 필요', message: '반려 사유를 확인하고 다시 공개해주세요', destination: 'profile', tone: 'danger' });
check('제안이 있으면 반려를 빼고 어떤 심사상태에서도 수신함 경로',
    (['', '심사대기', '승인'] as const).map((st) =>
        resolveOfferTrack({ reviewStatus: st, isPublic: true, offerCount: 1, pendingCount: 1, newOfferCount: 0 }).destination),
    ['offers', 'offers', 'offers']);

// 폴백 — 제안이 없으면 알 수 없는 값도 미등록으로 떨어진다.
check('제안받기 6 — 알 수 없는 심사상태는 미등록 폴백',
    resolveOfferTrack({ ...OFFER_BASE, reviewStatus: '알수없음' as never }).state,
    'UNREGISTERED');
// NEW 뱃지는 미등록에서만. 등록 후에도 뜨면 뱃지가 소진되어 유도 기능을 잃는다.
check('NEW 뱃지는 미등록에서만',
    (['심사대기', '반려', '승인'] as const).map((st) => resolveOfferTrack({ ...OFFER_BASE, reviewStatus: st }).badge === 'NEW'),
    [false, false, false]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
