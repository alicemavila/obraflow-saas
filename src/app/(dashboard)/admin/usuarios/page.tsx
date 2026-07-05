import { redirect } from 'next/navigation'
// Compatibilidade: /admin/usuarios → /cadastros/usuarios
export default function AdminUsuariosRedirect() {
  redirect('/cadastros/usuarios')
}
