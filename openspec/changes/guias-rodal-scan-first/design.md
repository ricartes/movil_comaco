# Design: Rodal Scan-First Header Entry (guias)

All code lives in `movil_comaco_gde`. `movil_comaco` gets zero commits.

## Technical Approach

Add the one missing capability (point -> rodal), invert one boolean, and build the markup that `EmisionDesdeFaena.js` already references but that never existed. No schema migration, no payload change, no plugin change, no `www/index.html` change (`js/Datos/GeocercaRodal.js:334`, `js/Servicios/GeocercaRodalService.js:348`, `js/Common/Constantes.js:361` are already registered).

## Architecture Decisions

### D1 — Point-in-polygon stays in SQL

**Choice**: SpatiaLite `ST_Contains(GeomFromGeoJSON(g.GEOCERCA), ST_GeomFromText('POINT(lon lat)'))`, one query.
**Verified, not assumed**: that exact expression already runs in production at `www/js/Datos/GeocercaRodal.js:142`, backed by the `cordova-sqlite-spatialite-evplus-ext-common-free` plugin (registered in `package.json` `cordova.plugins`, devDependency `gitlab:ricartes/...-unstable-0xx`).
**Rejected**: a JS ray-casting fallback — it would need a second, independent implementation of a predicate the DB already evaluates, and the two would drift.
**Preserved semantics**: an invalid/NULL geometry makes `ST_Contains` return NULL; the existing `row.PERTENECE == 1` test treats NULL as non-match. Keep that comparison verbatim.
**Injection**: the point is string-interpolated (SpatiaLite constructors do not accept bound params here). Coerce with `Number()` before interpolation, exactly as line 141 does; every other value is bound.

### D2 — LEFT JOIN, never INNER

**Choice**: geometry rows drive the query; the OC-scoped catalog is LEFT JOINed.

```sql
SELECT g.*,
       ST_Contains(GeomFromGeoJSON(g.GEOCERCA),
                   ST_GeomFromText('POINT(<lon> <lat>)')) PERTENECE,
       c.RODAL COD_RODAL, c.NOM_RODAL
FROM GDE_GEOCERCA_RODAL g
LEFT JOIN (SELECT DISTINCT RODAL, NOM_RODAL FROM RODAL
           WHERE EMPRESA = ? AND TIPO_DOCTO = ? AND NRO_OC = ?) c
       ON TRIM(UPPER(c.RODAL)) = TRIM(UPPER(g.RODAL))
WHERE g.ROL_PREDIO = ?
ORDER BY g.ID DESC
```

**Rationale**: an INNER JOIN erases geometry hits that fail to reconcile, making a data-sync defect indistinguishable from "the point is outside every rodal". Those two need different operator messages.
**Scope**: `(EMPRESA, TIPO_DOCTO, NRO_OC)` from `orden_compra_asignada` — the same scope `combo_rodal` uses (`EmisionDesdeFaena.js:320`, `Parametros.js:1082`). `ROL_PREDIO` from `$$("#combo_predio").val()`, the same source the existing forward validation uses (`EmisionDesdeFaena.js:676`).

### D3 — Reconciliation rule: exact code match only

`RODAL.RODAL` **is** the `#combo_rodal` option value (`Parametros.js:1093`). Join on `TRIM(UPPER(...))` equality. No fuzzy, prefix, or partial matching. Deduplicate hits by trimmed/uppercased code (one rodal may carry several geometry rows).

| distinct catalog codes hit | orphan hits | state | action |
|---|---|---|---|
| 1 | any | `RESUELTO` | auto-select combo, reveal |
| 0 | 0 | `SIN_COINCIDENCIA` | stay hidden, offer governed fallback |
| 0 | >=1 | `GEOMETRIA_HUERFANA` | stay hidden, message names a catalog/geometry sync defect, offer fallback |
| >=2 | any | `AMBIGUO` | stay hidden, list candidate codes, operator picks manually |

**Never** write a geometry `RODAL` string into `#combo_rodal` when it is not an option: `datosRodalAsignado` would stay null and `GDE_PLAN_MANEJO` / `GDE_AVISO_CORTA` / `GDE_SECCION` (`EmisionDesdeFaena.js:1535-1537`) would persist wrong.
**`AMBIGUO` resolution reuses the existing forward path**: the operator's manual `#combo_rodal` pick fires the handler at `:236`, which re-validates the retained QR through `validarPuntoQrContraGeocercaRodal` and reveals on `ok`. No new confirmation UI.

### D4 — Scan surface

**Build** in `www/pages/EmisionDesdeFaena.html`, a new `<div class="block" id="block_qr_trazabilidad_faena">` immediately **before** `#block_rodal` (line 96), containing `#btn_escanear_qr_trazabilidad_faena` plus the five elements the JS already addresses and that exist in no markup file: `#row_qr_trazabilidad_faena`, `#row_estado_qr_trazabilidad_faena`, `#estado_qr_trazabilidad_faena`, `#detalle_estado_qr_trazabilidad_faena`, `#detalle_qr_trazabilidad_faena`; plus `#btn_avance_sin_validacion_qr_faena` for the fallback.
**Wire** with `$$("#btn_escanear_qr_trazabilidad_faena").on("click", escanear_qr_trazabilidad_faena)` inside the page-init block beside the other `$$(...).change(...)` bindings. No inline `onclick` — the page is router-injected.
**Remove** from `escanear_qr_trazabilidad_faena` (`:591`) the `rodal_seleccionado_qr_trazabilidad_faena()` guard at `:594-597` — that guard *is* the order being inverted. Replace with a guard on `orden_compra_asignada` being resolved; without it the lookup cannot be scoped. Keep the plugin guard (`:601`) and the `scan()` option object (`:606-615`) verbatim.
**Rewrite** `actualizar_visibilidad_qr_trazabilidad_faena` (`:585-589`): drop the `rodal_seleccionado_...` term. The scan row shows when `#block_rodal` is visible **and `orden_compra_asignada` is resolved**. Left as-is the CTA could never appear; conditioned on `#block_rodal` alone it would appear on an unsynced device, because `#block_rodal` carries no inline style and is visible until `combo_rodal` runs.
**Plugin**: `cordova-plugin-mcc-mlkit-barcode-scanner@4.0.2` via the existing `obtener_lector_qr_trazabilidad_faena()` (`:638`) -> `cordova.plugins.mlkit.barcodeScanner.scan`. Used as-is; no version change.

### D5 — Inverting the default: every entry path

Flip `limpiar_qr_trazabilidad_faena` (`:512`) to `actualizar_bloqueo_visual_qr_trazabilidad_faena(true)`. Add one wrapper `revelar_contenido_posterior_faena(motivo)` so every reveal is a single auditable call site.

| Path | Line | After inversion |
|---|---|---|
| page init | 135 | hidden — intended |
| `#combo_predio` change | 176 | hidden — intended |
| `#combo_rodal` change | 247 | hidden, then revealed by the re-validation at `:695` |
| `combo_rodal` no-catalog branch | 2332-2334 | **MUST reveal** — `#block_rodal` is hidden, no rodal exists to resolve, the gate is inapplicable |
| reload GDE, validated | 566 | **MUST reveal** — today no toggle call exists; it worked only because the default was visible |
| reload GDE, permitido-con-advertencia | 571 | **MUST reveal** — same reason |
| reload GDE, early `return` (borrador saved before this feature) | 540-542 | **MUST reveal** — otherwise every legacy borrador becomes uneditable |
| `recargar_combo_rodal` sets combo from `GDE_RODAL` | 936-946 | **MUST reveal** — a persisted rodal is a resolved rodal |
| QR ok / advertencia accepted | 695, 759 | already reveals, unchanged |
| `rechazar_qr_trazabilidad_faena` | 503 | hidden, unchanged |

The **five** `MUST reveal` rows above are the reload-existing-GDE, no-catalog and `recargar_combo_rodal` regressions; each gets its own contract test. (An earlier revision of this paragraph said "four" while the table already listed five — the table was correct and the implementation followed it. Corrected after verification.)

### D6 — Fallback flag: FAIL CLOSED

`Constantes.parametroQrAvanceSinValidacion: <PAG_ID>` beside `parametroIva: 3`. `permite_avance_sin_validacion_qr_trazabilidad()` (`:1268`) keeps its call shape and reads a page-scope cache loaded at init.

**Absent row (`-1`), read error, or read not yet resolved => fallback DENIED.** The cache initialises to `false` and only an explicit provisioned value of the "permit" token flips it to `true`. There is no unknown state that permits advance: unresolved is denied, which also removes the init race — no window exists in which the button is live before the value is known. This matches `specs/tenant-scoped-parameters/spec.md:39`.

**Rationale — failure asymmetry.** Fail-closed fails **loudly**: emission is blocked, someone calls within minutes, the row gets provisioned. Fail-open fails **silently**: everything appears to work, the traceability control is inert, and it surfaces only when a guía is later found carrying a rodal that did not correspond. A control that can be silently absent is worse than one that can be loudly broken. Recorded here so the choice is not silently re-litigated.

**The "fail-closed bricks a never-synced device" objection was checked in code and it dissolves.** `combo_predios` (`EmisionDesdeFaena.js:2063`) calls `DATOS_seleccionar_predios`; on an empty table it returns `-1`, the function sets `hay_parametro = 0` and leaves `#combo_predio` with **no options**. With no predio there is no `#combo_predio` change, so no cliente, so no `DATOS_seleccionar_orden_compra` (`Parametros.js:1703`, returns `-1` on an empty `ORDEN_COMPRA`), so `combo_rodal` never runs and no rodal catalog exists. A never-synced device cannot emit a guía with or without this gate. Fail-closed blocks a screen that was already non-functional; the objection is empty.

**The real case that does exist — and it is a deployment requirement, not a reason to fail open.** `borra_parametro_general` (`Parametros.js:98`) issues `DELETE FROM PARAMETRO_GENERAL` and the sync then re-inserts **only the rows the server returned** (`WebServices.js:678-699`). A device with fully synced predios, OCs and rodales, syncing against a backend where the row was never created, ends up with working catalogs and no flag row. Fail-closed blocks that device even though everything else about it works. That is exactly why provisioning is a **deployment prerequisite** (below), not a follow-up.

**A second, unverified variant must be checked before rollout.** `ws_cargar_parametros_generales` posts `data: { rut: rut, id_emp: 1 }` — empresa **hardcoded to 1** (`WebServices.js:666`) — while inserting whatever `item.EMP_ID` the response carries. If the backend honours that filter, a device operating under an empresa other than 1 would never receive its row and fail-closed would block it permanently. Server behaviour is not knowable from client source. This is a rollout verification item, not something to design around.

### D7 — Tenant-scoped read: fix, do not migrate

New `DATOS_seleccionar_valorParametroPorEmpresa(empId, pagId, callback)` in `www/js/Datos/Parametros.js`, `WHERE EMP_ID = ? AND PAG_ID = ?` (`PARAMETRO_GENERAL` carries `EMP_ID`, `Tablas.js:21`), modelled on `movil_comaco/www/js/Services/HelperService.js:102`.

**Existing callers stay put — justified, not defaulted.** `DATOS_seleccionar_valorParametro` (`:2754`) has exactly **one** call site: `www/js/Servicios/Parametros.js:4`, reading `parametroVersionApp`. App version is empresa-invariant, so every `EMP_ID` row carries the same `PAG_VALOR` and `item(0)` is correct. More decisively, that read runs **before empresa selection**, so there is no `empId` to thread through it — migrating it is not merely unnecessary, it is undefined at that call site. The sibling PAG_ID-only readers at `:2794` and `:2826` are untouched for the same reason plus scope. Guardrail instead of migration: a contract test asserts the fallback flag is **never** read through the PAG_ID-only helper.

### D8 — Test harness

`package.json` `"scripts.test"` becomes an explicit file list, not a glob:

```
node --test --experimental-test-isolation=none tests/qr_backward_compat.test.js tests/rodal-point-resolution.test.js tests/scan-first-faena.test.js
```

`node --test tests/` fails on Node v22.19.0 (`ERR_UNSUPPORTED_DIR_IMPORT`). `node --test "tests/*.test.js"` works but its quoting is shell-dependent; an explicit list is shell-agnostic on Windows and matches the sibling repo's convention (`openspec/config.yaml` `test_command_raw`). Per `rules.tasks`, this package.json change must be flagged in tasks.

Tests follow the established contract style — production sources loaded into a `node:vm` context with stubbed DOM and `sqlitePlugin`, as in `tests/qr_backward_compat.test.js:1-45`. Not pure unit tests.

## Data Flow

```
[QR scan] --text--> validarTextoQrTrazabilidad ---> payload{lat,lon}
                                                        |
   orden_compra_asignada(EMPRESA,TIPO_DOCTO,NRO_OC)      |
   $$("#combo_predio").val() -> ROL_PREDIO               |
                       \                                 /
                        v                               v
              resolverRodalPorPuntoQr (GeocercaRodalService.js)
                                |
                     DATOS_buscarRodalPorPunto (GeocercaRodal.js)
                       GDE_GEOCERCA_RODAL  LEFT JOIN  RODAL
                                |
              RESUELTO | AMBIGUO | SIN_COINCIDENCIA | GEOMETRIA_HUERFANA
                                |
        RESUELTO -> #combo_rodal.val(cod).trigger("change") -> reveal
        others   -> stay hidden + governed fallback
```

### Sequence: scan -> resolve -> auto-select -> reveal

```
Operator   ScanBtn   EmisionDesdeFaena.js   QrTrazabilidadService   GeocercaRodalService   SQLite(SpatiaLite)
   |          |               |                      |                      |                     |
   |--tap---->|               |                      |                      |                     |
   |          |--escanear---->|                      |                      |                     |
   |          |               |--mlkit.scan--------->|(plugin)              |                     |
   |<-------------- camera; QR text ---------------->|                      |                     |
   |          |               |--validarTextoQr----->|                      |                     |
   |          |               |<--{ok,payload}-------|                      |                     |
   |          |               |--resolverRodalPorPuntoQr(payload,rol,OC)--->|                     |
   |          |               |                      |                      |--SELECT ST_Contains>|
   |          |               |                      |                      |<--rows + PERTENECE--|
   |          |               |<--{estado,rodal,candidatos}-----------------|                     |
   |          |               |                                                                   |
   |          |    RESUELTO: #combo_rodal.val(cod).trigger("change")                              |
   |          |               |-> DATOS_ObtenerDatosRodal -> datosRodalAsignado                   |
   |          |               |-> validarPuntoQrContraGeocercaRodal (existing) -> ok              |
   |          |               |-> revelar_contenido_posterior_faena("qr")                         |
   |<--form revealed ---------|                                                                   |
   |          |    AMBIGUO / SIN_COINCIDENCIA / HUERFANA: stay hidden + message                   |
   |          |               |-> fallback button iff parameter permits                           |
```

GPS tracking and offline-first flows are untouched and deliberately not diagrammed.

## File Changes

| File | Action | Description |
|---|---|---|
| `www/js/Datos/GeocercaRodal.js` | Modify | `DATOS_buscarRodalPorPunto(rolPredio, empresa, tipoDocto, numOrden, lon, lat)` |
| `www/js/Servicios/GeocercaRodalService.js` | Modify | `resolverRodalPorPuntoQr(...)`, four-state resolution + dedup |
| `www/js/Datos/Parametros.js` | Modify | `DATOS_seleccionar_valorParametroPorEmpresa` |
| `www/js/Common/Constantes.js` | Modify | `parametroQrAvanceSinValidacion` PAG_ID |
| `www/js/Vistas/EmisionDesdeFaena.js` | Modify | inverted default, 4 new reveal call sites, scan wiring, auto-select, ambiguity, flag cache, rewritten visibility fn |
| `www/pages/EmisionDesdeFaena.html` | Modify | scan block + 5 status elements + fallback button before `#block_rodal` |
| `package.json` | Modify | working `test` script |
| `tests/rodal-point-resolution.test.js` | Create | DAO/service contract |
| `tests/scan-first-faena.test.js` | Create | visibility + wiring contract |

`www/index.html`: **no change** — every touched JS file is already registered.

## Interfaces

```js
// Datos/GeocercaRodal.js
DATOS_buscarRodalPorPunto(rolPredio, empresa, tipoDocto, numOrden, longitud, latitud)
// -> Promise<{ hits: [{...fila, COD_RODAL, NOM_RODAL}], cantidadHits,
//              codigosCatalogo: [string], cantidadHuerfanas }>

// Servicios/GeocercaRodalService.js
resolverRodalPorPuntoQr(payloadQr, rolPredio, ordenCompra)
// -> Promise<{ estado: "RESUELTO"|"AMBIGUO"|"SIN_COINCIDENCIA"|"GEOMETRIA_HUERFANA",
//              rodal: string|null, nombreRodal: string|null,
//              candidatos: [string], mensaje: string }>

// Datos/Parametros.js
DATOS_seleccionar_valorParametroPorEmpresa(empId, pagId, callback) // callback(-1) when absent
```

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Contract (DAO) | SQL binds EMPRESA/TIPO_DOCTO/NRO_OC/ROL_PREDIO; uses `ST_Contains`; uses LEFT JOIN so orphans survive; coordinates pass through `Number()` | `vm` context + fake `sqlitePlugin` capturing SQL and params |
| Contract (service) | 4-state truth table; dedup of multi-geometry rodales; NULL `PERTENECE` = non-match | stubbed DAO rows |
| Contract (view) | default is hidden; each of the 5 `MUST reveal` paths reveals; scan fn no longer contains the rodal precondition; every new element ID in JS exists in the HTML; fallback flag read only via the empresa-scoped accessor | source-text + stubbed-DOM assertions, existing style |
| Contract (fail-closed) | absent row (`-1`) denies; read error denies; unresolved-at-init denies; only the explicit provisioned permit token allows; the fallback button is never live before the value is known | stubbed accessor returning `-1`, a rejection, and no callback at all |
| Unit / E2E | none | Repo has no unit or E2E layer (`config.yaml`: `unit_tests: false`, `e2e_tests: false`) |

RED first: the `package.json` fix is task 1; nothing else can be tested before it.

## Cordova / Android / Gradle

cordova-android `^13.0.0`, target Android 13+. Framework7 6.3.14. No plugin added, removed, or version-changed. No `plugins-local/`, no `config.xml` Gradle preference, no `firebase/` — the `config.yaml` `rules.proposal` high-risk trigger does **not** fire. Plugins consumed as-is: `cordova-plugin-mcc-mlkit-barcode-scanner@4.0.2`, `cordova-sqlite-spatialite-evplus-ext-common-free`. No bundler: new globals live in already-registered files. Node v22.19.0 for tests only.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Non-matrix note: the point coordinates are interpolated into SQL; `Number()` coercion before interpolation is the mitigation and is asserted by a contract test.

## Migration / Rollout

No schema migration. PR1 -> PR2 on `desarrollo`.

**DEPLOYMENT PREREQUISITE — not a follow-up task.** The `PARAMETRO_GENERAL` row must exist for every empresa in use **before the app reaches field devices**. Under fail-closed the row is on the critical path: a device that syncs against a backend without it has working catalogs and a blocked emission screen (`Parametros.js:98` wipes the table and the sync re-inserts only what the server returned). Rollout order is: provision the row server-side -> verify it arrives on a device of each empresa in use -> ship the APK. Before shipping, also verify the hardcoded `id_emp: 1` in `WebServices.js:666` does not prevent non-empresa-1 devices from receiving their row.

Rollback per the proposal: flip the row to permit, then revert PR2 then PR1. The row remains the fastest runtime lever — it just cannot be relied on as an implicit default any more.

## Dependencies

- **The `PARAMETRO_GENERAL` fallback row is a DEPLOYMENT PREREQUISITE, not a follow-up task: the row must exist before the app reaches field devices.** Under fail-closed, an unprovisioned backend produces a device with synced catalogs and a blocked emission screen.
- `PAG_ID` assigned before PR2 merges.
- Confirmed that non-empresa-1 devices actually receive their row despite the hardcoded `id_emp: 1` at `WebServices.js:666`.
- `GDE_GEOCERCA_RODAL` geometry populated for the OC's rodales; otherwise every scan reaches a non-resolution and, under fail-closed, a blocked form.
- Confirmed `movil_comaco_gde` remote.

**Operational hazard (not a task)**: `movil_comaco_gde` has two diverged remotes — `github/desarrollo` contains the QR files, `origin/desarrollo` does not. Every file in this change exists on only one. Confirm the remote before branching.

## Delivery: two chained PRs (boundary confirmed, estimates revised)

| PR | Content | Estimate | Range |
|---|---|---|---|
| PR1 | harness fix, `DATOS_buscarRodalPorPunto`, `resolverRodalPorPuntoQr`, empresa-scoped parameter, `Constantes`, `tests/rodal-point-resolution.test.js` | **~330** | 290-370 |
| PR2 | HTML scan block, wiring, inverted default + 4 reveal sites, auto-select, ambiguity, fallback gating, `tests/scan-first-faena.test.js` | **~310** | 270-360 |

Higher than the proposal's 250/270 in both slices. The delta is test preamble: this repo's contract tests carry a heavy `vm`/stub bootstrap (the context builder in `qr_backward_compat.test.js` alone is ~60 lines), and PR1 is where it gets built. Both slices still clear the 400-line budget. Contingency if PR1's DAO test overruns: split harness + empresa-scoped parameter out as PR0 (~100), leaving PR1 at ~230.

Each slice is autonomous: PR1 adds functions with no UI call sites (revert = delete); PR2 is UI-only on top.

## Open Questions

- [ ] `PAG_ID` for `parametroQrAvanceSinValidacion` must be assigned before PR2 merges.
- [ ] Does the backend honour the hardcoded `id_emp: 1` (`WebServices.js:666`)? If it does, non-empresa-1 devices never receive the flag row and fail-closed blocks them permanently. Verify before rollout; this is the one path where the deployment prerequisite can be met server-side and still not reach the device.
- [ ] Under fail-closed, `GDE_GEOCERCA_RODAL` coverage stops being a degradation and becomes a hard blocker: a rodal with no geometry cannot resolve and, with the flag denied, the form never opens. Coverage must be confirmed per OC before rollout.
- [ ] The payload carries `rolOrigen`; the design deliberately does **not** cross-check it against `#combo_predio` because the two field formats are unverified. An unverified equality check would produce false rejections in the field. Confirm the formats before adding it.
