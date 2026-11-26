# Design Reference Analysis — A Little Place to Rest

Riset pendukung sebelum iterasi visual berikutnya. Tujuannya memahami *mengapa* empat referensi terasa
berkualitas, lalu menerjemahkannya ke identitas proyek ini — bukan menyalin.

---

## 0. Metode & batasan (dibaca dulu)

| Referensi | Yang benar-benar diamati | Sumber |
|---|---|---|
| Bruno Simon | Studi kasus tertulis oleh Bruno sendiri; ringkasan teknis repo open-source; 2 screenshot portfolio 2025 (dunia & start screen) | [Awwwards case study (Mar 2026)](https://www.awwwards.com/brunos-portfolio-case-study.html), [frontenddesignbasics breakdown](https://frontenddesignbasics.vercel.app/docs/cases/bruno-simon-folio), repo [folio-2019](https://github.com/brunosimon/folio-2019) & [folio-2025](https://github.com/brunosimon/folio-2025) (MIT) |
| HelloEnjoy / HelloFlower | Halaman studio lengkap + screenshot seluruh halaman (galeri HelloFlower, Fantasynth); README repo HelloFlower | [helloenjoy.com](https://helloenjoy.com/), [github.com/C4RL05/helloflower](https://github.com/C4RL05/helloflower) (MIT, kode saja) |
| LotusPath | Halaman *Calm Lotus* (teks lengkap) + screenshot render 3D *My Living Lotus Pond* | [lotuspath.life/calm-lotus](https://www.lotuspath.life/calm-lotus), [lotuspath.life/pond](https://www.lotuspath.life/pond) |
| Fantasynth 2 | Deskripsi resmi HelloEnjoy; halaman Fantasynth (web, 2026); gambar Fantasynth One & Live | [helloenjoy.com](https://helloenjoy.com/), [fantasynth.com](https://fantasynth.com/) |

**Batasan yang jujur:**
- Browser sandbox tidak diizinkan membuka keempat situs (proxy menolak host). Halaman diambil lewat Firecrawl.
- Screenshot langsung bruno-simon.com keluar hitam (layar muat WebGPU belum selesai); visual Bruno diambil dari
  gambar di breakdown teknis. Interaksi menyetir **tidak** saya coba sendiri.
- **Fantasynth 2 adalah aplikasi VR free-roam untuk Meta Quest (2022)** — tidak bisa dicoba di web. Analisisnya
  berdasarkan deskripsi resmi + Fantasynth versi web (2026) dan Fantasynth One yang satu keluarga.
- Fakta penting yang mengoreksi premis: **Fantasynth dibuat oleh HelloEnjoy** (bukan studio terpisah), dan
  **LotusPath adalah situs kebijaksanaan Buddhis** yang memiliki bagian "Calm & 3D Games", bukan situs 3D murni.
- Tidak ada fitur di dokumen ini yang tidak muncul di sumber di atas.

---

## 1. Ringkasan setiap referensi

### A. Bruno Simon — portfolio yang dijelajahi dengan mobil
Dunia pulau kecil buatan Blender tempat pengunjung menyetir mobil off-road; proyek, prop, dan rahasia tersebar di
dalamnya. Versi 2025: three.js WebGPU + TSL, fisika Rapier, ~78.400 bilah rumput (1 segitiga/bilah) yang "di-loop"
mengikuti kamera, pohon dengan **foliage berupa plane menghadap kamera bertekstur SDF**, angin yang menyentuh
rumput–daun–garis udara, siklus siang/malam & musim, cuaca (hujan, salju, petir), UI dibuat sebagai objek 3D,
sound design spasial, achievement, dan fitur multiplayer halus ("Whispers").

### B. HelloEnjoy — HelloFlower (dan studio di baliknya)
Studio London sejak 1999 (pembuat Papervision3D, HelloRun, *Lights*). **HelloFlower** adalah studio bunga 3D
prosedural: tiap lapis kelopak (*corolla*) adalah **mesh dua sisi berbentuk spline**, dicat tekstur yang dibaurkan
dari **dua warna**, dengan parameter per lapis **`petals / open / spin / sway / curve`**. Drag untuk orbit, sentuh
untuk membentuk. Pencahayaan "camera headlight + ambient", specular sengaja dilunakkan (0.1).

### C. LotusPath — Calm Lotus & My Living Lotus Pond
Bagian ketenangan dari situs Buddhis. *Calm Lotus*: teratai yang **membuka dan menutup mengikuti napas**; ritme
bawaan **4 detik tarik · tanpa tahan · 6 detik hembus**; durasi 30 dtk–15 menit atau bebas; "quiet mode";
getar opsional saat pergantian fase. *Living sanctuary*: kolam 3D dengan **koi, riak saat disentuh/di-drag,
kuncup teratai yang membuka di dekat riak**, menyeimbangkan batu, melepas lentera air; preset cahaya **Golden dawn,
Crystal noon, Sakura sunset, Moonlit night**; **kelopak sakura berjatuhan**; suara interaksi sintetis yang
**mati sampai pengguna memilihnya**; "No scores, deadlines or breath sensing"; kontrol & bacaan tetap jalan tanpa 3D.

### D. Fantasynth 2 (keluarga Fantasynth, HelloEnjoy)
*Fantasynth One* (2017, VR): meluncur melewati lingkungan yang **diisi secara prosedural dan "menyala" mengikuti
musik**. *Fantasynth 2* (2022, Quest): "eksplorasi efek emosional & perseptual dari visual prosedural yang
tersinkron dengan musik" — **ruang yang bisa dijalani, berakar pada realitas, berevolusi bersama musik**; musik
ambient Carbon Based Lifeforms. *Fantasynth* web (2026): instrumen visual — **visual terkunci ke BPM** (geometri
berdenyut, partikel meledak, kamera bergerak), dengan fog/bloom/color grade/exposure/tone mapping sebagai "mix".

---

## 2. Kekuatan visual

| | Kekuatan |
|---|---|
| Bruno Simon | Palet sangat kohesif (satu hue dominan + aksen hangat lentera); foliage "kartu daun" yang mengembang & ber-rim light; kepadatan detail kecil (bangku, lentera, batu bata, peti); dunia yang bergerak karena angin. |
| HelloFlower | Kelopak dengan **siluet spline melengkung & ujung tertekuk**; gradasi **pangkal gelap-jenuh → ujung cerah**; banyak lapis dengan jumlah & bukaan berbeda; highlight lembut. |
| LotusPath | Atmosfer dari **gerak lambat yang terus ada** (kelopak jatuh, koi berenang, kaustik air); satu titik fokus (kuncup teratai) di tengah komposisi melingkar batu; preset cahaya bernama puitis. |
| Fantasynth | Warna, cahaya & partikel diperlakukan sebagai **satu instrumen**; struktur (denyut, burst, gerak kamera) lebih penting dari bentuk; post-processing sebagai "mix" global. |

## 3. Pola interaksi yang menarik

- **Dunia = navigasi** (Bruno): tempat adalah landmark, bukan menu; penanda berlian kecil di atas titik interaktif.
- **Start screen yang sudah merupakan dunia** (Bruno): sekaligus meminta klik yang dibutuhkan browser untuk suara.
- **Segalanya bereaksi** (Bruno): benda bisa disenggol; hadiah eksplorasi adalah respons, bukan poin.
- **Sentuh untuk membentuk / sway** (HelloFlower): objek merespons gestur secara kontinu, bukan hanya on/off.
- **Riak memanggil kehidupan** (LotusPath): tap air → koi mendekat, kuncup membuka. Satu gestur, banyak respons kecil.
- **Opt-in untuk suara & data** (LotusPath): suara interaksi mati sampai dipilih; tidak ada skor/streak/sensing.
- **Visual terkunci ke musik** (Fantasynth): perubahan terjadi di ketukan, bukan acak.

## 4. Teknik animasi yang relevan

| Teknik | Sumber | Untuk proyek ini |
|---|---|---|
| Medan angin bersama untuk rumput, daun, garis udara | Bruno | Sudah ada (`windField`); perluas ke kartu daun & partikel |
| Kartu daun dengan tekstur SDF + flutter per daun | Bruno | Ganti kanopi blob |
| "Shrink" daun di depan subjek agar pandangan bersih | Bruno | Ganti dither-fade kanopi yang saat ini bertitik |
| Kelopak spline + parameter `open/spin/sway/curve` | HelloFlower | Bunga interaktif & bunga langka |
| Benda jatuh melayang (kelopak sakura, daun musim gugur) | LotusPath, Bruno | Partikel kelopak/daun yang berputar pelan |
| Koi dengan steering lembut ke riak | LotusPath | Kolam |
| Denyut/burst ter-sinkron ketukan; evolusi sepanjang lagu | Fantasynth | Reaksi musik multi-band + progres lagu |

## 5. Teknik kamera yang relevan

- **Kamera mengikuti subjek dari sudut tinggi** (Bruno, terlihat di screenshot): sudut tinggi menjaga keterbacaan
  dunia low-poly dan murah dirender. Kita tidak punya avatar; padanannya adalah *orbit + glance* yang sudah ada.
- **Glide antar-tampilan dengan easing** (HelloFlower `glideTo()` dari top-down ke 3/4) — setara `flyTo` kita.
- **Kamera bergerak di ketukan** (Fantasynth) — untuk kita: *bukan* gerak kamera; paling jauh napas kecil pada
  idle drift. Gerak kamera mengikuti musik berisiko motion sickness dan bertentangan dengan PRD.
- **Dunia yang sudah ada sebelum klik** (Bruno) — arrival kita sudah begitu; pertahankan.

## 6. Peluang implementasi di Three.js (stack proyek: WebGL + R3F)

| Peluang | Teknik | Biaya |
|---|---|---|
| Kanopi kartu daun | `InstancedMesh` plane + tekstur daun prosedural (canvas, alphaTest), orientasi ke kamera di vertex shader, warna per-instance, flutter dari `windField`, translucency | Sedang; ±1.5–4k kartu |
| Meadow responsif sentuhan | Raycast ke permukaan pulau → `uPointer` (posisi dunia) → rumput/bunga didorong menjauh dalam radius di `applyWind` | Rendah |
| Kelopak/daun jatuh | Satu `InstancedMesh` (±120) dengan simulasi di vertex shader (jatuh, berayun, berputar, loop) | Rendah |
| Koi | 3 ikan (badan + ekor, animasi sirip di shader), steering ke titik riak terakhir | Rendah |
| Kelopak spline ala HelloFlower | `CatmullRomCurve3` untuk siluet + tekuk ujung; gradasi dua warna per vertex | Rendah |
| Musik multi-band | `AnalyserNode` → bass / mid / high + deteksi onset sederhana → kanal uniform terpisah | Rendah |
| Soundscape alami opt-in | Web Audio prosedural (noise tersaring = angin/air, osilator = jangkrik) | Sedang |

**Tidak** diadopsi: WebGPU/TSL (R3F + postprocessing saat ini berbasis WebGL; migrasi tidak sebanding untuk lingkup ini),
fisika Rapier (tidak ada kendaraan/avatar), multiplayer (PRD: tidak ada data dikirim), check-in suasana hati
LotusPath (PRD melarang membaca kondisi emosional pengunjung).

## 7. Risiko performa

| Risiko | Mitigasi |
|---|---|
| Overdraw kartu daun transparan | `alphaTest` (bukan blending), depth write aktif, jumlah kartu per tier |
| Raycast pointer tiap frame | Raycast hanya saat pointer bergerak, ke mesh permukaan pulau saja, di-throttle |
| Partikel jatuh | Simulasi sepenuhnya di GPU, satu draw call |
| Analisis audio tiap frame | FFT 256, satu pembacaan per frame (sudah) |
| Soundscape prosedural | Node dibuat sekali, hanya saat opt-in, dihentikan saat tab tersembunyi |
| Tumpukan efek kecil | Budget draw call per tier tetap dipantau lewat `?debug` |

---

## 8. Tabel perbandingan

| Aspek | Bruno Simon | HelloFlower | LotusPath | Fantasynth 2 | **A Little Place to Rest** |
|---|---|---|---|---|---|
| Tujuan | Portfolio yang dimainkan | Alat kreatif bunga | Jeda mindful | Perjalanan musik VR | Hadiah: tempat beristirahat |
| Energi | Bermain, aktif | Tenang, fokus | Sangat tenang | Intens, imersif | Sangat tenang, hangat |
| Navigasi | Menyetir bebas | Orbit | Orbit + tap | Berjalan (free roam) | Orbit + perjalanan kamera antar tempat |
| Interaksi inti | Menabrak, menemukan | Membentuk kelopak | Riak, napas | Hadir dalam musik | Menyentuh, menemukan, bernapas, membaca |
| Gaya visual | Low-poly saturasi, monokrom pink | Kelopak halus, gradasi kuat | Semi-realistis, PBR, sakura | Geometri neon prosedural | Diorama stylized golden hour |
| Musik | 3 lagu CC0 + SFX spasial | — | Suara interaksi opt-in | Musik = penggerak utama | Lagu pribadi + reaksi halus |
| UI | Hampir semua 3D | Panel editor | Kartu web di sekitar kanvas | Tidak ada (VR) | Sangat minim, mengapung |
| Yang diambil | Dunia hidup, angin, kartu daun, wayfinding | Kelopak spline, sway, gradasi | Riak memanggil koi, kelopak jatuh, opt-in | Pemetaan musik berlapis, evolusi lagu | — |

---

## 9. Design synthesis — identitas sendiri

**"A storybook diorama that breathes with you."**
Bukan taman bermain (Bruno), bukan alat (HelloFlower), bukan aplikasi meditasi (LotusPath), bukan rave
(Fantasynth). Sebuah miniatur buatan tangan saat golden hour yang **selalu sedikit bergerak, merespons dengan
lembut, dan tidak pernah meminta apa-apa.**

Empat pilar, masing-masing berutang pada satu referensi:

1. **Tempat, bukan halaman** (Bruno) — semua navigasi adalah perjalanan di dunia; landmark yang dikenali; dunia
   sudah hidup sebelum klik pertama.
2. **Setiap sentuhan dijawab** (HelloEnjoy) — rumput menyibak di bawah jari, bunga condong, kelopak membuka
   berlapis; tidak ada objek interaktif yang hanya "on/off".
3. **Gerak lambat yang tak pernah berhenti** (LotusPath) — kelopak jatuh, koi berenang, riak, kunang-kunang;
   tenang karena ritmenya pelan, bukan karena diam.
4. **Musik sebagai cuaca, bukan lampu disko** (Fantasynth, diredam) — musik memengaruhi dunia seperti angin:
   lapisan halus, ter-smooth, dibatasi; berevolusi sepanjang lagu, tidak pernah berkedip.

**Aturan visual yang tidak berubah:** palet golden hour yang sudah ada (forest/sage, cream, amber, lavender),
cahaya sebagai pemeran utama, tipografi Cormorant + Manrope, UI mengapung tanpa kartu besar.

---

## 10. Audit kode yang sudah ada

| Bagian | Status | Keputusan |
|---|---|---|
| Arsitektur satu dunia persisten, director, camera rig | Baik | **Pertahankan** — sudah sejalan dengan pilar 1 |
| Pulau, rumput instanced, angin bersama, atmosfer 3 waktu, awan | Baik | Pertahankan; perluas angin ke elemen baru |
| Kanopi oak (gugus blob) | Terlihat seperti kertas kusut | **Tingkatkan** → kartu daun |
| Dither-fade kanopi saat orbit | Berfungsi tapi bertitik | **Ganti** dengan shrink kartu daun dekat kamera |
| Rumput & bunga | Bergerak karena angin, tidak merespons sentuhan | **Tingkatkan** → menyibak di sekitar pointer |
| Bunga interaktif | Mekar 2 lapis, kelopak sederhana | Tingkatkan → kelopak spline + condong ke pointer |
| Kolam | Riak saat tap, teratai statis | Tingkatkan → koi + kuncup yang membuka |
| Reaksi musik | Satu nilai loudness | **Tingkatkan** → bass/mid/high + onset + progres lagu |
| Lingkungan "hidup" | Debu cahaya, kunang-kunang | Tambah kelopak/daun yang berjatuhan |
| Suara | Hanya musik pemilik | Tambah soundscape alami **opt-in** (mati secara default) |

Tidak ada fitur yang dihapus; semua perubahan bersifat peningkatan di tempat.

## 11. Prioritas implementasi (dampak visual & interaksi ÷ usaha)

| # | Item | Pilar | Dampak | Usaha |
|---|---|---|---|---|
| 1 | Kanopi kartu daun + shrink dekat kamera (ganti dither) | 3 | ★★★★★ | Sedang |
| 2 | Rumput & bunga menyibak di sekitar pointer/jari | 2 | ★★★★☆ | Rendah |
| 3 | Kelopak & daun berjatuhan, digerakkan angin | 3 | ★★★★☆ | Rendah |
| 4 | Musik multi-band + onset + evolusi sepanjang lagu | 4 | ★★★☆☆ | Rendah |
| 5 | Koi di kolam yang mendekati riak; kuncup teratai membuka | 2, 3 | ★★★★☆ | Sedang |
| 6 | Kelopak spline ala HelloFlower + bunga condong ke pointer | 2 | ★★★☆☆ | Sedang |
| 7 | Soundscape alami prosedural, opt-in | 3 | ★★★☆☆ | Sedang |
| 8 | Quiet mode (sembunyikan semua UI) | 3 | ★★☆☆☆ | Rendah |

Gelombang 1 (sesi ini): #1–#4. Gelombang 2: #5–#8. Setiap item ditutup dengan QA visual desktop + mobile.

---

## 12. Hasil gelombang 1 (QA browser)

| # | Item | Hasil QA |
|---|---|---|
| 1 | Kanopi kartu daun | Oak kini bertajuk daun individual dengan rim light & kedalaman berlapis (sebelumnya "kertas kusut"). Gugus blob lama tetap jadi penghasil bayangan tak terlihat. Daun mengecil saat sangat dekat kamera (orbit saja); rentang dinaikkan ke 4.5–9 setelah QA karena masih menutupi pandangan dari belakang rumah. Dither pinus diperketat (2–4.2). |
| 2 | Meadow menyibak | Rumput, bunga, alang-alang condong menjauhi titik sentuh; naik cepat, kembali pelan (~1 dtk). Terverifikasi lewat pointer yang ditahan (sandbox 1 fps terlalu lambat untuk gerakan asli). |
| 3 | Kelopak & daun jatuh | Satu draw call, simulasi GPU. Ukuran pertama terlalu kecil dari jarak orbit → diperbesar. |
| 4 | Musik multi-band | Nada uji ber-beat: semua kanal 0 sebelum musik; mid ≈0.3, high ≈0.15, pulse ketukan naik ke ≈0.3 lalu meluruh. Bass jenuh di 1.0 → gain diturunkan; jumlah kelopak sempat *turun* saat musik mulai → kini naik 0.7→1.0 sepanjang lagu. |

Gelombang 2 (#5–#8) belum dikerjakan.
