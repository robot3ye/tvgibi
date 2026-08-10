import { streamText, tool, convertToModelMessages } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { searchYouTubeVideos } from '../../../lib/youtube';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json();
  console.log('[Emmy API] Received body:', JSON.stringify(body, null, 2));
  const { messages } = body;

  let modelMessages;
  try {
      modelMessages = await convertToModelMessages(messages);
  } catch (e) {
      console.error('[Emmy API] convertToModelMessages failed:', e);
      // Fallback to direct mapping if convert fails
      modelMessages = messages;
  }

  const result = streamText({
    model: google('gemini-1.5-flash'), // Use gemini-1.5-flash
    system: `Senin adın Emmy. tvgibi.tv platformunun Baş Yayın Yönetmenisin (Editor-in-Chief). 
Sen, 80'ler/90'lar brutalist ve retro TV yayıncılığı ruhunu benimsemiş, zeki, iş bitirici ve biraz sivri dilli bir yapay zeka asistanısın. 
Kullanıcı (Patron) senden belirli bir kanal için (örneğin 'Müzik kanalı için 4 saatlik synthwave listesi') yayın akışı oluşturmanı isteyecek.
Görevlerin:
1. İstenen konseptte YouTube'da arama yapmak. ('searchYouTube' aracını kullan)
2. Bulduğun videoların sürelerini (duration) kontrol ederek istenilen toplam yayın süresine YAKLAŞIK olarak ulaşacak bir akış (taslak) oluşturmak. (Sürenin tamı tamına tutması gerekmez, 1 saat isteniyorsa 50-70 dakika arası kabul edilebilir).
3. Listeyi oluşturduğunda, bu taslağı sisteme göndermek için 'create_schedule_draft' aracını çağırmak.
ÖNEMLİ KURAL: Maksimum 2 kez arama yapabilirsin. Eğer bulduğun videoların toplam süresi istenilen süreye ulaşmıyorsa bile KESİNLİKLE SÜREKLİ ARAMA YAPMA. "Daha fazla arama yapmalıyım" diyerek yeni bir tool_call TETİKLEME. Sadece elindeki videoları kullanarak akışı tamamla ve MUTLAKA 'create_schedule_draft' aracını çağır! Eğer bunu yapmazsan sistem çöker.

Mümkün olduğunca retro, TV yayıncılığı terimlerini kullan. "Patron, bu iş bende", "Harika bir kuşak hazırladım" gibi ifadelerle cevap ver.`,
    messages: modelMessages,
    tools: {
      searchYouTube: tool({
        description: 'YouTube üzerinde video aramak için kullanılır. İstenilen konsept, tür veya sanatçı adıyla arama yapıp videoların başlık, açıklama ve süre bilgilerini (saniye cinsinden) getirir.',
        parameters: z.object({
          query: z.string().describe('YouTube arama sorgusu. (Örn: 80s synthwave full album)'),
          maxResults: z.number().optional().describe('Kaç adet sonuç getirileceği. Maksimum 50 olabilir.')
        }),
        execute: async (args: any) => {
          console.log('[searchYouTube] Executing with args:', args);
          const { query, maxResults } = args;
          const results = await searchYouTubeVideos(query, maxResults || 10);
          console.log(`[searchYouTube] Found ${results.length} results`);
          // Return only necessary fields to save tokens
          return results.map(r => ({
            videoId: r.videoId,
            title: r.title,
            duration: r.duration,
            creator: r.creator
          }));
        },
      } as any),
      create_schedule_draft: tool({
        description: 'Kullanıcının onayına sunulacak olan taslak yayın akışını (draft) oluşturur ve ekrana yansıtır. Videoların toplam süresi istenen yayına uygun olduğunda bu aracı ÇAĞIRMALISIN.',
        parameters: z.object({
          title: z.string().describe('Hazırlanan kuşağın/akışın adı (Örn: Gece Yarısı Synthwave Kuşağı)'),
          videos: z.array(
            z.object({
              videoId: z.string(),
              title: z.string(),
              duration: z.number().describe('Saniye cinsinden video süresi'),
              creator: z.string().optional()
            })
          ).describe('Yayına alınacak videoların listesi')
        }),
        execute: async (args: any) => {
          const { title, videos } = args;
          // This tool doesn't do backend work, it just signals the UI to display the draft
          return {
            success: true,
            message: `Taslak akış oluşturuldu: ${title}. İçinde ${videos.length} video var.`,
            draft: { title, videos }
          };
        }
      } as any)
    },
  });

  return result.toUIMessageStreamResponse();
}

