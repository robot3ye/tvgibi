'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ScrambleText from '../../../components/ui/ScrambleText';

export default function AdminLogin() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [glitchFx, setGlitchFx] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Random glitch effect interval
        const interval = setInterval(() => {
            if (Math.random() > 0.7) {
                setGlitchFx(true);
                setTimeout(() => setGlitchFx(false), 150);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            const data = await res.json();

            if (data.success) {
                router.push('/admin');
                router.refresh(); // Force refresh to update middleware state
            } else {
                setError(data.error || 'Geçersiz şifre.');
                setPassword('');
            }
        } catch (err) {
            setError('Bağlantı hatası oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono relative overflow-hidden selection:bg-[#00FF4F] selection:text-black p-4">
            {/* Retro Scanlines */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-20 opacity-30 mix-blend-overlay"></div>

            <div className={`z-30 w-full max-w-md ${glitchFx ? 'translate-x-[2px] -translate-y-[1px]' : ''}`}>
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-black text-[#00FF4F] tracking-tighter drop-shadow-[0_0_8px_rgba(0,255,79,0.8)] uppercase">
                        <ScrambleText text="SİSTEM GİRİŞİ" />
                    </h1>
                    <p className="text-[#00FF4F] opacity-70 mt-2 text-sm tracking-widest uppercase">
                        Yetkisiz Erişim Yasaktır
                    </p>
                </div>

                {/* Login Box */}
                <div className="bg-black/80 border-2 border-[#00FF4F] p-8 backdrop-blur-md relative shadow-[0_0_15px_rgba(0,255,79,0.2)]">
                    {/* Decorative corners */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00FF4F] -translate-x-1 -translate-y-1"></div>
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00FF4F] translate-x-1 -translate-y-1"></div>
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00FF4F] -translate-x-1 translate-y-1"></div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00FF4F] translate-x-1 translate-y-1"></div>

                    <form onSubmit={handleLogin} className="flex flex-col gap-6">
                        <div>
                            <label className="block text-[#00FF4F] text-xs font-bold mb-2 uppercase tracking-widest">
                                Şifre (Password)
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black border-2 border-[#00FF4F] text-[#00FF4F] p-3 font-mono focus:outline-none focus:ring-2 focus:ring-[#00FF4F]/50 focus:shadow-[0_0_10px_rgba(0,255,79,0.3)] transition-all"
                                placeholder="[ **** ]"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="bg-red-950/50 border border-red-500 text-red-500 p-3 text-sm animate-pulse">
                                HATA: {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[#00FF4F] text-black font-black py-4 uppercase tracking-widest hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                        >
                            <span className="relative z-10">
                                {isLoading ? 'DOĞRULANIYOR...' : 'GİRİŞ YAP'}
                            </span>
                            {/* Hover glitch effect */}
                            <div className="absolute inset-0 bg-black translate-y-[100%] group-hover:translate-y-0 transition-transform duration-200 opacity-10"></div>
                        </button>
                    </form>
                </div>
                
                <div className="mt-8 text-center text-xs text-[#00FF4F] opacity-50 uppercase tracking-widest">
                    <p>TVGIBI OS // CORE V2.0</p>
                    <p className="mt-1">Node Status: <span className="animate-pulse text-[#00FF4F] opacity-100">ONLINE</span></p>
                </div>
            </div>
        </div>
    );
}
