import { redirect } from 'next/navigation'
// Compatibilidade: /admin/empresa → /cadastros/empresa
export default function AdminEmpresaRedirect() {
  redirect('/cadastros/empresa')
}
