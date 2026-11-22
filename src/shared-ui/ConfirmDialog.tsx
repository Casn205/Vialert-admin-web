import { useState } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

interface Props {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  /** Texto de la acción: di exactamente qué pasa ("Eliminar hospital"). */
  confirmar: string;
  peligro?: boolean;
  onConfirmar: () => void | Promise<void>;
  onCancelar: () => void;
}

export function ConfirmDialog({ abierto, titulo, mensaje, confirmar, peligro = false, onConfirmar, onCancelar }: Props) {
  const [enCurso, setEnCurso] = useState(false);

  async function aceptar() {
    setEnCurso(true);
    try {
      await onConfirmar();
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={enCurso ? () => {} : onCancelar}
      titulo={titulo}
      pie={
        <>
          <Button variante="secundario" onClick={onCancelar} disabled={enCurso}>
            Cancelar
          </Button>
          <Button variante={peligro ? 'peligro' : 'primario'} onClick={aceptar} cargando={enCurso}>
            {confirmar}
          </Button>
        </>
      }
    >
      <p className="text-sm text-tinta-suave">{mensaje}</p>
    </Modal>
  );
}
