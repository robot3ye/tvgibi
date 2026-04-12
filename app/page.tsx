'use client';

import { useEffect } from 'react';
import HomeClient from '../components/home/HomeClient';

export default function Page() {
    // Anasayfaya giren bir kullanıcının siteyle etkileşime girdiğini varsayıyoruz.
    // Böylece kanallara tıkladığında tekrar "TV'Yİ AÇ" modalı ile karşılaşmaz.
    useEffect(() => {
        sessionStorage.setItem('tv_started', '1');
    }, []);

    return <HomeClient />;
}
