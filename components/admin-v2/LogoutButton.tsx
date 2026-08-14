'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/admin/login');
            router.refresh();
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return (
        <button 
            onClick={handleLogout}
            className="ml-4 bg-black text-[#00FF4F] px-2 py-1 text-xs font-bold border border-[#00FF4F] hover:bg-[#00FF4F] hover:text-black transition-colors"
        >
            [ LOGOUT ]
        </button>
    );
}
