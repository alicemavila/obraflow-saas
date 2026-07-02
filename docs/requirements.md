# Documentação de Requisitos — ObraFlow

## 1. Identificação do Projeto

**Nome do projeto:** ObraFlow
**Tipo de sistema:** SaaS Web Responsivo
**Produto:** Sistema de Diário de Obras e Acompanhamento de Obras
**Versão do documento:** 1.0
**Status:** MVP
**Público-alvo:** Construtoras, empresas de engenharia, administradoras de obras, clientes e síndicos.

---

## 2. Visão Geral

O **ObraFlow** é uma plataforma SaaS para gestão de diário de obras, permitindo que empresas cadastrem obras, usuários, permissões e registros diários com informações sobre atividades, ocorrências, mão de obra, materiais, fotos, anexos e comentários.

O sistema também oferece uma área exclusiva para clientes ou síndicos acompanharem o andamento da obra de forma segura, com acesso restrito somente às obras autorizadas.

Além disso, o MVP contempla geração de relatórios em PDF, histórico de registros, filtros, infraestrutura básica para produção, segurança de dados, backup e requisitos iniciais de conformidade com LGPD.

---

## 3. Objetivo do MVP

Criar uma primeira versão funcional do sistema que permita:

* Gerenciar empresas, usuários, permissões e obras.
* Registrar diariamente o andamento da obra.
* Anexar fotos, documentos e comentários aos registros.
* Permitir acesso restrito para cliente/síndico.
* Gerar relatórios em PDF.
* Garantir controle de acesso, segurança, isolamento de dados por empresa e boas práticas de LGPD.
* Preparar o projeto para deploy em produção com banco, hospedagem, backup e documentação.

---

## 4. Escopo do MVP

### 4.1 Incluído no MVP

O MVP deve contemplar:

* Login e autenticação de usuários.
* Gestão de empresa.
* Gestão de usuários.
* Gestão de permissões.
* Gestão de obras.
* Criação de registros diários.
* Cadastro de atividades.
* Cadastro de ocorrências.
* Cadastro de mão de obra.
* Cadastro de materiais.
* Upload de fotos.
* Upload de anexos.
* Comentários nos registros.
* Área do cliente/síndico.
* Visualização do andamento da obra.
* Relatórios em PDF.
* Histórico de registros.
* Filtros de relatório.
* Banco de dados.
* Hospedagem planejada.
* Backup.
* Segurança.
* LGPD.
* Logs e auditoria básica.
* Documentação técnica.

### 4.2 Fora do MVP

Não fazem parte da primeira versão:

* Aplicativo mobile nativo.
* Assinatura digital avançada.
* Integração com ERP.
* Integração com sistemas financeiros.
* Chat em tempo real.
* Notificações push.
* Controle financeiro completo da obra.
* Cronograma físico-financeiro avançado.
* Inteligência artificial para análise da obra.
* BI/dashboard analítico avançado.
* Workflow complexo de aprovação.
* Multi-idioma.
* Módulo de contratos.

---

## 5. Perfis de Usuário

### 5.1 SUPER_ADMIN

Usuário técnico/global do sistema.

Permissões:

* Acessar todas as empresas.
* Cadastrar empresas.
* Gerenciar configurações globais.
* Acessar logs administrativos.
* Dar suporte técnico.

### 5.2 ADMIN_EMPRESA

Administrador da empresa contratante.

Permissões:

* Gerenciar dados da própria empresa.
* Cadastrar usuários.
* Definir permissões.
* Cadastrar obras.
* Vincular usuários às obras.
* Visualizar registros e relatórios da empresa.

### 5.3 GESTOR_OBRA

Responsável pela gestão operacional da obra.

Permissões:

* Visualizar obras vinculadas.
* Criar registros diários.
* Editar registros permitidos.
* Adicionar atividades.
* Adicionar ocorrências.
* Adicionar mão de obra.
* Adicionar materiais.
* Enviar fotos e anexos.
* Gerar relatórios da obra.

### 5.4 COLABORADOR

Usuário operacional com permissões limitadas.

Permissões:

* Visualizar obras autorizadas.
* Contribuir com registros conforme permissão.
* Adicionar informações específicas, se autorizado.
* Enviar fotos ou anexos, se autorizado.

### 5.5 CLIENTE_SINDICO

Usuário externo com acesso restrito.

Permissões:

* Login próprio.
* Visualizar obras autorizadas.
* Visualizar andamento da obra.
* Visualizar registros publicados.
* Visualizar fotos e anexos liberados.
* Baixar relatórios, se autorizado.

Restrições:

* Não pode editar dados.
* Não pode excluir registros.
* Não pode acessar dados internos.
* Não pode visualizar obras não vinculadas.
* Não pode acessar dados de outras empresas.

---

## 6. Requisitos Funcionais

## 6.1 Autenticação e Acesso

### RF-001 — Login de Usuário

O sistema deve permitir que usuários realizem login com e-mail e senha.

**Critérios de aceite:**

* O usuário deve informar e-mail e senha.
* O sistema deve validar as credenciais.
* Em caso de sucesso, o usuário deve ser direcionado para sua área correspondente.
* Em caso de erro, o sistema deve exibir mensagem genérica, sem informar se o e-mail ou a senha está incorreto.

---

### RF-002 — Logout

O sistema deve permitir que o usuário encerre sua sessão.

**Critérios de aceite:**

* O usuário deve conseguir sair do sistema.
* Após logout, rotas protegidas não devem ser acessíveis.
* O usuário deve ser redirecionado para a tela de login.

---

### RF-003 — Controle de Acesso por Perfil

O sistema deve controlar permissões de acordo com o perfil do usuário.

**Critérios de aceite:**

* Cada perfil deve acessar somente funcionalidades permitidas.
* O backend deve validar permissões.
* O frontend não deve exibir menus sem permissão.
* Tentativas manuais de acesso indevido via API devem ser bloqueadas.

---

## 6.2 Área Administrativa

### RF-004 — Cadastro de Empresa

O sistema deve permitir o cadastro de empresas.

Campos mínimos:

* Razão social
* Nome fantasia
* CNPJ
* E-mail
* Telefone
* Status
* Data de cadastro

**Critérios de aceite:**

* Apenas SUPER_ADMIN pode cadastrar empresas.
* Campos obrigatórios devem ser validados.
* CNPJ deve ser único.
* Empresas inativas não devem permitir novos acessos administrativos.

---

### RF-005 — Gestão de Usuários

O sistema deve permitir o cadastro, edição, ativação e desativação de usuários.

Campos mínimos:

* Nome
* E-mail
* Perfil
* Empresa
* Status
* Obras vinculadas

**Critérios de aceite:**

* ADMIN_EMPRESA só pode gerenciar usuários da própria empresa.
* E-mail deve ser único.
* Senha deve ser armazenada com hash.
* Usuário desativado não deve conseguir acessar o sistema.

---

### RF-006 — Gestão de Permissões

O sistema deve permitir o controle de permissões por perfil.

**Critérios de aceite:**

* Cada perfil deve possuir permissões específicas.
* O sistema deve impedir acesso a funcionalidades não autorizadas.
* Permissões devem ser aplicadas no backend.
* Alterações de permissão devem ser registradas em log.

---

### RF-007 — Cadastro de Obras

O sistema deve permitir o cadastro de obras.

Campos mínimos:

* Nome da obra
* Código interno
* Endereço
* Empresa responsável
* Responsável técnico
* Data de início
* Data prevista de término
* Status: ativa, pausada ou finalizada
* Descrição

**Critérios de aceite:**

* ADMIN_EMPRESA pode cadastrar obras da própria empresa.
* GESTOR_OBRA pode visualizar apenas obras vinculadas.
* Obra deve estar sempre vinculada a uma empresa.
* Não deve existir acesso cruzado entre empresas.

---

## 6.3 Diário de Obra

### RF-008 — Criar Registro Diário

O sistema deve permitir a criação de registro diário para uma obra.

Campos mínimos:

* Obra
* Data do registro
* Responsável
* Resumo do dia
* Status: rascunho, publicado ou revisado
* Clima, se aplicável
* Data de criação
* Data de atualização

**Critérios de aceite:**

* Apenas usuários autorizados podem criar registros.
* O registro deve estar vinculado a uma obra.
* A obra deve pertencer à empresa do usuário.
* O sistema deve impedir criação de registros em obras não autorizadas.

---

### RF-009 — Cadastrar Atividades

O sistema deve permitir adicionar atividades ao registro diário.

Campos mínimos:

* Descrição da atividade
* Equipe ou responsável
* Período
* Status da atividade
* Observações

**Critérios de aceite:**

* Uma atividade deve pertencer a um registro diário.
* O usuário deve ter permissão para editar o registro.
* Atividades devem aparecer no detalhe do diário e no relatório.

---

### RF-010 — Cadastrar Ocorrências

O sistema deve permitir registrar ocorrências no diário da obra.

Campos mínimos:

* Tipo da ocorrência
* Descrição
* Gravidade
* Ação tomada
* Responsável

**Critérios de aceite:**

* Ocorrências devem estar vinculadas a um registro diário.
* O sistema deve permitir classificação por gravidade.
* Ocorrências devem poder ser filtradas nos relatórios.

---

### RF-011 — Cadastrar Mão de Obra

O sistema deve permitir registrar mão de obra utilizada no dia.

Campos mínimos:

* Função
* Quantidade
* Empresa/equipe
* Horas trabalhadas
* Observação

**Critérios de aceite:**

* Mão de obra deve estar vinculada ao registro diário.
* Quantidade e horas trabalhadas devem aceitar apenas valores válidos.
* Informações devem aparecer no relatório.

---

### RF-012 — Cadastrar Materiais

O sistema deve permitir registrar materiais utilizados.

Campos mínimos:

* Nome do material
* Quantidade
* Unidade de medida
* Observação

**Critérios de aceite:**

* Material deve estar vinculado ao registro diário.
* Quantidade deve ser obrigatória.
* Unidade de medida deve ser obrigatória.

---

### RF-013 — Upload de Fotos

O sistema deve permitir upload de fotos no registro diário.

**Critérios de aceite:**

* O usuário deve conseguir anexar múltiplas fotos.
* O sistema deve validar extensão do arquivo.
* O sistema deve validar tamanho máximo.
* Fotos devem ficar vinculadas ao registro diário.
* Usuários sem permissão não devem acessar fotos restritas.

---

### RF-014 — Upload de Anexos

O sistema deve permitir upload de anexos.

**Critérios de aceite:**

* O usuário deve conseguir anexar documentos.
* O sistema deve validar tipo e tamanho do arquivo.
* Anexos devem ser vinculados ao registro diário.
* O sistema deve impedir upload de arquivos potencialmente perigosos.
* O acesso ao arquivo deve respeitar permissões.

---

### RF-015 — Comentários

O sistema deve permitir comentários em registros diários.

Campos mínimos:

* Usuário
* Comentário
* Data e hora

**Critérios de aceite:**

* Comentários devem ficar vinculados ao registro diário.
* Usuários externos só devem visualizar comentários liberados.
* O sistema deve registrar autor e data do comentário.

---

### RF-016 — Histórico de Alterações

O sistema deve manter histórico de alterações relevantes.

**Critérios de aceite:**

* O sistema deve registrar criação, edição e exclusão lógica.
* Deve registrar usuário responsável pela ação.
* Deve registrar data e hora da ação.
* Alterações críticas devem ser auditáveis.

---

## 6.4 Área Cliente/Síndico

### RF-017 — Login do Cliente/Síndico

O sistema deve permitir login próprio para cliente ou síndico.

**Critérios de aceite:**

* Cliente/síndico deve acessar ambiente restrito.
* O usuário externo não deve acessar área administrativa.
* O login deve seguir as mesmas regras de segurança dos demais usuários.

---

### RF-018 — Visualizar Obras Autorizadas

O cliente/síndico deve visualizar apenas obras vinculadas ao seu usuário.

**Critérios de aceite:**

* O sistema deve listar apenas obras autorizadas.
* O backend deve bloquear acesso a obras não autorizadas.
* Tentativas via URL ou API devem retornar acesso negado ou recurso inexistente.

---

### RF-019 — Visualizar Andamento da Obra

O cliente/síndico deve conseguir acompanhar o andamento da obra.

**Critérios de aceite:**

* Deve visualizar registros publicados.
* Não deve visualizar rascunhos internos.
* Não deve visualizar dados sensíveis.
* Deve visualizar fotos e anexos liberados.

---

## 6.5 Relatórios

### RF-020 — Gerar Relatório PDF

O sistema deve gerar relatório em PDF do diário da obra.

O PDF deve conter:

* Dados da empresa
* Dados da obra
* Período selecionado
* Registros diários
* Atividades
* Ocorrências
* Mão de obra
* Materiais
* Fotos, se selecionadas
* Lista de anexos
* Responsável pela geração
* Data e hora da geração

**Critérios de aceite:**

* O PDF deve respeitar permissões.
* Cliente/síndico só pode gerar relatório de obra autorizada.
* O relatório não deve misturar dados de empresas diferentes.
* O sistema deve registrar log da geração do relatório.

---

### RF-021 — Histórico de Relatórios

O sistema deve manter histórico dos relatórios gerados.

**Critérios de aceite:**

* Deve registrar usuário gerador.
* Deve registrar data e hora.
* Deve registrar obra e período filtrado.
* Deve permitir consulta posterior por usuários autorizados.

---

### RF-022 — Filtros de Relatórios

O sistema deve permitir filtros nos relatórios.

Filtros mínimos:

* Obra
* Data inicial
* Data final
* Tipo de ocorrência
* Responsável
* Status do registro

**Critérios de aceite:**

* Filtros devem retornar apenas dados autorizados.
* Datas inválidas devem ser bloqueadas.
* Resultado vazio deve exibir mensagem adequada.

---

## 7. Regras de Negócio

### RN-001 — Isolamento por Empresa

Cada empresa deve acessar apenas seus próprios dados.

---

### RN-002 — Obra Sempre Vinculada a Empresa

Toda obra deve pertencer obrigatoriamente a uma empresa.

---

### RN-003 — Registro Diário Sempre Vinculado a Obra

Todo registro diário deve estar vinculado a uma obra existente.

---

### RN-004 — Cliente/Síndico com Acesso Restrito

Cliente/síndico só pode visualizar obras explicitamente autorizadas.

---

### RN-005 — Permissão Validada no Backend

Toda ação protegida deve ser validada no backend, mesmo que o botão ou menu esteja oculto no frontend.

---

### RN-006 — Registros Críticos Não Devem Ser Excluídos Fisicamente

Registros importantes devem usar exclusão lógica, preservando histórico e auditoria.

---

### RN-007 — Dados de Empresas Não Podem Ser Misturados

Listagens, filtros, relatórios, anexos e fotos devem respeitar o companyId do usuário autenticado.

---

### RN-008 — Apenas Registros Publicados São Visíveis para Cliente/Síndico

Registros em rascunho ou revisão interna não devem ser exibidos para usuários externos.

---

### RN-009 — Uploads Devem Ser Validados

Arquivos enviados devem passar por validação de tipo, tamanho e permissão.

---

### RN-010 — Ações Críticas Devem Gerar Log

Criação, edição, exclusão, geração de relatório, alteração de permissão e acesso indevido devem gerar log.

---

## 8. Requisitos Não Funcionais

### RNF-001 — Segurança

O sistema deve seguir boas práticas de segurança para aplicações web.

Requisitos mínimos:

* Senhas com hash forte.
* Autenticação segura.
* Controle de sessão.
* Proteção contra acesso indevido.
* Rate limiting no login.
* Validação de entrada.
* Proteção contra SQL Injection.
* Proteção contra XSS.
* Proteção contra CSRF, se aplicável.
* CORS configurado de forma segura.
* Headers de segurança.
* Não exposição de stack trace em produção.
* Logs sem dados sensíveis.
* Upload seguro de arquivos.

---

### RNF-002 — LGPD

O sistema deve ser projetado considerando privacidade e proteção de dados.

Requisitos mínimos:

* Coletar apenas dados necessários.
* Definir finalidade dos dados.
* Restringir acesso por perfil.
* Registrar ações relevantes.
* Evitar exposição de dados pessoais desnecessários.
* Permitir estratégia futura de exportação, anonimização ou exclusão de dados.
* Documentar política de retenção.
* Documentar tratamento de dados pessoais.
* Disponibilizar página de política de privacidade e termos de uso.

---

### RNF-003 — Performance

O sistema deve ter desempenho adequado para o MVP.

Critérios mínimos:

* Listagens devem usar paginação.
* Filtros devem usar índices no banco.
* Uploads devem ter limite de tamanho.
* Relatórios grandes devem ser processados de forma controlada.
* Consultas devem evitar carregamento desnecessário de dados.

---

### RNF-004 — Escalabilidade

O sistema deve ser preparado para crescimento inicial.

Requisitos mínimos:

* Arquitetura modular.
* Separação clara entre frontend, backend, banco e storage.
* Banco PostgreSQL.
* Estrutura preparada para storage externo.
* Possibilidade futura de filas para processamento pesado.
* Possibilidade futura de planos/assinaturas por empresa.

---

### RNF-005 — Disponibilidade

O sistema deve ser preparado para ambiente de produção.

Requisitos mínimos:

* Deploy com HTTPS.
* Banco gerenciado ou backup automático.
* Variáveis de ambiente.
* Logs de aplicação.
* Monitoramento básico.
* Plano de recuperação em caso de falha.

---

### RNF-006 — Backup

O sistema deve possuir estratégia de backup.

Requisitos mínimos:

* Backup automático do banco.
* Retenção mínima configurável.
* Controle de acesso aos backups.
* Backup dos arquivos enviados.
* Documentação de restauração.

---

### RNF-007 — Usabilidade

A interface deve ser simples, profissional e responsiva.

Requisitos mínimos:

* Feedback de carregamento.
* Mensagens de erro claras.
* Estados vazios.
* Confirmação para exclusões.
* Layout responsivo.
* Separação visual entre área administrativa e área cliente/síndico.

---

### RNF-008 — Compatibilidade

O sistema deve funcionar em navegadores modernos.

Compatibilidade mínima:

* Google Chrome
* Microsoft Edge
* Mozilla Firefox
* Layout responsivo para desktop, tablet e mobile web.

---

### RNF-009 — Manutenibilidade

O projeto deve possuir estrutura clara e documentada.

Requisitos mínimos:

* Código organizado por módulos.
* README completo.
* Documentação de arquitetura.
* Documentação de API.
* .env.example.
* Migrations.
* Seed com dados fictícios.
* Testes mínimos.
* CI/CD básico.

---

## 9. Modelo de Dados Inicial

Entidades previstas:

### Company

Representa uma empresa cliente do sistema.

Campos sugeridos:

* id
* razaoSocial
* nomeFantasia
* cnpj
* email
* telefone
* status
* createdAt
* updatedAt
* deletedAt

---

### User

Representa usuários internos e externos.

Campos sugeridos:

* id
* companyId
* name
* email
* passwordHash
* role
* status
* createdAt
* updatedAt
* deletedAt

---

### Worksite / Obra

Representa uma obra cadastrada.

Campos sugeridos:

* id
* companyId
* name
* code
* address
* responsibleId
* startDate
* expectedEndDate
* status
* description
* createdAt
* updatedAt
* deletedAt

---

### WorksiteUser

Representa vínculo entre usuários e obras.

Campos sugeridos:

* id
* companyId
* worksiteId
* userId
* roleInWorksite
* createdAt
* updatedAt

---

### DailyLog

Representa o registro diário da obra.

Campos sugeridos:

* id
* companyId
* worksiteId
* responsibleId
* logDate
* weather
* summary
* status
* createdAt
* updatedAt
* deletedAt

---

### Activity

Representa atividades executadas.

Campos sugeridos:

* id
* companyId
* dailyLogId
* description
* team
* period
* status
* notes
* createdAt
* updatedAt

---

### Occurrence

Representa ocorrências da obra.

Campos sugeridos:

* id
* companyId
* dailyLogId
* type
* description
* severity
* actionTaken
* responsible
* createdAt
* updatedAt

---

### Labor

Representa mão de obra utilizada.

Campos sugeridos:

* id
* companyId
* dailyLogId
* role
* quantity
* team
* workedHours
* notes
* createdAt
* updatedAt

---

### Material

Representa materiais utilizados.

Campos sugeridos:

* id
* companyId
* dailyLogId
* name
* quantity
* unit
* notes
* createdAt
* updatedAt

---

### Attachment

Representa fotos e documentos anexados.

Campos sugeridos:

* id
* companyId
* dailyLogId
* uploadedById
* fileName
* fileType
* mimeType
* size
* url
* visibility
* createdAt
* updatedAt
* deletedAt

---

### Comment

Representa comentários nos registros.

Campos sugeridos:

* id
* companyId
* dailyLogId
* userId
* comment
* visibility
* createdAt
* updatedAt
* deletedAt

---

### Report

Representa relatórios gerados.

Campos sugeridos:

* id
* companyId
* worksiteId
* generatedById
* periodStart
* periodEnd
* filters
* fileUrl
* createdAt

---

### AuditLog

Representa logs de auditoria.

Campos sugeridos:

* id
* companyId
* userId
* action
* entity
* entityId
* ipAddress
* userAgent
* metadata
* createdAt

---

## 10. Telas do Sistema

### Tela de Login

Funcionalidades:

* Login com e-mail e senha.
* Exibição de erro genérico.
* Redirecionamento conforme perfil.

---

### Dashboard Administrativo

Funcionalidades:

* Resumo de obras.
* Últimos registros.
* Atalhos administrativos.
* Indicadores simples.

---

### Gestão de Empresas

Disponível para SUPER_ADMIN.

Funcionalidades:

* Listar empresas.
* Cadastrar empresa.
* Editar empresa.
* Ativar/desativar empresa.

---

### Gestão de Usuários

Funcionalidades:

* Listar usuários.
* Cadastrar usuário.
* Editar usuário.
* Alterar perfil.
* Ativar/desativar usuário.
* Vincular usuário a obras.

---

### Gestão de Obras

Funcionalidades:

* Listar obras.
* Cadastrar obra.
* Editar obra.
* Alterar status.
* Visualizar detalhes.

---

### Diário de Obra

Funcionalidades:

* Listar registros.
* Criar registro diário.
* Editar registro.
* Adicionar atividades.
* Adicionar ocorrências.
* Adicionar mão de obra.
* Adicionar materiais.
* Adicionar fotos.
* Adicionar anexos.
* Adicionar comentários.
* Publicar registro.

---

### Área Cliente/Síndico

Funcionalidades:

* Visualizar obras autorizadas.
* Visualizar andamento.
* Visualizar registros publicados.
* Visualizar fotos/anexos liberados.
* Baixar relatório, se permitido.

---

### Relatórios

Funcionalidades:

* Filtrar registros.
* Gerar PDF.
* Visualizar histórico de relatórios.
* Baixar relatório.

---

### Página de Acesso Negado

Funcionalidades:

* Informar que o usuário não possui permissão.
* Oferecer retorno para dashboard.

---

## 11. Requisitos de Segurança

O sistema deve contemplar:

* Hash de senha com bcrypt ou Argon2.
* Autenticação segura.
* Controle de sessão seguro.
* Cookies HttpOnly/Secure/SameSite ou JWT seguro.
* Rate limiting em login.
* Bloqueio de acesso indevido.
* Validação de permissões no backend.
* Validação de payloads.
* Sanitização de entradas.
* Configuração segura de CORS.
* Proteção contra SQL Injection.
* Proteção contra XSS.
* Proteção contra CSRF, se aplicável.
* Headers de segurança.
* Upload seguro.
* Limite de tamanho de arquivos.
* Restrições de extensões.
* Logs de auditoria.
* Mascaramento de dados sensíveis em logs.
* Não versionamento de arquivos `.env`.
* Uso de variáveis de ambiente.
* HTTPS obrigatório em produção.
* Não exibição de stack trace em produção.

---

## 12. Requisitos de LGPD

O sistema deve seguir os princípios de proteção de dados pessoais.

Requisitos mínimos:

* Coletar apenas dados necessários.
* Informar finalidade dos dados.
* Restringir acesso conforme perfil.
* Evitar exposição de dados pessoais desnecessários.
* Documentar dados coletados.
* Documentar tempo de retenção.
* Criar página de política de privacidade.
* Criar página de termos de uso.
* Permitir futura exportação de dados.
* Permitir futura anonimização ou exclusão quando aplicável.
* Registrar logs de acesso e ações críticas.
* Proteger backups.
* Garantir segurança no armazenamento e transmissão dos dados.
* Criar documento `docs/security-lgpd.md`.

---

## 13. Infraestrutura

### Banco de Dados

* PostgreSQL.
* Migrations versionadas.
* Seed com dados fictícios.
* Índices por companyId, obra e data.
* Soft delete em entidades críticas.

---

### Hospedagem

O sistema deve ser preparado para deploy em ambiente cloud.

Sugestões:

* Render
* Railway
* Fly.io
* AWS
* Azure
* Google Cloud

---

### Storage

O sistema deve ser preparado para storage externo de arquivos.

Sugestões:

* AWS S3
* Cloudflare R2
* Google Cloud Storage
* Azure Blob Storage

---

### Backup

O sistema deve possuir:

* Backup automático do banco.
* Backup dos arquivos.
* Retenção configurável.
* Documentação de restauração.
* Controle de acesso aos backups.

---

### CI/CD

O projeto deve possuir pipeline básico com:

* Instalação de dependências.
* Execução de lint.
* Execução de testes.
* Build do projeto.
* Validação antes do merge/deploy.

---

## 14. Requisitos de Testes

O MVP deve possuir testes mínimos para:

* Login válido.
* Login inválido.
* Logout.
* Bloqueio de rota sem autenticação.
* Controle de acesso por perfil.
* Bloqueio de acesso entre empresas.
* Cadastro de obra.
* Criação de registro diário.
* Upload de arquivo válido.
* Bloqueio de arquivo inválido.
* Cliente/síndico visualizando obra autorizada.
* Cliente/síndico bloqueado em obra não autorizada.
* Geração de relatório PDF.
* API bloqueando ações indevidas.

---

## 15. Critérios de Aceite Geral do MVP

O MVP será considerado pronto quando:

* O sistema permitir login seguro.
* Admin conseguir cadastrar empresa.
* Admin conseguir cadastrar usuários.
* Admin conseguir cadastrar obras.
* Gestor conseguir criar registro diário.
* Registro diário aceitar atividades, ocorrências, mão de obra, materiais, fotos, anexos e comentários.
* Cliente/síndico conseguir acessar área própria.
* Cliente/síndico visualizar apenas obras autorizadas.
* Sistema gerar PDF com filtros.
* Dados estiverem isolados por empresa.
* Permissões forem aplicadas no backend.
* Uploads forem validados.
* Logs de auditoria básicos existirem.
* Dados sensíveis não forem expostos.
* Projeto rodar localmente com Docker.
* README estiver completo.
* `.env.example` não possuir dados reais.
* Documentação de segurança e LGPD existir.
* Houver plano básico de backup e deploy.

---

## 16. Priorização do MVP

### Prioridade P1 — Essencial

* Login.
* Controle de acesso.
* Empresa.
* Usuários.
* Obras.
* Registro diário.
* Atividades.
* Ocorrências.
* Cliente/síndico.
* Isolamento por empresa.
* Relatório PDF básico.

---

### Prioridade P2 — Importante

* Mão de obra.
* Materiais.
* Fotos.
* Anexos.
* Comentários.
* Histórico.
* Filtros avançados.
* Logs de auditoria.
* Segurança de upload.

---

### Prioridade P3 — Complementar

* Dashboard com indicadores.
* Melhorias visuais.
* Responsividade refinada.
* Exportações adicionais.
* Configurações avançadas.
* Monitoramento.
* Melhorias de performance.

---

## 17. Riscos do Projeto

### Risco 1 — Falha no isolamento de dados por empresa

Impacto: Alto
Mitigação: Validar companyId em todas as consultas e criar testes automatizados de multitenancy.

---

### Risco 2 — Permissões aplicadas apenas no frontend

Impacto: Alto
Mitigação: Implementar RBAC no backend e testar chamadas diretas via API.

---

### Risco 3 — Upload inseguro de arquivos

Impacto: Alto
Mitigação: Validar tipo, tamanho, extensão e armazenamento seguro.

---

### Risco 4 — Exposição de dados pessoais

Impacto: Alto
Mitigação: Minimização de dados, controle de acesso, logs seguros e documentação LGPD.

---

### Risco 5 — Relatórios misturando dados de empresas diferentes

Impacto: Alto
Mitigação: Aplicar filtros obrigatórios por companyId e criar testes automatizados.

---

### Risco 6 — Falta de backup

Impacto: Alto
Mitigação: Definir rotina de backup do banco e dos arquivos desde o MVP.

---

## 18. Entregáveis Esperados

O projeto deve entregar:

* Aplicação web funcional.
* Frontend responsivo.
* Backend com autenticação e autorização.
* Banco PostgreSQL.
* Migrations.
* Seed com dados fictícios.
* Upload de arquivos.
* Relatórios PDF.
* Área administrativa.
* Área cliente/síndico.
* Dockerfile.
* Docker Compose.
* README.
* `.env.example`.
* Documentação de arquitetura.
* Documentação de segurança e LGPD.
* Documentação de API.
* Testes mínimos.
* Pipeline CI/CD básico.
* Checklist de produção.

---

## 19. Checklist de Produção

Antes de publicar em produção, validar:

* HTTPS ativo.
* CORS configurado corretamente.
* Variáveis de ambiente configuradas.
* `.env` fora do Git.
* Banco com backup automático.
* Storage seguro.
* Logs ativos.
* Monitoramento básico.
* Rate limit no login.
* Senhas com hash forte.
* Upload com validação.
* Permissões testadas.
* Multitenancy testado.
* Relatórios testados.
* Política de privacidade disponível.
* Termos de uso disponíveis.
* Documentação atualizada.
* Pipeline CI/CD funcionando.

---

## 20. Considerações Finais

O ObraFlow deve ser desenvolvido como um MVP profissional, com foco em entregar valor rápido, mas sem negligenciar segurança, organização, LGPD, isolamento de dados e qualidade técnica.

Mesmo sendo uma primeira versão, o sistema deve ser preparado para evolução futura, permitindo crescimento para módulos como app mobile, assinatura digital, integrações, notificações, dashboards avançados e gestão financeira da obra.
