// PublishRequestCard.tsx - 제안 흐름 고지 + '이해' 확인 + 공개 신청 (지명형 1a-v2 §3.6)
// 기존 PublishToggle(2단 토글)을 대체한다. 자동수락 토글은 폐지 — 무응답 자동확정이 이미 기본값(스펙 D1).
'use client';

import { useState } from 'react';
import type { ReviewStatus } from '@/types';

interface PublishRequestCardProps {
    isPublic: boolean;
    reviewStatus: ReviewStatus;
    reviewRejectReason: string;
    missing: string[];
    saving: boolean;
    onChangePublic: (next: boolean) => void;
}

// CHANGED: 2026-08-25 — 4번 줄에서 "응답이 없으면 수락한 것으로 자동 확정됩니다"를 뺐다.
// 자동 확정이 **실재하지 않는다.** 캠지기 계약서 v2 §4.2가 "무응답 시 자동 확정을 쓰지 않는다"로
// 정했고(메일도 "회신해주세요"로 끝난다), 베이스 자동화 36개 전수 확인 결과 `크리에이터확인중`을
// 다음 상태로 옮기는 자동화가 없다. 크리에이터가 사실이 아닌 문장에 '이해'를 타이핑하고 있었다.
//
// ⚠️ 2026-08-25 추가 — "회신이 늦어지면 캠핏이 연락드려요"도 뺐다.
//    자동 확정(없는 기능)을 지우면서 그 자리에 **안 해도 될 일을 의무로 만드는 문장**을
//    넣고 있었다. 연락 프로세스도 담당자도 정해진 게 없다. 캠지기 약관에서도 같은 이유로
//    "캠핏이 직접 연락해 확인하며"를 빼고 과정만 남겼다(약관 v1.2).
//    → 우리가 지킬 수 있는 사실만 적는다. 지킬 의무를 자진해서 만들지 않는다.
//
// ⚠️ 2단계에서 자동 확정을 실제로 켤 때는 **이 고지 동의를 다시 받아야 한다.**
//    지금 회신 요구로 고쳐놓고 나중에 조용히 자동 확정을 켜면 지금보다 더 나쁘다 —
//    그때는 크리에이터에게 "그런 줄 몰랐다"고 할 근거가 오히려 생긴다. (캠지기측 지적)
const OFFER_FLOW: string[] = [
    '캠지기가 먼저 입금한 뒤 제안합니다',
    '캠핏이 입금을 확인하고 제안서를 이메일로 보내드려요',
    '제안서를 받으시면 24~48시간 안에 수락 또는 거절로 회신해주세요',
    '회신하지 않으시면 매칭이 확정되지 않아요. 임의로 수락 처리되지 않습니다',
    '거절하실 땐 사유를 적어주셔야 하고, 거절이 반복되면 서비스 이용이 제한될 수 있어요',
    '등록하신 채널 전부에 콘텐츠를 올리는 조건이에요',
];

export default function PublishRequestCard({
    isPublic, reviewStatus, reviewRejectReason, missing, saving, onChangePublic,
}: PublishRequestCardProps) {
    const [confirmText, setConfirmText] = useState('');
    const canSubmit = missing.length === 0 && confirmText.trim() === '이해' && !saving;

    // 이미 공개 중이면 상태 표시 + 끄기만 제공(끄기는 자유 — 타이핑 불필요)
    if (isPublic) {
        return (
            <div className="bg-card border border-line rounded-xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-brand-bg rounded-full flex items-center justify-center text-brand-strong text-xs">✓</span>
                    <span className="text-sm font-medium text-ink">
                        {reviewStatus === '승인' ? '공개 중' : reviewStatus === '반려' ? '공개 반려됨' : '캠핏 확인 중'}
                    </span>
                </div>
                {reviewStatus === '심사대기' && (
                    <p className="text-xs text-ink2">확인이 끝나면 캠지기에게 보입니다. 보통 1영업일 걸려요.</p>
                )}
                {reviewStatus === '반려' && reviewRejectReason && (
                    <p className="text-xs text-red-500 leading-relaxed">사유: {reviewRejectReason}</p>
                )}
                <button
                    type="button"
                    onClick={() => onChangePublic(false)}
                    disabled={saving}
                    className="w-full h-12 bg-subtle text-ink font-bold rounded-lg border border-line hover:border-strong transition-colors disabled:opacity-60"
                >
                    {saving ? '처리 중...' : '공개 중지하기'}
                </button>
            </div>
        );
    }

    return (
        <div className="bg-card border border-line rounded-xl p-5 flex flex-col gap-4">
            <div className="bg-subtle rounded-lg p-4">
                <p className="text-sm font-bold text-ink mb-2">제안은 이렇게 들어와요</p>
                <ol className="flex flex-col gap-1.5">
                    {OFFER_FLOW.map((line, index) => (
                        <li key={line} className="text-xs text-ink2 leading-relaxed flex gap-2">
                            <span className="text-ink3 shrink-0">{index + 1}.</span>
                            <span>{line}</span>
                        </li>
                    ))}
                </ol>
                <p className="text-xs text-ink3 mt-3 leading-relaxed">
                    제안이 들어온 뒤 금액·조건을 바꾸셔도 그 제안에는 적용되지 않아요 — 제안 시점의 조건으로 진행됩니다.
                </p>
            </div>

            {missing.length > 0 ? (
                <div>
                    <p className="text-xs text-ink2 mb-2 font-medium">공개하려면 아래를 먼저 완성해주세요</p>
                    <div className="flex flex-wrap gap-1.5">
                        {missing.map((item) => (
                            <span key={item} className="px-2.5 py-1 bg-subtle text-ink2 border border-line rounded-full text-xs">
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            ) : (
                <div>
                    <label className="block text-sm font-medium text-ink mb-2">
                        위 내용을 이해하셨다면 &lsquo;이해&rsquo;를 입력해주세요
                    </label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(event) => setConfirmText(event.target.value)}
                        placeholder="이해"
                        className="w-full h-12 px-4 bg-card border border-line rounded-lg text-ink text-sm focus:border-brand focus:outline-none transition-colors placeholder:text-ink3"
                    />
                </div>
            )}

            {/* CHANGED: 2026-08-25 — 개인정보 수집·이용 고지.
                공개 신청은 입력값이 캠지기에게 전달되기 시작하는 시점이라 동의 자리가 여기다.
                ⚠️ 문안은 법무 확인 전 초안이다. */}
            <div className="bg-subtle border border-line rounded-lg p-3">
                <p className="text-xs font-medium text-ink mb-1">개인정보 수집·이용 안내</p>
                <ul className="text-xs text-ink3 leading-relaxed list-disc pl-4 space-y-0.5">
                    <li><span className="text-ink2">수집 항목</span> — 프로필 이미지, 이메일, 채널 주소·지표·강점, 콘텐츠 형식·제작 기준, 방문 조건(지역·요일·사이트 종류·동반 인원·반려동물·드론), 협찬 금액</li>
                    <li><span className="text-ink2">이용 목적</span> — 캠지기의 협찬 제안 검토 및 제안서 발송</li>
                    <li><span className="text-ink2">제공 대상</span> — 캠핏 심사 담당자, 그리고 승인 후에는 캠핏에 입점한 캠지기</li>
                    <li><span className="text-ink2">보유 기간</span> — 공개를 중지하시면 캠지기에게 더 이상 보이지 않아요. 계정 삭제를 원하시면 카카오톡 채널로 알려주세요</li>
                </ul>
                <p className="text-xs text-ink3 mt-2">
                    공개 신청하시면 위 내용에 동의하신 것으로 봅니다. 정산 계좌·주민등록번호는 이 화면에서 받지 않아요.
                </p>
            </div>

            <button
                type="button"
                onClick={() => onChangePublic(true)}
                disabled={!canSubmit}
                className="w-full h-12 bg-brand text-black font-bold rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-40"
            >
                {saving ? '처리 중...' : '공개 신청하기'}
            </button>
            <p className="text-xs text-ink3 text-center">캠핏 확인 후 캠지기에게 보입니다 (보통 1영업일)</p>
        </div>
    );
}
