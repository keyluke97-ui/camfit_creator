// tools/jimyeong/verify-rules.ts
// 지명형 1a-v2 순수 판정 로직 재현 검증. 이 레포엔 테스트 러너가 없어 node로 직접 돌린다.
// 실행: npx tsx tools/jimyeong/verify-rules.ts
// 스펙: specs/2026-08-11-지명형협찬-1a-v2-포트폴리오-재설계.md §6

import {
    validateChannelPayload, collectMissingForPublish, needsReReview, isValidEmail,
    isFormatAvailable, pruneContentFormats, normalizeUploadDeadline, isAllowedUploadDeadline,
    VIOLATION_MESSAGES, violationMessage,
} from '../../lib/creatorProfileRules';
import { buildDeliverableSummary, buildVisitConditionSummary, withRo } from '../../lib/sponsorshipTerms';
import type { CreatorProfileUpdate } from '../../types';

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
    baseRegion: '경기도(서울, 인천 포함)',
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
}, true, true), ['유튜브 채널 URL']);
check('전부 충족', collectMissingForPublish(base, true, true), []);
check('이미지·정산 누락', collectMissingForPublish(base, false, false), ['프로필 이미지', '정산 정보']);
check('신규 3종 누락', collectMissingForPublish({
    ...base, representativeChannel: '', contentFormats: [], creatorEmail: '',
}, true, true), ['대표 채널', '제작 콘텐츠 형식', '크리에이터 이메일']);

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

// ── 공개 게이트에 동반 인원 (스펙 E3) ──
check(
    '인원 미입력 → 공개 못 함',
    collectMissingForPublish({ ...base, companions: 0 }, true, true),
    ['동반 인원']
);
check('인원 입력 → 누락 없음', collectMissingForPublish({ ...base, companions: 2 }, true, true), []);
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

// ── isValidEmail ──
check('이메일 유효', isValidEmail('a@b.co.kr'), true);
check('이메일 무효 — TLD 없음', isValidEmail('a@b'), false);
check('이메일 무효 — 공백', isValidEmail('a b@c.com'), false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
