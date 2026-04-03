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

/** 동의 항목 라벨 */
const CONSENT_ITEMS = [
    { key: 'consentPrivacy' as const, label: '개인정보 수집 및 이용 동의' },
    { key: 'consentTax' as const, label: '원천징수 동의' },
    { key: 'consentContent' as const, label: '콘텐츠 사용 권한 동의' },
    { key: 'consentPayment' as const, label: '지급 조건 동의' }
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
        consentTax: false,
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
        setFormData(previous => ({
            ...previous,
            consentPrivacy: newValue,
            consentTax: newValue,
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
        if (!formData.consentPrivacy || !formData.consentTax || !formData.consentContent || !formData.consentPayment) return false;
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

            setIsComplete(true);
        } catch (error) {
            console.error('Premium register submit error:', error);
            setErrorMessage('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setSubmitting(false);
        }
    }

    // ── 등록 완료 화면 ──
    if (isComplete) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-6">
                <div className="w-16 h-16 bg-[#01DF82]/10 rounded-full flex items-center justify-center">
                    <span className="text-3xl">✅</span>
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-white mb-2">프리미엄 협찬 등록 완료</h3>
                    <p className="text-sm text-[#888888] leading-relaxed">
                        재로그인하시면 프리미엄 협찬 탭이<br />
                        활성화됩니다.
                    </p>
                </div>
                <button
                    onClick={() => {
                        fetch('/api/auth/logout', { method: 'POST' }).then(() => {
                            router.push('/login');
                        });
                    }}
                    className="px-6 py-3 bg-[#01DF82] text-black font-bold text-sm rounded-xl hover:bg-[#00C972] transition-colors"
                >
                    재로그인하기
                </button>
            </div>
        );
    }

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

            {/* 사업자 조건부 필드 */}
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

                    {/* 사업자등록증 안내 — 파일 업로드 미구현, 카카오톡 CTA */}
                    <div className="bg-[#1E1E1E] border border-[#333333] rounded-xl p-4">
                        <p className="text-sm text-[#888888] mb-3">
                            사업자등록증은 캠핏 카카오톡 채널로 별도 제출해주세요.
                        </p>
                        <a
                            href={KAKAO_CHANNEL_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FEE500] text-[#3C1E1E] font-bold text-xs rounded-lg hover:bg-[#FDD800] transition-colors"
                        >
                            <span>💬</span>
                            <span>카카오톡으로 제출하기</span>
                        </a>
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

            {/* 개별 동의 항목 */}
            <div className="space-y-2">
                {CONSENT_ITEMS.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => handleCheckboxToggle(item.key)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#1E1E1E] transition-colors"
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
                        <span className={`text-sm ${formData[item.key] ? 'text-white' : 'text-[#888888]'}`}>
                            {item.label} <span className="text-red-400">*</span>
                        </span>
                    </button>
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
