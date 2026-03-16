// LoginPage.jsx - 캠지기 대시보드 로그인 (사업자번호 + 캠핑장 선택 + 연락처 뒷자리 4자리)

import { useState, useCallback, useEffect } from 'react' // CHANGED: Item 5 - useEffect 추가
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { lookupAccommodations, login, isAuthenticated } from '../../utils/dashboardApi'
// CHANGED: Item 4 - 인라인 토큰 제거, 공통 designTokens에서 import
import { BRAND_GREEN, BACKGROUND_COLOR, CARD_BACKGROUND, BORDER_COLOR, TEXT_MUTED } from '../../constants/designTokens'

/** 사업자번호 포맷: 000-00-00000 */
function formatBusinessNumber(value) {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}

function extractDigits(formatted) {
  return formatted.replace(/[^0-9]/g, '')
}

export default function LoginPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState('input') // 'input' | 'select'
  const [businessNumber, setBusinessNumber] = useState('')
  const [accommodations, setAccommodations] = useState([]) // CHANGED: { name, recordId } 객체 배열로 변경
  const [selectedAccommodation, setSelectedAccommodation] = useState(null) // CHANGED: { name, recordId } 객체로 변경
  const [phoneLastFour, setPhoneLastFour] = useState('') // CHANGED: 연락처 뒷자리 4자리 state 추가
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // CHANGED: Item 5 - hooks 규칙 위반 수정: 조건부 return을 useEffect로 이동
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  /** 1단계: 사업자번호로 캠핑장 조회 */
  const handleLookup = useCallback(async () => {
    const digits = extractDigits(businessNumber)
    if (digits.length !== 10) {
      setError('사업자 번호 10자리를 입력해주세요.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await lookupAccommodations(digits)

      if (!data.accommodations || data.accommodations.length === 0) {
        setError('해당 사업자 번호로 등록된 캠핑장이 없습니다.')
        return
      }

      // CHANGED: lookup 응답의 { name, recordId } 객체를 그대로 보존
      const accommodationItems = data.accommodations.map((item) =>
        typeof item === 'string' ? { name: item, recordId: null } : item
      )
      setAccommodations(accommodationItems)

      // CHANGED: 캠핑장이 1개여도 연락처 뒷자리 입력이 필요하므로 항상 Step 2로 이동
      if (accommodationItems.length === 1) {
        setSelectedAccommodation(accommodationItems[0])
      }
      setStep('select')
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [businessNumber])

  /** 2단계: 캠핑장 선택 + 연락처 뒷자리 입력 후 로그인 */
  // CHANGED: phoneLastFour 검증 추가
  const handleLogin = useCallback(
    async () => {
      setLoading(true)
      setError('')

      try {
        const cleanDigits = extractDigits(businessNumber)

        if (!selectedAccommodation) {
          setError('캠핑장을 선택해주세요.')
          return
        }

        const cleanPhone = phoneLastFour.replace(/[^0-9]/g, '')
        if (cleanPhone.length !== 4) {
          setError('연락처 뒷자리 4자리를 입력해주세요.')
          return
        }

        // CHANGED: recordId를 함께 전달하여 정확한 레코드로 인증
        await login(cleanDigits, selectedAccommodation.name, cleanPhone, selectedAccommodation.recordId)
        navigate('/dashboard', { replace: true })
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    },
    [businessNumber, selectedAccommodation, phoneLastFour, navigate]
  )

  /** Enter 키 처리 */
  // CHANGED: Step 2 조건에 phoneLastFour 4자리 검증 추가
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !loading) {
      if (step === 'input') handleLookup()
      else if (step === 'select' && selectedAccommodation?.name && phoneLastFour.replace(/[^0-9]/g, '').length === 4) handleLogin()
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ backgroundColor: BACKGROUND_COLOR }}
    >
      <div className="w-full" style={{ maxWidth: 448 }}>
        {/* 로고 / 제목 */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
            style={{ backgroundColor: `${BRAND_GREEN}15` }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke={BRAND_GREEN}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">프리미엄 협찬 대시보드</h1>
          <p className="text-sm mt-1" style={{ color: TEXT_MUTED }}>
            신청 현황과 크리에이터 배정을 확인하세요
          </p>
        </div>

        {/* 카드 */}
        <motion.div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: CARD_BACKGROUND,
            border: `1px solid ${BORDER_COLOR}`,
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AnimatePresence mode="wait">
            {step === 'input' ? (
              <motion.div
                key="input-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <label
                  className="block text-sm font-medium text-white mb-2"
                >
                  사업자 번호
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="000-00-00000"
                  value={businessNumber}
                  onChange={(event) => {
                    setBusinessNumber(formatBusinessNumber(event.target.value))
                    setError('')
                  }}
                  onKeyDown={handleKeyDown}
                  className="w-full px-4 py-3 rounded-xl text-white text-base"
                  style={{
                    backgroundColor: '#252525',
                    border: `1px solid ${error ? '#FF4444' : BORDER_COLOR}`,
                    transition: 'border-color 0.2s',
                  }}
                  autoFocus
                  disabled={loading}
                />
                <p
                  className="text-xs mt-2"
                  style={{ color: TEXT_MUTED }}
                >
                  프리미엄 협찬 신청 시 입력한 사업자 번호를 입력해주세요
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="select-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center mb-4">
                  <button
                    onClick={() => {
                      setStep('input')
                      setSelectedAccommodation(null)
                      setPhoneLastFour('') // CHANGED: 뒤로가기 시 연락처 뒷자리도 초기화
                      setError('')
                    }}
                    className="mr-2 p-1 rounded-lg"
                    style={{ color: TEXT_MUTED }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                  <span className="text-sm font-medium text-white">
                    본인 확인
                  </span>
                </div>

                {/* CHANGED: 캠핑장 선택 (여러 개인 경우만 표시) */}
                {/* CHANGED: 캠핑장 선택 — 객체 기반 비교로 recordId 보존 */}
                {accommodations.length > 1 && (
                  <div className="space-y-2">
                    {accommodations.map((item) => (
                      <button
                        key={item.recordId || item.name}
                        onClick={() => {
                          setSelectedAccommodation(item)
                          setError('')
                        }}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                        style={{
                          backgroundColor:
                            selectedAccommodation?.recordId === item.recordId ? `${BRAND_GREEN}15` : '#252525',
                          border: `1px solid ${
                            selectedAccommodation?.recordId === item.recordId ? BRAND_GREEN : BORDER_COLOR
                          }`,
                          color: selectedAccommodation?.recordId === item.recordId ? BRAND_GREEN : '#FFFFFF',
                        }}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* CHANGED: 캠핑장이 1개인 경우 선택된 캠핑장명 표시 */}
                {accommodations.length === 1 && (
                  <div
                    className="px-4 py-3 rounded-xl text-sm mb-4"
                    style={{
                      backgroundColor: `${BRAND_GREEN}15`,
                      border: `1px solid ${BRAND_GREEN}`,
                      color: BRAND_GREEN,
                    }}
                  >
                    {selectedAccommodation?.name}
                  </div>
                )}

                {/* CHANGED: 연락처 뒷자리 4자리 입력 필드 추가 */}
                <div className={accommodations.length > 1 ? 'mt-4' : ''}>
                  <label
                    className="block text-sm font-medium text-white mb-2"
                  >
                    연락처 뒷자리 4자리
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="0000"
                    value={phoneLastFour}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                      setPhoneLastFour(digits)
                      setError('')
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full px-4 py-3 rounded-xl text-white text-base"
                    style={{
                      backgroundColor: '#252525',
                      border: `1px solid ${error ? '#FF4444' : BORDER_COLOR}`,
                      transition: 'border-color 0.2s',
                    }}
                    autoFocus
                    disabled={loading}
                  />
                  <p
                    className="text-xs mt-2"
                    style={{ color: TEXT_MUTED }}
                  >
                    프리미엄 협찬 신청 시 입력한 연락처의 뒷자리 4자리
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 에러 메시지 */}
          <AnimatePresence>
            {error && (
              <motion.p
                className="text-sm mt-3"
                style={{ color: '#FF4444' }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* CHANGED: 버튼 비활성 조건을 변수로 추출하여 3중 반복 제거 */}
          {(() => {
            const isButtonDisabled =
              loading ||
              (step === 'input' && extractDigits(businessNumber).length !== 10) ||
              (step === 'select' && (!selectedAccommodation?.name || phoneLastFour.replace(/[^0-9]/g, '').length !== 4))

            return (
          <button
            onClick={() => {
              if (step === 'input') handleLookup()
              else handleLogin()
            }}
            disabled={isButtonDisabled}
            className="w-full mt-5 py-3.5 rounded-xl text-base font-semibold transition-all"
            style={{
              backgroundColor: isButtonDisabled ? '#333333' : BRAND_GREEN,
              color: isButtonDisabled ? TEXT_MUTED : '#000000',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                확인 중...
              </span>
            ) : step === 'input' ? (
              '다음'
            ) : (
              '로그인'
            )}
          </button>
            )
          })()}
        </motion.div>

        {/* 하단 안내 */}
        <p
          className="text-center text-xs mt-6"
          style={{ color: TEXT_MUTED }}
        >
          문의사항은{' '}
          <a
            href="https://pf.kakao.com/_Cxfnxfxj"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: BRAND_GREEN }}
          >
            카카오톡 채널
          </a>
          로 연락주세요
        </p>
      </div>
    </div>
  )
}
