import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { supabase } from '@/lib/supabase'; // Important: we need a server-side or service role client here ideally, but for now we can use the regular one. Let's create a server client if needed, but since we disabled RLS, the public client works fine!

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
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: `${nickname}: ${message}`, // Using the system prompt for full context is enough, but we can also pass the prompt directly.
    });

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
