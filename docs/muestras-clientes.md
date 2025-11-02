# Documentación: Funcionalidades Muestras y Clientes

## Palabra clave: muestras-clientes

### Fecha de implementación: ${new Date().toLocaleDateString('es-ES')}

---

## 1. Refactorización: Modal Unificado para Crear/Editar Muestras

### Descripción
Se unificó el componente `CreateSampleModal` para manejar tanto la creación como la edición de muestras, eliminando la necesidad de un modal separado para edición.

### Archivos modificados:
- `src/components/samples/CreateSampleModal.tsx`
- `src/app/samples/page.tsx`
- `src/components/samples/EditSampleModal.tsx` (ya no se utiliza)

### Cambios principales:

#### CreateSampleModal.tsx
1. **Nuevo prop opcional `sampleId`**: Determina si el modal está en modo creación o edición
2. **Función `loadSampleData`**: Carga todos los datos de la muestra cuando `sampleId` está presente
3. **Precarga de datos**: Todos los campos se precargan correctamente en modo edición:
   - `client_id`, `code`, `received_date`, `sla_type`
   - `project_id`, `species`, `variety`, `rootstock`
   - `planting_year`, `previous_crop`, `next_crop`, `fallow`
   - `client_notes`, `reception_notes`, `taken_by`, `delivery_method`
   - `suspected_pathogen`, `region`, `locality`
   - `sampling_observations`, `reception_observations`
   - `due_date`, `sla_status`, `status`
4. **Submit unificado**: `handleSubmit` ejecuta POST (crear) o PATCH (actualizar) según el modo
5. **UI condicional**:
   - Título: "Nueva Muestra" / "Editar Muestra"
   - Botón: "Crear muestra" / "Guardar cambios"
   - Campos adicionales solo en modo edición (status, due_date, sla_status, región, localidad, observaciones)
   - Campo de código deshabilitado en modo edición
   - Tipos de análisis ocultos en modo edición

#### samples/page.tsx
1. Eliminado `EditSampleModal` y su importación
2. Estado `editingSampleId` para manejar el modo edición
3. `handleEditSample` actualizado para usar el modal unificado
4. `CreateSampleModal` ahora se usa para crear y editar

---

## 2. Funcionalidad de Edición de Resultados

### Descripción
Se implementó la precarga de datos al editar resultados, permitiendo modificar todos los campos de un resultado existente.

### Archivos modificados:
- `src/components/results/AddResultModal.tsx`
- `src/app/results/page.tsx`

### Cambios principales:

#### AddResultModal.tsx
1. **Nuevo prop opcional `resultId`**: Para modo edición
2. **Función `loadResultData`**: Carga todos los datos del resultado desde la API
3. **Precarga completa de datos**:
   - Campos básicos: `sample_id`, `sample_test_id`, `methodology`, `methodologies`, `identification_techniques`
   - Campos de resultado: `findings`, `conclusion`, `diagnosis`, `pathogen_identified`, `pathogen_type`, `severity`, `confidence`, `result_type`, `recommendations`
   - Parsing de `findings` JSON para estructuras específicas:
     - Nematología (negativo/positivo)
     - Virología
     - Fitopatología
     - Bacteriología
     - Detección precoz
4. **Submit unificado**: POST para crear, PATCH para actualizar
5. **UI condicional**: Título y botón cambian según el modo

#### results/page.tsx
1. `AddResultModal` ahora acepta `resultId` para edición
2. Botón "Editar" pasa el `resultId` al modal

---

## 3. Funcionalidad de Creación de Proyectos

### Descripción
Se implementó la capacidad de crear proyectos desde la sección de muestras, con un modal similar al de crear clientes.

### Archivos creados/modificados:
- `src/components/projects/CreateProjectModal.tsx` (NUEVO)
- `src/app/samples/page.tsx`

### Cambios principales:

#### CreateProjectModal.tsx (NUEVO)
1. **Componente nuevo** basado en `CreateClientModal`
2. **Campos del formulario** (según tabla `projects`):
   - `name` (obligatorio) - Nombre del proyecto
   - `code` (opcional) - Código del proyecto
   - `start_date` (opcional) - Fecha de inicio
   - `end_date` (opcional) - Fecha de fin
   - `notes` (opcional) - Notas adicionales
   - `company_id` (automático) - Se asigna del usuario actual
3. **Inserción en tabla `projects`**: Utiliza Supabase para crear el proyecto

#### samples/page.tsx
1. **Botón "Crear Proyecto"**: Agregado junto a "Crear Cliente" y "Nueva muestra"
2. **Mismo diseño**: Estilos idénticos al botón de crear cliente
3. **Modal integrado**: `CreateProjectModal` se abre al hacer clic
4. **Refresh automático**: Los proyectos se recargan cuando se crea uno nuevo

### Estructura de la tabla `projects`:
```sql
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  start_date date,
  end_date date,
  notes text,
  company_id uuid,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
```

---

## 4. Correcciones de Errores

### Archivos corregidos:
- `src/components/results/AddResultModal.tsx` - Eliminado código duplicado
- `src/app/api/results/[id]/route.ts` - Eliminado código duplicado
- `src/app/api/samples/[id]/route.ts` - Eliminado código duplicado
- `src/components/samples/EditSampleModal.tsx` - Eliminado código duplicado al final

### Problemas resueltos:
- Errores de sintaxis por código duplicado
- Cierres de componentes incorrectos
- Estructura JSX mal formada

---

## Funcionalidades Implementadas

### ✅ Muestras
- [x] Modal unificado para crear/editar muestras
- [x] Precarga completa de datos en modo edición
- [x] Todos los campos editables en modo edición
- [x] Validación de campos obligatorios
- [x] Manejo de errores mejorado

### ✅ Resultados
- [x] Precarga de datos al editar resultados
- [x] Modal unificado para crear/editar resultados
- [x] Parsing correcto de estructuras JSON de findings
- [x] Soporte para todos los tipos de análisis

### ✅ Proyectos
- [x] Creación de proyectos desde sección de muestras
- [x] Modal con todos los campos requeridos
- [x] Integración con selector de proyectos en muestras
- [x] Diseño consistente con otros modales

---

## Notas Técnicas

### Patrón utilizado:
- Modal único para crear/editar (componente reutilizable)
- Props opcionales para determinar el modo (`sampleId`, `resultId`)
- Precarga de datos desde API en modo edición
- Submit unificado que ejecuta INSERT o UPDATE según el modo

### Mejoras de UX:
- Indicadores de carga mientras se cargan datos
- Mensajes de error claros
- Validación en tiempo real
- Campos deshabilitados cuando corresponde (código en edición)

### Consideraciones:
- Los proyectos creados aparecen inmediatamente en el selector de muestras
- Los clientes creados aparecen inmediatamente en el selector de muestras
- Todos los cambios se reflejan sin necesidad de recargar la página

