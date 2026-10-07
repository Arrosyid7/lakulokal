export type ArticleSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  resources?: { label: string; href: string }[];
};

export type Article = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  keyphrase: string;
  intro: string;
  relatedSlugs: string[];
  sections: ArticleSection[];
};

export const articles: Article[] = [
  {
    slug: "memilih-momen-video-untuk-clip",
    title: "Cara Memilih Momen Video untuk Clip",
    seoTitle: "Memilih Momen Video untuk Clip: Panduan",
    description: "Pelajari cara memilih momen video untuk clip YouTube, menjaga konteks, dan memotong satu gagasan sampai selesai.",
    keyphrase: "memilih momen video untuk clip",
    intro: "Memilih momen video untuk clip dimulai dari isi, bukan durasi. Cari bagian yang menyampaikan satu gagasan lengkap, lalu pastikan penonton baru tetap memahami konteksnya.",
    relatedSlugs: ["clip-video-youtube-yang-jelas", "video-untuk-clip-pendek"],
    sections: [
      {
        heading: "Memilih momen video untuk clip yang utuh",
        paragraphs: [
          "Tandai bagian ketika pembicara menjawab satu pertanyaan, menjelaskan satu langkah, atau menceritakan satu kejadian. Clip yang baik punya titik mulai yang mudah dikenali dan penutup yang terasa selesai.",
          "Hindari memotong tepat sebelum inti jawaban. Dengarkan beberapa detik sebelum dan sesudah momen yang menarik agar kalimat pembuka maupun penutup tidak terasa terputus.",
          "Sesudah menemukan bagian yang kuat, tulis kalimat pembuka dan inti pesannya. Catatan ini membantu membedakan clip yang benar-benar membawa gagasan baru dari potongan lain yang hanya mengulang pembahasan.",
          "Pilih juga penutup yang terasa alami. Kalimat terakhir bisa merangkum jawaban atau memberi jeda sebelum topik berikutnya dimulai."
        ],
        bullets: [
          "Pilih satu pesan utama untuk setiap clip.",
          "Buang jeda yang tidak membawa informasi, tetapi jangan menghilangkan kata yang mengubah makna.",
          "Pastikan clip tetap masuk akal tanpa penjelasan panjang dari video asal."
        ]
      },
      {
        heading: "Periksa konteks dan suara",
        paragraphs: [
          "Sebuah kutipan bisa terdengar berbeda ketika dipisahkan dari percakapan sebelumnya. Putar ulang bagian sebelum dan sesudah pilihan Anda untuk memastikan potongan itu tidak mengubah maksud pembicara.",
          "Dengarkan juga kualitas suara. Musik yang terlalu keras, percakapan yang tertimpa, atau awal kata yang terpotong dapat membuat penonton sulit mengikuti isi.",
          "Perhatikan pergantian pembicara dan perubahan topik. Jika potongan membutuhkan kalimat sebelumnya agar bisa dipahami, sertakan konteks itu atau pilih momen lain yang lebih mandiri."
        ]
      },
      {
        heading: "Susun beberapa clip dengan sudut berbeda",
        paragraphs: [
          "Jika satu video memuat beberapa ide, pilih momen dengan tujuan yang berbeda, misalnya penjelasan singkat, contoh, dan kesimpulan. Hindari menghasilkan beberapa clip yang hanya mengulang kalimat yang sama.",
          "Sebelum memproses video, catat topik atau kata kunci tiap momen. Cara ini membantu Anda meninjau hasil dan memberi nama file yang mudah dicari."
        ]
      },
      {
        heading: "Siapkan sumber video yang boleh digunakan",
        paragraphs: [
          "Pastikan Anda memiliki hak atau izin yang diperlukan untuk memproses dan membagikan video. Pengguna LakuLokal juga perlu mematuhi Ketentuan Layanan YouTube dan aturan yang berlaku.",
          "Periksa apakah izin yang Anda miliki mencakup pemotongan, penyuntingan lanjutan, dan publikasi di kanal yang akan digunakan."
        ]
      }
    ]
  },
  {
    slug: "clip-video-youtube-yang-jelas",
    title: "Panduan Membuat Clip Video YouTube yang Jelas",
    seoTitle: "Clip Video YouTube yang Jelas: Panduan",
    description: "Panduan membuat clip video YouTube yang jelas dengan satu pesan, konteks yang cukup, sambungan rapi, dan peninjauan hasil.",
    keyphrase: "clip video YouTube yang jelas",
    intro: "Clip video YouTube yang jelas membantu penonton memahami topik sejak awal. Susun potongan agar pembuka, isi, dan penutup menyampaikan satu pesan yang sama.",
    relatedSlugs: ["memilih-momen-video-untuk-clip", "hak-cipta-clip-video"],
    sections: [
      {
        heading: "Mulai menyusun clip video YouTube yang jelas",
        paragraphs: [
          "Sebelum memotong, tentukan pertanyaan yang ingin dijawab oleh clip. Pertanyaan itu menjadi penyaring: bagian yang tidak membantu menjawabnya mungkin lebih cocok berada di clip lain.",
          "Tuliskan inti clip dalam satu kalimat. Jika kalimatnya terlalu panjang atau berisi beberapa topik, pecah menjadi beberapa bagian yang berdiri sendiri."
        ]
      },
      {
        heading: "Jaga awal agar langsung memberi konteks",
        paragraphs: [
          "Pembuka sebaiknya menyertakan cukup konteks agar orang yang belum menonton video asal tidak bingung. Jangan hanya mengambil jawaban singkat jika pertanyaannya penting untuk memahami maksudnya.",
          "Hindari intro tambahan yang mengulang isi. Potong jeda yang tidak perlu, tetapi sisakan ruang alami sebelum kata pertama agar suara tidak terasa mendadak.",
          "Bila topik berpindah di tengah video, mulai clip setelah pembicara memperkenalkan pokok bahasannya. Penonton akan mendapat pegangan tanpa perlu mendengar ulang seluruh pembukaan video."
        ]
      },
      {
        heading: "Gunakan potongan yang menjaga makna",
        paragraphs: [
          "Potongan yang rapat bukan berarti setiap jeda harus dihapus. Jeda singkat bisa membantu penonton memahami perubahan gagasan. Dengarkan hasil dari awal sampai akhir dan perhatikan apakah sambungan audio terdengar wajar.",
          "Periksa nama, angka, dan istilah setelah pemotongan. Bagian kecil yang hilang dapat membuat pernyataan terdengar berbeda dari maksud aslinya.",
          "Jangan menyambungkan dua bagian yang berjauhan seolah-olah terjadi dalam satu kalimat tanpa jeda. Jika Anda menggabungkan bagian berbeda, pastikan urutannya tidak mengubah alur atau maksud pembicara."
        ]
      },
      {
        heading: "Tinjau hasil sebelum dibagikan",
        paragraphs: [
          "Putar setiap clip pada perangkat yang akan digunakan untuk mengunggahnya. Pastikan gambar penting tetap terlihat, suara cukup jelas, dan clip tidak berakhir di tengah kalimat.",
          "LakuLokal membuat order dari tautan YouTube yang dikirim melalui akun. Status pembayaran dan pemrosesan dapat dilihat di halaman order.",
          "Periksa pembingkaian gambar setelah dipotong. Pastikan wajah, papan tulis, atau benda yang sedang dibahas tidak berada terlalu dekat dengan tepi gambar.",
          "Jika Anda menambahkan teks saat mengedit lanjutan, baca kembali ejaan nama dan istilah. Teks sebaiknya membantu memahami isi, bukan menutupi bagian gambar yang penting.",
          "Hasil LakuLokal menggunakan bingkai vertikal. Periksa kembali posisi pembicara dan objek utama di setiap file sebelum mengunggahnya."
        ]
      }
    ]
  },
  {
    slug: "hak-cipta-clip-video",
    title: "Hak Cipta Clip Video: Periksa Izin Sebelum Mengolah",
    seoTitle: "Hak Cipta Clip Video: Periksa Izin",
    description: "Periksa hak cipta clip video, izin rekaman, musik, dan materi lain sebelum mengolah atau membagikan potongan dari YouTube.",
    keyphrase: "hak cipta clip video",
    intro: "Periksa hak cipta clip video sebelum mengolahnya. Tautan yang bisa ditonton belum tentu memberi izin untuk memotong, mengunggah ulang, atau membagikan rekaman, musik, dan materi lain.",
    relatedSlugs: ["clip-video-youtube-yang-jelas", "video-untuk-clip-pendek"],
    sections: [
      {
        heading: "Periksa hak cipta clip video sebelum memproses",
        paragraphs: [
          "Video publik dapat diakses untuk ditonton, tetapi status publik saja tidak membuktikan bahwa Anda boleh mengunduh, memotong, mengunggah ulang, atau memakai materinya untuk tujuan lain.",
          "Tinjau lisensi dan izin yang berlaku untuk video serta materi pihak ketiga di dalamnya. Jika ragu, tanyakan kepada pemilik hak sebelum memproses atau memublikasikan potongan."
        ]
      },
      {
        heading: "Periksa seluruh materi dalam rekaman",
        paragraphs: [
          "Hak penggunaan dapat mencakup lebih dari gambar utama. Musik latar, foto, cuplikan siaran, ilustrasi, dan suara orang lain juga dapat memiliki pemilik atau ketentuan tersendiri.",
          "Simpan catatan izin dan sumber materi yang Anda gunakan. Catatan itu memudahkan pemeriksaan kembali ketika clip hendak dipakai di kanal atau konteks yang berbeda.",
          "Jika pemilik video menetapkan syarat tertentu, baca syarat itu sebelum memproses. Jangan menganggap izin untuk menonton atau menyematkan video otomatis mengizinkan penggunaan ulang."
        ]
      },
      {
        heading: "Simpan syarat izin dengan jelas",
        paragraphs: [
          "Catat siapa yang memberikan izin, materi mana yang dicakup, dan batas penggunaan yang disebutkan. Jika ada aturan atribusi, ikuti permintaan pemilik saat menyiapkan publikasi.",
          "Periksa kembali catatan tersebut ketika Anda mengubah tujuan clip, misalnya dari penggunaan pribadi menjadi publikasi untuk kanal lain."
        ]
      },
      {
        heading: "Jangan mengubah maksud sumber",
        paragraphs: [
          "Potongan yang terlalu pendek dapat menghilangkan konteks dan membuat pembicara tampak mengatakan sesuatu yang berbeda. Sertakan bagian yang diperlukan untuk mempertahankan makna, dan jangan menambahkan keterangan yang menyesatkan.",
          "Jika clip berisi pendapat, klaim, atau informasi sensitif, periksa sumber lengkap sebelum membagikannya."
        ]
      },
      {
        heading: "Tinjau aturan yang berlaku",
        paragraphs: [
          "Pengguna bertanggung jawab memastikan memiliki hak atau izin yang diperlukan untuk memproses dan menggunakan video. Pengguna LakuLokal juga harus mengikuti Ketentuan Layanan YouTube dan peraturan yang berlaku.",
          "Sebelum membagikan hasil, periksa kembali musik, gambar, dan suara yang ikut masuk ke dalam rekaman. Izin untuk satu bagian belum tentu mencakup materi lain yang muncul di video.",
          "Panduan ini bersifat umum dan bukan nasihat hukum. Jika penggunaan video menimbulkan pertanyaan hukum, mintalah saran dari tenaga profesional yang sesuai."
        ],
        resources: [{ label: "Baca Ketentuan Layanan YouTube", href: "https://www.youtube.com/t/terms?hl=id" }]
      }
    ]
  },
  {
    slug: "video-untuk-clip-pendek",
    title: "Cara Menyiapkan Video untuk Clip Pendek",
    seoTitle: "Video untuk Clip Pendek: Cara Menyiapkan",
    description: "Siapkan video untuk clip pendek dengan memeriksa tautan, topik, hak penggunaan, dan momen sebelum mengirim order.",
    keyphrase: "video untuk clip pendek",
    intro: "Menyiapkan video untuk clip pendek membantu Anda memeriksa sumber, menentukan tujuan, dan meninjau hasil. Mulai dengan memastikan tautan video benar dan hak penggunaannya sudah diperiksa.",
    relatedSlugs: ["memilih-momen-video-untuk-clip", "clip-video-youtube-yang-jelas"],
    sections: [
      {
        heading: "Pastikan video untuk clip pendek dapat diakses",
        paragraphs: [
          "Buka tautan sebelum mengirimkannya dan pastikan video yang tampil memang sumber yang akan diproses. Video privat, dibatasi usia, atau tidak tersedia untuk diunduh dapat gagal diproses.",
          "Hindari menyalin tautan playlist atau halaman kanal jika yang dibutuhkan adalah satu video tertentu.",
          "Jika tautan dibagikan oleh orang lain, tanyakan apakah videonya masih dapat dibuka dan apakah Anda memiliki izin untuk mengolahnya. Pemeriksaan singkat ini membantu menghindari order yang memakai sumber keliru."
        ]
      },
      {
        heading: "Tentukan tujuan setiap clip",
        paragraphs: [
          "Pikirkan siapa yang akan menonton dan apa yang perlu mereka pahami. Tujuan yang jelas membantu Anda memilih bagian video yang relevan dan memeriksa apakah potongan hasil masih memiliki konteks.",
          "Jika sumber berisi beberapa pembahasan, catat topik yang ingin diambil. Daftar sederhana lebih membantu daripada mencoba mengambil semua bagian menarik sekaligus."
        ],
        bullets: [
          "Catat kata kunci atau pertanyaan untuk tiap momen.",
          "Tandai bagian yang memerlukan konteks tambahan.",
          "Pilih hanya video yang hak penggunaannya sudah Anda periksa."
        ]
      },
      {
        heading: "Pahami alur order",
        paragraphs: [
          "Di LakuLokal, pengguna masuk ke akun, mengirim tautan video dan memilih paket, lalu melihat status order di dashboard. Harga paket yang aktif diambil oleh server saat order dibuat.",
          "Pembayaran menggunakan QRIS DANA. Server memeriksa status transaksi sebelum order ditandai lunas, dan hasil clip ditampilkan setelah pemrosesan selesai.",
          "Simpan tautan order setelah dikirim agar Anda dapat kembali ke halaman detailnya. Dari sana, periksa status terbaru dan unduh hasil yang tersedia sebelum masa penyimpanan berakhir."
        ]
      },
      {
        heading: "Simpan hasil dengan tertib",
        paragraphs: [
          "Setelah hasil tersedia, unduh file dan pindahkan ke penyimpanan yang Anda kelola. File hasil LakuLokal disimpan sementara sesuai konfigurasi layanan, jadi jangan mengandalkan tautan unduhan sebagai arsip jangka panjang.",
          "Gunakan nama file yang menjelaskan topik atau urutan clip. Simpan juga catatan singkat tentang tujuan tiap potongan agar file lebih mudah ditemukan ketika akan disunting atau diunggah.",
          "Pastikan file sudah dapat dibuka sebelum menutup halaman order. Jika ada kendala, catat kode order supaya lebih mudah meminta bantuan."
        ]
      }
    ]
  }
];

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}
