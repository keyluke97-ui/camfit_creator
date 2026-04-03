// PremiumRegisterForm.tsx - 프리미엄 협찬 크리에이터 등록 폼 컴포넌트
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BankOption, BusinessType, PremiumRegisterFormData } from '@/types';
import { KAKAO_CHANNEL_URL } from '@/lib/constants';

/** Airtable singleSelect 실제 옵션값과 정확히 일치 */
const BANK_OPTIONS: BankOption[] = [
    '국민은행', '신한은행', '우리은행', '농협', '하나은행',
    '카카오뱅크', '토스뱅크', '기업은행', 'sc제일은행', '기타(직접입력)'
];

// CHANGED: 동의 항목 4개 → 3개 (원천징수 동의 제거 → 지급 조건 동의에 통합)
/** 동의 항목 정의 (라벨 + 상세 문구) */
const CONSENT_ITEMS: {
    key: keyof Pick<PremiumRegisterFormData, 'consentPrivacy' | 'consentContent' | 'consentPayment'>;
    label: string;
    detail: string;
}[] = [
    {
        key: 'consentPrivacy',
        label: '개인정보 수집 및 이용 동의',
        detail: `본인은 캠핏(주식회사 넥스트에디션)이 본 계약의 이행과 관련하여 다음 목적을 위하여 본인의 개인정보를 수집·이용하는 것에 동의합니다.

• 수집·이용 목적: 대금 지급, 세금 신고, 계약 이행 및 관리
• 수집 항목: 성명, 생년월일, 연락처, 주민등록번호(또는 사업자등록번호), 계좌 정보, SNS 채널 정보
• 보유·이용 기간: 관계 법령상 보존기간(예: 소득세법, 전자상거래법) 경과 후 즉시 파기

본인은 상기 목적 외의 용도로 개인정보가 활용되지 않으며, 동의 거부 시 대금 지급 및 계약 이행이 불가능함을 인지합니다.`
    },
    {
        key: 'consentContent',
        label: '콘텐츠 사용 권한 동의',
        detail: `본인은 본 계약에 따라 제작된 사진, 영상, 게시글 등 일체의 콘텐츠(이하 '콘텐츠')에 대하여 캠핑장 및 캠핏이 아래 조건에 따라 활용하는 것에 동의합니다.

• 활용 목적: 마케팅, 홍보, 서비스 개선, 프로모션 등 상업적 목적 포함
• 활용 범위: 캠핏 공식 채널(앱, 웹, SNS), 캠핑장 자체 채널(홈페이지, SNS), 오프라인 광고물 등
• 활용 기간: 콘텐츠 최초 업로드일로부터 1년간
• 2차 가공 여부: 콘텐츠의 일부 편집·재가공 가능하되, 본질을 훼손하지 않는 범위 내에서 사용
• 저작권: 콘텐츠의 원저작권은 크리에이터 본인에게 있으며, 캠핑장과 캠핏은 위 활용 범위 내에서 사용할 수 있는 권한을 부여받습니다.

본인은 상기 조건에 동의하며, 타사와의 경쟁 광고 활용 등은 별도 합의가 필요함을 인지합니다.`
    },
    {
        key: 'consentPayment',
        label: '지급 조건 동의',
        detail: `본인은 협찬비 지급 조건과 관련하여 다음 사항에 동의합니다.

• 본인 명의의 계좌가 아닐 시 금액 지급이 어려울 수 있습니다.
• 지급 시기: 콘텐츠 저장일 기준 익월 10일에 일괄 입금됩니다. 단, 회계 처리 일정 및 금융기관 사정 등 불가피한 사유가 있는 경우, 최대 5영업일 이내의 추가 지급 유예 기간을 둘 수 있습니다.
• 지급 방법: 사전에 등록한 계좌 정보에 따라 현금 이체 방식으로 지급
• 원천징수: 개인 사업자의 경우 소득세법에 따라 소득세 3.3%를 원천징수한 후 지급됩니다.
• 계약 불이행 시 처리: a. 크리에이터가 협의된 기간 내 콘텐츠를 업로드하지 않을 경우 지급 보류 가능 / b. 콘텐츠에 사실과 다른 내용이 포함된 경우 지급 취소 가능
• 환불·취소 조항: 지급 후 법령 또는 계약 위반 사실이 확인될 경우, 캠핏은 지급 금액을 환수할 수 있음

본인은 상기 지급 조건을 충분히 이해하고 이행할 의무가 있음을 확인합니다.`
    }
];

/** 폼 초기값 */
function getInitialFormData(): PremiumRegisterFormData {
    return {
        name: '',
        birthDate: '',
        phone: '',
        bank: '',
        customBank: '',
        accountHolder: '',
        accountNumber: '',
        residentNumber: '',
        address: '',
        businessType: '',
        taxEmail: '',
        businessNumber: '',
        consentPrivacy: false,
        consentContent: false,
        consentPayment: false
    };
}

export default function PremiumRegisterForm() {
    const router = useRouter();
    const [formData, setFormData] = useState<PremiumRegisterFormData>(getInitialFormData);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    // CHANGED: 동의 상세보기 모달 상태 추가
    const [consentDetailKey, setConsentDetailKey] = useState<string | null>(null);

    /** 텍스트/날짜/이메일 입력 핸들러 */
    function handleInputChange(field: keyof PremiumRegisterFormData, value: string) {
        setFormData(previous => ({ ...previous, [field]: value }));
        setErrorMessage('');
    }

    /** 체크박스 토글 핸들러 */
    function handleCheckboxToggle(field: keyof PremiumRegisterFormData) {
        setFormData(previous => ({ ...previous, [field]: !previous[field] }));
    }

    /** 전체 동의 토글 */
    function handleAllConsentsToggle() {
        const allChecked = CONSENT_ITEMS.every(item => formData[item.key]);
        const newValue = !allChecked;
        // CHANGED: consentTax 제거
        setFormData(previous => ({
            ...previous,
            consentPrivacy: newValue,
            consentContent: newValue,
            consentPayment: newValue
        }));
    }

    /** 제출 가능 여부 검사 */
    function isFormValid(): boolean {
        if (!formData.name || !formData.birthDate || !formData.phone) return false;
        if (!formData.bank || !formData.accountHolder || !formData.accountNumber) return false;
        if (!formData.residentNumber || !formData.address || !formData.businessType) return false;
        if (formData.bank === '기타(직접입력)' && !formData.customBank) return false;
        if (formData.businessType === '사업자' && (!formData.taxEmail || !formData.businessNumber)) return false;
        // CHANGED: consentTax 제거
        if (!formData.consentPrivacy || !formData.consentContent || !formData.consentPayment) return false;
        return true;
    }

    /** 폼 제출 */
    async function handleSubmit() {
        if (!isFormValid() || submitting) return;

        setSubmitting(true);
        setErrorMessage('');

        try {
            const response = await fetch('/api/premium-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                setErrorMessage(data.error || '등록에 실패했습니다.');
                return;
            }

            // CHANGED: 개인은 자동 로그아웃→로그인, 사업자는 완료 화면 (카카오톡 CTA 필요)
            if (formData.businessType === '사업자') {
                setIsComplete(true);
            } else {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login');
            }
        } catch (error) {
            console.error('Premium register submit error:', error);
            setErrorMessage('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setSubmitting(false);
        }
    }

    // ── 등록 완료 화면 (사업자 전용 — 카카오톡으로 사업자등록증 제출 안내) ──
    // CHANGED: 사업자만 완료 화면 노출, 개인은 자동 리다이렉트
    if (isComplete) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-6">
                <div className="w-16 h-16 bg-[#01DF82]/10 rounded-full flex items-center justify-center">
                    <span className="text-3xl">✅</span>
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-white mb-2">프리미엄 협찬 등록 완료</h3>
                    <p className="text-sm text-[#888888] leading-relaxed">
                        사업자등록증 이미지를<br />
                        카카오톡 채널로 제출해주세요.
                    </p>
                </div>

                {/* CHANGED: 카카오톡 CTA를 제출 완료 화면으로 이동 (폼 중간에서 제거) */}
                <a
                    href={KAKAO_CHANNEL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full max-w-xs flex items-center justify-center gap-2 h-12 bg-[#FEE500] text-[#3C1E1E] font-bold rounded-xl hover:bg-[#FDD800] transition-colors"
                >
                    <span>💬</span>
                    <span>카카오톡으로 제출하기</span>
                </a>

                <button
                    onClick={() => {
                        fetch('/api/auth/logout', { method: 'POST' }).then(() => {
                            router.push('/login');
                        });
                    }}
                    className="text-sm text-[#888888] hover:text-white underline transition-colors"
                >
                    재로그인하기
                </button>
            </div>
        );
    }

    // ── 현재 열린 동의 상세 정보 ──
    const activeConsentDetail = CONSENT_ITEMS.find(item => item.key === consentDetailKey);

    // ── 폼 UI ──
    const allConsentsChecked = CONSENT_ITEMS.every(item => formData[item.key]);

    return (
        <div className="space-y-6">
            {/* 에러 메시지 */}
            {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-red-400 text-sm text-center font-medium">{errorMessage}</p>
                </div>
            )}

            {/* ── 섹션 1: 기본 정보 ── */}
            <SectionTitle title="기본 정보" />

            <FormInput
                label="이름"
                value={formData.name}
                onChange={(value) => handleInputChange('name', value)}
                placeholder="실명을 입력해주세요"
                required
            />

            <FormInput
                label="생년월일"
                type="date"
                value={formData.birthDate}
                onChange={(value) => handleInputChange('birthDate', value)}
                required
            />

            <FormInput
                label="연락처"
                type="tel"
                value={formData.phone}
                onChange={(value) => handleInputChange('phone', value)}
                placeholder="01012345678"
                required
            />

            {/* ── 섹션 2: 계좌 정보 ── */}
            <SectionTitle title="계좌 정보" />

            <div>
                <label className="block text-sm font-medium text-white mb-2">
                    은행 <span className="text-red-400">*</span>
                </label>
                <select
                    value={formData.bank}
                    onChange={(event) => handleInputChange('bank', event.target.value)}
                    className="w-full h-12 px-4 bg-[#1E1E1E] border border-[#333333] rounded-lg text-white text-sm focus:border-[#01DF82] focus:outline-none transition-colors appearance-none"
                >
                    <option value="">은행을 선택해주세요</option>
                    {BANK_OPTIONS.map((bank) => (
                        <option key={bank} value={bank}>{bank}</option>
                    ))}
                </select>
            </div>

            {/* 기타 은행 직접 입력 */}
            {formData.bank === '기타(직접입력)' && (
                <FormInput
                    label="기타 은행 (직접 입력)"
                    value={formData.customBank}
                    onChange={(value) => handleInputChange('customBank', value)}
                    placeholder="은행명을 직접 입력해주세요"
                    required
                />
            )}

            <FormInput
                label="예금주"
                value={formData.accountHolder}
                onChange={(value) => handleInputChange('accountHolder', value)}
                placeholder="예금주명을 입력해주세요"
                required
            />

            <FormInput
                label="계좌번호"
                value={formData.accountNumber}
                onChange={(value) => handleInputChange('accountNumber', value)}
                placeholder="- 없이 숫자만 입력"
                required
            />

            {/* ── 섹션 3: 세금 정보 ── */}
            <SectionTitle title="세금 정보" />

            <FormInput
                label="주민등록번호"
                value={formData.residentNumber}
                onChange={(value) => handleInputChange('residentNumber', value)}
                placeholder="- 포함 13자리"
                required
            />

            <FormInput
                label="주소 (상세주소 포함)"
                value={formData.address}
                onChange={(value) => handleInputChange('address', value)}
                placeholder="우편물 수령 가능한 주소를 입력해주세요"
                isTextarea
                required
            />

            {/* 개인/사업자 선택 */}
            <div>
                <label className="block text-sm font-medium text-white mb-3">
                    개인 / 사업자 <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-3">
                    {(['개인', '사업자'] as BusinessType[]).map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => handleInputChange('businessType', type)}
                            className={`flex-1 h-12 rounded-lg text-sm font-medium transition-colors ${
                                formData.businessType === type
                                    ? 'bg-[#01DF82] text-black'
                                    : 'bg-[#1E1E1E] border border-[#333333] text-[#888888] hover:border-[#01DF82]'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* CHANGED: 사업자 조건부 필드 — 카카오톡 CTA 제거 (제출 완료 화면으로 이동) */}
            {formData.businessType === '사업자' && (
                <>
                    <FormInput
                        label="세금 계산서 발행을 위한 이메일"
                        type="email"
                        value={formData.taxEmail}
                        onChange={(value) => handleInputChange('taxEmail', value)}
                        placeholder="tax@example.com"
                        required
                    />

                    <FormInput
                        label="사업자 번호"
                        value={formData.businessNumber}
                        onChange={(value) => handleInputChange('businessNumber', value)}
                        placeholder="- 포함하여 입력"
                        required
                    />

                    <div className="bg-[#1E1E1E] border border-[#333333] rounded-xl p-4">
                        <p className="text-sm text-[#888888]">
                            사업자등록증은 등록 완료 후 카카오톡 채널로 별도 제출해주세요.
                        </p>
                    </div>
                </>
            )}

            {/* ── 섹션 4: 동의 항목 ── */}
            <SectionTitle title="동의 항목" />

            {/* 전체 동의 */}
            <button
                type="button"
                onClick={handleAllConsentsToggle}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                    allConsentsChecked
                        ? 'bg-[#01DF82]/10 border-[#01DF82]/30'
                        : 'bg-[#1E1E1E] border-[#333333]'
                }`}
            >
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                    allConsentsChecked ? 'bg-[#01DF82]' : 'border border-[#555555]'
                }`}>
                    {allConsentsChecked && (
                        <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </div>
                <span className={`text-sm font-bold ${allConsentsChecked ? 'text-[#01DF82]' : 'text-white'}`}>
                    전체 동의
                </span>
            </button>

            {/* CHANGED: 개별 동의 항목 — 상세보기 버튼 추가 */}
            <div className="space-y-2">
                {CONSENT_ITEMS.map((item) => (
                    <div key={item.key} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#1E1E1E] transition-colors">
                        {/* 체크박스 + 라벨 */}
                        <button
                            type="button"
                            onClick={() => handleCheckboxToggle(item.key)}
                            className="flex items-center gap-3 flex-1 min-w-0"
                        >
                            <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                                formData[item.key] ? 'bg-[#01DF82]' : 'border border-[#555555]'
                            }`}>
                                {formData[item.key] && (
                                    <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                            <span className={`text-sm text-left ${formData[item.key] ? 'text-white' : 'text-[#888888]'}`}>
                                {item.label} <span className="text-red-400">*</span>
                            </span>
                        </button>

                        {/* 상세보기 버튼 */}
                        <button
                            type="button"
                            onClick={() => setConsentDetailKey(item.key)}
                            className="text-xs text-[#666666] hover:text-[#01DF82] transition-colors flex-shrink-0 underline"
                        >
                            상세보기
                        </button>
                    </div>
                ))}
            </div>

            {/* ── 제출 버튼 ── */}
            <button
                type="button"
                onClick={handleSubmit}
                disabled={!isFormValid() || submitting}
                className={`w-full h-14 rounded-xl font-bold text-base transition-colors ${
                    isFormValid() && !submitting
                        ? 'bg-[#01DF82] text-black hover:bg-[#00C972]'
                        : 'bg-[#333333] text-[#666666] cursor-not-allowed'
                }`}
            >
                {submitting ? '등록 중...' : '프리미엄 협찬 등록하기'}
            </button>

            {/* ── CHANGED: 동의 상세보기 모달 ── */}
            {activeConsentDetail && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setConsentDetailKey(null)}
                    />
                    <div className="relative w-full max-w-md bg-[#1E1E1E] rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-y-auto">
                        {/* 헤더 */}
                        <div className="sticky top-0 bg-[#1E1E1E] border-b border-[#333333] px-5 py-4 flex items-center justify-between z-10">
                            <h2 className="text-base font-bold text-white">
                                {activeConsentDetail.label}
                            </h2>
                            <button
                                onClick={() => setConsentDetailKey(null)}
                                className="text-[#666666] hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        {/* 본문 */}
                        <div className="p-5">
                            <p className="text-sm text-[#B0B0B0] leading-relaxed whitespace-pre-line">
                                {activeConsentDetail.detail}
                            </p>
                        </div>
                        {/* 확인 버튼 */}
                        <div className="sticky bottom-0 bg-[#1E1E1E] border-t border-[#333333] p-5">
                            <button
                                type="button"
                                onClick={() => {
                                    // 상세보기 닫으면서 해당 항목 자동 체크
                                    if (!formData[activeConsentDetail.key]) {
                                        handleCheckboxToggle(activeConsentDetail.key);
                                    }
                                    setConsentDetailKey(null);
                                }}
                                className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors"
                            >
                                확인 및 동의
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────
// 하위 컴포넌트
// ──────────────────────────────────────────────

/** 섹션 구분 타이틀 */
function SectionTitle({ title }: { title: string }) {
    return (
        <div className="pt-2">
            <h3 className="text-base font-bold text-white">{title}</h3>
            <div className="mt-2 h-px bg-[#333333]" />
        </div>
    );
}

/** 범용 입력 필드 */
interface FormInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: 'text' | 'tel' | 'email' | 'date';
    placeholder?: string;
    required?: boolean;
    isTextarea?: boolean;
}

function FormInput({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    required,
    isTextarea
}: FormInputProps) {
    const baseClassName = 'w-full px-4 bg-[#1E1E1E] border border-[#333333] rounded-lg text-white text-sm focus:border-[#01DF82] focus:outline-none transition-colors placeholder:text-[#555555]';

    return (
        <div>
            <label className="block text-sm font-medium text-white mb-2">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            {isTextarea ? (
                <textarea
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    className={`${baseClassName} py-3 resize-none`}
                />
            ) : (
                <input
                    type={type}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={placeholder}
                    className={`${baseClassName} h-12`}
                />
            )}
        </div>
    );
}
