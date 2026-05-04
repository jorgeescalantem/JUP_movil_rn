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
   - Validación por código: el código debe ser igual a `numeroServicio`
2. **Llegué al destino**
3. **Entregar servicio**
   - Captura `Guiacontrol` (solo numérico, 1..10 dígitos)

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

## 13) Solución de errores comunes (Git)

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