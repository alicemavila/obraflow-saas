import type { Metadata } from 'next'
import { PreCadastroPage } from '@/components/domain/cadastros/PreCadastroPage'
export const metadata: Metadata = { title: 'Equipamentos' }
export default function EquipamentosPage() {
  return <PreCadastroPage title="Equipamentos" description="Cadastre equipamentos usados nas obras" apiPath="/api/pre-cadastros/equipamentos" itemLabel="equipamento" placeholder="Ex: Betoneira, Escavadeira, Andaime..." />
}
