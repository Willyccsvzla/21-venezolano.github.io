# Estado del proyecto para auditoría

Fecha de comprobación: 2026-10-29  
Rama de trabajo: `codex/product-roadmap`  
Repositorio: `21-venezolano.github.io` (`Willyccsvzla/21-venezolano.github.io`)

## Alcance de este estado

Se inspeccionó y amplió la aplicación existente. Se conservó el motor/reglas del juego y la primera versión no incluye apuestas con dinero real, retiros bancarios ni monedas canjeables. No se publicó, desplegó ni aplicó ninguna migración a producción.

## Funciones web implementadas

- Lobby de seis accesos: salas, recargar, perfil, mercado, invitar amigos y ranking.
- Salas públicas, profesionales, VIP y privadas con código.
- Pozo visible en la mesa y registrado en el resultado de la mano.
- Perfil con apodo, avatar y marco.
- Fichas de juego separadas del saldo premium.
- Mercado de reversos Plata y Oro con niveles de mejora; All Black reservado al primer puesto del ranking.
- Invitación mediante enlace/código y ranking persistente.
- Los reversos elegidos se muestran solo para las cartas ocultas del jugador correspondiente. Se incorporaron los recursos Plata, Oro y All Black provistos por el usuario; el reverso no expone valor ni palo.
- Las cartas pequeñas de los oponentes se ampliaron. El efecto cosmético “WIN” se puede comprar con moneda premium, equipar desde el mercado y aparece al lado del jugador que gana cada mano; utiliza el inventario existente y no requiere una migración nueva.
- Se aumentaron también las áreas táctiles de los controles, incluidos los botones de acción de la mesa.
- En desarrollo local, `Dev User` ve herramientas de prueba para agregar moneda premium desde el mercado; el endpoint servidor rechaza esos créditos con autenticación real, `DATABASE_URL` o entorno de producción.
- Servidor preparado para validar recibos de Google Play y recompensas de AdMob con idempotencia.

## Estado móvil y comercial

La integración de Play Billing y anuncios recompensados está **parcial**: existen las validaciones/backend y el contrato se explica en [integraciones-android.md](integraciones-android.md), pero este repositorio no contiene proyecto Android, SDK ni puente nativo. Para completar ese tramo se requieren el contenedor Android, los IDs reales de productos/unidad de anuncios, `PLAY_PACKAGE_NAME`, credenciales de cuenta de servicio de Play y configuración/credenciales de AdMob. No se deben activar productos o callbacks de producción hasta instalar y probar ese puente.

La migración `0005_progression.sql` forma parte del código y fue probada localmente con las migraciones anteriores. No se aplicó a la base de producción.

## Verificaciones ejecutadas

- `pnpm typecheck`: aprobado.
- `pnpm lint`: aprobado.
- `pnpm build:dev`: aprobado; genera la salida Vercel/Nitro. El bundler muestra avisos de directivas `use client` provenientes de dependencias.
- En la actualización visual/cosmética más reciente, `pnpm typecheck`, `pnpm lint`, `pnpm build:dev` y `git diff --check` también pasaron.
- `node scripts/validate-progression.mjs`: aprobado; aplicó localmente migraciones `0001`–`0005`, verificó saldos separados e idempotencia (repetición rechazada).
- `node scripts/feature-audit.mjs`: 12 funciones web reportadas como presentes y las 3 piezas de integración Android/monetización como parciales.
- Suite `node --test --test-reporter=spec 'scripts/**/*.test.mjs'`: 185 aprobadas de 197; 12 fallidas. Tres dependen de `.grok/skills/og/SKILL.md` y `AGENTS.md`, que no están en este checkout. Ocho asumen valores predeterminados de la plantilla “Wild Race”, pero en este proyecto la identidad configurada es “21 Venezolano”. Una requiere `.grok/skills/og/references`, ausente. Estos fallos pertenecen a pruebas auxiliares de la plantilla; no se reportan como aprobados y deben corregirse/aislarse si se exige suite completamente verde.
- Se inició el preview local en `http://127.0.0.1:8080/` y una petición HTTP local elevada devolvió 200. La automatización del navegador disponible no logró abrir esa dirección, así que la verificación visual del flujo queda pendiente de la auditoría manual en el navegador del usuario.

## Para la auditoría

Revisar los cambios locales de la rama `codex/product-roadmap`, probar visualmente lobby/mesa/mercado y validar con varias cuentas la privacidad de reversos All Black, Plata y Oro. Revisar también las 12 pruebas auxiliares fallidas indicadas arriba. El despliegue público y las credenciales/SDK Android permanecen fuera de este estado de verificación.
