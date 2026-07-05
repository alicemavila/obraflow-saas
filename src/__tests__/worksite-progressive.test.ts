/**
 * Testes de cadastro progressivo de obras
 * Cobrem: schemas Zod, calculateWorksiteProfileCompletion, casos de borda.
 */

import {
  createSimpleWorksiteSchema,
  createCompleteWorksiteSchema,
  createWorksiteSchema,
  calculateWorksiteProfileCompletion,
} from '@/lib/validations/worksite'
import { WorksiteRegistrationMode, WorksiteStatus } from '@prisma/client'

// ─── createSimpleWorksiteSchema ───────────────────────────────────────────────

describe('createSimpleWorksiteSchema', () => {
  it('aceita name + status — mínimo obrigatório', () => {
    const result = createSimpleWorksiteSchema.safeParse({
      name: 'Obra Simples',
      status: WorksiteStatus.PLANEJAMENTO,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.registrationMode).toBe(WorksiteRegistrationMode.SIMPLE)
      expect(result.data.hasTaskList).toBe(false)
    }
  })

  it('aceita name + status + groupId (UUID)', () => {
    const result = createSimpleWorksiteSchema.safeParse({
      name: 'Obra Com Grupo',
      status: WorksiteStatus.EM_ANDAMENTO,
      groupId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('aceita sem groupId — groupId é opcional na API', () => {
    const result = createSimpleWorksiteSchema.safeParse({
      name: 'Obra Sem Grupo',
      status: WorksiteStatus.PLANEJAMENTO,
    })
    expect(result.success).toBe(true)
  })

  it('rejeita name vazio', () => {
    const result = createSimpleWorksiteSchema.safeParse({
      name: '',
      status: WorksiteStatus.PLANEJAMENTO,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita name com 1 caractere (< 2)', () => {
    const result = createSimpleWorksiteSchema.safeParse({
      name: 'A',
      status: WorksiteStatus.PLANEJAMENTO,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita sem status', () => {
    const result = createSimpleWorksiteSchema.safeParse({ name: 'Obra X' })
    expect(result.success).toBe(false)
  })

  it('rejeita status inválido', () => {
    const result = createSimpleWorksiteSchema.safeParse({
      name: 'Obra X',
      status: 'INVALIDO',
    })
    expect(result.success).toBe(false)
  })

  it('NÃO exige cep, address, city, state, responsibleName ou startDate', () => {
    // Este é o caso de bug original — deve passar sem nenhum campo de gestão
    const result = createSimpleWorksiteSchema.safeParse({
      name: 'Obra Rápida',
      status: WorksiteStatus.PLANEJAMENTO,
    })
    expect(result.success).toBe(true)
  })

  it('aceita hasTaskList como opcional', () => {
    const result = createSimpleWorksiteSchema.safeParse({
      name: 'Obra Com Lista',
      status: WorksiteStatus.PLANEJAMENTO,
      hasTaskList: true,
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.hasTaskList).toBe(true)
  })
})

// ─── createCompleteWorksiteSchema ────────────────────────────────────────────

describe('createCompleteWorksiteSchema', () => {
  const base = {
    name: 'Edifício Central',
    status: WorksiteStatus.EM_ANDAMENTO,
    responsibleName: 'Eng. João Silva',
    startDate: '2025-01-01',
    endDateForecast: '2025-12-31',
  }

  it('aceita dados completos mínimos', () => {
    const result = createCompleteWorksiteSchema.safeParse(base)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.registrationMode).toBe(WorksiteRegistrationMode.COMPLETE)
    }
  })

  it('aceita com todos os campos opcionais preenchidos', () => {
    const result = createCompleteWorksiteSchema.safeParse({
      ...base,
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      cep: '01310-100',
      address: 'Av. Paulista, 1000',
      city: 'São Paulo',
      state: 'SP',
      contractType: 'Empreitada',
      clientName: 'Condomínio Aurora',
      contractNumber: 'CT-2025-001',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita sem responsibleName', () => {
    const result = createCompleteWorksiteSchema.safeParse({
      ...base,
      responsibleName: undefined,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita sem startDate', () => {
    const result = createCompleteWorksiteSchema.safeParse({
      ...base,
      startDate: undefined,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita sem endDateForecast', () => {
    const result = createCompleteWorksiteSchema.safeParse({
      ...base,
      endDateForecast: undefined,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita endDateForecast anterior a startDate', () => {
    const result = createCompleteWorksiteSchema.safeParse({
      ...base,
      startDate: '2025-06-01',
      endDateForecast: '2025-01-01',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      expect(fieldErrors.endDateForecast).toBeDefined()
    }
  })

  it('aceita startDate === endDateForecast (mesmo dia)', () => {
    const result = createCompleteWorksiteSchema.safeParse({
      ...base,
      startDate: '2025-06-01',
      endDateForecast: '2025-06-01',
    })
    expect(result.success).toBe(true)
  })
})

// ─── createWorksiteSchema (unificado para API) ────────────────────────────────

describe('createWorksiteSchema (unificado)', () => {
  it('aceita payload mínimo de cadastro simples — só name e status', () => {
    const result = createWorksiteSchema.safeParse({
      name: 'Obra Via API',
      status: 'PLANEJAMENTO',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.registrationMode).toBe(WorksiteRegistrationMode.SIMPLE)
    }
  })

  it('aceita cadastro simples com registrationMode explícito', () => {
    const result = createWorksiteSchema.safeParse({
      name: 'Obra Simples API',
      status: 'EM_ANDAMENTO',
      registrationMode: 'SIMPLE',
    })
    expect(result.success).toBe(true)
  })

  it('aceita cadastro simples sem nenhum campo opcional de gestão', () => {
    // Bug original: 422 por exigir campos de gestão no modo simples
    const result = createWorksiteSchema.safeParse({
      name: 'Obra Mínima',
      status: 'PLANEJAMENTO',
      registrationMode: 'SIMPLE',
    })
    expect(result.success).toBe(true)
  })

  it('aceita cadastro completo com campos obrigatórios', () => {
    const result = createWorksiteSchema.safeParse({
      name: 'Obra Completa API',
      status: 'EM_ANDAMENTO',
      registrationMode: 'COMPLETE',
      responsibleName: 'Eng. Ana',
      startDate: '2025-03-01',
      endDateForecast: '2025-12-31',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita COMPLETE sem responsibleName', () => {
    const result = createWorksiteSchema.safeParse({
      name: 'Obra Incompleta',
      status: 'EM_ANDAMENTO',
      registrationMode: 'COMPLETE',
      startDate: '2025-03-01',
      endDateForecast: '2025-12-31',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita COMPLETE sem startDate', () => {
    const result = createWorksiteSchema.safeParse({
      name: 'Obra Incompleta',
      status: 'EM_ANDAMENTO',
      registrationMode: 'COMPLETE',
      responsibleName: 'Eng. X',
      endDateForecast: '2025-12-31',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita COMPLETE sem endDateForecast', () => {
    const result = createWorksiteSchema.safeParse({
      name: 'Obra Incompleta',
      status: 'EM_ANDAMENTO',
      registrationMode: 'COMPLETE',
      responsibleName: 'Eng. X',
      startDate: '2025-03-01',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita datas inválidas independente do modo', () => {
    const result = createWorksiteSchema.safeParse({
      name: 'Obra X',
      status: 'PLANEJAMENTO',
      startDate: '2025-12-31',
      endDateForecast: '2025-01-01',
    })
    expect(result.success).toBe(false)
  })

  it('aceita todos os status do enum WorksiteStatus', () => {
    for (const status of Object.values(WorksiteStatus)) {
      const result = createWorksiteSchema.safeParse({ name: 'Obra X', status })
      expect(result.success).toBe(true)
    }
  })
})

// ─── calculateWorksiteProfileCompletion ──────────────────────────────────────

describe('calculateWorksiteProfileCompletion', () => {
  it('retorna false para SIMPLE independente dos campos', () => {
    expect(calculateWorksiteProfileCompletion({
      name: 'Obra', status: WorksiteStatus.EM_ANDAMENTO,
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      responsibleName: 'Eng. X', startDate: new Date(),
      endDateForecast: new Date(), registrationMode: WorksiteRegistrationMode.SIMPLE,
    })).toBe(false)
  })

  it('retorna false quando registrationMode é null', () => {
    expect(calculateWorksiteProfileCompletion({
      name: 'Obra', status: WorksiteStatus.EM_ANDAMENTO,
      groupId: 'abc', responsibleName: 'Eng. X',
      startDate: new Date(), endDateForecast: new Date(), registrationMode: null,
    })).toBe(false)
  })

  it('retorna true para COMPLETE com todos os campos essenciais', () => {
    expect(calculateWorksiteProfileCompletion({
      name: 'Obra Completa', status: WorksiteStatus.EM_ANDAMENTO,
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      responsibleName: 'Eng. Ana', startDate: new Date('2025-01-01'),
      endDateForecast: new Date('2025-12-31'),
      registrationMode: WorksiteRegistrationMode.COMPLETE,
    })).toBe(true)
  })

  it('retorna false para COMPLETE sem groupId', () => {
    expect(calculateWorksiteProfileCompletion({
      name: 'Obra', status: WorksiteStatus.EM_ANDAMENTO,
      groupId: null, responsibleName: 'Eng. X',
      startDate: new Date(), endDateForecast: new Date(),
      registrationMode: WorksiteRegistrationMode.COMPLETE,
    })).toBe(false)
  })

  it('retorna false para COMPLETE sem responsibleName', () => {
    expect(calculateWorksiteProfileCompletion({
      name: 'Obra', status: WorksiteStatus.EM_ANDAMENTO,
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      responsibleName: null, startDate: new Date(),
      endDateForecast: new Date(), registrationMode: WorksiteRegistrationMode.COMPLETE,
    })).toBe(false)
  })

  it('retorna false para COMPLETE sem startDate', () => {
    expect(calculateWorksiteProfileCompletion({
      name: 'Obra', status: WorksiteStatus.EM_ANDAMENTO,
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      responsibleName: 'Eng. X', startDate: null,
      endDateForecast: new Date(), registrationMode: WorksiteRegistrationMode.COMPLETE,
    })).toBe(false)
  })

  it('retorna false para COMPLETE sem endDateForecast', () => {
    expect(calculateWorksiteProfileCompletion({
      name: 'Obra', status: WorksiteStatus.EM_ANDAMENTO,
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      responsibleName: 'Eng. X', startDate: new Date(),
      endDateForecast: null, registrationMode: WorksiteRegistrationMode.COMPLETE,
    })).toBe(false)
  })

  it('retorna false para COMPLETE sem name', () => {
    expect(calculateWorksiteProfileCompletion({
      name: '', status: WorksiteStatus.EM_ANDAMENTO,
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      responsibleName: 'Eng. X', startDate: new Date(),
      endDateForecast: new Date(), registrationMode: WorksiteRegistrationMode.COMPLETE,
    })).toBe(false)
  })

  it('obra SIMPLE editada para COMPLETE com campos essenciais vira isProfileComplete=true', () => {
    // Simula o fluxo: obra criada como SIMPLE, depois editada para COMPLETE
    const result = calculateWorksiteProfileCompletion({
      name: 'Obra Atualizada',
      status: WorksiteStatus.EM_ANDAMENTO,
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      responsibleName: 'Eng. Novo Responsável',
      startDate: new Date('2025-06-01'),
      endDateForecast: new Date('2026-01-01'),
      registrationMode: WorksiteRegistrationMode.COMPLETE,
    })
    expect(result).toBe(true)
  })
})
