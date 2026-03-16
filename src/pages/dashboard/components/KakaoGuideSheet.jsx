// KakaoGuideSheet.jsx - 인원 변경 / 환불 요청을 카카오톡 상담으로 연결하는 bottom-sheet

import { motion } from 'framer-motion'
import { BRAND_GREEN, CARD_BACKGROUND, BORDER_COLOR, TEXT_MUTED, OVERLAY_COLOR } from '../../../constants/designTokens'

// CHANGED: 기존 ModifyCrewModal/RefundModal 제거 후 카카오톡 상담 방식으로 전환
const KAKAO_LINK = 'http://pf.kakao.com/_fBxaQG/chat'

/** 안내 항목 컴포넌트 */
function GuideItem({ emoji, text }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-sm shrink-0">{emoji}</span>
      <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>{text}</p>
    </div>
  )
}

/** 유형별 안내 내용 */
const GUIDE_CONTENT = {
  modify: {
    title: '인원 변경 안내',
    guideItems: [
      {
        emoji: '✅',
        text: '매칭이 완료되지 않은 인원은 감소 가능하며, 차액은 환불됩니다.',
      },
      {
        emoji: '➕',
        text: '인원 증가 시 추가 금액 입금이 필요합니다.',
      },
    ],
    requestLabel: '카카오톡 채널에서 아래 내용을 먼저 남겨주세요',
  },
  refund: {
    title: '환불 요청 안내',
    guideItems: [
      {
        emoji: '💰',
        text: '매칭이 완료되지 않은 인원에 한해 환불이 가능합니다.',
      },
      {
        emoji: '⚠️',
        text: '이미 배정된 크리에이터는 환불 대상에서 제외됩니다.',
      },
    ],
    requestLabel: '카카오톡 채널에서 아래 내용을 먼저 남겨주세요',
  },
}

export default function KakaoGuideSheet({ type, accommodationName, onClose }) {
  const guide = GUIDE_CONTENT[type] || GUIDE_CONTENT.modify

  function handleKakaoOpen() {
    window.open(KAKAO_LINK, '_blank', 'noopener,noreferrer')
    onClose()
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

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">{guide.title}</h3>
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

        {/* 안내 항목 */}
        <div
          className="rounded-xl p-4 mb-4 space-y-3"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER_COLOR}` }}
        >
          {guide.guideItems.map((item, index) => (
            <GuideItem key={index} emoji={item.emoji} text={item.text} />
          ))}
        </div>

        {/* 카카오 채널 문의 방법 안내 */}
        <div
          className="rounded-xl p-4 mb-5"
          style={{ backgroundColor: `${BRAND_GREEN}08`, border: `1px solid ${BRAND_GREEN}25` }}
        >
          <p className="text-xs font-medium mb-3" style={{ color: BRAND_GREEN }}>
            {guide.requestLabel}
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: TEXT_MUTED }}>🏕️ 캠핑장 이름</span>
              <span className="text-xs font-medium text-white">{accommodationName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: TEXT_MUTED }}>👤 대표자명</span>
              <span className="text-xs" style={{ color: TEXT_MUTED }}>직접 입력</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: TEXT_MUTED }}>
                {type === 'modify' ? '🔢 변경할 인원 (등급별)' : '📋 환불 요청 내용'}
              </span>
              <span className="text-xs" style={{ color: TEXT_MUTED }}>직접 입력</span>
            </div>
          </div>
        </div>

        {/* 소요 시간 안내 */}
        <div className="flex items-center gap-2 mb-5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke={TEXT_MUTED} strokeWidth="1.5" />
            <path d="M12 7v5l3 3" stroke={TEXT_MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-xs" style={{ color: TEXT_MUTED }}>
            상담원 매칭까지 최대 <span className="font-medium text-white">2~3 영업일</span> 소요됩니다.
          </p>
        </div>

        {/* 카카오톡 채널 버튼 */}
        <button
          onClick={handleKakaoOpen}
          className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{ backgroundColor: '#FEE500', color: '#191919' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M9 1.5C4.86 1.5 1.5 4.136 1.5 7.385c0 2.072 1.364 3.895 3.43 4.95l-.88 3.28a.188.188 0 0 0 .274.204L8.4 13.22a9.4 9.4 0 0 0 .6.038c4.14 0 7.5-2.636 7.5-5.885C16.5 4.137 13.14 1.5 9 1.5z"
              fill="#191919"
            />
          </svg>
          카카오톡 채널로 문의하기
        </button>
      </motion.div>
    </motion.div>
  )
}
