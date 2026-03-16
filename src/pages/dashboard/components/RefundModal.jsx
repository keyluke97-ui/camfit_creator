// RefundModal.jsx - 환불 요청 모달
// ⚠️ deprecated — DashboardPage에서 import 없음. KakaoGuideSheet로 대체됨. 삭제 예정.
import { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { requestRefund } from '../../../utils/dashboardApi'
// CHANGED: Item 4 - 인라인 토큰 제거, 공통 designTokens에서 import
import { BRAND_GREEN, CARD_BACKGROUND, BORDER_COLOR, TEXT_MUTED, OVERLAY_COLOR, DESTRUCTIVE_COLOR, WARNING_BACKGROUND, WARNING_BORDER } from '../../../constants/designTokens'

// CHANGED: 환불 계좌 정보 입력 필드 추가 (은행, 계좌번호, 예금주명)
const BANK_OPTIONS = [
  '국민은행', '신한은행', '하나은행', '우리은행', 'NH농협은행',
  'IBK기업은행', '카카오뱅크', '토스뱅크', '케이뱅크', 'SC제일은행',
  '대구은행', '부산은행', '경남은행', '광주은행', '전북은행',
  '제주은행', '수협은행', '신협', '새마을금고', '우체국',
]

export default function RefundModal({ totalRequested, totalAssigned, onClose, onSuccess }) {
  const [reason, setReason] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const submitLockRef = useRef(false) // CHANGED: 더블클릭 방지용 ref

  const hasAssignedCreators = totalAssigned > 0
  // CHANGED: 모든 필드(사유 + 계좌 정보) 입력 완료 시에만 제출 가능
  const canSubmit =
    reason.trim().length > 0 &&
    bankName.length > 0 &&
    accountNumber.trim().length > 0 &&
    accountHolder.trim().length > 0 &&
    !loading

  const handleSubmit = useCallback(async () => {
    // CHANGED: submitLockRef로 더블클릭/중복 요청 방지
    if (!canSubmit || submitLockRef.current) return
    submitLockRef.current = true
    setLoading(true)
    setError('')

    try {
      const response = await requestRefund({
        reason: reason.trim(),
        bankName,
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
      })
      setResult(response)
      if (onSuccess) onSuccess()
    } catch (submitError) {
      // CHANGED: Item 9 - JWT 만료 시 모달 내에서 로그인 페이지로 리다이렉트
      if (submitError.message?.includes('인증이 만료')) {
        window.location.href = '/dashboard/login'
        return
      }
      setError(submitError.message || '환불 요청 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      submitLockRef.current = false
    }
  }, [canSubmit, reason, bankName, accountNumber, accountHolder, onSuccess])

  if (result) {
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
          <div className="flex justify-center mb-4">
            <div
              className="w-10 h-1 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            />
          </div>

          <div className="text-center py-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgba(1,223,130,0.1)' }}
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

            <h3 className="text-base font-bold text-white mb-2">환불 요청 완료</h3>
            <p className="text-sm mb-3" style={{ color: TEXT_MUTED }}>
              {result.message}
            </p>

            {result.refundNote && (
              <div
                className="rounded-xl p-4 text-left mt-4"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${BORDER_COLOR}`,
                }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: TEXT_MUTED }}>
                  안내사항
                </p>
                <p className="text-sm text-white leading-relaxed">
                  {result.refundNote}
                </p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full mt-6 py-3 rounded-xl text-sm font-bold transition-colors"
              style={{ backgroundColor: BRAND_GREEN, color: '#000000' }}
            >
              확인
            </button>
          </div>
        </motion.div>
      </motion.div>
    )
  }

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
        className="w-full rounded-t-2xl"
        style={{
          maxWidth: 448,
          maxHeight: '85vh', // CHANGED: Item 10 - 모바일 키보드 가림 방지
          backgroundColor: CARD_BACKGROUND,
          border: `1px solid ${BORDER_COLOR}`,
          borderBottom: 'none',
          overflowY: 'auto', // CHANGED: Item 10 - 내용이 길 때 스크롤 가능
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6 pb-8">
        <div className="flex justify-center mb-4">
          <div
            className="w-10 h-1 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          />
        </div>

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">환불 요청</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke={TEXT_MUTED}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {hasAssignedCreators && (
          <div
            className="rounded-xl p-4 mb-4"
            style={{
              backgroundColor: WARNING_BACKGROUND,
              border: `1px solid ${WARNING_BORDER}`,
            }}
          >
            <div className="flex items-start gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="flex-shrink-0 mt-0.5"
              >
                <path
                  d="M12 9v4m0 4h.01M12 2L2 20h20L12 2z"
                  stroke={DESTRUCTIVE_COLOR}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-xs leading-relaxed" style={{ color: DESTRUCTIVE_COLOR }}>
                이미 배정된 크리에이터가 {totalAssigned}명 있습니다.
                부분 환불로 처리되며, 정확한 환불 금액은 담당자 확인 후 안내드립니다.
              </p>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label
            className="block text-xs font-medium mb-2"
            style={{ color: TEXT_MUTED }}
          >
            환불 사유
          </label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="환불 사유를 입력해주세요"
            rows={3}
            className="w-full rounded-xl p-4 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-1"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: `1px solid ${BORDER_COLOR}`,
            }}
          />
        </div>

        {/* CHANGED: 환불 계좌 정보 입력 섹션 추가 */}
        <div
          className="rounded-xl p-4 mb-4"
          style={{
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: `1px solid ${BORDER_COLOR}`,
          }}
        >
          <p className="text-xs font-medium mb-3" style={{ color: TEXT_MUTED }}>
            환불 계좌 정보
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: TEXT_MUTED }}>
                은행 선택
              </label>
              <select
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${BORDER_COLOR}`,
                  color: bankName ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='rgba(255,255,255,0.4)' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                }}
              >
                <option value="" disabled>은행을 선택해주세요</option>
                {BANK_OPTIONS.map((bank) => (
                  <option key={bank} value={bank} style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}>
                    {bank}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: TEXT_MUTED }}>
                계좌번호
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value.replace(/[^0-9]/g, ''))}
                placeholder="'-' 없이 숫자만 입력"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${BORDER_COLOR}`,
                }}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: TEXT_MUTED }}>
                예금주명
              </label>
              <input
                type="text"
                value={accountHolder}
                onChange={(event) => setAccountHolder(event.target.value)}
                placeholder="예금주명을 입력해주세요"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${BORDER_COLOR}`,
                }}
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm mb-3" style={{ color: '#FF4444' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
          style={{
            backgroundColor: canSubmit ? DESTRUCTIVE_COLOR : '#333333',
            color: canSubmit ? '#FFFFFF' : TEXT_MUTED,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  opacity="0.3"
                />
                <path
                  d="M12 2a10 10 0 0 1 10 10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              처리 중...
            </>
          ) : canSubmit ? (
            '환불 요청'
          ) : (
            '필수 항목을 모두 입력해주세요'
          )}
        </button>
        </div>{/* CHANGED: Item 10 - p-6 pb-8 래핑 div 닫기 */}
      </motion.div>
    </motion.div>
  )
}
