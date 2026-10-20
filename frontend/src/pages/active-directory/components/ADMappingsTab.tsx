import { useEffect, useState } from 'react'
import { getADGroups } from '../../../services/adService'
import type { ADConfig, ADGroup, Role } from '../../../types/ad'
import type { Site } from '../../../types/site'
import { SelectDropdown } from '../../../components/ui/SelectDropdown'
import { ShieldCheck, Users, Plus, X, Search, RefreshCw, Edit3, Trash2, Check, Save } from 'lucide-react'

interface ADMappingsTabProps {
  config: ADConfig
  sites: Site[]
  onChange: (updated: ADConfig) => void
  onSave: () => void
  saving: boolean
}

const ROLE_OPTIONS = [
  { value: 'operator', label: 'Operador de Loja (Acesso restrito às filiais)' },
  { value: 'admin', label: 'Administrador da Loja' },
  { value: 'operador_matriz', label: 'Operador Matriz (Acesso Global a Todas as Lojas)' },
]

const ROLE_LABELS: Record<Role, string> = {
  operator: 'Operador de Loja',
  admin: 'Administrador da Loja',
  operador_matriz: 'Operador Matriz (Acesso Global)',
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

  const cleanSiteName = (name: string, code: string) => {
    return name.replace(new RegExp(`^\\[?${code}\\]?\\s*[-–—]?\\s*`, 'i'), '').trim()
  }

  return (
    <div className="space-y-6 text-xs">
      {/* 1. Grupos Superadministradores */}
      <div className="rounded-2xl border border-[#1E2636] bg-[#121721] p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-orange-400" />
            Grupos Superadministradores (Acesso Total)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Membros destes grupos no Active Directory recebem automaticamente privilégios de superadmin global
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {config.superadmin_groups.map((grp) => (
            <span
              key={grp}
              className="flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-[#181F2E] px-3 py-1.5 text-xs font-mono font-semibold text-orange-400 shadow-xs"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              <span>{grp}</span>
              <button
                type="button"
                onClick={() => handleRemoveSuperGroup(grp)}
                className="ml-1 text-slate-400 hover:text-rose-400 transition-colors"
                title="Remover grupo superadmin"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}

          <div className="flex items-center gap-2">
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
              className="rounded-lg border border-[#263044] bg-[#181F2E] px-3 py-1.5 text-xs font-medium text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddSuperGroup}
              className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Adicionar</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Mapeamento de Grupos para Lojas e Perfis */}
      <div className="rounded-2xl border border-[#1E2636] bg-[#121721] p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E2636] pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-400" />
              Mapeamentos de Grupos do AD para Lojas e Perfis
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Associe grupos de segurança do domínio a perfis operacionais e lojas autorizadas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar vínculos..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-48 sm:w-60 rounded-lg border border-[#263044] bg-[#181F2E] pl-8 pr-3 py-1.5 text-xs font-medium text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleOpenNewMapping}
              className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Novo Vínculo</span>
            </button>
          </div>
        </div>

        {mappingsEntries.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
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
                  className="flex flex-col justify-between rounded-xl border border-[#1E2636] bg-[#181F2E]/60 p-4 transition-all hover:bg-[#181F2E] hover:border-[#263044] hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-white break-all">
                        {grp}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold border shrink-0 ${
                          role === 'operador_matriz'
                            ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                            : role === 'admin'
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                        }`}
                      >
                        {ROLE_LABELS[role] || role}
                      </span>
                    </div>

                    <div className="mt-3">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                        Lojas Vinculadas:
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {mappedSites.map((s, idx) => (
                          <span
                            key={idx}
                            className="rounded bg-[#121721] border border-[#263044] px-1.5 py-0.5 text-[10px] font-mono text-slate-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-3 border-t border-[#1E2636] pt-2.5">
                    <button
                      type="button"
                      onClick={() => handleEditMapping(grp, data)}
                      className="flex items-center gap-1 text-xs font-medium text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      <Edit3 className="h-3 w-3" /> Editar
                    </button>
                    <span className="text-[#263044]">•</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteMapping(grp)}
                      className="flex items-center gap-1 text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" /> Excluir
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. Modal de Criação/Edição de Vínculo */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl border border-[#1E2636] bg-[#121721] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E2636] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-400" />
                {editingGroupName ? `Editar Vínculo: ${editingGroupName}` : 'Novo Vínculo de Grupo AD'}
              </h3>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-[#181F2E] hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Seleção do Grupo */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Nome do Grupo no Active Directory *
                </label>
                <input
                  type="text"
                  placeholder="Digite ou selecione abaixo..."
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                  className="w-full rounded-lg border border-[#263044] bg-[#181F2E] px-3 py-2 text-xs font-mono font-medium text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />

                {/* Busca dinâmica no AD */}
                <div className="mt-2 rounded-xl border border-[#263044] bg-[#181F2E]/60 p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Grupos no servidor AD:</span>
                    <button
                      type="button"
                      onClick={() => loadGroupsFromAD(adSearchTerm)}
                      className="font-semibold text-orange-400 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className={`h-3 w-3 ${loadingAdGroups ? 'animate-spin' : ''}`} />
                      <span>{loadingAdGroups ? 'Consultando...' : 'Recarregar'}</span>
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Filtrar grupos no servidor..."
                      value={adSearchTerm}
                      onChange={(e) => {
                        setAdSearchTerm(e.target.value)
                        loadGroupsFromAD(e.target.value)
                      }}
                      className="w-full rounded-lg border border-[#263044] bg-[#121721] px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {adGroups.map((g) => (
                      <button
                        key={g.name}
                        type="button"
                        onClick={() => setTargetGroup(g.name)}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-300 hover:bg-[#20293A] hover:text-white transition-colors"
                      >
                        <span className="font-mono font-medium">{g.name}</span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{g.description || ''}</span>
                      </button>
                    ))}
                    {adGroups.length === 0 && !loadingAdGroups && (
                      <p className="text-center text-[11px] text-slate-500 py-2">
                        Nenhum grupo listado (conecte o AD para carregar automaticamente).
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Perfil / Role */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Perfil de Acesso (Role) *
                </label>
                <SelectDropdown
                  value={targetRole}
                  onChange={(val) => setTargetRole(val as Role)}
                  options={ROLE_OPTIONS}
                  className="w-full"
                  triggerClassName="w-full text-xs font-medium"
                />
              </div>

              {/* Seleção de Lojas */}
              {targetRole !== 'operador_matriz' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Lojas e Filiais Permitidas
                  </label>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-[#263044] bg-[#181F2E]/60 p-2.5 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {sites.map((s) => {
                        const isChecked = targetSites.includes(s.code) || targetSites.includes(s.name)
                        return (
                          <label
                            key={s.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                              isChecked
                                ? 'bg-orange-500/15 border-orange-500/30 font-semibold text-orange-300'
                                : 'border-transparent text-slate-300 hover:bg-[#20293A]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSite(s.code)}
                              className="h-3.5 w-3.5 rounded border-[#263044] bg-[#121721] text-orange-500 focus:ring-orange-500"
                            />
                            <span className="truncate">
                              {cleanSiteName(s.name, s.code)}{' '}
                              <span className="font-mono text-[10px] text-slate-400">({s.code})</span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#1E2636] pt-4">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-xl border border-[#263044] bg-[#181F2E] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#20293A] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMapping}
                disabled={!targetGroup.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Salvar Vínculo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botão de Salvar Alterações Globais */}
      <div className="flex justify-end border-t border-[#1E2636] pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 disabled:opacity-50"
        >
          {saving ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{saving ? 'Salvando...' : 'Salvar Alterações de Permissão'}</span>
        </button>
      </div>
    </div>
  )
}
