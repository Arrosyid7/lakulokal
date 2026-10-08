import { ProfileForm } from "@/components/profile/profile-form";
import { requireUser } from "@/lib/auth";

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase.from("profiles").select("full_name,email,avatar_url").eq("id", user.id).maybeSingle();
  return (
    <main id="account-content" className="container app-main">
      <header className="dashboard-page-heading">
        <p className="section-kicker">Akun</p>
        <h1 className="page-title">Profil</h1>
        <p className="page-lead">Kelola nama dan periksa email yang terhubung ke akun Anda.</p>
      </header>
      {error ? <p className="form-error" role="alert">Profil gagal dimuat. Coba muat ulang halaman.</p> : (
        <div className="profile-layout">
          <ProfileForm fullName={profile?.full_name ?? ""} email={profile?.email ?? user.email ?? ""} />
          <aside className="profile-note">
            <h2>Data akun</h2>
            <p>Nama membantu mengenali profil. Email dipakai untuk masuk dan tidak dapat diubah dari formulir ini.</p>
          </aside>
        </div>
      )}
    </main>
  );
}
