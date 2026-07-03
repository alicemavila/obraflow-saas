import type { Metadata } from 'next'
import { PreCadastroPage } from '@/components/domain/cadastros/PreCadastroPage'
export const metadata: Metadata = { title: 'Modelos de Relatórios' }
export default function ModelosRelatorioPage() {
  return (
    <PreCadastroPage
      title="Modelos de relatórios"
      description="Crie modelos padronizados de relatório para agilizar a geração de PDFs"
      apiPath="/api/pre-cadastros/modelos-relatorio"
      itemLabel="modelo"
      placeholder="Ex: Relatório Mensal, Relatório de Ocorrências..."
    />
  )
}
