import type { Metadata } from 'next'
import { PreCadastroPage } from '@/components/domain/cadastros/PreCadastroPage'
export const metadata: Metadata = { title: 'Checklist' }
export default function ChecklistPage() {
  return (
    <PreCadastroPage
      title="Checklist"
      description="Crie itens de checklist padrão para usar nos diários de obra"
      apiPath="/api/pre-cadastros/checklist"
      itemLabel="item de checklist"
      placeholder="Ex: Verificar EPI, Sinalização instalada, Reunião diária..."
    />
  )
}
