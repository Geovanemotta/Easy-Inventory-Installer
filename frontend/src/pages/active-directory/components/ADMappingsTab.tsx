import { useEffect, useState } from 'react'
import { getADGroups } from '../../../services/adService'
import type { ADConfig, ADGroup, Role } from '../../../types/ad'
import type { Site } from '../../../types/site'

interface ADMappingsTabProps {
  config: ADConfig
  sites: Site[]
  onChange: (updated: ADConfig) => void
  onSave: () => void
  saving: boolean
}

const ROLE_LABELS: Record<Role, string> = {
  operator: 'Operador de Loja',
  admin: 'Administrador da Loja',
  operador_matriz: 'Operador Matriz (Acesso Global / Firewall)',
}

export default function ADMappingsTab({
  config,
  sites,
  onChange,
  onSave,
  saving,
}: ADMappingsTabProps) {
  // Grupos Superadmin
  const [newSuperGroup, setNewSuperGroup] = useState('')

  // Editor de Vínculo
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null)
  const [targetGroup, setTargetGroup] = useState('')
  const [targetRole, setTargetRole] = useState<Role>('operator')
  const [targetSites, setTargetSites] = useState<string[]>([])

  // Busca de Grupos no AD
  const [adGroups, setAdGroups] = useState<ADGroup[]>([])
  const [loadingAdGroups, setLoadingAdGroups] = useState(false)
  const [adSearchTerm, setAdSearchTerm] = useState('')

  // Filtro na listagem
  const [filterSearch, setFilterSearch] = useState('')

  // Carrega grupos do AD
  const loadGroupsFromAD = (search?: string) => {
    setLoadingAdGroups(true)
    getADGroups(search)
      .then((res) => setAdGroups(res.groups))
      .catch((err) => console.warn('Não foi possível consultar grupos no AD:', err))
      .finally(() => setLoadingAdGroups(false))
  }

  useEffect(() => {
    if (editorOpen) {
      loadGroupsFromAD()
    }
  }, [editorOpen])

  // Gestão de Superadmin Groups
  const handleAddSuperGroup = () => {
    const trimmed = newSuperGroup.trim()
    if (!trimmed) return
    if (!config.superadmin_groups.includes(trimmed)) {
      onChange({
        ...config,
        superadmin_groups: [...config.superadmin_groups, trimmed],
      })
    }
    setNewSuperGroup('')
  }

  const handleRemoveSuperGroup = (grp: string) => {
    onChange({
      ...config,
      superadmin_groups: config.superadmin_groups.filter((g) => g !== grp),
    })
  }

  // Abertura do editor
  const handleOpenNewMapping = () => {
    setEditingGroupName(null)
    setTargetGroup('')
    setTargetRole('operator')
    setTargetSites([])
    setEditorOpen(true)
  }

  const handleEditMapping = (grp: string, data: any) => {
    setEditingGroupName(grp)
    setTargetGroup(grp)
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      setTargetRole(data.role || 'operator')
      setTargetSites(data.sites || [])
    } else if (Array.isArray(data)) {
      setTargetRole('operator')
      setTargetSites(data)
    }
    setEditorOpen(true)
  }

  const handleDeleteMapping = (grp: string) => {
    const nextMappings = { ...config.group_mappings }
    delete nextMappings[grp]
    onChange({
      ...config,
      group_mappings: nextMappings,
    })
  }

  const handleSaveMapping = () => {
    if (!targetGroup.trim()) return

    const nextMappings = { ...config.group_mappings }
    if (editingGroupName && editingGroupName !== targetGroup.trim()) {
      delete nextMappings[editingGroupName]
    }

    nextMappings[targetGroup.trim()] = {
      role: targetRole,
      sites: targetRole === 'operador_matriz' ? ['*'] : targetSites,
    }

    onChange({
      ...config,
      group_mappings: nextMappings,
    })

    setEditorOpen(false)
  }

  const toggleSite = (siteCodeOrName: string) => {
    if (targetSites.includes(siteCodeOrName)) {
      setTargetSites(targetSites.filter((s) => s !== siteCodeOrName))
    } else {
      setTargetSites([...targetSites, siteCodeOrName])
    }
  }

  const mappingsEntries = Object.entries(config.group_mappings || {}).filter(([grp]) =>
    filterSearch ? grp.toLowerCase().includes(filterSearch.toLowerCase()) : true
  )

  return (
    <div className="space-y-6">
      {/* 1. Grupos Superadministradores */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3">
          <h3 className="text-sm font-bold text-slate-900">
            Grupos Superadministradores (Acesso Total)
          </h3>
          <p className="text-xs text-slate-500">
            Membros destes grupos no Active Directory recebem automaticamente privilégios de superadmin global
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {config.superadmin_groups.map((grp) => (
            <span
              key={grp}
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800"
            >
              <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {grp}
              <button
                type="button"
                onClick={() => handleRemoveSuperGroup(grp)}
                className="ml-1 text-blue-400 hover:text-blue-600"
                title="Remover grupo superadmin"
              >
                ✕
              </button>
            </span>
          ))}

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Novo grupo AD (ex: Domain Admins)..."
              value={newSuperGroup}
              onChange={(e) => setNewSuperGroup(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddSuperGroup()
                }
              }}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddSuperGroup}
              className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-500"
            >
              + Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* 2. Mapeamento de Grupos para Lojas e Perfis */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Mapeamentos de Grupos do AD para Lojas e Perfis
            </h3>
            <p className="text-xs text-slate-500">
              Associe grupos de segurança do domínio a perfis operacionais e lojas autorizadas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filtrar vínculos..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleOpenNewMapping}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
            >
              + Novo Vínculo
            </button>
          </div>
        </div>

        {mappingsEntries.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhum vínculo de grupo cadastrado até o momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mappingsEntries.map(([grp, data]) => {
              const role: Role = (typeof data === 'object' && data?.role) || 'operator'
              const mappedSites: string[] =
                role === 'operador_matriz'
                  ? ['Todas as Lojas (Acesso Global)']
                  : (typeof data === 'object' && data?.sites) || (Array.isArray(data) ? data : [])

              return (
                <div
                  key={grp}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:bg-white hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {grp}
                      </span>
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        {ROLE_LABELS[role] || role}
                      </span>
                    </div>

                    <div className="mt-3">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400">
                        Lojas Vinculadas:
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {mappedSites.map((s, idx) => (
                          <span
                            key={idx}
                            className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200/60 pt-2.5">
                    <button
                      type="button"
                      onClick={() => handleEditMapping(grp, data)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      Editar
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteMapping(grp)}
                      className="text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. Modal / Drawer de Criação/Edição de Vínculo */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingGroupName ? `Editar Vínculo: ${editingGroupName}` : 'Novo Vínculo de Grupo AD'}
              </h3>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="my-4 space-y-4">
              {/* Seleção do Grupo */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Nome do Grupo no Active Directory *
                </label>
                <input
                  type="text"
                  placeholder="Digite ou selecione abaixo..."
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />

                {/* Busca dinâmica no AD */}
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Grupos no servidor AD:</span>
                    <button
                      type="button"
                      onClick={() => loadGroupsFromAD(adSearchTerm)}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      {loadingAdGroups ? 'Consultando...' : 'Recarregar'}
                    </button>
                  </div>

                  <div className="mb-2">
                    <input
                      type="text"
                      placeholder="Filtrar grupos no servidor..."
                      value={adSearchTerm}
                      onChange={(e) => {
                        setAdSearchTerm(e.target.value)
                        loadGroupsFromAD(e.target.value)
                      }}
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1">
                    {adGroups.map((g) => (
                      <button
                        key={g.name}
                        type="button"
                        onClick={() => setTargetGroup(g.name)}
                        className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs text-slate-800 hover:bg-slate-200/70"
                      >
                        <span className="font-mono font-medium">{g.name}</span>
                        <span className="text-[10px] text-slate-400">{g.description || ''}</span>
                      </button>
                    ))}
                    {adGroups.length === 0 && !loadingAdGroups && (
                      <p className="text-center text-[11px] text-slate-400">
                        Nenhum grupo listado (conecte o AD para carregar automaticamente).
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Perfil / Role */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Perfil de Acesso (Role) *
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as Role)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="operator">Operador de Loja (Acesso restrito às filiais)</option>
                  <option value="admin">Administrador da Loja</option>
                  <option value="operador_matriz">Operador Matriz (Acesso Global a Todas as Lojas)</option>
                </select>
              </div>

              {/* Seleção de Lojas */}
              {targetRole !== 'operador_matriz' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Lojas e Filiais Permitidas
                  </label>
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      {sites.map((s) => {
                        const isChecked = targetSites.includes(s.code) || targetSites.includes(s.name)
                        return (
                          <label
                            key={s.id}
                            className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs transition-colors ${
                              isChecked
                                ? 'bg-blue-100/80 font-semibold text-blue-900'
                                : 'hover:bg-slate-200/60 text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSite(s.code)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate">{s.name} ({s.code})</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMapping}
                disabled={!targetGroup.trim()}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                Salvar Vínculo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botão de Salvar Alterações Globais */}
      <div className="flex justify-end border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Alterações de Permissão'}
        </button>
      </div>
    </div>
  )
}
