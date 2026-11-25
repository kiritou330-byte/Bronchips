# A Little Place to Rest

> "A little world where you can slow down."

Dunia 3D interaktif (Next.js + React Three Fiber) berupa pulau kecil yang melayang di antara awan:
taman, kolam untuk bernapas, rumah mungil dengan surat, kejutan-kejutan kecil, dan tempat duduk untuk
menatap langit. Rencana teknis dan log QA ada di [`docs/PLAN.md`](docs/PLAN.md).

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Memasukkan lagu

1. Taruh file lagu di `public/audio/` (MP3 disarankan), misalnya `public/audio/chelsea-song.mp3`.
2. Sesuaikan `src/config/audio.config.ts` (path, judul, artis, volume).
3. Build ulang. Kalau file tidak ditemukan, tombol musik dan pemutar disembunyikan otomatis — tidak ada tombol palsu.

Musik **tidak pernah** diputar otomatis: baru mulai setelah tombol *Enter my little world* (jika toggle
*Play our little soundtrack* menyala) atau lewat tombol musik di kanan atas. Musik tidak ter-reset saat
berpindah tempat.

## Mengubah teks

| File | Isi |
|---|---|
| `src/config/letter.config.ts` | Isi surat (paragraf dipisah baris kosong), salam penutup, label tombol |
| `src/config/messages.config.ts` | Sapaan pembuka, pesan bunga & awan, petunjuk |
| `src/config/world.config.ts` | Nama penerima, tata letak pulau, suasana waktu (warna, matahari, kabut), posisi kamera |
| `src/config/quality.config.ts` | Budget per tier kualitas (rumput, bayangan, post-processing) |

## Deploy ke Vercel

Proyek ada di subfolder repo ini. Saat import di Vercel, set **Root Directory** ke `little-place-to-rest`.
Halaman di-prerender statis; semua aset (font, tekstur prosedural) di-host lokal.

## Parameter URL (untuk pengujian)

- `?debug` — penghitung FPS / draw call / segitiga di pojok kiri bawah + API QA di `window.__lpr`.
- `?quality=low|medium|high` — mengunci tier kualitas (default: deteksi otomatis + turun otomatis bila FPS rendah).

## Tempat & interaksi

| Tempat | Apa yang bisa dilakukan |
|---|---|
| Arrival | Penerbangan sinematik menembus awan, sapaan, masuk ke dunia |
| Garden | Drag/pinch/scroll untuk melihat-lihat; sentuh bunga bercahaya, awan, kupu-kupu, pintu rumah |
| Pond | Duduk di dermaga, latihan napas (30 detik / 1 menit / bebas), sentuh air untuk riak |
| Cottage | Masuk lewat pintu, buka amplop di meja, baca surat |
| Lookout | Seberangi jembatan, duduk di bangku, ganti suasana: Morning / Golden Hour / Night |
| Kejutan | Bunga langka (ikuti kupu-kupu), kelinci, lentera tersembunyi, batu berpesan, bintang (malam) |

Tidak ada login, database, tracking, atau data yang dikirim ke mana pun. Semua berjalan di browser.

## Aksesibilitas & performa

- Menghormati `prefers-reduced-motion` (bisa juga diatur di Settings).
- Tiga tier kualitas; tier turun otomatis bila FPS rendah, bisa dipilih manual di Settings.
- Fallback 2D (sapaan + surat) bila WebGL tidak tersedia atau konteks GPU hilang.
- Render berhenti (mode `demand`) saat surat menutupi layar; berhenti otomatis saat tab tidak terlihat.
