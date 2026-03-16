// StatusCard.jsx - 프리미엄 협찬 신청 상태 카드 (신청 정보 + 결제 요약)

import { motion } from 'framer-motion'
import { BRAND_GREEN, CARD_BACKGROUND, BORDER_COLOR, TEXT_MUTED } from '../../../constants/designTokens'

// CHANGED: 입금 안내용 상수 (입금 미확인 시 표시)
const KAKAO_LINK = 'http://pf.kakao.com/_fBxaQG/chat'
const BANK_INFO = {
  bankName: '하나은행',
  accountNumber: '225-910068-71204',
  accountHolder: '(주) 넥스트에디션',
}

/** 숫자를 한국 원화 포맷으로 변환 */
function formatCurrency(value) {
  if (!value && value !== 0) return '-'
  return new Intl.NumberFormat('ko-KR').format(value) + '원'
}

/** 단일 정보 행 */
function InfoRow({ label, value, highlight = false }) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm" style={{ color: TEXT_MUTED }}>{label}</span>
      <span
        className="text-sm font-medium"
        style={{ color: highlight ? BRAND_GREEN : '#FFFFFF' }}
      >
        {value || '-'}
      </span>
    </div>
  )
}

// CHANGED: 입금 확인 완료 시 — 정상 금액 표시 섹션
function PaymentConfirmedSection({ requiredPaymentAmount }) {
  return (
    <div
      className="flex justify-between items-center mt-3 pt-3"
      style={{ borderTop: `1px solid ${BORDER_COLOR}` }}
    >
      <span className="text-sm font-medium text-white">신청 금액 (VAT 포함)</span>
      <span className="text-base font-bold" style={{ color: BRAND_GREEN }}>
        {formatCurrency(requiredPaymentAmount)}
      </span>
    </div>
  )
}

// CHANGED: 입금 미확인 시 — 입금 안내 + 계좌 정보 + 카카오톡 링크 표시
function PaymentPendingSection({ requiredPaymentAmount }) {
  return (
    <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER_COLOR}` }}>
      {/* 입금 필요 금액 */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium" style={{ color: '#FF8C00' }}>입금 필요 금액 (VAT 포함)</span>
        <span className="text-base font-bold" style={{ color: '#FF8C00' }}>
          {formatCurrency(requiredPaymentAmount)}
        </span>
      </div>

      {/* 입금 계좌 안내 박스 */}
      <div
        className="rounded-xl p-4 mb-3"
        style={{
          backgroundColor: 'rgba(255,140,0,0.06)',
          border: '1px solid rgba(255,140,0,0.2)',
        }}
      >
        <p className="text-xs font-medium mb-2.5" style={{ color: '#FF8C00' }}>
          아래 계좌로 입금 후 카카오톡으로 확인 요청해주세요
        </p>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: TEXT_MUTED }}>입금 은행</span>
            <span className="text-xs text-white">{BANK_INFO.bankName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: TEXT_MUTED }}>계좌번호</span>
            <span className="text-xs font-medium text-white">{BANK_INFO.accountNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: TEXT_MUTED }}>예금주</span>
            <span className="text-xs text-white">{BANK_INFO.accountHolder}</span>
          </div>
        </div>
      </div>

      {/* 카카오톡 입금 확인 요청 버튼 */}
      <a
        href={KAKAO_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
        style={{ backgroundColor: '#FEE500', color: '#191919' }}
      >
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M9 1.5C4.86 1.5 1.5 4.136 1.5 7.385c0 2.072 1.364 3.895 3.43 4.95l-.88 3.28a.188.188 0 0 0 .274.204L8.4 13.22a9.4 9.4 0 0 0 .6.038c4.14 0 7.5-2.636 7.5-5.885C16.5 4.137 13.14 1.5 9 1.5z"
            fill="#191919"
          />
        </svg>
        카카오톡으로 입금 확인 요청하기
      </a>
    </div>
  )
}

export default function StatusCard({ application }) {
  if (!application) return null

  // CHANGED: paymentConfirmed, requiredPaymentAmount 추가 구조 분해
  const {
    accommodationName,
    selectedPlan,
    region,
    crew,
    representativeName,
    phone,
    paymentConfirmed,
    requiredPaymentAmount,
  } = application

  return (
    <motion.div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: CARD_BACKGROUND,
        border: `1px solid ${BORDER_COLOR}`,
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 카드 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${BRAND_GREEN}15` }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              stroke={BRAND_GREEN}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="text-base font-bold text-white">신청 정보</h2>
      </div>

      {/* 캠핑장 이름 강조 */}
      <div
        className="rounded-xl px-4 py-3 mb-4"
        style={{ backgroundColor: `${BRAND_GREEN}10` }}
      >
        <p className="text-xs mb-1" style={{ color: TEXT_MUTED }}>캠핑장</p>
        <p className="text-base font-bold" style={{ color: BRAND_GREEN }}>
          {accommodationName}
        </p>
      </div>

      {/* 상세 정보 */}
      <div
        className="divide-y"
        style={{ borderColor: BORDER_COLOR }}
      >
        <InfoRow label="선택 플랜" value={selectedPlan} />
        <InfoRow label="지역" value={region} />
        <InfoRow label="대표자명" value={representativeName} />
        <InfoRow label="연락처" value={phone} />
      </div>

      {/* 모집 인원 + 금액 요약 */}
      <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${BORDER_COLOR}` }}>
        <p className="text-xs font-medium mb-3" style={{ color: TEXT_MUTED }}>
          모집 인원 / 금액
        </p>
        <div className="space-y-2">
          {crew.icon.requested > 0 && (
            <CrewRow
              emoji="⭐️"
              label="아이콘"
              count={crew.icon.requested}
              unitPrice={crew.icon.unitPrice}
            />
          )}
          {crew.partner.requested > 0 && (
            <CrewRow
              emoji="✔️"
              label="파트너"
              count={crew.partner.requested}
              unitPrice={crew.partner.unitPrice}
            />
          )}
          {crew.rising.requested > 0 && (
            <CrewRow
              emoji="🔥"
              label="라이징"
              count={crew.rising.requested}
              unitPrice={crew.rising.unitPrice}
            />
          )}
        </div>

        {/* CHANGED: 입금 확인 여부에 따라 다른 금액 섹션 렌더링 */}
        {paymentConfirmed ? (
          <PaymentConfirmedSection requiredPaymentAmount={requiredPaymentAmount} />
        ) : (
          <PaymentPendingSection requiredPaymentAmount={requiredPaymentAmount} />
        )}
      </div>
    </motion.div>
  )
}

/** 등급별 모집 인원 행 */
function CrewRow({ emoji, label, count, unitPrice }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-white">
        {emoji} {label} {count}명
      </span>
      <span className="text-sm" style={{ color: TEXT_MUTED }}>
        {formatCurrency(unitPrice)} × {count}
      </span>
    </div>
  )
}
