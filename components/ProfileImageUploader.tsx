// ProfileImageUploader.tsx - 프로필 이미지 선택·리사이즈·업로드·프리뷰
'use client';

import { useRef, useState, type ChangeEvent } from 'react';

interface ProfileImageUploaderProps {
    imageUrl: string;                  // 현재 이미지 URL('' 가능)
    onUploaded: (url: string) => void; // 업로드 성공 시 새 URL 콜백
}

const MAX_DIMENSION = 1024;

// Canvas로 최대 1024px 리사이즈 → JPEG data URL(품질 0.85). 외부 라이브러리 없음.
async function resizeToDataUrl(file: File): Promise<string> {
    const objectUrl = URL.createObjectURL(file);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = objectUrl;
        });

        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            const scale = MAX_DIMENSION / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas context 생성 실패');
        ctx.drawImage(img, 0, 0, width, height);
        return canvas.toDataURL('image/jpeg', 0.85);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export default function ProfileImageUploader({ imageUrl, onUploaded }: ProfileImageUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    async function handleFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        setError('');
        setUploading(true);
        try {
            const dataUrl = await resizeToDataUrl(file);
            const response = await fetch('/api/creator/profile/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dataUrl, filename: file.name })
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || '업로드에 실패했습니다.');
                return;
            }
            onUploaded(data.imageUrl);
        } catch {
            setError('이미지 처리 중 오류가 발생했습니다.');
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="w-28 h-28 rounded-2xl bg-subtle border border-line overflow-hidden flex items-center justify-center">
                {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="프로필 이미지" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-ink3 text-xs">이미지 없음</span>
                )}
            </div>
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-subtle text-ink text-sm rounded-lg hover:border-brand border border-line transition-colors disabled:opacity-60"
            >
                {uploading ? '업로드 중...' : imageUrl ? '이미지 변경' : '이미지 업로드'}
            </button>
            <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
        </div>
    );
}
