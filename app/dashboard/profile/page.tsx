import { ProfileForm } from "@/components/profile/profile-form";
import { requireUser } from "@/lib/auth";

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase.from("profiles").select("full_name,email,avatar_url").eq("id", user.id).maybeSingle();
  return (
    <main className="container app-main">
      <h1 className="page-title">Profil</h1>
      <p className="page-lead">Kelola nama dan lihat email yang terhubung ke akun Supabase Auth.</p>
      {error ? <p className="form-error" role="alert">Profil gagal dimuat. Coba muat ulang halaman.</p> : (
        <ProfileForm fullName={profile?.full_name ?? ""} email={profile?.email ?? user.email ?? ""} />
      )}
    </main>
  );
}
