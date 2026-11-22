import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { Ambulancia } from '@/core/domain/ambulancia';
import { editarAmbulanciaSchema, nuevaAmbulanciaSchema, type NuevaAmbulanciaForm } from '@/core/schemas/ambulancia';
import { Button, FormField, Modal, campoClase } from '@/shared-ui';

type EdicionForm = Pick<NuevaAmbulanciaForm, 'placa' | 'codigoInterno' | 'entidadId'>;

interface Props {
  abierto: boolean;
  /** Ambulancia a editar; `null` para crear una nueva. */
  ambulancia: Ambulancia | null;
  onCerrar: () => void;
  /** Deben lanzar si fallan para que el diálogo siga abierto. */
  onCrear: (datos: NuevaAmbulanciaForm) => Promise<void>;
  onEditar: (id: string, datos: EdicionForm) => Promise<void>;
}

export function AmbulanciaFormModal({ abierto, ambulancia, onCerrar, onCrear, onEditar }: Props) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={ambulancia ? `Editar ${ambulancia.placa}` : 'Nueva ambulancia'}>
      {/* El formulario se monta solo con el diálogo abierto: cada apertura empieza limpia. */}
      {ambulancia ? (
        <FormularioEdicion ambulancia={ambulancia} onCerrar={onCerrar} onEditar={onEditar} />
      ) : (
        <FormularioNuevo onCerrar={onCerrar} onCrear={onCrear} />
      )}
    </Modal>
  );
}

function FormularioNuevo({ onCerrar, onCrear }: Pick<Props, 'onCerrar' | 'onCrear'>) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NuevaAmbulanciaForm>({ resolver: zodResolver(nuevaAmbulanciaSchema) });

  async function enviar(datos: NuevaAmbulanciaForm) {
    try {
      await onCrear(datos);
    } catch {
      /* el padre ya avisó del error; el diálogo se queda abierto */
    }
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
      <FormField htmlFor="amb-email" label="Correo" error={errors.email?.message} ayuda="Con este correo la ambulancia inicia sesión en la app.">
        <input id="amb-email" type="email" autoComplete="off" aria-invalid={!!errors.email} className={campoClase} {...register('email')} />
      </FormField>
      <FormField htmlFor="amb-password" label="Contraseña" error={errors.password?.message} ayuda="Mínimo 8 caracteres. No se vuelve a mostrar.">
        <input id="amb-password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} className={campoClase} {...register('password')} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField htmlFor="amb-placa" label="Placa" error={errors.placa?.message}>
          <input id="amb-placa" autoComplete="off" aria-invalid={!!errors.placa} className={campoClase} {...register('placa')} />
        </FormField>
        <FormField htmlFor="amb-codigo" label="Código interno" error={errors.codigoInterno?.message}>
          <input id="amb-codigo" autoComplete="off" aria-invalid={!!errors.codigoInterno} className={campoClase} {...register('codigoInterno')} />
        </FormField>
      </div>
      <FormField htmlFor="amb-entidad" label="Entidad" error={errors.entidadId?.message} ayuda="Se guarda en MAYÚSCULAS.">
        <input id="amb-entidad" autoComplete="off" aria-invalid={!!errors.entidadId} className={campoClase} {...register('entidadId')} />
      </FormField>
      <div className="flex justify-end gap-2 pt-1">
        <Button variante="secundario" onClick={onCerrar} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" cargando={isSubmitting}>
          Crear ambulancia
        </Button>
      </div>
    </form>
  );
}

function FormularioEdicion({ ambulancia, onCerrar, onEditar }: Pick<Props, 'onCerrar' | 'onEditar'> & { ambulancia: Ambulancia }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EdicionForm>({
    resolver: zodResolver(editarAmbulanciaSchema),
    defaultValues: { placa: ambulancia.placa, codigoInterno: ambulancia.codigoInterno, entidadId: ambulancia.entidadId },
  });

  async function enviar(datos: EdicionForm) {
    try {
      await onEditar(ambulancia.id, datos);
    } catch {
      /* el padre ya avisó del error; el diálogo se queda abierto */
    }
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
      <p className="text-sm text-tinta-suave">
        Correo de la cuenta: <span className="font-medium text-tinta">{ambulancia.email}</span> (no se puede cambiar).
      </p>
      <div className="grid grid-cols-2 gap-3">
        <FormField htmlFor="amb-placa" label="Placa" error={errors.placa?.message}>
          <input id="amb-placa" autoComplete="off" aria-invalid={!!errors.placa} className={campoClase} {...register('placa')} />
        </FormField>
        <FormField htmlFor="amb-codigo" label="Código interno" error={errors.codigoInterno?.message}>
          <input id="amb-codigo" autoComplete="off" aria-invalid={!!errors.codigoInterno} className={campoClase} {...register('codigoInterno')} />
        </FormField>
      </div>
      <FormField htmlFor="amb-entidad" label="Entidad" error={errors.entidadId?.message} ayuda="Se guarda en MAYÚSCULAS.">
        <input id="amb-entidad" autoComplete="off" aria-invalid={!!errors.entidadId} className={campoClase} {...register('entidadId')} />
      </FormField>
      <div className="flex justify-end gap-2 pt-1">
        <Button variante="secundario" onClick={onCerrar} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" cargando={isSubmitting}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
