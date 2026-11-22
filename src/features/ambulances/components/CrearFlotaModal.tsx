import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import type { FilaLote, ResultadoFila } from '@/core/domain/ambulancia';
import { loteSchema, type LoteForm } from '@/core/schemas/ambulancia';
import { Badge, Button, FormField, Modal, campoClase } from '@/shared-ui';

const MAX_FILAS = 50;
const filaVacia = (): FilaLote => ({ placa: '', codigoInterno: '', email: '' });
const COLUMNAS = 'grid grid-cols-[1fr_1fr_1.5fr_auto] items-start gap-2';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  /** Devuelve el resultado de cada fila; debe lanzar solo si falla toda la petición. */
  onCrear: (datos: LoteForm) => Promise<ResultadoFila[]>;
}

/** "Crear flota": plantilla común (entidad, estado, contraseña) + una fila por ambulancia. */
export function CrearFlotaModal({ abierto, onCerrar, onCrear }: Props) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Crear flota">
      <Formulario onCerrar={onCerrar} onCrear={onCrear} />
    </Modal>
  );
}

function Formulario({ onCerrar, onCrear }: Omit<Props, 'abierto'>) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoteForm>({
    resolver: zodResolver(loteSchema),
    defaultValues: { entidadId: '', estadoOperativo: 'habilitada', password: '', filas: [filaVacia()] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'filas' });
  const [resultado, setResultado] = useState<{ filas: FilaLote[]; resultados: ResultadoFila[] } | null>(null);

  async function enviar(datos: LoteForm) {
    try {
      const resultados = await onCrear(datos);
      setResultado({ filas: datos.filas, resultados });
    } catch {
      /* el padre ya avisó del error; el diálogo se queda abierto con lo escrito */
    }
  }

  if (resultado) {
    const total = resultado.resultados.length;
    const creadas = resultado.resultados.filter((r) => r.ok).length;
    const fallidas = resultado.resultados.filter((r) => !r.ok);

    /** Vuelve al formulario con solo las filas que fallaron (la plantilla se conserva). */
    function reintentar() {
      const filas = fallidas.flatMap((r) => resultado!.filas[r.fila] ?? []);
      reset({ ...getValues(), filas });
      setResultado(null);
    }

    return (
      <div className="space-y-4">
        <p role="status" className="text-sm font-medium">
          {`Se crearon ${creadas} de ${total} ambulancias.`}
        </p>
        <ul className="max-h-72 divide-y divide-borde overflow-y-auto rounded-md border border-borde text-sm">
          {resultado.resultados.map((r) => {
            const f = resultado.filas[r.fila];
            return (
              <li key={r.fila} className="flex items-start justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium">{f?.placa || `Fila ${r.fila + 1}`}</p>
                  <p className="truncate text-xs text-tinta-suave">{f?.email}</p>
                  {!r.ok && <p className="text-xs text-critico">{r.error}</p>}
                </div>
                <Badge tono={r.ok ? 'ok' : 'critico'}>{r.ok ? 'Creada' : 'Con error'}</Badge>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-end gap-2">
          {fallidas.length > 0 && (
            <Button variante="secundario" onClick={reintentar}>
              Corregir las fallidas
            </Button>
          )}
          <Button onClick={onCerrar}>Cerrar</Button>
        </div>
      </div>
    );
  }

  const mensajeFila = (i: number) => {
    const e = errors.filas?.[i];
    return e?.placa?.message ?? e?.codigoInterno?.message ?? e?.email?.message;
  };

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField htmlFor="flota-entidad" label="Entidad" error={errors.entidadId?.message} ayuda="Se guarda en MAYÚSCULAS.">
          <input id="flota-entidad" autoComplete="off" aria-invalid={!!errors.entidadId} className={campoClase} {...register('entidadId')} />
        </FormField>
        <FormField htmlFor="flota-estado" label="Estado inicial">
          <select id="flota-estado" className={campoClase} {...register('estadoOperativo')}>
            <option value="habilitada">Habilitada</option>
            <option value="inactiva">Inactiva (cuenta deshabilitada)</option>
          </select>
        </FormField>
      </div>
      <FormField htmlFor="flota-password" label="Contraseña común" error={errors.password?.message} ayuda="Mínimo 8 caracteres. La usarán todas las ambulancias del lote.">
        <input id="flota-password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} className={campoClase} {...register('password')} />
      </FormField>

      <div className="space-y-2">
        <div className={`${COLUMNAS} text-xs font-semibold text-tinta-suave`} aria-hidden>
          <span>Placa</span>
          <span>Código interno</span>
          <span>Correo</span>
          <span className="w-9" />
        </div>
        {fields.map((f, i) => (
          <div key={f.id} className="space-y-1">
            <div className={COLUMNAS}>
              <input aria-label={`Placa de la fila ${i + 1}`} autoComplete="off" aria-invalid={!!errors.filas?.[i]?.placa} className={campoClase} {...register(`filas.${i}.placa`)} />
              <input aria-label={`Código interno de la fila ${i + 1}`} autoComplete="off" aria-invalid={!!errors.filas?.[i]?.codigoInterno} className={campoClase} {...register(`filas.${i}.codigoInterno`)} />
              <input aria-label={`Correo de la fila ${i + 1}`} type="email" autoComplete="off" aria-invalid={!!errors.filas?.[i]?.email} className={campoClase} {...register(`filas.${i}.email`)} />
              <Button variante="texto" aria-label={`Quitar la fila ${i + 1}`} onClick={() => remove(i)} disabled={fields.length === 1}>
                ×
              </Button>
            </div>
            {mensajeFila(i) && (
              <p role="alert" className="text-xs text-critico">
                Fila {i + 1}: {mensajeFila(i)}
              </p>
            )}
          </div>
        ))}
        {errors.filas?.message && (
          <p role="alert" className="text-xs text-critico">
            {errors.filas.message}
          </p>
        )}
        <Button variante="secundario" onClick={() => append(filaVacia())} disabled={fields.length >= MAX_FILAS}>
          Agregar fila
        </Button>
        <span className="ml-2 text-xs text-tinta-suave">
          {fields.length} de {MAX_FILAS}
        </span>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variante="secundario" onClick={onCerrar} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" cargando={isSubmitting}>
          Crear ambulancias
        </Button>
      </div>
    </form>
  );
}
