import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { password } = body;

        const correctPassword = process.env.ADMIN_PASSWORD;

        if (!correctPassword) {
            console.error('ADMIN_PASSWORD is not set in environment variables');
            return NextResponse.json(
                { success: false, error: 'Sunucu yapılandırma hatası' },
                { status: 500 }
            );
        }

        if (password === correctPassword) {
            // Create the response and set the cookie
            const response = NextResponse.json({ success: true });
            
            response.cookies.set({
                name: 'admin_session',
                value: 'authenticated',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                // Session expires in 7 days
                maxAge: 60 * 60 * 24 * 7,
            });

            return response;
        }

        return NextResponse.json(
            { success: false, error: 'Erişim reddedildi. Geçersiz şifre.' },
            { status: 401 }
        );
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { success: false, error: 'Bilinmeyen bir hata oluştu' },
            { status: 500 }
        );
    }
}
