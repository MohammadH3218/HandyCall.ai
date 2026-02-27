export default function ProsLayout({ children }: { children: React.ReactNode }) {
  // Public marketing routes under /pros should never inherit dashboard auth guards.
  return <>{children}</>;
}
