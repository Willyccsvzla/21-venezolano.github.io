# Auditoría inicial — fuente de producción de 21 Venezolano

Fecha: 2026-10-28

## Fuente confirmada

- El proyecto de Vercel se llama `21-venezolano-io`.
- El repositorio GitHub que reporta Vercel es `Willyccsvzla/21-venezolano.github.io`.
- `main` está en `f5c6362987e00e986c1569a96c52d867b7275098`, igual al último despliegue de producción `READY` (`dpl_HnGzprx7iH9VvhQtvZ3MXsbG5PoG`).
- No existe un repositorio GitHub llamado `Willyccsvzla/21-venezolano.io`; la API devuelve 404. Este checkout sí corresponde a la fuente que Vercel declara para producción.
- El proyecto consultado solo devuelve el alias `21-venezolano-io.vercel.app`; la asociación del dominio personalizado `21-venezolano.io` no aparece en la lista visible de dominios y queda pendiente de confirmación en la cuenta/DNS.

## Estado y arquitectura

- Aplicación TypeScript/React 19 con Vite 8 y TanStack Start, configurada para Vercel.
- Motor de juego en `src/game/engine/`; partidas en vivo en `src/game/live/` y `src/lib/table.functions.ts`.
- Persistencia SQL: `players`, `ledger`, `open_seats`, `live_tables` y `table_chat` (migraciones 0001–0004). Existe un único ledger de créditos virtuales; el alta acredita 500 créditos.
- Ya existen cinco salas públicas, creación/entrada a mesas privadas por código, perfil con apodo/avatar, invitación mediante enlace y pozo visible en la mesa en vivo.
- No se encontró implementación de ranking, marcos de perfil, inventario/mercado de reversos, billetera premium separada, anuncios recompensados ni compra única para quitar anuncios.
- La rama no tiene protección y el repositorio no reporta workflows de GitHub Actions.

## Alcance y seguridad

- Esta auditoría y el checkout de trabajo no modifican producción.
- No se reconstruirá el motor ni se cambiarán sus reglas.
- La primera versión excluye apuestas con dinero real, retiros bancarios y monedas canjeables.
- No se ejecutó `build`: el script de build termina aplicando migraciones de base de datos.

## Validaciones en el commit de producción

- Tests `.mjs`: 180 aprobados, 17 fallidos. Dieciséis esperan documentación/configuración `.grok` que no viene en el checkout público. Uno contrasta la expectativa del test con las cuatro migraciones SQL existentes en `migrations/`.
- Tests TypeScript: 59 aprobados, 0 fallidos.
- `pnpm typecheck`: 3 errores en `src/lib/auth/gates.tsx` y `src/lib/auth/popup.server.ts`, relacionados con `GROK_PROVIDERS` y `signInWithOAuth2` no resueltos por el checkout público.
- `pnpm lint`: 4 errores y 3 avisos en archivos existentes; incluye los tres `prefer-const` de `src/game/live/step.ts`, un bloque vacío en `src/lib/app-data/client.server.ts` y avisos de hooks/variables.
- `pnpm check:auth`: requiere que esté activo un servidor de desarrollo para leer el valor resuelto de `VITE_AUTH_ENABLED`.

## Plan priorizado

1. Mantener el desarrollo en rama y preview; completar la verificación del dominio personalizado sin promover cambios.
2. Añadir pruebas de caracterización para proteger reglas, turnos, empate, retirada, pozo y contabilidad del ledger.
3. Crear el lobby de seis accesos: Salas, Recargar, Perfil, Mercado, Invitar amigos y Ranking.
4. Añadir perfil editable con marco; ampliar las mesas con categorías profesional/VIP y privadas con código, conservando el pozo vivo.
5. Separar las fichas de juego de la moneda premium con ledgers independientes e idempotentes; añadir reversos Plata/Oro y mejoras; restringir All Black al primer puesto.
6. Completar invitaciones y ranking calculados por el servidor.
7. Integrar anuncios recompensados con verificación de recompensa y compra única para quitar anuncios con verificación de recibo de tienda.
8. Validar todo en preview antes de cualquier promoción; no habilitar dinero real ni conversión de monedas.

## Utilidades

- `node scripts/project-context.mjs`: rama, commit, estado, scripts, migraciones y puntos de entrada.
- `node scripts/feature-audit.mjs`: presencia de funcionalidades solicitadas.
- `node scripts/validate-progression.mjs`: aplica migraciones en PGlite y verifica compra cosmética, recompensa de fichas y protección ante repetición.
- Validaciones existentes: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm check:auth` y `scripts/browser-smoke.mjs`.

## Primera entrega local — 2026-10-28

Rama de trabajo: `codex/product-roadmap`.

- Se añadió la navegación del lobby con seis accesos: Salas, Recargar, Perfil, Mercado, Invitar amigos y Ranking.
- Perfil permite cambiar apodo y avatar guardando mediante la función existente del servidor.
- Invitaciones permite seleccionar una mesa pública o compartir la sala privada recién creada, con enlace/código directo al flujo de entrada existente.
- Recarga, mercado, ranking y objetos de colección aparecen como secciones en preparación; no simulan recompensas, compras ni resultados.
- No se modificó el motor ni sus reglas; no se publicó ni desplegó.

## Entrega progresiva — 2026-10-28

- Las mesas existentes ahora se agrupan sin alterar sus entradas: tres públicas, La Gallera profesional y Club Maracaibo VIP; las privadas tienen su propia categoría.
- Las manos completadas guardan resultados idempotentes y el ranking se calcula en el servidor. All Black solo se puede equipar en el primer puesto y se retira cuando el ranking cambia.
- La migración `0005_progression.sql` crea perfil con marco, reversos Plata/Oro con niveles, inventario, ledger y billetera premium separados, resultados, recibos y tickets de anuncio.
- El mercado ya permite comprar/mejorar Plata y Oro y marcos con saldo premium, y equipar los objetos; All Black no está a la venta.
- Se añadió validación server-side de compras de Google Play y el callback AdMob SSV firmado, idempotente y limitado a 100 fichas de juego por evento.
- Recarga muestra anuncios recompensados y compra única de quitar anuncios. En el navegador quedan desactivados si no existe el puente nativo Android.
- El checkout no contiene un proyecto/SDK Android. La integración nativa requerida, sus identificadores y variables de entorno quedan detallados en `docs/integraciones-android.md`; no se simula una compra, anuncio ni saldo.
- No se cambió el motor ni las reglas. La migración no se ha aplicado a producción; no se publicó ni desplegó.

Validación de esta entrega:

- `pnpm build:dev`: aprobado.
- ESLint de los archivos tocados: aprobado.
- `pnpm typecheck`: solo conserva los tres errores previos en los archivos de autenticación (`GROK_PROVIDERS` y `signInWithOAuth2`); no muestra errores en las funciones nuevas.
- `node scripts/validate-progression.mjs`: aprobado; aplicó las cinco migraciones en PGlite, verificó débito del mercado, crédito de anuncio y rechazo del evento duplicado.
- `pnpm test`: 181/197 pruebas `.mjs` pasan; 16 siguen fallando porque este checkout público no contiene material `.grok`/plantillas. La prueba de migraciones que asumía que la carpeta raíz estaba vacía se corrigió. Las pruebas TypeScript se ejecutaron aparte: 59/59 pasan.
- ESLint de archivos modificados pasa. El lint completo conserva un error existente en `src/lib/app-data/client.server.ts` y dos avisos en archivos no modificados.
- El proyecto Android no existe en este checkout y no hay Android SDK/Gradle disponibles en el entorno. Por eso las acciones de compra/anuncio quedan inactivas hasta implementar el puente Android documentado y configurar Play Console/AdMob.

Validación después de esta entrega:

- `pnpm build:dev`: aprobado.
- ESLint de `src/game/App.tsx` y `src/game/ui/Lobby.tsx`: aprobado.
- ESLint y `pnpm build:dev` repetidos tras conectar Invitaciones con enlaces directos a mesa: aprobados.
- Tests TypeScript: 59 aprobados, 0 fallidos.
- Tests `.mjs`: 180 aprobados, 17 fallidos, los mismos fallos descritos arriba.
- `pnpm typecheck` mantiene los 3 errores existentes en archivos de autenticación/generación de proveedores; no hay errores en los componentes modificados.
