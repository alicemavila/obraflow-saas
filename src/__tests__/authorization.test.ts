import {
  describe,
  expect,
  it,
} from '@jest/globals'

import {
  BusinessError,
  canApproveDailyLog,
  canCreateDailyLog,
  canEditDailyLog,
  canGenerateReport,
  canManageUsers,
  canManageWorksites,
  canSubmitDailyLog,
  canUploadFile,
  ForbiddenError,
  isSameTenant,
  type SessionUser,
  TenantMismatchError,
  UnauthorizedError,
  worksiteAcceptsDailyLog,
} from '../lib/permissions'

function createUser(
  role: SessionUser['role'],
  overrides: Partial<SessionUser> = {},
): SessionUser {
  return {
    id: 'user-123',
    role,
    companyId: 'company-a',
    ...overrides,
  }
}

describe('Permissões globais', () => {
  describe('canManageWorksites', () => {
    it('permite SUPER_ADMIN gerenciar obras', () => {
      const user = createUser('SUPER_ADMIN')

      expect(
        canManageWorksites(user),
      ).toBe(true)
    })

    it('permite ADMIN_EMPRESA gerenciar obras', () => {
      const user = createUser('ADMIN_EMPRESA')

      expect(
        canManageWorksites(user),
      ).toBe(true)
    })

    it('não permite GESTOR_OBRA gerenciar obras', () => {
      const user = createUser('GESTOR_OBRA')

      expect(
        canManageWorksites(user),
      ).toBe(false)
    })

    it('não permite COLABORADOR gerenciar obras', () => {
      const user = createUser('COLABORADOR')

      expect(
        canManageWorksites(user),
      ).toBe(false)
    })

    it('não permite CLIENTE_SINDICO gerenciar obras', () => {
      const user = createUser('CLIENTE_SINDICO')

      expect(
        canManageWorksites(user),
      ).toBe(false)
    })
  })

  describe('canManageUsers', () => {
    it('permite SUPER_ADMIN gerenciar usuários', () => {
      expect(
        canManageUsers(
          createUser('SUPER_ADMIN'),
        ),
      ).toBe(true)
    })

    it('permite ADMIN_EMPRESA gerenciar usuários', () => {
      expect(
        canManageUsers(
          createUser('ADMIN_EMPRESA'),
        ),
      ).toBe(true)
    })

    it('não permite GESTOR_OBRA gerenciar usuários', () => {
      expect(
        canManageUsers(
          createUser('GESTOR_OBRA'),
        ),
      ).toBe(false)
    })

    it('não permite COLABORADOR gerenciar usuários', () => {
      expect(
        canManageUsers(
          createUser('COLABORADOR'),
        ),
      ).toBe(false)
    })

    it('não permite CLIENTE_SINDICO gerenciar usuários', () => {
      expect(
        canManageUsers(
          createUser('CLIENTE_SINDICO'),
        ),
      ).toBe(false)
    })
  })

  describe('canCreateDailyLog', () => {
    it('permite SUPER_ADMIN criar diário', () => {
      expect(
        canCreateDailyLog(
          createUser('SUPER_ADMIN'),
        ),
      ).toBe(true)
    })

    it('permite ADMIN_EMPRESA criar diário', () => {
      expect(
        canCreateDailyLog(
          createUser('ADMIN_EMPRESA'),
        ),
      ).toBe(true)
    })

    it('permite GESTOR_OBRA criar diário', () => {
      expect(
        canCreateDailyLog(
          createUser('GESTOR_OBRA'),
        ),
      ).toBe(true)
    })

    it('permite COLABORADOR criar diário', () => {
      expect(
        canCreateDailyLog(
          createUser('COLABORADOR'),
        ),
      ).toBe(true)
    })

    it('não permite CLIENTE_SINDICO criar diário', () => {
      expect(
        canCreateDailyLog(
          createUser('CLIENTE_SINDICO'),
        ),
      ).toBe(false)
    })
  })

  describe('canSubmitDailyLog', () => {
    it('permite SUPER_ADMIN enviar diário', () => {
      expect(
        canSubmitDailyLog(
          createUser('SUPER_ADMIN'),
        ),
      ).toBe(true)
    })

    it('permite ADMIN_EMPRESA enviar diário', () => {
      expect(
        canSubmitDailyLog(
          createUser('ADMIN_EMPRESA'),
        ),
      ).toBe(true)
    })

    it('permite GESTOR_OBRA enviar diário', () => {
      expect(
        canSubmitDailyLog(
          createUser('GESTOR_OBRA'),
        ),
      ).toBe(true)
    })

    it('não permite COLABORADOR enviar diário', () => {
      expect(
        canSubmitDailyLog(
          createUser('COLABORADOR'),
        ),
      ).toBe(false)
    })

    it('não permite CLIENTE_SINDICO enviar diário', () => {
      expect(
        canSubmitDailyLog(
          createUser('CLIENTE_SINDICO'),
        ),
      ).toBe(false)
    })
  })

  describe('canApproveDailyLog', () => {
    it('permite SUPER_ADMIN aprovar diário', () => {
      expect(
        canApproveDailyLog(
          createUser('SUPER_ADMIN'),
        ),
      ).toBe(true)
    })

    it('permite ADMIN_EMPRESA aprovar diário', () => {
      expect(
        canApproveDailyLog(
          createUser('ADMIN_EMPRESA'),
        ),
      ).toBe(true)
    })

    it('permite GESTOR_OBRA aprovar diário', () => {
      expect(
        canApproveDailyLog(
          createUser('GESTOR_OBRA'),
        ),
      ).toBe(true)
    })

    it('não permite COLABORADOR aprovar diário', () => {
      expect(
        canApproveDailyLog(
          createUser('COLABORADOR'),
        ),
      ).toBe(false)
    })

    it('não permite CLIENTE_SINDICO aprovar diário', () => {
      expect(
        canApproveDailyLog(
          createUser('CLIENTE_SINDICO'),
        ),
      ).toBe(false)
    })
  })

  describe('canGenerateReport', () => {
    it('permite SUPER_ADMIN gerar relatório', () => {
      expect(
        canGenerateReport(
          createUser('SUPER_ADMIN'),
        ),
      ).toBe(true)
    })

    it('permite ADMIN_EMPRESA gerar relatório', () => {
      expect(
        canGenerateReport(
          createUser('ADMIN_EMPRESA'),
        ),
      ).toBe(true)
    })

    it('permite GESTOR_OBRA gerar relatório', () => {
      expect(
        canGenerateReport(
          createUser('GESTOR_OBRA'),
        ),
      ).toBe(true)
    })

    it('não permite COLABORADOR gerar relatório', () => {
      expect(
        canGenerateReport(
          createUser('COLABORADOR'),
        ),
      ).toBe(false)
    })

    it('permite CLIENTE_SINDICO gerar relatório', () => {
      expect(
        canGenerateReport(
          createUser('CLIENTE_SINDICO'),
        ),
      ).toBe(true)
    })
  })

  describe('canUploadFile', () => {
    it('permite SUPER_ADMIN fazer upload', () => {
      expect(
        canUploadFile(
          createUser('SUPER_ADMIN'),
        ),
      ).toBe(true)
    })

    it('permite ADMIN_EMPRESA fazer upload', () => {
      expect(
        canUploadFile(
          createUser('ADMIN_EMPRESA'),
        ),
      ).toBe(true)
    })

    it('permite GESTOR_OBRA fazer upload', () => {
      expect(
        canUploadFile(
          createUser('GESTOR_OBRA'),
        ),
      ).toBe(true)
    })

    it('permite COLABORADOR fazer upload', () => {
      expect(
        canUploadFile(
          createUser('COLABORADOR'),
        ),
      ).toBe(true)
    })

    it('não permite CLIENTE_SINDICO fazer upload', () => {
      expect(
        canUploadFile(
          createUser('CLIENTE_SINDICO'),
        ),
      ).toBe(false)
    })
  })
})

describe('Isolamento entre empresas', () => {
  describe('isSameTenant', () => {
    it('permite SUPER_ADMIN acessar qualquer empresa', () => {
      const user = createUser(
        'SUPER_ADMIN',
        {
          companyId: undefined,
        },
      )

      expect(
        isSameTenant(
          user,
          'company-b',
        ),
      ).toBe(true)
    })

    it('permite usuário acessar recurso da própria empresa', () => {
      const user = createUser(
        'ADMIN_EMPRESA',
        {
          companyId: 'company-a',
        },
      )

      expect(
        isSameTenant(
          user,
          'company-a',
        ),
      ).toBe(true)
    })

    it('bloqueia usuário ao acessar recurso de outra empresa', () => {
      const user = createUser(
        'ADMIN_EMPRESA',
        {
          companyId: 'company-a',
        },
      )

      expect(
        isSameTenant(
          user,
          'company-b',
        ),
      ).toBe(false)
    })

    it('bloqueia usuário sem empresa vinculada', () => {
      const user = createUser(
        'GESTOR_OBRA',
        {
          companyId: undefined,
        },
      )

      expect(
        isSameTenant(
          user,
          'company-a',
        ),
      ).toBe(false)
    })
  })
})

describe('Edição de diário', () => {
  it('não permite editar diário aprovado', () => {
    const user = createUser(
      'SUPER_ADMIN',
    )

    expect(
      canEditDailyLog(
        user,
        'APROVADO',
        'creator-id',
      ),
    ).toBe(false)
  })

  it('permite SUPER_ADMIN editar diário não aprovado', () => {
    const user = createUser(
      'SUPER_ADMIN',
    )

    expect(
      canEditDailyLog(
        user,
        'RASCUNHO',
        'another-user',
      ),
    ).toBe(true)
  })

  it('permite ADMIN_EMPRESA editar diário não aprovado', () => {
    const user = createUser(
      'ADMIN_EMPRESA',
    )

    expect(
      canEditDailyLog(
        user,
        'RASCUNHO',
        'another-user',
      ),
    ).toBe(true)
  })

  it('permite GESTOR_OBRA editar diário não aprovado', () => {
    const user = createUser(
      'GESTOR_OBRA',
    )

    expect(
      canEditDailyLog(
        user,
        'RASCUNHO',
        'another-user',
      ),
    ).toBe(true)
  })

  it('permite COLABORADOR editar o próprio diário', () => {
    const user = createUser(
      'COLABORADOR',
      {
        id: 'creator-id',
      },
    )

    expect(
      canEditDailyLog(
        user,
        'RASCUNHO',
        'creator-id',
      ),
    ).toBe(true)
  })

  it('bloqueia COLABORADOR ao editar diário criado por outro usuário', () => {
    const user = createUser(
      'COLABORADOR',
      {
        id: 'collaborator-id',
      },
    )

    expect(
      canEditDailyLog(
        user,
        'RASCUNHO',
        'another-user',
      ),
    ).toBe(false)
  })

  it('não permite CLIENTE_SINDICO editar diário', () => {
    const user = createUser(
      'CLIENTE_SINDICO',
    )

    expect(
      canEditDailyLog(
        user,
        'RASCUNHO',
        user.id,
      ),
    ).toBe(false)
  })
})

describe('Status da obra', () => {
  it('aceita diário quando a obra está em andamento', () => {
    expect(
      worksiteAcceptsDailyLog(
        'EM_ANDAMENTO',
      ),
    ).toBe(true)
  })

  it('não aceita diário quando a obra está em planejamento', () => {
    expect(
      worksiteAcceptsDailyLog(
        'PLANEJAMENTO',
      ),
    ).toBe(false)
  })

  it('não aceita diário quando a obra está concluída', () => {
    expect(
      worksiteAcceptsDailyLog(
        'CONCLUIDA',
      ),
    ).toBe(false)
  })

  it('não aceita diário quando a obra está cancelada', () => {
    expect(
      worksiteAcceptsDailyLog(
        'CANCELADA',
      ),
    ).toBe(false)
  })
})

describe('Erros de autorização', () => {
  it('UnauthorizedError possui status 401', () => {
    const error =
      new UnauthorizedError()

    expect(
      error.statusCode,
    ).toBe(401)

    expect(
      error.code,
    ).toBe('UNAUTHORIZED')

    expect(
      error.name,
    ).toBe('UnauthorizedError')
  })

  it('ForbiddenError possui status 403', () => {
    const error =
      new ForbiddenError()

    expect(
      error.statusCode,
    ).toBe(403)

    expect(
      error.code,
    ).toBe('FORBIDDEN')

    expect(
      error.name,
    ).toBe('ForbiddenError')
  })

  it('TenantMismatchError possui status 403', () => {
    const error =
      new TenantMismatchError()

    expect(
      error.statusCode,
    ).toBe(403)

    expect(
      error.code,
    ).toBe('TENANT_MISMATCH')

    expect(
      error.name,
    ).toBe('TenantMismatchError')
  })

  it('BusinessError possui status 422', () => {
    const error =
      new BusinessError(
        'Regra inválida',
        'INVALID_RULE',
      )

    expect(
      error.statusCode,
    ).toBe(422)

    expect(
      error.code,
    ).toBe('INVALID_RULE')

    expect(
      error.name,
    ).toBe('BusinessError')
  })
})