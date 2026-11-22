import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import type { Hospital } from '@/core/domain/hospital';
import { hospitalSchema, type HospitalForm } from '@/core/schemas/hospital';
import { Button, FormField, Modal, SelectorCoordenadas, campoClase } from '@/shared-ui';

interface Props {
  abierto: boolean;
  /** Hospital a editar; `null` para crear uno nuevo. */
  hospital: Hospital | null;
  onCerrar: () => void;
  /** Debe lanzar si falla para que el diálogo siga abierto. */
  onGuardar: (datos: HospitalForm) => Promise<void>;
}

export function HospitalFormModal({ abierto, hospital, onCerrar, onGuardar }: Props) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={hospital ? 'Editar hospital' : 'Nuevo hospital'}>
      {/* El formulario se monta solo con el diálogo abierto: cada apertura empieza limpia. */}
      <Formulario hospital={hospital} onCerrar={onCerrar} onGuardar={onGuardar} />
    </Modal>
  );
}

function Formulario({ hospital, onCerrar, onGuardar }: Omit<Props, 'abierto'>) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<HospitalForm>({
    resolver: zodResolver(hospitalSchema),
    defaultValues: hospital ? { nombre: hospital.nombre, lat: hospital.lat, lng: hospital.lng } : undefined,
  });

  const lat = useWatch({ control, name: 'lat' });
  const lng = useWatch({ control, name: 'lng' });
  const punto =
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;

  async function enviar(datos: HospitalForm) {
    try {
      await onGuardar(datos);
    } catch {
      /* el padre ya avisó del error; el diálogo se queda abierto */
    }
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
      <FormField htmlFor="hospital-nombre" label="Nombre" error={errors.nombre?.message}>
        <input id="hospital-nombre" autoComplete="off" aria-invalid={!!errors.nombre} className={campoClase} {...register('nombre')} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField htmlFor="hospital-lat" label="Latitud" error={errors.lat?.message} ayuda="Entre −90 y 90">
          <input id="hospital-lat" type="number" step="any" inputMode="decimal" aria-invalid={!!errors.lat} className={campoClase} {...register('lat', { valueAsNumber: true })} />
        </FormField>
        <FormField htmlFor="hospital-lng" label="Longitud" error={errors.lng?.message} ayuda="Entre −180 y 180">
          <input id="hospital-lng" type="number" step="any" inputMode="decimal" aria-invalid={!!errors.lng} className={campoClase} {...register('lng', { valueAsNumber: true })} />
        </FormField>
      </div>
      <div className="space-y-1">
        <SelectorCoordenadas
          valor={punto}
          onCambio={(p) => {
            setValue('lat', p.lat, { shouldValidate: true, shouldDirty: true });
            setValue('lng', p.lng, { shouldValidate: true, shouldDirty: true });
          }}
        />
        <p className="text-xs text-tinta-suave">
          Haz clic en el mapa para elegir el lugar (puedes arrastrar el marcador) o escribe las coordenadas.
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variante="secundario" onClick={onCerrar} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" cargando={isSubmitting}>
          {hospital ? 'Guardar cambios' : 'Crear hospital'}
        </Button>
      </div>
    </form>
  );
}
