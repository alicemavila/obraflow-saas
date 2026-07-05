import {
  PrismaClient, UserRole, CompanyPlan, CompanyStatus,
  WorksiteStatus, WorksiteRegistrationMode,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // ─── SUPER ADMIN ──────────────────────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@diariobras.com' },
    update: {},
    create: {
      email: 'superadmin@diariobras.com',
      passwordHash: await bcrypt.hash('SuperAdmin@2025', 12),
      name: 'Super Administrador',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  })
  console.log('✅ SUPER_ADMIN:', superAdmin.email)

  // ─── EMPRESA DEMO ─────────────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { cnpj: '12.345.678/0001-90' },
    update: {},
    create: {
      name: 'Construtora Demo Ltda',
      cnpj: '12.345.678/0001-90',
      slug: 'construtora-demo',
      plan: CompanyPlan.PRO,
      status: CompanyStatus.ACTIVE,
      maxWorksites: 999,
      maxUsers: 20,
    },
  })
  console.log('✅ Empresa:', company.name)

  // ─── USUÁRIOS ─────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@construtora-demo.com' },
    update: {},
    create: {
      companyId: company.id,
      email: 'admin@construtora-demo.com',
      passwordHash: await bcrypt.hash('Admin@2025', 12),
      name: 'Maria Administradora',
      role: UserRole.ADMIN_EMPRESA,
      isActive: true,
    },
  })

  const gestorUser = await prisma.user.upsert({
    where: { email: 'gestor@construtora-demo.com' },
    update: {},
    create: {
      companyId: company.id,
      email: 'gestor@construtora-demo.com',
      passwordHash: await bcrypt.hash('Gestor@2025', 12),
      name: 'Carlos Gestor',
      role: UserRole.GESTOR_OBRA,
      isActive: true,
    },
  })

  const colaboradorUser = await prisma.user.upsert({
    where: { email: 'colaborador@construtora-demo.com' },
    update: {},
    create: {
      companyId: company.id,
      email: 'colaborador@construtora-demo.com',
      passwordHash: await bcrypt.hash('Colab@2025', 12),
      name: 'João Colaborador',
      role: UserRole.COLABORADOR,
      isActive: true,
    },
  })

  const clienteUser = await prisma.user.upsert({
    where: { email: 'sindico@condominio-demo.com' },
    update: {},
    create: {
      companyId: company.id,
      email: 'sindico@condominio-demo.com',
      passwordHash: await bcrypt.hash('Cliente@2025', 12),
      name: 'Ana Síndica',
      role: UserRole.CLIENTE_SINDICO,
      isActive: true,
    },
  })
  console.log('✅ Usuários criados: admin, gestor, colaborador, cliente')

  // ─── GRUPOS DE OBRA ───────────────────────────────────────────────────────
  const group = await prisma.worksiteGroup.upsert({
    where: { id: 'demo-group-aaaa-aaaa-aaaaaaaaaa01' },
    update: {},
    create: {
      id: 'demo-group-aaaa-aaaa-aaaaaaaaaa01',
      companyId: company.id,
      name: 'Geral',
    },
  })
  console.log('✅ Grupo criado:', group.name)

  // ─── OBRA 1 — Cadastro COMPLETO (existente, dados suficientes) ─────────────
  const worksite1 = await prisma.worksite.upsert({
    where: { id: 'demo-worksite-1-aaaa-aaaa-aaaaaaaaaa01' },
    update: {
      registrationMode: WorksiteRegistrationMode.COMPLETE,
      isProfileComplete: true,
      groupId: group.id,
    },
    create: {
      id: 'demo-worksite-1-aaaa-aaaa-aaaaaaaaaa01',
      companyId: company.id,
      name: 'Edifício Aurora — Torre A',
      address: 'Av. Paulista, 1000',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      cep: '01310-100',
      artNumber: 'SP-ART-2024-001',
      responsibleName: 'Eng. Roberto Matos',
      responsibleCrea: 'CREA-SP 1234567',
      startDate: new Date('2024-03-01'),
      endDateForecast: new Date('2025-12-31'),
      status: WorksiteStatus.EM_ANDAMENTO,
      clientName: 'Condomínio Aurora',
      contractNumber: 'CT-2024-001',
      contractType: 'Empreitada global',
      totalArea: 15000,
      registrationMode: WorksiteRegistrationMode.COMPLETE,
      isProfileComplete: true,
      groupId: group.id,
      createdById: adminUser.id,
    },
  })

  // ─── OBRA 2 — Cadastro COMPLETO (planejamento) ────────────────────────────
  const worksite2 = await prisma.worksite.upsert({
    where: { id: 'demo-worksite-2-bbbb-bbbb-bbbbbbbbb002' },
    update: {
      registrationMode: WorksiteRegistrationMode.COMPLETE,
      isProfileComplete: true,
    },
    create: {
      id: 'demo-worksite-2-bbbb-bbbb-bbbbbbbbb002',
      companyId: company.id,
      name: 'Residencial Bosque Verde',
      address: 'Rua das Flores, 500',
      neighborhood: 'Jardim Paulista',
      city: 'Campinas',
      state: 'SP',
      cep: '13000-000',
      responsibleName: 'Eng. Ana Paula Rodrigues',
      startDate: new Date('2025-02-01'),
      endDateForecast: new Date('2026-08-31'),
      status: WorksiteStatus.PLANEJAMENTO,
      clientName: 'Condomínio Bosque Verde',
      contractNumber: 'CT-2025-001',
      totalArea: 8500,
      registrationMode: WorksiteRegistrationMode.COMPLETE,
      isProfileComplete: true,
      groupId: group.id,
      createdById: adminUser.id,
    },
  })

  // ─── OBRA 3 — Cadastro SIMPLES (incompleto) ───────────────────────────────
  const worksite3 = await prisma.worksite.upsert({
    where: { id: 'demo-worksite-3-cccc-cccc-ccccccccc003' },
    update: {},
    create: {
      id: 'demo-worksite-3-cccc-cccc-ccccccccc003',
      companyId: company.id,
      name: 'Reforma Comercial Centro',
      status: WorksiteStatus.PLANEJAMENTO,
      registrationMode: WorksiteRegistrationMode.SIMPLE,
      isProfileComplete: false,
      hasTaskList: true,
      groupId: group.id,
      createdById: adminUser.id,
    },
  })

  console.log('✅ Obras criadas:')
  console.log(`   • ${worksite1.name} (COMPLETO, EM_ANDAMENTO)`)
  console.log(`   • ${worksite2.name} (COMPLETO, PLANEJAMENTO)`)
  console.log(`   • ${worksite3.name} (SIMPLES/INCOMPLETO)`)

  // ─── ASSOCIAÇÕES OBRA/USUÁRIO ─────────────────────────────────────────────
  for (const [wsId, userId, role] of [
    [worksite1.id, gestorUser.id, UserRole.GESTOR_OBRA],
    [worksite1.id, colaboradorUser.id, UserRole.COLABORADOR],
    [worksite1.id, clienteUser.id, UserRole.CLIENTE_SINDICO],
    [worksite3.id, gestorUser.id, UserRole.GESTOR_OBRA],
  ] as [string, string, UserRole][]) {
    await prisma.worksiteUser.upsert({
      where: { worksiteId_userId: { worksiteId: wsId, userId } },
      update: {},
      create: { worksiteId: wsId, userId, companyId: company.id, role, assignedById: adminUser.id },
    })
  }
  console.log('✅ Associações obra/usuário criadas')

  // ─── DIÁRIO DEMO ──────────────────────────────────────────────────────────
  const dailyLog = await prisma.dailyLog.upsert({
    where: { worksiteId_date: { worksiteId: worksite1.id, date: new Date('2025-01-10') } },
    update: {},
    create: {
      worksiteId: worksite1.id,
      companyId: company.id,
      date: new Date('2025-01-10'),
      weatherMorning: 'ENSOLARADO',
      weatherAfternoon: 'PARCIALMENTE_NUBLADO',
      tempMin: 18.0,
      tempMax: 29.5,
      workedHours: 8.5,
      notes: 'Dia produtivo. Concretagem da laje do 3º pavimento concluída.',
      status: 'APROVADO',
      createdById: gestorUser.id,
      submittedAt: new Date('2025-01-10T17:00:00Z'),
      submittedById: gestorUser.id,
      approvedAt: new Date('2025-01-10T18:00:00Z'),
      approvedById: adminUser.id,
    },
  })

  // Só cria se ainda não existir (evita duplicação em re-seeds)
  const existingActivities = await prisma.activity.count({ where: { dailyLogId: dailyLog.id } })
  if (existingActivities === 0) {
    await prisma.activity.create({
      data: {
        dailyLogId: dailyLog.id, companyId: company.id,
        description: 'Concretagem da laje do 3º pavimento — Bloco A',
        location: 'Bloco A, 3º Pavimento', quantity: 45.5, unit: 'm³', progress: 100,
        order: 1, createdById: gestorUser.id,
      },
    })
    await prisma.labor.create({ data: { dailyLogId: dailyLog.id, companyId: company.id, role: 'Pedreiro', quantity: 12, shift: 'INTEGRAL' } })
    await prisma.labor.create({ data: { dailyLogId: dailyLog.id, companyId: company.id, role: 'Armador', quantity: 8, shift: 'INTEGRAL' } })
    await prisma.material.create({ data: { dailyLogId: dailyLog.id, companyId: company.id, name: 'Concreto usinado fck 25 MPa', quantity: 45.5, unit: 'm³' } })
    await prisma.occurrence.create({
      data: {
        dailyLogId: dailyLog.id, companyId: company.id, type: 'OBSERVACAO', severity: 'BAIXA',
        description: 'Caminhão betoneira com atraso de 30 minutos',
        actionTaken: 'Reorganizado o cronograma da tarde.', isResolved: true,
        resolvedAt: new Date('2025-01-10T14:00:00Z'), createdById: gestorUser.id,
      },
    })
  }
  console.log('✅ Diário demo pronto')

  // ─── PRÉ-CADASTROS DEMO ───────────────────────────────────────────────────
  const preCadastros: { category: string; name: string }[] = [
    // Mão de obra
    { category: 'mao-de-obra', name: 'Pedreiro' },
    { category: 'mao-de-obra', name: 'Eletricista' },
    { category: 'mao-de-obra', name: 'Armador' },
    { category: 'mao-de-obra', name: 'Encanador' },
    // Equipamentos
    { category: 'equipamentos', name: 'Betoneira' },
    { category: 'equipamentos', name: 'Andaime' },
    { category: 'equipamentos', name: 'Escavadeira' },
    { category: 'equipamentos', name: 'Compactador' },
    // Tipos de ocorrências
    { category: 'tipos-ocorrencia', name: 'Acidente de trabalho' },
    { category: 'tipos-ocorrencia', name: 'Paralisação por chuva' },
    { category: 'tipos-ocorrencia', name: 'Falta de material' },
    { category: 'tipos-ocorrencia', name: 'Visita técnica' },
    // Checklist
    { category: 'checklist', name: 'Verificar uso de EPI por todos os trabalhadores' },
    { category: 'checklist', name: 'Sinalização de segurança instalada' },
    { category: 'checklist', name: 'Reunião diária de segurança realizada' },
    { category: 'checklist', name: 'Área limpa e organizada ao final do dia' },
    // Modelos de relatório
    { category: 'modelos-relatorio', name: 'Relatório Diário Padrão' },
    { category: 'modelos-relatorio', name: 'Relatório Mensal Consolidado' },
    { category: 'modelos-relatorio', name: 'Relatório de Ocorrências' },
  ]

  let preCadCreated = 0
  for (const item of preCadastros) {
    const existing = await prisma.preCadastro.findFirst({
      where: { companyId: company.id, category: item.category, name: item.name },
    })
    if (!existing) {
      await prisma.preCadastro.create({
        data: { companyId: company.id, category: item.category, name: item.name },
      })
      preCadCreated++
    }
  }
  console.log(`✅ Pré-cadastros demo: ${preCadCreated} criados (${preCadastros.length - preCadCreated} já existiam)`)

  console.log('\n🎉 Seed concluído!\n')
  console.log('📋 Credenciais:')
  console.log('  SUPER_ADMIN:     superadmin@diariobras.com      / SuperAdmin@2025')
  console.log('  ADMIN_EMPRESA:   admin@construtora-demo.com     / Admin@2025')
  console.log('  GESTOR_OBRA:     gestor@construtora-demo.com    / Gestor@2025')
  console.log('  COLABORADOR:     colaborador@construtora-demo.com / Colab@2025')
  console.log('  CLIENTE_SINDICO: sindico@condominio-demo.com    / Cliente@2025')
  console.log('\n📦 Obras demo:')
  console.log('  • Edifício Aurora — Torre A  (COMPLETO, EM_ANDAMENTO)')
  console.log('  • Residencial Bosque Verde   (COMPLETO, PLANEJAMENTO)')
  console.log('  • Reforma Comercial Centro   (SIMPLES/INCOMPLETO) ← badge de aviso')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
