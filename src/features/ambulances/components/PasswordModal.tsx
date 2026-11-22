import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { Ambulancia } from '@/core/domain/ambulancia';
import { passwordSchema } from '@/core/schemas/ambulancia';
import { Button, FormField, Modal, campoClase } from '@/shared-ui';

interface Props {
  /** Ambulancia a la que se le cambia la contraseña; `null` mantiene el diálogo cerrado. */
  ambulancia: Ambulancia | null;
  onCerrar: () => void;
  /** Debe lanzar si falla para que el diálogo siga abierto. */
  onGuardar: (id: string, password: string) => Promise<void>;
}

export function PasswordModal({ ambulancia, onCerrar, onGuardar }: Props) {
  return (
    <Modal abierto={ambulancia !== null} onCerrar={onCerrar} titulo={`Cambiar contraseña de ${ambulancia?.placa ?? ''}`}>
      {ambulancia && <Formulario ambulancia={ambulancia} onCerrar={onCerrar} onGuardar={onGuardar} />}
    </Modal>
  );
}

function Formulario({ ambulancia, onCerrar, onGuardar }: Omit<Props, 'ambulancia'> & { ambulancia: Ambulancia }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ password: string }>({ resolver: zodResolver(passwordSchema) });

  async function enviar({ password }: { password: string }) {
    try {
      await onGuardar(ambulancia.id, password);
    } catch {
      /* el padre ya avisó del error; el diálogo se queda abierto */
    }
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
      <p className="text-sm text-tinta-suave">
        La sesión actual de la unidad se cerrará y tendrá que iniciar sesión de nuevo con la contraseña nueva.
      </p>
      <FormField htmlFor="amb-nueva-password" label="Nueva contraseña" error={errors.password?.message} ayuda="Mínimo 8 caracteres.">
        <input id="amb-nueva-password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} className={campoClase} {...register('password')} />
      </FormField>
      <div className="flex justify-end gap-2 pt-1">
        <Button variante="secundario" onClick={onCerrar} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" cargando={isSubmitting}>
          Cambiar contraseña
        </Button>
      </div>
    </form>
  );
}
