// BrandIcon.tsx - 캠핏 3D 오브젝트 아이콘 (public/icons/*.png) — 이모지 대체용
// 텍스트 옆 인라인으로 쓰는 작은 정적 아이콘.
import Image from 'next/image';

// 아이콘 종류 — public/icons/ 파일명과 1:1 (오타 방지용 유니온)
export type BrandIconName =
    | 'briefcase'
    | 'broom'
    | 'camera'
    | 'chart'
    | 'coupon'
    | 'heart'
    | 'magnifier'
    | 'memo'
    | 'sparkle'
    | 'speech'
    | 'star'
    | 'sun'
    | 'target'
    | 'tent'
    // CHANGED: 이모지 대체용 추가 아이콘 (사용자 제공 누끼)
    | 'bulb'
    | 'calendar'
    | 'clipboard'
    | 'link'
    | 'location'
    | 'message';

interface BrandIconProps {
    name: BrandIconName;
    size?: number; // px (정사각형). 기본 18 (인라인 이모지 크기)
    className?: string;
    alt?: string; // 의미 전달이 필요하면 지정, 기본은 장식(alt="")
}

export default function BrandIcon({ name, size = 18, className = '', alt = '' }: BrandIconProps) {
    return (
        <Image
            src={`/icons/${name}.png`}
            alt={alt}
            width={size}
            height={size}
            className={`inline-block align-[-0.15em] ${className}`}
        />
    );
}
