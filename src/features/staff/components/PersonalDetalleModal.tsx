import { ETIQUETA_TIPO_PERSONAL, nombreCompleto, type Personal } from '@/core/domain/personal';
import { Button, Modal } from '@/shared-ui';

interface Props {
  persona: Personal | null;
  /** Placa de la ambulancia asignada, si se conoce. */
  placa: string | null;
  onCerrar: () => void;
}

/** Aquí sí se muestran la cédula y el teléfono completos (en las tablas van enmascarados). */
export function PersonalDetalleModal({ persona, placa, onCerrar }: Props) {
  const filas: [string, string][] = persona
    ? [
        ['Tipo', ETIQUETA_TIPO_PERSONAL[persona.tipo]],
        ['Cédula', persona.cedula || 'Sin dato'],
        ...(persona.tipo === 'paramedico' ? ([['Teléfono', persona.telefono || 'Sin dato']] as [string, string][]) : []),
        ['Entidad', persona.entidadId || 'Sin dato'],
        ['Estado', persona.estado === 'ocupado' ? 'En turno' : 'Disponible'],
        ['Ambulancia', persona.ambulanciaId ? (placa ?? 'No encontrada') : 'Sin asignar'],
      ]
    : [];

  return (
    <Modal abierto={persona !== null} onCerrar={onCerrar} titulo={persona ? nombreCompleto(persona) : 'Detalle'}>
      <div className="space-y-4">
        <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
          {filas.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-tinta-suave">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex justify-end">
          <Button variante="secundario" onClick={onCerrar}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
