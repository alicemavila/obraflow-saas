/**
 * Testes para cadastro progressivo de obras
 * Cobrem as validações Zod e a função calculateWorksiteProfileCompletion.
 */

import {
  createSimpleWorksiteSchema,
  createCompleteWorksiteSchema,
  createWorksiteSchema,
  calculateWorksiteProfileCompletion,
} from '@/lib/validations/worksite'
import { WorksiteRegistrationMode, WorksiteStatus } from '@prisma/client'

// ─── Cadastro Simples ─────────────────────────────────────────────────────────

describe('createSimpleWorksiteSchema', () => {
  it('aceita nome e status — deve salvar SIMPLE e isProfileComplete false', () => {
    const result = createSimpleWorksiteSchema.safeParse({
      name: 'Obra Rápida',
      status: WorksiteStatus.PLANEJAMENTO,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.registrationMode).toBe(WorksiteRegistrationMode.SIMPLE)
    }
  })

  it('rejeita cadastro simples sem nome', () => {
    const result = createSimpleWorksiteSchema.safeParse({
      status: WorksiteStatus.PLANEJAMENTO,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita cadastro simples sem status', () => {
    const result = createSimpleWorksiteSchema.safeParse({ name: 'Obra X' })
    expect(result.success).toBe(false)
  })

  it('aceita campos opcionais: groupId, hasTaskList', () => {
    const result = createSimpleWorksiteSchema.safeParse({
      name: 'Obra com Grupo',
      status: WorksiteStatus.EM_ANDAMENTO,
      hasTaskList: true,
    })
    expect(result.success).toBe(true)
  })
})

// ─── Cadastro Completo ────────────────────────────────────────────────────────

describe('createCompleteWorksiteSchema', () => {
  const base = {
    name: 'Edifício Central',
    status: WorksiteStatus.EM_ANDAMENTO,
    responsibleName: 'Eng. João Silva',
    startDate: '2025-01-01',
  }

  it('aceita dados completos essenciais', () => {
    const result = createCompleteWorksiteSchema.safeParse(base)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.registrationMode).toBe(WorksiteRegistrationMode.COMPLETE)
    }
  })

  it('rejeita quando responsável não informado', () => {
    const result = createCompleteWorksiteSchema.safeParse({
      ...base,
      responsibleName: undefined,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita quando data de início não informada', () => {
    const result = createCompleteWorksiteSchema.safeParse({
      ...base,
      startDate: undefined,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita quando término é anterior ao início', () => {
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

  it('aceita endereço opcional sem quebrar', () => {
    const result = createCompleteWorksiteSchema.safeParse({
      ...base,
      cep: '01310-100',
      city: 'São Paulo',
      state: 'SP',
    })
    expect(result.success).toBe(true)
  })
})

// ─── Schema unificado (API) ───────────────────────────────────────────────────

describe('createWorksiteSchema (unificado)', () => {
  it('aceita cadastro simples via schema unificado', () => {
    const result = createWorksiteSchema.safeParse({
      name: 'Obra Simples',
      status: WorksiteStatus.PLANEJAMENTO,
      registrationMode: WorksiteRegistrationMode.SIMPLE,
    })
    expect(result.success).toBe(true)
  })

  it('aceita cadastro completo via schema unificado', () => {
    const result = createWorksiteSchema.safeParse({
      name: 'Obra Completa',
      status: WorksiteStatus.EM_ANDAMENTO,
      registrationMode: WorksiteRegistrationMode.COMPLETE,
      responsibleName: 'Eng. Ana',
      startDate: '2025-03-01',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita COMPLETE sem responsável no schema unificado', () => {
    const result = createWorksiteSchema.safeParse({
      name: 'Obra Sem Responsável',
      status: WorksiteStatus.EM_ANDAMENTO,
      registrationMode: WorksiteRegistrationMode.COMPLETE,
    })
    expect(result.success).toBe(false)
  })
})

// ─── calculateWorksiteProfileCompletion ──────────────────────────────────────

describe('calculateWorksiteProfileCompletion', () => {
  it('retorna false para SIMPLE independente dos campos', () => {
    const result = calculateWorksiteProfileCompletion({
      name: 'Obra',
      status: WorksiteStatus.EM_ANDAMENTO,
      responsibleName: 'Eng. X',
      startDate: new Date(),
      registrationMode: WorksiteRegistrationMode.SIMPLE,
    })
    expect(result).toBe(false)
  })

  it('retorna true para COMPLETE com todos os campos essenciais', () => {
    const result = calculateWorksiteProfileCompletion({
      name: 'Obra Completa',
      status: WorksiteStatus.EM_ANDAMENTO,
      responsibleName: 'Eng. Ana',
      startDate: new Date('2025-01-01'),
      registrationMode: WorksiteRegistrationMode.COMPLETE,
    })
    expect(result).toBe(true)
  })

  it('retorna false para COMPLETE sem responsável', () => {
    const result = calculateWorksiteProfileCompletion({
      name: 'Obra',
      status: WorksiteStatus.EM_ANDAMENTO,
      responsibleName: null,
      startDate: new Date(),
      registrationMode: WorksiteRegistrationMode.COMPLETE,
    })
    expect(result).toBe(false)
  })

  it('retorna false para COMPLETE sem data de início', () => {
    const result = calculateWorksiteProfileCompletion({
      name: 'Obra',
      status: WorksiteStatus.EM_ANDAMENTO,
      responsibleName: 'Eng. X',
      startDate: null,
      registrationMode: WorksiteRegistrationMode.COMPLETE,
    })
    expect(result).toBe(false)
  })

  it('retorna false para COMPLETE sem nome', () => {
    const result = calculateWorksiteProfileCompletion({
      name: '',
      status: WorksiteStatus.EM_ANDAMENTO,
      responsibleName: 'Eng. X',
      startDate: new Date(),
      registrationMode: WorksiteRegistrationMode.COMPLETE,
    })
    expect(result).toBe(false)
  })

  it('uma obra SIMPLE editada para COMPLETE com campos essenciais vira completa', () => {
    // Simula edição: era SIMPLE, agora tem todos os campos
    const result = calculateWorksiteProfileCompletion({
      name: 'Obra Atualizada',
      status: WorksiteStatus.EM_ANDAMENTO,
      responsibleName: 'Eng. Novo Responsável',
      startDate: new Date('2025-06-01'),
      registrationMode: WorksiteRegistrationMode.COMPLETE,
    })
    expect(result).toBe(true)
  })
})
