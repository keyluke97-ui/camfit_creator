// ModifyCrewModal.jsx - 크루 인원 변경 요청 모달 (등급별 ±1 스테퍼 + 실시간 가격 재계산)
// ⚠️ deprecated — DashboardPage에서 import 없음. KakaoGuideSheet로 대체됨. 삭제 예정.

import { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { modifyCrew } from '../../../utils/dashboardApi'
// CHANGED: M-2 - 인라인 토큰 제거, 공통 designTokens에서 import
import { BRAND_GREEN, CARD_BACKGROUND, BORDER_COLOR, TEXT_MUTED, OVERLAY_COLOR } from '../../../constants/designTokens'

/** 등급 설정 (key, emoji, label) */
const GRADE_CONFIG = [
  { key: 'icon', emoji: '⭐️', label: '아이콘' },
  { key: 'partner', emoji: '✔️', label: '파트너' },
  { key: 'rising', emoji: '🔥', label: '라이징' },
]

/** 추가결제 계좌 정보 */
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

/** VAT 포함 총액 계산 */
function calculateTotalWithVat(crewCounts, unitPrices) {
  const subtotal =
    (crewCounts.icon * unitPrices.icon) +
    (crewCounts.partner * unitPrices.partner) +
    (crewCounts.rising * unitPrices.rising)
  return Math.round(subtotal * 1.1)
}

/** 등급별 최대 인원 제한 */
const MAX_CREW_PER_GRADE = 20

/** ±1 스테퍼 컴포넌트 */
// CHANGED: Item 7 - maximum prop 추가로 무제한 증가 방지
function Stepper({ value, minimum, maximum = MAX_CREW_PER_GRADE, onChange, disabled }) {
  const canDecrease = value > minimum && !disabled
  const canIncrease = value < maximum && !disabled

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => canDecrease && onChange(value - 1)}
        disabled={!canDecrease}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold transition-all"
        style={{
          backgroundColor: canDecrease ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
          color: canDecrease ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
          cursor: canDecrease ? 'pointer' : 'not-allowed',
        }}
      >
        −
      </button>
      <span className="w-8 text-center text-sm font-bold text-white">{value}</span>
      <button
        onClick={() => canIncrease && onChange(value + 1)}
        disabled={!canIncrease}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold transition-all"
        style={{
          backgroundColor: canIncrease ? `${BRAND_GREEN}20` : 'rgba(255,255,255,0.03)',
          color: canIncrease ? BRAND_GREEN : 'rgba(255,255,255,0.2)',
          cursor: canIncrease ? 'pointer' : 'not-allowed',
        }}
      >
        +
      </button>
    </div>
  )
}

/** 등급별 인원 변경 행 */
function GradeRow({ emoji, label, value, minimum, unitPrice, onChange, disabled }) {
  return (
    <div
      className="flex items-center justify-between py-3"
      style={{ borderBottom: `1px solid ${BORDER_COLOR}` }}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-white">{emoji} {label}</span>
          {minimum > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: TEXT_MUTED }}>
              최소 {minimum}명
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: TEXT_MUTED }}>
          {formatCurrency(unitPrice)} / 1명
        </span>
      </div>
      <Stepper
        value={value}
        minimum={minimum}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  )
}

/** 성공 결과 화면 */
function SuccessResult({ result, onClose }) {
  const needsPayment = result.needsAdditionalPayment
  const priceDifference = result.priceDifference || 0

  return (
    <div className="text-center">
      {/* 성공 아이콘 */}
      <div
        className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
        style={{ backgroundColor: `${BRAND_GREEN}15` }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke={BRAND_GREEN}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <p className="text-base font-bold text-white mb-2">인원 변경 완료</p>
      <p className="text-sm mb-4" style={{ color: TEXT_MUTED }}>
        요청하신 인원 변경이 정상 처리되었습니다.
      </p>

      {/* 추가 결제 필요 시 계좌 안내 */}
      {needsPayment && priceDifference > 0 && (
        <div
          className="rounded-xl p-4 mb-4 text-left"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${BRAND_GREEN}30` }}
        >
          <p className="text-sm font-medium mb-3" style={{ color: BRAND_GREEN }}>
            추가 결제 안내
          </p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: TEXT_MUTED }}>추가 금액 (VAT 포함)</span>
              <span className="text-sm font-bold" style={{ color: BRAND_GREEN }}>
                {formatCurrency(priceDifference)}
              </span>
            </div>
            <div
              className="pt-2 mt-2 space-y-1.5"
              style={{ borderTop: `1px solid ${BORDER_COLOR}` }}
            >
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: TEXT_MUTED }}>입금 은행</span>
                <span className="text-xs text-white">{BANK_INFO.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: TEXT_MUTED }}>계좌번호</span>
                <span className="text-xs text-white">{BANK_INFO.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: TEXT_MUTED }}>예금주</span>
                <span className="text-xs text-white">{BANK_INFO.accountHolder}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 감소 시 환불 안내 */}
      {priceDifference < 0 && (
        <div
          className="rounded-xl p-4 mb-4 text-left"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER_COLOR}` }}
        >
          <p className="text-sm" style={{ color: TEXT_MUTED }}>
            차액 <span className="font-bold text-white">{formatCurrency(Math.abs(priceDifference))}</span>은 별도 안내 후 환불됩니다.
          </p>
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full py-3 rounded-xl text-sm font-semibold"
        style={{ backgroundColor: BRAND_GREEN, color: '#000000' }}
      >
        확인
      </button>
    </div>
  )
}

export default function ModifyCrewModal({ application, recruitment, onClose, onSuccess }) {
  /** 단가 추출 */
  const unitPrices = useMemo(() => ({
    icon: application?.crew?.icon?.unitPrice || 300000,
    partner: application?.crew?.partner?.unitPrice || 100000,
    rising: application?.crew?.rising?.unitPrice || 50000,
  }), [application])

  /** 등급별 최소값 (이미 배정된 수) */
  const minimumCounts = useMemo(() => ({
    icon: recruitment?.icon?.assigned || 0,
    partner: recruitment?.partner?.assigned || 0,
    rising: recruitment?.rising?.assigned || 0,
  }), [recruitment])

  /** 현재 신청 인원 (초기값) */
  const originalCounts = useMemo(() => ({
    icon: application?.crew?.icon?.requested || 0,
    partner: application?.crew?.partner?.requested || 0,
    rising: application?.crew?.rising?.requested || 0,
  }), [application])

  const [crewCounts, setCrewCounts] = useState(originalCounts)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  /** 인원 변경 핸들러 */
  const handleCountChange = useCallback((gradeKey, newValue) => {
    setCrewCounts(previous => ({ ...previous, [gradeKey]: newValue }))
    setError('')
  }, [])

  /** 변경 여부 판별 */
  const hasChanged = useMemo(() => {
    return (
      crewCounts.icon !== originalCounts.icon ||
      crewCounts.partner !== originalCounts.partner ||
      crewCounts.rising !== originalCounts.rising
    )
  }, [crewCounts, originalCounts])

  /** 실시간 금액 계산 */
  const originalTotal = useMemo(
    () => calculateTotalWithVat(originalCounts, unitPrices),
    [originalCounts, unitPrices]
  )
  const newTotal = useMemo(
    () => calculateTotalWithVat(crewCounts, unitPrices),
    [crewCounts, unitPrices]
  )
  const priceDifference = newTotal - originalTotal

  /** 변경 요청 제출 */
  const handleSubmit = useCallback(async () => {
    if (!hasChanged) return
    setLoading(true)
    setError('')

    try {
      const response = await modifyCrew({
        icon: crewCounts.icon,
        partner: crewCounts.partner,
        rising: crewCounts.rising,
      })
      setResult(response)
      onSuccess()
    } catch (submitError) {
      // CHANGED: Item 9 - JWT 만료 시 모달 내에서 로그인 페이지로 리다이렉트
      if (submitError.message?.includes('인증이 만료')) {
        window.location.href = '/dashboard/login'
        return
      }
      setError(submitError.message || '인원 변경 요청에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [hasChanged, crewCounts, onSuccess])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: OVERLAY_COLOR }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full rounded-t-2xl p-6 pb-8"
        style={{
          maxWidth: 448,
          backgroundColor: CARD_BACKGROUND,
          border: `1px solid ${BORDER_COLOR}`,
          borderBottom: 'none',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
        </div>

        {result ? (
          // CHANGED: M-3 - handleSuccessClose 불필요 래퍼 제거, onClose 직접 전달
          <SuccessResult result={result} onClose={onClose} />
        ) : (
          <>
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">인원 변경 요청</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke={TEXT_MUTED} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* 안내 문구 */}
            <p className="text-xs mb-4" style={{ color: TEXT_MUTED }}>
              이미 배정된 크리에이터 수 이하로는 줄일 수 없습니다.
            </p>

            {/* 등급별 스테퍼 */}
            <div className="mb-4">
              {GRADE_CONFIG.map(({ key, emoji, label }) => (
                <GradeRow
                  key={key}
                  emoji={emoji}
                  label={label}
                  value={crewCounts[key]}
                  minimum={minimumCounts[key]}
                  unitPrice={unitPrices[key]}
                  onChange={(newValue) => handleCountChange(key, newValue)}
                  disabled={loading}
                />
              ))}
            </div>

            {/* 금액 비교 */}
            <div
              className="rounded-xl p-4 mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs" style={{ color: TEXT_MUTED }}>기존 금액 (VAT 포함)</span>
                <span className="text-sm text-white">{formatCurrency(originalTotal)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs" style={{ color: TEXT_MUTED }}>변경 후 금액 (VAT 포함)</span>
                <span className="text-sm font-bold text-white">{formatCurrency(newTotal)}</span>
              </div>
              {hasChanged && (
                <div
                  className="flex justify-between items-center pt-2"
                  style={{ borderTop: `1px solid ${BORDER_COLOR}` }}
                >
                  <span className="text-xs" style={{ color: TEXT_MUTED }}>차액</span>
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: priceDifference > 0 ? '#FF6B6B' : priceDifference < 0 ? BRAND_GREEN : '#FFFFFF',
                    }}
                  >
                    {priceDifference > 0 ? '+' : ''}{formatCurrency(priceDifference)}
                  </span>
                </div>
              )}
            </div>

            {/* 에러 메시지 */}
            {error && (
              <p className="text-sm mb-3" style={{ color: '#FF4444' }}>{error}</p>
            )}

            {/* 제출 버튼 */}
            <button
              onClick={handleSubmit}
              disabled={!hasChanged || loading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: hasChanged && !loading ? BRAND_GREEN : '#333333',
                color: hasChanged && !loading ? '#000000' : TEXT_MUTED,
                cursor: hasChanged && !loading ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  처리 중...
                </span>
              ) : hasChanged ? (
                '변경 요청'
              ) : (
                '변경 사항 없음'
              )}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
