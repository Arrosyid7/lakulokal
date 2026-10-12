update public.site_configuration
set landing_content = jsonb_set(
  jsonb_set(
    landing_content,
    '{processSteps}',
    '[
      {"title":"Masuk atau buat akun","description":"Gunakan akun untuk membeli kredit, melihat saldo, dan menyimpan riwayat order."},
      {"title":"Bayar Rp1.000 dengan QRIS","description":"Pembayaran membeli 5 kredit. Unggah bukti QRIS pada halaman order agar admin dapat memeriksanya."},
      {"title":"Tunggu persetujuan admin","description":"Order tetap menunggu selama pemeriksaan. Saldo bertambah 5 kredit setelah pembayaran disetujui."},
      {"title":"Pilih video dan jumlah clip","description":"Buat satu clip dengan rentang waktu manual memakai 1 kredit, lalu ulangi untuk clip berikutnya. Atau buat lima clip sekaligus dengan 5 kredit."}
    ]'::jsonb
  ),
  '{questions}',
  '[
    {"question":"Berapa harga kredit clip?","answer":"Rp1.000 membeli 5 kredit. Setiap clip menggunakan 1 kredit, jadi satu pembelian cukup untuk membuat lima clip."},
    {"question":"Bagaimana pembayaran diproses?","answer":"Bayar melalui QRIS, lalu unggah bukti pada halaman order. Status order menunggu pemeriksaan admin. Kredit baru masuk ke saldo setelah admin menyetujui pembayaran."},
    {"question":"Bagaimana cara membuat satu clip atau lima clip?","answer":"Pilih file video dari perangkat. Untuk clip manual, masukkan waktu mulai dan selesai dalam detik. Satu proses membuat satu clip dan memakai 1 kredit; mulai proses baru untuk membuat clip manual berikutnya. Pilihan lima clip membuat lima bagian yang dibagi merata sekaligus dan memakai 5 kredit."},
    {"question":"Apakah kredit yang belum dipakai tetap tersimpan?","answer":"Ya. Kredit yang belum digunakan tetap tersimpan di saldo akun Anda. Saldo berkurang sesuai clip yang diproses: 1 kredit untuk satu clip atau 5 kredit untuk lima clip."},
    {"question":"Apa yang terjadi jika pembuatan clip gagal?","answer":"Kredit untuk clip yang belum berhasil disimpan dikembalikan ke saldo. Clip yang sudah berhasil disimpan tetap menggunakan kredit."},
    {"question":"File video apa yang dapat diproses?","answer":"Pilih file MP4, MOV, M4V, atau WebM berukuran maksimal 250 MB dan berdurasi tidak lebih dari dua jam."},
    {"question":"Apa yang perlu diperiksa sebelum memilih video?","answer":"Pastikan Anda memiliki hak atau izin yang diperlukan untuk memproses dan menggunakan video, serta mematuhi Ketentuan Layanan YouTube dan aturan yang berlaku."},
    {"question":"Apakah video dan hasilnya disimpan?","answer":"Video sumber diproses di browser dan tetap berada di perangkat Anda. File hasil tersedia di riwayat order selama 24 jam, lalu dihapus otomatis. Unduh hasil sebelum masa penyimpanan berakhir."}
  ]'::jsonb
),
updated_at = now()
where id = 'main';

update public.site_articles
set sections = (
  select coalesce(
    jsonb_agg(
      case
        when section.value ->> 'heading' = 'Pastikan file video untuk clip pendek dapat dibuka' then
          jsonb_set(
            section.value,
            '{paragraphs}',
            '[
              "Pilih dan putar file yang ingin diproses. LakuLokal menerima MP4, MOV, M4V, dan WebM.",
              "Simpan file di perangkat yang digunakan untuk membuat clip. File sumber diproses langsung di browser dan tidak diunggah ke server.",
              "Jika video diberikan oleh orang lain, pastikan Anda memiliki izin untuk mengolahnya. Pemeriksaan singkat ini membantu menghindari order dengan sumber yang keliru."
            ]'::jsonb
          )
        when section.value ->> 'heading' = 'Pahami alur order' then
          jsonb_set(
            section.value,
            '{paragraphs}',
            '[
              "Beli 5 kredit seharga Rp1.000 melalui QRIS, lalu unggah bukti pembayaran di halaman order. Admin memeriksa transaksi dan saldo bertambah setelah pembayaran disetujui.",
              "Gunakan dashboard untuk melihat saldo dan riwayat order. File clip tersedia selama 24 jam setelah selesai, lalu dihapus otomatis. Unduh hasil sebelum masa itu berakhir."
            ]'::jsonb
          )
        else section.value
      end
      order by section.ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(public.site_articles.sections)
    with ordinality as section(value, ordinality)
)
where slug = 'video-untuk-clip-pendek';

update public.site_articles
set sections = sections || jsonb_build_array(
  jsonb_build_object(
    'heading', 'Pilih satu clip atau lima clip',
    'paragraphs', jsonb_build_array(
      'Untuk clip manual, masukkan waktu mulai dan selesai yang Anda inginkan. Satu proses menghasilkan satu clip berdurasi maksimal 60 detik dan memakai 1 kredit. Kembali ke halaman pembuatan clip untuk menentukan rentang manual berikutnya.',
      'Untuk lima clip, LakuLokal memilih lima bagian yang dibagi merata dari video. Setiap clip dibatasi maksimal 60 detik dan menggunakan total 5 kredit.',
      'Kredit yang belum digunakan tetap tersimpan di saldo akun. Jika proses gagal, kredit untuk clip yang belum berhasil disimpan dikembalikan ke saldo.'
    )
  )
)
where slug = 'video-untuk-clip-pendek'
  and not exists (
    select 1
    from jsonb_array_elements(public.site_articles.sections) as section(value)
    where section.value ->> 'heading' = 'Pilih satu clip atau lima clip'
  );

update public.site_articles
set sections = (
  select coalesce(
    jsonb_agg(
      case
        when section.value ->> 'heading' = 'Tinjau hasil sebelum dibagikan'
          and jsonb_array_length(section.value -> 'paragraphs') >= 2 then
          jsonb_set(
            section.value,
            '{paragraphs,1}',
            '"LakuLokal memproses file video yang Anda pilih dari perangkat, bukan tautan YouTube. File sumber diproses di browser, sementara status proses dan hasilnya dapat dilihat di riwayat order."'::jsonb
          )
        else section.value
      end
      order by section.ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(public.site_articles.sections)
    with ordinality as section(value, ordinality)
)
where slug = 'clip-video-youtube-yang-jelas';

notify pgrst, 'reload schema';
