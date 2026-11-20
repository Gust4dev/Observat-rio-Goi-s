import AdminConsole from "@/components/admin/AdminConsole";

export const metadata = { title: "Administração | Observatório Goiás", robots: { index: false, follow: false } };

export default function AdminPage() {
  return <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-8"><AdminConsole /></main>;
}
