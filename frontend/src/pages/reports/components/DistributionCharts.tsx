import type { DashboardChartsResponse } from '../../../types/dashboard'
import DonutChart from './DonutChart'

interface DistributionChartsProps {
  data: DashboardChartsResponse | null
  loading: boolean
  onFilterByLabel?: (categoria: string, label: string) => void
}

export default function DistributionCharts({
  data,
  loading,
  onFilterByLabel,
}: DistributionChartsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex h-64 animate-pulse flex-col rounded-xl border border-[#1E2636] bg-[#121721] p-5 shadow-sm"
          >
            <div className="mb-4 h-4 w-32 rounded bg-[#181F2E]" />
            <div className="flex flex-1 items-center justify-center">
              <div className="h-32 w-32 rounded-full border-4 border-[#181F2E]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-[#1E2636] bg-[#121721] text-sm text-slate-500">
        Nenhum dado estatístico disponível no momento.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
      <DonutChart
        title="Sistemas Operacionais"
        subtitle="Distribuição por plataforma e distribuição"
        items={data.sistema_operacional}
        total={data.total_maquinas}
        onItemClick={(lbl) => onFilterByLabel && onFilterByLabel('sistema', lbl)}
      />

      <DonutChart
        title="Capacidade de Memória RAM"
        subtitle="Distribuição de volume (GB)"
        items={data.memoria_ram}
        total={data.total_maquinas}
        onItemClick={(lbl) => onFilterByLabel && onFilterByLabel('ram', lbl)}
      />

      <DonutChart
        title="Tipo de Memória RAM"
        subtitle="DDR3, DDR4, DDR5 e barramentos"
        items={data.tipo_ram}
        total={data.total_maquinas}
        onItemClick={(lbl) => onFilterByLabel && onFilterByLabel('ram_tipo', lbl)}
      />

      <DonutChart
        title="Tamanho dos Discos"
        subtitle="Capacidade total de armazenamento"
        items={data.tipo_disco}
        total={data.total_maquinas}
        onItemClick={(lbl) => onFilterByLabel && onFilterByLabel('disco', lbl)}
      />

      <DonutChart
        title="Tipo de Armazenamento"
        subtitle="NVMe, SSD, HDD e Virtual"
        items={data.tipo_armazenamento || []}
        total={data.total_maquinas}
        onItemClick={(lbl) => onFilterByLabel && onFilterByLabel('disco_tipo', lbl)}
      />

      <DonutChart
        title="Status Operacional"
        subtitle="Atualizada, Atualização Necessária ou Desatualizada"
        items={data.status_coleta}
        total={data.total_maquinas}
        onItemClick={(lbl) => onFilterByLabel && onFilterByLabel('status', lbl)}
      />

      <DonutChart
        title="Distribuição por Loja / Filial"
        subtitle="Volume de estações ativas por unidade"
        items={data.filiais}
        total={data.total_maquinas}
        onItemClick={(lbl) => onFilterByLabel && onFilterByLabel('filial', lbl)}
      />
    </div>
  )
}
