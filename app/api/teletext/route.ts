import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { channelName, programTitle } = body;

        const prompt = `Sen 90'ların sonundan kalma, hafif kafayı yemiş, underground bir korsan televizyon kanalının otomatik Teletext (alt bant) sistemisin.
Şu an "${channelName}" adlı kanalda "${programTitle}" isimli program yayınlanıyor.
Bana bu programla veya genel absürt durumlarla ilgili, televizyonun altından geçecek 1-2 cümlelik kısa, vurucu, tuhaf ve neon-siberpunk/retro tarzı bir "Flaş Haber" metni yaz.
Çok uzun olmasın (maksimum 150 karakter). Emoji kullanma. Sadece metni ver.`;

        // We use gemini-2.5-flash for faster response
        const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            prompt: prompt,
            temperature: 0.9,
        });

        return new Response(JSON.stringify({ text: text.trim() }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('[Teletext API Error]:', error);
        return new Response(JSON.stringify({ text: 'SİSTEM HATASI... BAĞLANTI KOPTU... LÜTFEN EKRANA VURMAYIN...' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
