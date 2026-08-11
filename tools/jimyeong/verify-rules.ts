// tools/jimyeong/verify-rules.ts
// 지명형 1a-v2 순수 판정 로직 재현 검증. 이 레포엔 테스트 러너가 없어 node로 직접 돌린다.
// 실행: npx tsx tools/jimyeong/verify-rules.ts
// 스펙: specs/2026-08-11-지명형협찬-1a-v2-포트폴리오-재설계.md §6

import {
    validateChannelPayload, collectMissingForPublish, needsReReview, isValidEmail,
} from '../../lib/creatorProfileRules';
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

// ── isValidEmail ──
check('이메일 유효', isValidEmail('a@b.co.kr'), true);
check('이메일 무효 — TLD 없음', isValidEmail('a@b'), false);
check('이메일 무효 — 공백', isValidEmail('a b@c.com'), false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
