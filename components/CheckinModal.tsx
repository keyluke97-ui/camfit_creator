
'use client';

import { useState, useEffect } from 'react';
import type { Application } from '@/types';

interface CheckinModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CheckinModal({ isOpen, onClose }: CheckinModalProps) {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [inputs, setInputs] = useState<{ [key: string]: { date: string; site: string } }>({});
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchApplications();
            setMessage('');
        }
    }, [isOpen]);

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/applications/my');
            const data = await res.json();
            if (data.applications) {
                setApplications(data.applications);
                // 초기 입력값 설정
                const initialInputs: any = {};
                data.applications.forEach((app: Application) => {
                    initialInputs[app.id] = {
                        date: app.checkInDate || '',
                        site: app.checkInSite || ''
                    };
                });
                setInputs(initialInputs);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (id: string, field: 'date' | 'site', value: string) => {
        setInputs(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const handleSubmit = async (id: string) => {
        setSubmitting(id);
        setMessage('');
        try {
            const { date, site } = inputs[id];
            if (!date || !site) {
                alert('입실일과 사이트를 모두 입력해주세요.');
                return;
            }

            const res = await fetch('/api/applications/checkin', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recordId: id,
                    checkInDate: date,
                    checkInSite: site
                })
            });

            if (!res.ok) throw new Error('Failed');

            setMessage('등록되었습니다! ✅');
            fetchApplications(); // Refresh to show saved state
        } catch (err) {
            alert('등록에 실패했습니다.');
        } finally {
            setSubmitting(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1E1E1E] border border-[#333333] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="p-5 border-b border-[#333333] flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">입실 일정 등록</h2>
                    <button onClick={onClose} className="text-[#666666] hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-10 text-[#B0B0B0]">목록을 불러오는 중...</div>
                    ) : applications.length === 0 ? (
                        <div className="text-center py-10 text-[#B0B0B0]">신청한 유료 협찬 내역이 없습니다.</div>
                    ) : (
                        <div className="space-y-6">
                            {message && (
                                <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-center mb-4">
                                    {message}
                                </div>
                            )}
                            {applications.map((app) => (
                                <div key={app.id} className="bg-[#111] p-4 rounded-lg border border-[#333]">
                                    <h3 className="text-lg font-bold text-white mb-3">{app.accommodationName}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                        <div>
                                            <label className="block text-xs text-[#B0B0B0] mb-1">입실일</label>
                                            <input
                                                type="date"
                                                value={inputs[app.id]?.date}
                                                onChange={(e) => handleInputChange(app.id, 'date', e.target.value)}
                                                className="w-full h-10 px-3 bg-[#2A2A2A] text-white rounded border border-[#333] focus:border-[#01DF82] focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[#B0B0B0] mb-1">입실 사이트</label>
                                            <input
                                                type="text"
                                                placeholder="예: A-1"
                                                value={inputs[app.id]?.site}
                                                onChange={(e) => handleInputChange(app.id, 'site', e.target.value)}
                                                className="w-full h-10 px-3 bg-[#2A2A2A] text-white rounded border border-[#333] focus:border-[#01DF82] focus:outline-none"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleSubmit(app.id)}
                                            disabled={submitting === app.id}
                                            className="h-10 bg-[#01DF82] text-black font-bold rounded hover:bg-[#00C972] transition-colors disabled:opacity-50"
                                        >
                                            {submitting === app.id ? '저장 중...' : '등록하기'}
                                        </button>
                                    </div>
                                    {app.status && (
                                        <p className="text-xs text-[#666666] mt-2">상태: {app.status}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
