// Mascot.tsx - 캠핏 마스코트 '캠냥이' 표정 이미지 (public/mascot/*.png)
// 정적 PNG. 빈 상태/성공 화면 등 핵심 지점에만 절제해서 사용.
import Image from 'next/image';

// 표정 종류 — public/mascot/ 파일명과 1:1 (오타 방지용 유니온)
export type MascotExpression =
    | 'cheer'        // 꽃가루 축하
    | 'curious'      // 두리번
    | 'empathy'      // 하트
    | 'inspect-chart'
    | 'inspect-memo' // 메모 든
    | 'inspect-photo'
    | 'smile'        // 손 흔들기
    | 'sorry'        // 미안
    | 'thinking'     // 생각
    | 'trophy';      // 트로피

// 표정별 한국어 alt (스크린리더/접근성)
const ALT_TEXT: Record<MascotExpression, string> = {
    cheer: '축하하는 캠냥이',
    curious: '궁금해하는 캠냥이',
    empathy: '공감하는 캠냥이',
    'inspect-chart': '차트를 살펴보는 캠냥이',
    'inspect-memo': '메모하는 캠냥이',
    'inspect-photo': '사진을 살펴보는 캠냥이',
    smile: '인사하는 캠냥이',
    sorry: '미안해하는 캠냥이',
    thinking: '생각하는 캠냥이',
    trophy: '트로피를 든 캠냥이',
};

interface MascotProps {
    expression: MascotExpression;
    size?: number; // px (정사각형). 기본 96
    className?: string;
    priority?: boolean; // 로그인/성공화면 등 above-the-fold면 true
}

export default function Mascot({ expression, size = 96, className = '', priority = false }: MascotProps) {
    return (
        <Image
            src={`/mascot/${expression}.png`}
            alt={ALT_TEXT[expression]}
            width={size}
            height={size}
            priority={priority}
            className={className}
        />
    );
}
