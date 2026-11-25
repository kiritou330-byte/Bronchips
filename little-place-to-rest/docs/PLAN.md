# A Little Place to Rest — Technical & Creative Plan

Dokumen kerja untuk PRD v2.0. Ditulis sebelum implementasi dan diperbarui di akhir tiap milestone.

---

## 1. Analisis PRD

### Inti produk
Satu dunia kecil yang **persisten** (pulau melayang), bukan tujuh halaman. Tujuh "scene" di PRD
sebenarnya adalah **mode kamera + mode interaksi** di dalam satu dunia yang sama:

| PRD scene | Secara teknis |
|---|---|
| 01 Arrival | Shot sinematik pembuka + overlay judul. Dunia sudah dirender di belakangnya. |
| 02 Garden | Mode explore: orbit terbatas di sekitar pulau + objek interaktif. |
| 03 Pond | Shot "duduk di tepi kolam" + overlay latihan napas. |
| 04 Cottage | Shot pintu → masuk ke interior yang benar-benar ada di dalam rumah. |
| 05 Letter | Shot close-up meja + animasi amplop 3D → surat sebagai DOM (agar tajam & mudah dibaca). |
| 06 Surprises | Objek tersembunyi yang tersebar di dunia; bukan scene terpisah. |
| 07 Stay longer | Shot titik pandang di tebing + kontrol waktu (Morning / Golden Hour / Night). |

Konsekuensi arsitektur paling penting: **satu `<Canvas>` yang tidak pernah di-unmount**. Musik tidak
terputus, tidak ada reload, dan setiap perpindahan "scene" adalah transisi kamera yang mulus.

### Ketegangan di dalam PRD dan keputusannya
| Ketegangan | Keputusan |
|---|---|
| AO, DOF, shadow dinamis, volumetric vs. 30–60 FPS di HP menengah | Tiga tier kualitas. Efek mahal hanya di High. Volumetric dipalsukan dengan mesh cone aditif (murah di semua tier). |
| "Detailed material textures" vs. aset kecil & lokal | Tekstur dibuat prosedural saat runtime (shader noise + CanvasTexture kecil). Nol unduhan tekstur. |
| "Realistic-looking water" vs. gaya stylized | Air stylized-realistis: fresnel, warna kedalaman, ripple prosedural, pantulan langit palsu. Pantulan planar sungguhan hanya di High. |
| "Tidak ada placeholder" vs. file musik belum disediakan | Player memeriksa file saat runtime. Kalau file tidak ada, player dan tombol musik tidak ditampilkan sama sekali, jadi tidak ada tombol palsu. Cara memasukkan lagu didokumentasikan. |
| Next.js (SSR) vs. WebGL | Semua kode 3D client-only (`dynamic(..., { ssr: false })`). Halaman tetap punya HTML awal yang ringan. |
| "Hindari render loop saat idle" vs. dunia yang selalu hidup | Loop tetap berjalan saat dunia terlihat (dunia memang beranimasi). Loop berhenti saat tab tersembunyi, dan beralih ke `demand` saat surat menutupi layar penuh. |
| Bahasa Indonesia + microcopy Inggris, tapi copy di PRD berbahasa Inggris | Copy dari PRD dipakai apa adanya. Semua teks ada di `config/*.ts` agar mudah diganti. |

---

## 2. Visual Direction (final)

**"A hand-made miniature at golden hour."**
Bentuknya lembut dan sedikit gemuk seperti diorama yang dipahat tangan. Materialnya punya detail mikro
prosedural (serat kayu, noise batu, gradasi rumput). **Cahaya adalah pemeran utama**: matahari rendah
yang hangat, fill biru dingin dari langit, rim light pada dedaunan, dan aerial perspective (fog berwarna
langit) yang membuat pulau terasa berada di udara terbuka. Di bawah pulau ada lautan awan.

- **Referensi rasa:** diorama indie seperti *Alba*, *A Short Hike* (tapi lebih halus), dan ilustrasi Ghibli
  saat sore. Bukan low-poly datar, bukan fotorealisme.
- **Bentuk:** tidak ada primitive mentah. Setiap bentuk punya bevel, noise displacement, atau
  gradasi vertex color. Silhouette harus terbaca dari jauh.
- **Palet (Golden Hour, default):**
  - Forest green `#2F4A36`, sage `#8FA886`, rumput terang `#B5C27A`
  - Cream `#F3E9D2`, golden sun `#FFC979`, amber `#E89A4C`
  - Muted blue `#7C93A8`, lavender `#B7A9CC` (bayangan & langit atas)
  - Wood `#7A5638`, batu `#8C8279`
- **Tiga suasana waktu:**
  - *Morning:* langit biru-lavender pucat, kabut tipis putih, matahari tinggi dan netral, bayangan pendek.
  - *Golden Hour:* matahari rendah amber, langit gradasi peach→lavender, bayangan panjang, rim light kuat.
  - *Night:* biru tua, bulan dingin, jendela rumah menyala hangat, kunang-kunang dominan, bintang.
- **Tipografi:** Display: *Cormorant Garamond* (italic untuk sapaan & surat). UI: *Manrope* kecil, tracking
  lebar. Warna teks cream di atas dunia, dengan text-shadow lembut (bukan kartu/glass panel).
- **UI:** bagian dari dunia. Label kecil, ikon tipis (Lucide), tanpa kartu besar. Prompt interaksi muncul
  dekat objek sebagai label kecil yang mengambang.

---

## 3. Technical Architecture

```
little-place-to-rest/
  src/
    app/                    layout.tsx, page.tsx, globals.css (Tailwind v4)
    components/
      Experience.tsx        root client: Canvas + overlay UI
      ui/                   ArrivalOverlay, MessageToast, InteractionHint, SceneNav, Settings, Letter, Breathing
      audio/                MusicPlayer
      navigation/           SceneNav
    world/
      World.tsx             menyusun semua isi dunia
      environment/          Sky, Lighting, Fog/Atmosphere, Clouds, LightShafts, Stars
      objects/              Island, Grass, Trees, Flowers, Cottage, Pond, Bridge, Butterflies, Fireflies, ...
      materials/            shader chunks (wind, noise), procedural textures
      camera/               CameraRig (spring-damped), OrbitInput (drag/pinch/wheel), shots
      effects/              PostFX (tiered)
    hooks/                  useQuality, useReducedMotion, ...
    state/                  navigation.ts, audio.ts, world.ts (zustand stores terpisah)
    config/                 world.config.ts, audio.config.ts, messages.config.ts, letter.config.ts
    lib/                    three/ (geometry helpers, noise), audio/ (analyser), animation/ (easing, springs)
  public/audio/             lagu milik pemilik
```

**State terpisah** (zustand, sudah menjadi dependency R3F):
- `navigation`: `phase` (arrival | explore | pond | cottage | letter | lookout), shot aktif, status transisi.
- `audio`: status play/pause, volume, mute, ketersediaan file, nilai analyser.
- `world`: time of day (+ progres transisi), tier kualitas, objek yang sudah ditemukan, pesan aktif.

**Camera system** (bagian paling penting):
- Kamera tidak pernah diset langsung. Selalu ada `target` (posisi, lookAt, fov) dan `current` yang
  mengejar target dengan **critically-damped spring** (`maath/easing.damp3`). Hasilnya tidak ada lompatan,
  bahkan saat target berubah di tengah transisi.
- Transisi antar-shot memakai GSAP: target bergerak sepanjang kurva (CatmullRom) dengan easing
  `power2.inOut`/`sine.inOut`. Spring menghaluskan sisanya.
- Mode explore: controller orbit buatan sendiri (azimuth, polar, jarak) dengan inersia, batas polar
  (tidak bisa ke bawah pulau), batas zoom, drag satu jari, pinch dua jari, wheel. Ada idle sway kecil.
- Tap vs. drag dibedakan dengan ambang jarak, supaya memutar kamera tidak memicu interaksi.

**Rendering:**
- `ACESFilmic`/`AGX` tone mapping, sRGB output, `PCFSoftShadowMap`. Shadow camera dipaskan ketat ke pulau
  (resolusi 1024 Medium / 2048 High).
- Environment map dibuat prosedural (drei `<Environment>` + `<Lightformer>`), tanpa HDR eksternal.
- Postprocessing (tiered): N8AO (High), Bloom halus (Medium+), Vignette, DOF hanya saat close-up surat (High).

**Kualitas adaptif:** tier awal dari heuristik (mobile? DPR? core CPU?) lalu disesuaikan otomatis oleh
`PerformanceMonitor` drei (turun tier jika FPS rendah). Bisa dipilih manual di Settings. `?debug` menampilkan FPS.

---

## 4. Cara setiap scene dibangun

**Dunia dasar (semua scene)**
- *Sky:* sphere besar dengan shader gradasi 3 warna + glow matahari + (malam) bintang. Uniform di-lerp per time-of-day.
- *Pulau:* `BufferGeometry` radial. Permukaan atas di-displace noise (bukit landai, cekungan kolam), tepi
  dibulatkan. Bagian bawah berupa kerucut batu terbalik dengan strata warna, noise, dan akar menggantung.
- *Rumput:* satu `InstancedMesh` bilah rumput (5–7 vertex). Angin di vertex shader (noise yang bergerak, amplitudi
  bervariasi per instance). Warna gradasi pangkal→ujung, mengikuti warna tanah. Jumlah: 18k / 9k / 3.5k.
- *Pohon:* batang tapered dengan lengkungan, kanopi berupa gugus icosphere yang di-displace noise, shading
  dengan rim/translucency palsu dan goyangan angin di shader. Semak memakai teknik yang sama.
- *Bunga:* instanced (batang, kelopak, pusat). Bunga interaktif adalah mesh terpisah dengan kelopak individual
  yang dianimasikan GSAP (mekar).
- *Awan:* gugus blob prosedural dengan shading lembut + fog. Lautan awan di bawah pulau. Drift lambat dengan kecepatan berbeda.
- *Partikel:* `Points` dengan shader (debu cahaya / serbuk sari), gerak noise lambat.
- *Light shafts:* cone/plane aditif dengan gradasi & noise bergerak, mengikuti arah matahari.

**01 Arrival** — kamera mulai jauh dan tinggi di antara awan, bergerak sepanjang kurva ~9 detik menuju pulau,
judul muncul bertahap (Motion). CTA → (izin musik) → kamera turun ke posisi explore, overlay fade.
Dunia sudah aktif di belakang, jadi tidak ada loading screen panjang (hanya fade-in pertama).

**02 Garden** — orbit explore + objek interaktif yang memiliki *affordance*: denyut cahaya halus dan label kecil
saat hover/dekat. Bunga mekar (kelopak berputar, partikel, pesan). Kupu-kupu terbang menjauh, kamera melirik
mengikuti, dan arah terbangnya mengarah ke kejutan tersembunyi. Awan bergeser + pesan.

**03 Pond** — kolam di cekungan pulau, shader air (fresnel, kedalaman, ripple prosedural + ripple saat disentuh),
daun mengambang, platform kayu, kunang-kunang. Shot "duduk" rendah di platform. Overlay napas: bunga cahaya 3D
yang membesar 4 detik dan mengecil 6 detik (tanpa menahan napas). Durasi 30s / 60s / bebas, bisa dihentikan kapan saja.

**04 Cottage** — rumah dengan dinding papan kayu (tekstur prosedural), atap genteng instanced, cerobong, jendela
emissive hangat, kotak bunga, lampu teras. Pintu ber-pivot. Interior nyata di dalam rumah: lantai kayu, kursi,
rak buku, meja, lampu meja (point light), jendela ke taman, amplop. Saat kamera masuk, atap/dinding depan
di-fade agar tidak ada clipping.

**05 Letter** — close-up meja (DOF di High). Animasi amplop 3D: flap terbuka (rotasi pivot), kertas meluncur
keluar. Lalu transisi ke surat DOM bergaya kertas dengan teks yang muncul per paragraf. Tombol "Close this letter".

**06 Surprises** — bunga langka (di balik batu), kelinci (idle + lompat), lentera tersembunyi (menyala saat disentuh),
pesan pendek di batu kecil, bintang yang bisa disentuh (malam). Tidak ada skor.

**07 Stay a little longer** — shot di tepi tebing menghadap lautan awan + kontrol waktu. Transisi waktu
~4 detik dengan me-lerp semua uniform (langit, matahari, fog, ambient, emissive jendela, intensitas kunang-kunang).

**Audio** — satu `HTMLAudioElement` global (tidak pernah dibuat ulang) + `AnalyserNode` opsional. Reaksi musik
sangat halus: amplitudo partikel ±15%, glow bunga. Tidak ada kedip.

---

## 5. Risiko performa & kompatibilitas mobile

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Fill-rate (DPR tinggi di HP) | FPS anjlok | DPR dibatasi ke 1.25–1.5 di mobile; PerformanceMonitor menurunkan DPR. |
| Postprocessing di HP | Biaya per-pixel besar | Low: tanpa composer. Medium: bloom ringan. High: AO + bloom + DOF. |
| Shadow map | Draw call & fill | Hanya satu directional light dengan shadow; rumput tidak cast shadow; Low: tanpa shadow (pakai AO baked di vertex color). |
| Jumlah rumput/bunga | Vertex cost | Instancing + jumlah per tier. |
| Shader compile stutter | Patah-patah saat objek pertama muncul | Semua material dibuat saat awal (pre-compile `gl.compile`) sebelum arrival dimulai. |
| iOS Safari: audio autoplay | Musik tidak mulai | Musik hanya dimulai dari gesture pengguna (klik CTA / tombol). AudioContext dibuat di gesture yang sama. |
| iOS Safari: memori WebGL | Tab crash | Tekstur kecil (≤512px), dispose saat tidak dipakai, tanpa render target besar di Low. |
| Gesture vs. scroll browser | Halaman ikut scroll/zoom | `touch-action: none` pada canvas, layout fixed fullscreen, `overscroll-behavior: none`. |
| Address bar mobile (100vh) | Layout melompat | `100dvh`. |
| WebGL tidak tersedia | Layar kosong | Fallback DOM: sapaan, surat, dan musik tetap bisa diakses. |
| Motion sickness | Pengalaman buruk | Kecepatan rotasi dibatasi, tidak ada roll, transisi ≥1.8 detik, reduced-motion = cut lembut + gerakan minimal. |
| Validasi FPS di sandbox | Browser sandbox memakai software GL | QA visual di sandbox; budget dijaga konservatif; overlay `?debug` FPS untuk uji di HP asli. |

**Budget (Medium/mobile):** ≤ 120 draw call, ≤ 400k segitiga terlihat, 1 shadow map 1024, DPR ≤ 1.5.

---

## 6. Milestone

| # | Milestone | Isi | Status |
|---|---|---|---|
| M0 | Rencana | Dokumen ini | ✅ |
| M1 | **Vertical slice** | Setup proyek, sky, lighting, fog, pulau, rumput, pohon, bunga, awan, partikel, rumah (exterior), kolam dasar, camera rig, Arrival cinematic, explore orbit, interaksi bunga, UI dasar, tier kualitas dasar, `?debug` | ✅ |
| M2 | Garden lengkap + Pond | Kupu-kupu, interaksi awan, navigasi antar-lokasi, kolam + shader air, latihan napas | |
| M3 | Cottage + Letter | Pintu, interior, amplop 3D, surat | |
| M4 | Surprises + Stay longer | 5 kejutan, lookout, transisi waktu | |
| M5 | Audio | Player lengkap, persistensi, reaksi musik | |
| M6 | Optimasi & aksesibilitas | Adaptive quality, reduced motion, fallback WebGL, uji browser | |
| M7 | Polish | Refinement visual/animasi, uji responsif | |

Setiap milestone ditutup dengan QA visual di browser (screenshot mobile 390×844 dan desktop 1440×900)
dan pengecekan console error.

---

## Log QA

### M1 — vertical slice (11 putaran QA)
Masalah yang ditemukan lewat screenshot dan sudah diperbaiki:
- Permukaan pulau tidak terlihat (winding segitiga terbalik → back-face culled).
- Awan drei tampil sebagai bulatan abu-gelap (Lambert pada billboard) → diganti sistem awan sendiri dengan shading volume palsu, silver lining, fog, dan depth sort.
- Lighting golden hour murung karena matahari di belakang pulau → side light 3/4 dari kiri, fill langit diseimbangkan.
- Frustum bayangan tetap ±5 (prop R3F tanpa `updateProjectionMatrix`).
- Cekungan kolam kosong → kolam dengan shader air, teratai, batu, alang-alang.
- Batu bawah pulau seperti kotak-kotak → grid diacak, warna strata halus.
- Teks arrival menimpa pulau → framing hold berbeda untuk landscape/portrait.
- Explore di HP terlalu sempit → framing sadar aspect ratio (FOV + jarak).
- Bunga interaktif: glow abu → emas hangat, area sentuh diperbesar, mekar dua lapis kelopak.
- Budget: sirap atap RoundedBox → Box; detail kanopi bertingkat per tier.

Catatan lingkungan QA: browser sandbox merender WebGL secara software (~1–4 fps). Penilaian visual valid,
angka FPS tidak. Gunakan `?debug` di HP asli untuk FPS nyata.
