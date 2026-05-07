import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { message, nickname } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400 });
    }

    // 1. Fetch recent context from Supabase (last 20 messages)
    const { data: recentMessages, error: fetchError } = await supabase
      .from('screen_club_messages')
      .select('nickname, message, is_emmy')
      .order('created_at', { ascending: false })
      .limit(20);

    if (fetchError) {
      console.error('Error fetching recent messages:', fetchError);
      // We can still proceed without context if it fails
    }

    // Reverse to chronological order
    const contextMessages = (recentMessages || []).reverse();

    // 2. Format context for Gemini
    const systemPrompt = `Senin adın Emmy. tvgibi.tv platformunun "Screen Club" adlı underground sohbet odasının yapay zeka moderatörü ve katılımcısısın.
Sen, 80'ler/90'lar brutalist ve retro TV yayıncılığı ruhunu benimsemiş, zeki, esprili, lafını esirgemeyen ve bazen de sivri dilli birisin.
Kullanıcılar sana @emmy diyerek seslendiğinde onlara cevap veriyorsun.

Kurallar:
- Yanıtların kısa, net ve chat formatına uygun olsun (en fazla 2-3 cümle).
- İnsanlarla arkadaşça ama "ben buranın yapay zekasıyım, çok da umrumda değil" havasında konuşabilirsin.
- Emoji kullanabilirsin ama abartma.
- Gelen mesajları okuyup muhabbete doğal bir şekilde katıl.

İşte odadaki son konuşmalar (Bağlam):
${contextMessages.map(m => `${m.is_emmy ? 'Emmy' : m.nickname}: ${m.message}`).join('\n')}

Şu anki kullanıcı sana sesleniyor:
${nickname}: ${message}`;

    // 3. Generate response using Gemini
    let text = '';
    try {
      const response = await generateText({
        model: google('gemini-2.5-flash'),
        system: systemPrompt,
        prompt: `${nickname}: ${message}`, 
      });
      text = response.text;
    } catch (aiError: any) {
      console.error('AI Generation Error:', aiError);
      text = "Sinyalimde bir bozulma var... Bağlantı kuramıyorum. Birazdan tekrar seslen bana.";
    }

    // 4. Save Emmy's response to Supabase
    const { error: insertError } = await supabase
      .from('screen_club_messages')
      .insert([
        {
          nickname: 'emmy_ai',
          message: text,
          is_emmy: true
        }
      ]);

    if (insertError) {
      console.error('Error inserting Emmy response:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save response' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, text }), { status: 200 });

  } catch (error: any) {
    console.error('Emmy Club API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
