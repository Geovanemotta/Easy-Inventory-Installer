import type { EnrichedMachine } from '../services/inventoryHelpers'

type DeleteDeviceModalProps = {
  device: EnrichedMachine | null
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteDeviceModal({
  device,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteDeviceModalProps) {
  if (!device) return null

  return (
    <div
      className="modal-overlay"
      onClick={() => !isDeleting && onCancel()}
    >
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>
          <span>🗑️</span>
          Confirmar Exclusão de Máquina
        </h3>
        <p>
          Tem certeza que deseja excluir permanentemente a máquina{' '}
          <strong>{device.hostname}</strong> ({device.ip || 'Sem IP'} / {device.mac || 'Sem MAC'})?
        </p>
        {device.alerta_hardware ? (
          <div className="card-alerta-hardware" style={{ margin: '12px 0 16px' }}>
            <div className="alerta-conteudo">
              <div className="alerta-titulo">
                <span>⚠️</span>
                <span>Conflito MAC / Alerta de Hardware Pendente</span>
              </div>
              <div className="alerta-desc">
                Excluir este registro é a ação recomendada caso o SSD tenha sido movido legitimamente para uma nova estação definitiva.
              </div>
            </div>
          </div>
        ) : (
          <p
            style={{
              fontSize: '12px',
              color: '#b91c1c',
              background: '#fee2e2',
              padding: '10px 14px',
              borderRadius: '6px',
              border: '1px solid #fecaca',
              lineHeight: '1.45',
              marginBottom: '20px',
            }}
          >
            ⚠️ <strong>Atenção:</strong> Esta ação removerá a máquina, todo o histórico de alterações (drift) e os softwares registrados. Se a ação for legítima (troca de máquina, upgrade ou desativação), o inventário ficará limpo e o endereço MAC ficará livre para novos registros.
          </p>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="action-btn"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-danger"
            style={{ padding: '8px 16px', borderRadius: '6px' }}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Excluindo...' : 'Sim, Excluir Definitivamente'}
          </button>
        </div>
      </div>
    </div>
  )
}
