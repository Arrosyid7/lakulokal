"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { SiteFooter } from "@/components/site-footer";

type AuthFormProps = { mode: "login" | "register" | "forgot" | "reset" };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirm_password") || "");
    const fullName = String(form.get("full_name") || "").trim();

    try {
      if (mode === "register") {
        if (!fullName) throw new Error("Nama wajib diisi.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email tidak valid.");
        if (password.length < 8) throw new Error("Password minimal 8 karakter.");
        if (password !== confirmPassword) throw new Error("Konfirmasi password tidak sama.");
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`
          }
        });
        if (error) throw error;
        if (!data.session) {
          setMessage({ kind: "success", text: "Periksa email Anda untuk mengonfirmasi pendaftaran sebelum masuk." });
          return;
        }
        router.replace("/dashboard");
        router.refresh();
      } else if (mode === "login") {
        if (!email || !password) throw new Error("Email dan password wajib diisi.");
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error("Email atau password tidak cocok.");
        const next = new URLSearchParams(window.location.search).get("next");
        const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
        router.replace(safeNext);
        router.refresh();
      } else if (mode === "forgot") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Masukkan alamat email yang valid.");
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        });
        if (error) throw error;
        setMessage({ kind: "success", text: "Jika alamat tersebut terdaftar, instruksi pemulihan akan dikirim ke email." });
      } else {
        if (password.length < 8) throw new Error("Password minimal 8 karakter.");
        if (password !== confirmPassword) throw new Error("Konfirmasi password tidak sama.");
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw new Error("Sesi pemulihan tidak valid. Minta tautan baru.");
        setMessage({ kind: "success", text: "Password berhasil diperbarui. Silakan masuk kembali." });
        await supabase.auth.signOut();
      }
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Permintaan gagal. Silakan coba lagi."
      });
    } finally {
      setBusy(false);
    }
  }

  const title = {
    login: "Masuk ke akun",
    register: "Buat akun LakuLokal",
    forgot: "Pulihkan akses akun",
    reset: "Buat password baru"
  }[mode];
  const descriptions = {
    login: "Masuk untuk mengelola order dan hasil clip Anda.",
    register: "Gunakan email aktif untuk membuat dan melihat order.",
    forgot: "Masukkan email akun. Kami akan mengirim tautan pemulihan bila alamat terdaftar.",
    reset: "Gunakan password baru dengan panjang minimal 8 karakter."
  }[mode];
  const asideCopy = {
    login: "Lanjutkan mengelola order, pembayaran, dan hasil clip dari akun Anda.",
    register: "Buat akun untuk mengirim video dan menyimpan riwayat order clip.",
    forgot: "Akses akun Anda kembali melalui instruksi pemulihan yang dikirim ke email.",
    reset: "Perbarui password untuk menjaga akses ke akun dan riwayat order."
  }[mode];

  return (
    <>
      <main className="auth-page">
        <div className="auth-layout">
          <aside className="auth-aside">
            <Link className="brand" href="/">LakuLokal</Link>
            <div>
              <h2>Video panjang jadi <em>clip</em> yang mudah dikelola.</h2>
              <p>{asideCopy}</p>
            </div>
            <p className="auth-aside-foot">Order dan hasil clip tetap terhubung dengan akun Anda.</p>
          </aside>
          <section className="auth-card" aria-labelledby="auth-title">
            <Link className="text-link auth-back" href="/">Kembali ke beranda</Link>
            <h1 id="auth-title">{title}</h1>
            <p>{descriptions}</p>
            <form className="form-stack" onSubmit={submit} noValidate>
              {mode === "register" && (
                <div className="field">
                  <label htmlFor="full_name">Nama</label>
                  <input id="full_name" name="full_name" autoComplete="name" required maxLength={120} />
                </div>
              )}
              {(mode === "register" || mode === "login" || mode === "forgot") && (
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" autoComplete="email" required />
                </div>
              )}
              {(mode === "login" || mode === "register" || mode === "reset") && (
                <div className="field">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    minLength={mode === "login" ? undefined : 8}
                  />
                  <button
                    className="text-link"
                    type="button"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  </button>
                </div>
              )}
              {(mode === "register" || mode === "reset") && (
                <div className="field">
                  <label htmlFor="confirm_password">Konfirmasi password</label>
                  <input id="confirm_password" name="confirm_password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} />
                </div>
              )}
              {message && (
                <p
                  className={message.kind === "error" ? "form-error" : "form-success"}
                  role={message.kind === "error" ? "alert" : "status"}
                  aria-live={message.kind === "error" ? "assertive" : "polite"}
                >
                  {message.text}
                </p>
              )}
              <button className="button" type="submit" disabled={busy}>
                {busy ? "Memproses..." : ({
                  login: "Masuk",
                  register: "Buat akun",
                  forgot: "Kirim tautan pemulihan",
                  reset: "Simpan password baru"
                }[mode])}
              </button>
            </form>
            <div className="auth-foot">
              {mode === "login" && <>Belum punya akun? <Link className="text-link" href="/register">Buat akun</Link><br /><Link className="text-link" href="/forgot-password">Lupa password?</Link></>}
              {mode === "register" && <>Sudah punya akun? <Link className="text-link" href="/login">Masuk</Link><br />Dengan mendaftar, Anda menyetujui <Link className="text-link" href="/terms">Syarat Layanan</Link> dan <Link className="text-link" href="/privacy">Kebijakan Privasi</Link>.</>}
              {mode === "forgot" && <Link className="text-link" href="/login">Kembali ke halaman masuk</Link>}
              {mode === "reset" && <Link className="text-link" href="/login">Kembali ke halaman masuk</Link>}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
