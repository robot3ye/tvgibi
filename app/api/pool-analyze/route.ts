import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, creator } = body;

        if (!title) {
            return new Response(JSON.stringify({ error: 'Title is required' }), { status: 400 });
        }

        const prompt = `Sen 90'ların sonundan kalma, tecrübeli bir müzik direktörü ve TV yayın yönetmenisin.
Sana verilen şarkı/video başlığını analiz et ve bunu televizyon yayın havuzumuz için kategorize et.
Eğer bu bir müzik videosu ise türünü (genre) ve enerjisini belirle. 
Müzik dışıysa (belgesel, komedi vb.) ona göre uygun bir kategori uydur.
Ayrıca videodaki sanatçı ismine ve şarkıya bakarak vokal türünü de (kadın, erkek, düet, vokalsiz) tahmin et.

Video Başlığı: "${title}"
Kanal/Yaratıcı: "${creator || 'Bilinmiyor'}"

Mevcut Kategoriler (Örnekler, bunlarla sınırlı değilsin, uydurabilirsin): 
90s_pop, turkish_rock, arabesk, synthwave, slow, chill, elektronika, 80s_retro, trash_tv, belgesel, haber, komedi vb.

Lütfen sadece istenen JSON formatında yanıt ver.`;

        const result = await generateObject({
            model: google('gemini-2.5-flash'),
            schema: z.object({
                category: z.string().describe('Videonun kategorisi/türü (Örn: 90s_pop, rock, slow, synthwave) (boşluk yerine alt tire kullan, küçük harf)'),
                energy_level: z.number().min(1).max(10).describe('Enerji seviyesi: 1 (Çok yavaş/uykulu/gece yarısı) ile 10 (Çok hareketli/parti) arası bir tam sayı.'),
                era: z.string().describe('Videonun/Şarkının ait olduğu dönem (Örn: 70s, 80s, 90s, 2000s, 2010s, 2020s, Bilinmiyor)'),
                vocal_type: z.string().describe("Vokal türü. Şarkıcı/Grup isminden veya şarkıdan vokalin türünü tahmin et. Sadece şu değerlerden birini seç: 'kadın', 'erkek', 'düet', 'vokalsiz', 'bilinmiyor'")
            }),
            prompt: prompt,
            temperature: 0.7,
        });

        return new Response(JSON.stringify(result.object), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('[Pool Analyze API Error]:', error);
        return new Response(JSON.stringify({ error: error.message || 'API Hatası' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
