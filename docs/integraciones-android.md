# Integraciones Android para Play Store

La base web ya expone las comprobaciones del servidor. Este repositorio no contiene todavía un proyecto Android ni los SDK nativos; el host Android debe implementar los dos puentes descritos abajo. Las fichas y monedas son saldos internos, sin retiro bancario ni conversión a dinero.

## Google Play Billing

Configurar en Play Console estos productos administrados:

- `remove_ads`: compra no consumible; activa `adsRemoved` después de verificarse.
- `premium_100`: paquete consumible de 100 monedas premium.
- `premium_500`: paquete consumible de 500 monedas premium.
- `premium_1200`: paquete consumible de 1200 monedas premium.

La aplicación Android debe implementar `window.PlayBillingBridge.purchase(productId, obfuscatedAccountId)` y devolver `{ productId, purchaseToken }`. Debe usar `obfuscatedAccountId` en `BillingFlowParams` y enviar el token a `verifyPlayPurchase`; el servidor lo valida con Google Play, guarda el hash del token para evitar duplicados, acredita el saldo premium una sola vez y consume los paquetes de moneda. `remove_ads` queda reconocido como compra no consumible.

Configurar en el entorno servidor de Vercel:

- `PLAY_PACKAGE_NAME`: identificador Android registrado en Play Console.
- `PLAY_SERVICE_ACCOUNT_EMAIL`: cuenta de servicio con acceso a Play Developer API.
- `PLAY_SERVICE_ACCOUNT_PRIVATE_KEY`: clave privada de esa cuenta, con saltos de línea reales o escapados como `\\n`.

El wrapper debe asociar la compra a la cuenta autenticada mediante el identificador opaco SHA-256 del `userId` en `obfuscatedAccountId`.

## Anuncios recompensados

Configurar el bloque recompensado de AdMob para entregar exactamente `100` unidades con el tipo `game_chips`, activar server-side verification y apuntar el callback a `/api/admob-ssv`. El callback valida la firma ECDSA de AdMob, la unidad configurada, el ticket emitido por el servidor, el valor fijo y el identificador de transacción antes de acreditar fichas. Las repeticiones del mismo callback no vuelven a acreditar.

Variables de entorno:

- `ADMOB_REWARDED_UNIT_ID`: ID del bloque recompensado.
- `ADMOB_SSV_ENABLED=1`: activa la emisión de tickets firmados para anuncios.

El host Android debe implementar `window.AdMobRewardedBridge.show(request)`, configurar en el SDK `user_id=request.userId` y `custom_data=request.customData`, y devolver `true` únicamente después del evento de recompensa del SDK. El servidor espera el callback de AdMob para acreditar; nunca confía en una llamada de recompensa del cliente.

## Migración

La migración `0005_progression.sql` crea los ledgers e inventario separados, resultados de manos y registros idempotentes para recompensas/recibos. Se aplica en el siguiente despliegue que ejecute el migrador. No se ha aplicado a producción desde este trabajo.
