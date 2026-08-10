# Akıllı Müzik Havuzu (Smart Music Pool) Mimarisi

## 1. Temel Konsept
Kanallar için tek tek yayın akışı girmek yerine, binlerce şarkılık dev bir "İçerik Havuzu (Content Pool)" oluşturulur. Her şarkı bir "Kategori" (Örn: 90s Pop, Rock, Synthwave) ve "Enerji Seviyesi" (1-10) ile etiketlenir.

Müzik kanalları ise "Ben şu kategorilerden, şu ağırlıkta besleniyorum" şeklinde yapılandırılır. 
Örneğin;
- **Kanal A (Nostalji):** %70 90s Pop, %30 Slow
- **Kanal B (Gece Kulübü):** %100 Elektronik/Synthwave

## 2. Optimizasyon Algoritması (Tekrarı Önleme)
Rastgele (Random) seçim yapmak televizyonculukta her zaman felakettir (aynı şarkı 1 saatte 3 kere çalabilir). Bunun yerine **"Ağırlıklı ve Soğumalı Rastgele" (Weighted Random with Cooldown)** algoritması kullanılır.

**Nasıl Çalışır?**
1. Sistem kanalın beslendiği kategorilerdeki şarkıları çeker.
2. `last_played_at` (son çalınma zamanı) değerine bakar. Son 6 saat içinde çalınmış bir şarkı listeye **kesinlikle alınmaz** (Cooldown).
3. Geriye kalan şarkılar arasından `play_count` (çalınma sayısı) en düşük olanlara öncelik verilir.
4. Böylece havuzdaki tüm şarkılar eşit ve adil bir şekilde ekranda döner, izleyiciye "Sürekli aynı şey çalıyor" hissi verilmez.

## 3. Dinamik Zamanlama (Gündüz / Gece Kuşağı)
Şarkıların "Enerji Seviyesi" özelliği sayesinde:
- Saat 08:00 - 18:00 arası: Enerjisi yüksek (7-10) şarkılar seçilir.
- Saat 00:00 - 06:00 arası: Enerjisi düşük (1-4), slow ve chill şarkılar seçilir.
Bu sayede kanalın bir "Ruhu" ve "Yayın Yönetmeni" varmış gibi hissettirir.

## 4. Veritabanı Altyapısı
Bu sistem için gerekli SQL tabloları `supabase/migrations/20260710_smart_music_pool.sql` dosyasına yazılmıştır. 
Sistemi aktif edeceğimiz zaman tek yapmamız gereken bu tabloları Supabase'e yüklemek ve Cron Job (zamanlanmış görev) ile 24 saatlik yayın akışlarını her gece saat 04:00'te bu algoritmaya göre otomatik doldurmaktır.
