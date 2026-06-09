# JUP movil (Expo + React Native)

Base de desarrollo para la app móvil **JUP movil** (Expo + TypeScript) con control por roles (**CONDUCTOR** / **PROPIETARIO**), navegación con Drawer, mocks locales (sin backend) y documentación del contrato esperado del backend.

> Objetivo: que puedas ejecutar el proyecto desde VS Code y construir paso a paso todas las pantallas y flujos definidos.

---

## Requisitos

- Node.js LTS
- npm
- Expo Go (en tu teléfono) o emulador iOS/Android
- VS Code

---

## 1) Instalación

En la raíz del repo:

```bash
npm install
```

---

## 2) Ejecutar la app

```bash
npm run start
```

Atajos:

- Android: `npm run android`
- iOS: `npm run ios`

---

## 3) Dependencias base (navegación + storage)

Si aún no están instaladas:

```bash
npx expo install @react-navigation/native
npx expo install react-native-screens react-native-safe-area-context
npm i @react-navigation/drawer @react-navigation/native-stack
npx expo install react-native-gesture-handler react-native-reanimated
npx expo install @react-native-async-storage/async-storage
```

Si aparece un error relacionado con `gesture-handler`, reinicia Metro bundler (detén y vuelve a ejecutar `npm run start`) y limpia caché si hace falta:

```bash
npx expo start -c
```

---

## 4) Arquitectura recomendada

Estructura sugerida dentro de `src/`:

- `src/api/` — Clientes de API + mocks
- `src/components/` — Componentes UI reutilizables
- `src/config/` — Config (ej. `API_BASE_URL`)
- `src/navigation/` — Drawer/Stack + guards por rol
- `src/screens/` — Pantallas
- `src/store/` — Estado global (sesión/rol)
- `src/types/` — Tipos TS (Servicio, Role, etc.)

---

## 5) Control por rol (reglas de negocio)

### Roles

- `CONDUCTOR`
- `PROPIETARIO`

### Drawer (menú lateral)

**CONDUCTOR**
- Estado de servicios
- Servicios (Home)
- Cerrar sesión

**PROPIETARIO**
- Cierres (dashboard con gráfica + drilldown)
- Servicios prestados (completados + procesado)
- Cerrar sesión

> Además de ocultar items del menú, se deben aplicar **guards** para bloquear acceso directo por navegación/deep-link.

---

## 6) Home

### CONDUCTOR
- Lista de servicios en formato compacto: `Fecha hora` + `Origen` + `Destino`.
- No mostrar cliente/compañía/código en la tarjeta.
- Acciones rápidas visibles: Teléfono / Google Maps / Waze.

### PROPIETARIO
- No debe mostrar CTAs operativos (tel/maps/waze, “llegué”, “entregar”, etc.).
- Debe incluir tarjeta **Resumen del mes**.

---

## 7) Tarjeta "Resumen del mes" (solo PROPIETARIO)

- Rango: **mes actual por `fechaServicio`**
  - desde: 1er día del mes
  - hasta: hoy
- Estados incluidos: `COMPLETADO` + `procesado` (los mismos que la pantalla de Servicios Prestados)
- Muestra:
  - Total servicios (N)
  - Suma `valor`
  - Suma `copago`
- Al hacer tap en la tarjeta: navega a **Servicios Prestados** con el filtro del mes actual aplicado automáticamente y con búsqueda automática.

---

## 8) Servicios Prestados (solo PROPIETARIO)

- Lista de servicios con estados `COMPLETADO` + `procesado`
- Filtro de fecha (desde/hasta)
- Totales arriba de la lista:
  - `Σ valor`
  - `Σ copago`
  - `N movimientos`
- Orden por chips: `No`, `Cliente`, `Compañía`
- Detalle del servicio: mostrar todos los datos (solo lectura)

---

## 9) Cierres (solo PROPIETARIO)

- Pantalla con gráfica (Pie chart): **Terminados** vs **Completados**
- Filtro de rango (default: últimos 30 días)
- Tap en segmento o leyenda: abre lista filtrada (drilldown)

Lista **Terminados**:
- Acción `Cerrar` → modal para capturar `Guiacontrol`
- Al enviar: cambia estado a `COMPLETADO` y se remueve de la lista

---

## 10) Flujo CONDUCTOR (operativo)

Estados clave:
- `ASIGNADA`
- `EN_TRANSITO`
- `TERMINADO`
- `COMPLETADO`

Acciones:
1. **Llegué al origen**
  - Validación por código: el código debe ser igual a `numeroServicio`.
  - Se realiza en modal custom (no nativo) alineado al diseño de la app.
2. **Llegué al destino**
  - Confirmación previa en modal custom (no `Alert` nativo).
3. **Entregar servicio**
  - Captura `Guiacontrol` (solo numérico, 1..10 dígitos).
  - Firma de cliente obligatoria para confirmar entrega.
  - Modal de firma en tamaño normal + opción de pantalla completa.

Regla: **solo un servicio activo**
- Se considera activo si estado está en: `EN_TRANSITO` o `TERMINADO`

---

## 11) Backend (contrato mínimo esperado)

En desarrollo inicial podemos usar mocks locales. Cuando exista backend, estos datos deben existir.

### Campo de fecha para filtros
- `fechaServicio` (ISO 8601). Es la referencia para:
  - filtros desde/hasta
  - resumen del mes

### Modelo `Servicio` (mínimo)

- `numeroServicio`: string/number
- `estado`: `ASIGNADA | EN_TRANSITO | TERMINADO | COMPLETADO | procesado`
- `fechaServicio`: string ISO
- Origen:
  - `origenDireccion`, `origenLat`, `origenLng`
- Destino:
  - `destinoDireccion`, `destinoLat`, `destinoLng`
- `clienteNombre`, `clienteDocumento`, `companiaNombre`, `zona`
- `telefonos`: string[]
- `Guiacontrol`: string | null
- `valor`: number
- `copago`: number

### Endpoints mínimos (referencia)

- `GET /me` → `{ rol: 'CONDUCTOR' | 'PROPIETARIO', ... }`
- `GET /servicios?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&estados=...` → `{ items: Servicio[] }` (+ opcional totales)
- `POST /servicios/{numeroServicio}/cerrar` body `{ Guiacontrol: string }`

---

## 12) Desarrollo paso a paso (orden recomendado)

1. Navegación Drawer + Stack + guards por rol.
2. Store de sesión/rol con persistencia y **switch de rol** (por defecto CONDUCTOR).
3. Mock API (`/me`, `/servicios`) para avanzar sin backend.
4. Home con tarjetas compactas + acciones por rol.
5. Tarjeta "Resumen del mes" (propietario) + navegación a Servicios Prestados con autosearch.
6. Servicios Prestados (filtros + totales + detalle).
7. Cierres (gráfica + drilldown + cierre con Guiacontrol).
8. Flujo CONDUCTOR (origen/destino/entrega) y regla de solo un servicio activo.

---

## 13) Estado implementado actualmente (CONDUCTOR)

Este es el estado funcional real ya implementado en código para conductor y su pantalla de estado de servicios.

### 13.1 Servicios (Home de Conductor)

- Tarjetas de servicio ordenadas por `fechaServicio`.
- Estados visibles en home: `ASIGNADA`, `EN_TRANSITO`, `TERMINADO`.
- Bloque de **Servicio activo** con navegación directa al detalle del servicio activo.
- Acciones rápidas por tarjeta: Teléfono, Google Maps, Waze.
- Bloqueo operativo en servicios `ASIGNADA` cuando existe otro servicio activo.

### 13.2 Detalle del servicio (Conductor)

- Pantalla dedicada (ruta `ServicioDetalle`) con información completa del servicio.
- CTA inferior dinámico por estado:
  - `ASIGNADA`: Llegué al origen.
  - `EN_TRANSITO`: Llegué al destino.
  - `TERMINADO`: Entregar servicio.
  - `COMPLETADO/procesado`: estado deshabilitado.
- Colores del CTA por estado:
  - Naranja (`ASIGNADA`)
  - Azul (`EN_TRANSITO`)
  - Verde (`TERMINADO`)
  - Gris cuando está deshabilitado.

### 13.3 Diálogos/Modales del flujo (sin componentes nativos)

- Reemplazo de `Alert` nativo por modales custom en:
  - Confirmación de llegada a destino.
  - Selector de teléfonos disponibles.
  - Mensajes de feedback (éxito, error, no disponible).
- Estilo visual consistente con el sistema de diseño actual:
  - Superficie clara, bordes suaves, tipografía de alto contraste.
  - Botones de confirmar/cancelar con colores de marca.

### 13.4 Flujo de entrega implementado

- Validaciones activas:
  - `Guiacontrol` numérica de 1 a 10 dígitos.
  - Firma obligatoria para completar entrega.
- Firma:
  - Integración con `react-native-signature-canvas`.
  - Opción de limpiar firma.
  - Opción de captura en pantalla completa.

### 13.5 Pantalla Estado de servicios (Conductor)

- Rediseño visual de la pantalla con enfoque de tablero.
- Gráfica de histórico con:
  - Filtros de tiempo (7/15/30 días según configuración actual).
  - Barras con borde/etiquetas y línea de tendencia.
  - Selección de barra para mostrar fecha exacta del día.

### 13.6 Datos mock y persistencia

- Se agregaron servicios de prueba para cubrir escenarios operativos.
- Hidratación de sesión con merge entre persistencia local y mocks para evitar perder nuevos datos de prueba.

---

## 14) Orden lógico en que se implementó (histórico real)

1. Base de navegación y control por rol (`CONDUCTOR` / `PROPIETARIO`).
2. Construcción y ajuste visual de Home de Conductor (tarjetas + acciones rápidas).
3. Creación de ruta y pantalla dedicada de Detalle del servicio.
4. Implementación de transición operativa por estados (`ASIGNADA -> EN_TRANSITO -> TERMINADO -> COMPLETADO`).
5. Validación de llegada a origen por código.
6. Confirmación de llegada a destino.
7. Implementación de entrega con `Guiacontrol`.
8. Integración de firma del cliente (normal + pantalla completa).
9. Reemplazo de diálogos nativos por modales custom consistentes con diseño.
10. Ajustes de visibilidad de servicios activos y reglas de bloqueo en Home.
11. Ajustes de persistencia (merge mocks + storage) para reflejar cambios de datos de prueba.
12. Rediseño y mejoras de la pantalla Estado de servicios para conductor.

---

## 15) Solución de errores comunes (Git)

### "Can't push refs to remote. Try running Pull first"

```bash
git pull --rebase origin main
git push origin main
```

---

## Licencia

Privado / uso interno.# JUP_movil_rn

Base inicial para una app movil con Expo, React Native y TypeScript.

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Expo Go o un emulador Android/iOS

## Comandos

```bash
npm install
npm start
npm run android
npm run ios
npm run web
```

## Estructura sugerida

```text
src/
	screens/      pantallas
	components/   componentes reutilizables
	theme.ts      colores y espaciado base
```

## Siguiente paso recomendado

Crear la primera funcionalidad dentro de `src/screens` o `src/components` y mantener `App.tsx` como punto de entrada liviano.