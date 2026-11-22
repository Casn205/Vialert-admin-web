import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ETIQUETA_TIPO_PERSONAL, type Personal, type TipoPersonal } from '@/core/domain/personal';
import { personalSchema, type PersonalForm } from '@/core/schemas/personal';
import { Button, FormField, Modal, campoClase } from '@/shared-ui';

interface Props {
  abierto: boolean;
  tipo: TipoPersonal;
  /** Persona a editar; `null` para crear. */
  persona: Personal | null;
  onCerrar: () => void;
  /** Debe lanzar si falla para que el diálogo siga abierto. */
  onGuardar: (datos: PersonalForm) => Promise<void>;
}

export function PersonalFormModal({ abierto, tipo, persona, onCerrar, onGuardar }: Props) {
  const titulo = `${persona ? 'Editar' : 'Nuevo'} ${ETIQUETA_TIPO_PERSONAL[tipo].toLowerCase()}`;
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={titulo}>
      <Formulario tipo={tipo} persona={persona} onCerrar={onCerrar} onGuardar={onGuardar} />
    </Modal>
  );
}

function Formulario({ tipo, persona, onCerrar, onGuardar }: Omit<Props, 'abierto'>) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PersonalForm>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      tipo,
      nombre: persona?.nombre ?? '',
      apellido: persona?.apellido ?? '',
      cedula: persona?.cedula ?? '',
      entidadId: persona?.entidadId ?? '',
      telefono: persona?.telefono ?? '',
    },
  });

  async function enviar(datos: PersonalForm) {
    try {
      await onGuardar(datos);
    } catch {
      /* el padre ya avisó del error; el diálogo se queda abierto */
    }
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField htmlFor="personal-nombre" label="Nombre" error={errors.nombre?.message}>
          <input id="personal-nombre" autoComplete="off" aria-invalid={!!errors.nombre} className={campoClase} {...register('nombre')} />
        </FormField>
        <FormField htmlFor="personal-apellido" label="Apellido" error={errors.apellido?.message}>
          <input id="personal-apellido" autoComplete="off" aria-invalid={!!errors.apellido} className={campoClase} {...register('apellido')} />
        </FormField>
      </div>
      <FormField htmlFor="personal-cedula" label="Cédula" error={errors.cedula?.message}>
        <input id="personal-cedula" inputMode="numeric" autoComplete="off" aria-invalid={!!errors.cedula} className={campoClase} {...register('cedula')} />
      </FormField>
      {tipo === 'paramedico' && (
        <FormField htmlFor="personal-telefono" label="Teléfono" error={errors.telefono?.message}>
          <input id="personal-telefono" type="tel" autoComplete="off" aria-invalid={!!errors.telefono} className={campoClase} {...register('telefono')} />
        </FormField>
      )}
      <FormField htmlFor="personal-entidad" label="Entidad" error={errors.entidadId?.message} ayuda="Se guarda en mayúsculas.">
        <input id="personal-entidad" autoComplete="off" aria-invalid={!!errors.entidadId} className={campoClase} {...register('entidadId')} />
      </FormField>
      {persona && (
        <p className="rounded-md bg-fondo px-3 py-2 text-xs text-tinta-suave">
          El estado y la ambulancia asignada los gestiona la app móvil y no se pueden cambiar aquí.
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button variante="secundario" onClick={onCerrar} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" cargando={isSubmitting}>
          {persona ? 'Guardar cambios' : `Crear ${ETIQUETA_TIPO_PERSONAL[tipo].toLowerCase()}`}
        </Button>
      </div>
    </form>
  );
}
