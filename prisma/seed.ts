import { PrismaClient, UserRole, CompanyPlan, CompanyStatus, WorksiteStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // ─── SUPER ADMIN ──────────────────────────────────────────────────────────
  const superAdminHash = await bcrypt.hash('SuperAdmin@2025', 12)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@diariobras.com' },
    update: {},
    create: {
      email: 'superadmin@diariobras.com',
      passwordHash: superAdminHash,
      name: 'Super Administrador',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  })
  console.log('✅ SUPER_ADMIN criado:', superAdmin.email)

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
  console.log('✅ Empresa demo criada:', company.name)

  // ─── ADMIN DA EMPRESA ─────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@2025', 12)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@construtora-demo.com' },
    update: {},
    create: {
      companyId: company.id,
      email: 'admin@construtora-demo.com',
      passwordHash: adminHash,
      name: 'Maria Administradora',
      role: UserRole.ADMIN_EMPRESA,
      isActive: true,
    },
  })
  console.log('✅ ADMIN_EMPRESA criado:', adminUser.email)

  // ─── GESTOR DE OBRA ───────────────────────────────────────────────────────
  const gestorHash = await bcrypt.hash('Gestor@2025', 12)
  const gestorUser = await prisma.user.upsert({
    where: { email: 'gestor@construtora-demo.com' },
    update: {},
    create: {
      companyId: company.id,
      email: 'gestor@construtora-demo.com',
      passwordHash: gestorHash,
      name: 'Carlos Gestor',
      role: UserRole.GESTOR_OBRA,
      isActive: true,
    },
  })
  console.log('✅ GESTOR_OBRA criado:', gestorUser.email)

  // ─── COLABORADOR ──────────────────────────────────────────────────────────
  const colaboradorHash = await bcrypt.hash('Colab@2025', 12)
  const colaboradorUser = await prisma.user.upsert({
    where: { email: 'colaborador@construtora-demo.com' },
    update: {},
    create: {
      companyId: company.id,
      email: 'colaborador@construtora-demo.com',
      passwordHash: colaboradorHash,
      name: 'João Colaborador',
      role: UserRole.COLABORADOR,
      isActive: true,
    },
  })
  console.log('✅ COLABORADOR criado:', colaboradorUser.email)

  // ─── CLIENTE/SÍNDICO ──────────────────────────────────────────────────────
  const clienteHash = await bcrypt.hash('Cliente@2025', 12)
  const clienteUser = await prisma.user.upsert({
    where: { email: 'sindico@condominio-demo.com' },
    update: {},
    create: {
      companyId: company.id,
      email: 'sindico@condominio-demo.com',
      passwordHash: clienteHash,
      name: 'Ana Síndica',
      role: UserRole.CLIENTE_SINDICO,
      isActive: true,
    },
  })
  console.log('✅ CLIENTE_SINDICO criado:', clienteUser.email)

  // ─── OBRAS DEMO ───────────────────────────────────────────────────────────
  const worksite1 = await prisma.worksite.upsert({
    where: { id: 'demo-worksite-1-aaaa-aaaa-aaaaaaaaaa01' },
    update: {},
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
      totalArea: 15000,
      createdById: adminUser.id,
    },
  })

  const worksite2 = await prisma.worksite.upsert({
    where: { id: 'demo-worksite-2-bbbb-bbbb-bbbbbbbbb002' },
    update: {},
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
      createdById: adminUser.id,
    },
  })
  console.log('✅ Obras demo criadas:', worksite1.name, '|', worksite2.name)

  // ─── ASSOCIAÇÕES OBRA/USUÁRIO ─────────────────────────────────────────────
  await prisma.worksiteUser.upsert({
    where: {
      worksiteId_userId: { worksiteId: worksite1.id, userId: gestorUser.id },
    },
    update: {},
    create: {
      worksiteId: worksite1.id,
      userId: gestorUser.id,
      companyId: company.id,
      role: UserRole.GESTOR_OBRA,
      assignedById: adminUser.id,
    },
  })

  await prisma.worksiteUser.upsert({
    where: {
      worksiteId_userId: { worksiteId: worksite1.id, userId: colaboradorUser.id },
    },
    update: {},
    create: {
      worksiteId: worksite1.id,
      userId: colaboradorUser.id,
      companyId: company.id,
      role: UserRole.COLABORADOR,
      assignedById: adminUser.id,
    },
  })

  await prisma.worksiteUser.upsert({
    where: {
      worksiteId_userId: { worksiteId: worksite1.id, userId: clienteUser.id },
    },
    update: {},
    create: {
      worksiteId: worksite1.id,
      userId: clienteUser.id,
      companyId: company.id,
      role: UserRole.CLIENTE_SINDICO,
      assignedById: adminUser.id,
    },
  })
  console.log('✅ Associações obra/usuário criadas')

  // ─── DIÁRIO DEMO ──────────────────────────────────────────────────────────
  const dailyLog = await prisma.dailyLog.upsert({
    where: {
      worksiteId_date: {
        worksiteId: worksite1.id,
        date: new Date('2025-01-10'),
      },
    },
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

  await prisma.activity.create({
    data: {
      dailyLogId: dailyLog.id,
      companyId: company.id,
      description: 'Concretagem da laje do 3º pavimento — Bloco A',
      location: 'Bloco A, 3º Pavimento',
      quantity: 45.5,
      unit: 'm³',
      progress: 100,
      order: 1,
      createdById: gestorUser.id,
    },
  })

  await prisma.labor.create({
    data: {
      dailyLogId: dailyLog.id,
      companyId: company.id,
      role: 'Pedreiro',
      quantity: 12,
      shift: 'INTEGRAL',
    },
  })

  await prisma.labor.create({
    data: {
      dailyLogId: dailyLog.id,
      companyId: company.id,
      role: 'Armador',
      quantity: 8,
      shift: 'INTEGRAL',
    },
  })

  await prisma.material.create({
    data: {
      dailyLogId: dailyLog.id,
      companyId: company.id,
      name: 'Concreto usinado fck 25 MPa',
      quantity: 45.5,
      unit: 'm³',
    },
  })

  await prisma.occurrence.create({
    data: {
      dailyLogId: dailyLog.id,
      companyId: company.id,
      type: 'OBSERVACAO',
      severity: 'BAIXA',
      description: 'Caminhão betoneira com atraso de 30 minutos',
      actionTaken: 'Reorganizado o cronograma da tarde. Sem impacto no prazo.',
      isResolved: true,
      resolvedAt: new Date('2025-01-10T14:00:00Z'),
      createdById: gestorUser.id,
    },
  })
  console.log('✅ Diário demo criado com atividades, mão de obra, materiais e ocorrências')

  console.log('\n🎉 Seed concluído com sucesso!\n')
  console.log('📋 Credenciais de acesso:')
  console.log('  SUPER_ADMIN:    superadmin@diariobras.com     / SuperAdmin@2025')
  console.log('  ADMIN_EMPRESA:  admin@construtora-demo.com    / Admin@2025')
  console.log('  GESTOR_OBRA:    gestor@construtora-demo.com   / Gestor@2025')
  console.log('  COLABORADOR:    colaborador@construtora-demo.com / Colab@2025')
  console.log('  CLIENTE_SINDICO: sindico@condominio-demo.com  / Cliente@2025')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
