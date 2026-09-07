# Design: Persist the QR Trace on Save (guias)

Code target: `movil_comaco_gde`, branch `feature/rodal-scan-first-ui` (tip `665d6efb`). Artifact store: hybrid — also Engram `sdd/guias-qr-trace-on-save/design`. Inherits the D5 MUST-REVEAL table and the fail-closed D6 of `sdd/guias-rodal-scan-first/design` (rev 2); neither is modified here.

## Technical Approach

One **pure** mapper in the service layer, one call site in `guardar_datos_guia`, explicit precedence, explicit vocabulary. The mapper writes only `QR_TRAZABILIDAD_*`; it never touches a guía field. The view keeps all global reads in three thin impure helpers so the mapper stays testable without a DOM.

## Architecture Decisions

### D1 — Question A: catalog owns the guía fields — CONFIRMED

| Option | Tradeoff | Decision |
|---|---|---|
| Catalog block `:1680-1686` owns `GDE_RODAL/_NOMBRE_RODAL/GDE_PLAN_MANEJO/GDE_AVISO_CORTA/GDE_SECCION`; trace columns carry the validated values | Two representations of the same fact, reconciled by nothing | **Chosen** |
| Validated geocerca overwrites the guía fields (what the dead mapper does at `:1991-2000`) | Second writer for the same field; on re-save of a hydrated borrador the guía drifts from the catalog | Rejected |

Rationale: auto-select (`:781`) fires the `#combo_rodal` change handler, so `datosRodalAsignado` and the geocerca describe the **same** rodal — the catalog write is already QR-derived, indirectly. `prepararQrPendiente...:2043-2047` freezes exactly these three fields while an association is active, which is the codebase stating that the catalog is the normal owner and the snapshot the exception.

**Recorded divergence, not fixed here**: `QrAsociacionGde.js:149` does write `GDE_SECCION/GDE_AVISO_CORTA/GDE_PLAN_MANEJO` from the geocerca. So after association the geocerca wins; at save the catalog wins. Values should agree; disagreement is a data-sync defect of the same class as D3's `GEOMETRIA_HUERFANA`. Association behaviour is out of scope.

### D2 — Question B: partial trace, never silence, never block — CONFIRMED, with one added constraint

Save is never blocked (there is no QR gate on save today; the gate is the hidden container). A reveal without an accepted trace persists `_VALIDADO = 0` plus a `_RESULTADO` reason.

**Added constraint the proposal did not see**: a partial trace MUST leave the seven geographic-evaluation columns (`_FECHA_VALIDACION`, `_ROL_PREDIO_VALIDADO`, `_RODAL_VALIDADO`, `_SECCION_VALIDADA`, `_AEF_VALIDADO`, `_PM_VALIDADO`, `_FLAG_CONTROL`) NULL when no geocerca evaluation happened. `cargar_qr_trazabilidad_desde_gde:562-573` infers `permitidoConAdvertencia` from the presence of those columns plus `FLAG_CONTROL === 1`; a fabricated set would make a reload reveal the form as if a validation had occurred.

### D3 — Question C: legacy borrador untouched — CONFIRMED, enforced structurally

The mapper never assigns `GDE_RODAL`, `GDE_SECCION`, `GDE_AVISO_CORTA`, `GDE_PLAN_MANEJO`. C is not a runtime branch, it is an absence — asserted by a contract test comparing those four keys before/after.

### D4 — Question 2: the shared-mapper extraction is OVERTURNED

The proposal's premise is false. **There is no JS mapper on the association side.** `QrAsociacionGde.js:139-177` is a raw `UPDATE GDE SET …` with 24 bind params sourced from an `asociacion` record built at `QrAsociacionGdeService.js:141-161`, inside the same transaction as the association `INSERT` (`:106`). Extracting one `gde`-object mapper would require rewriting that DAO into an object-driven write — association persistence behaviour, explicitly out of scope. The two are also not the same mapping: the association write is the signed snapshot and additionally writes three guía fields; the save write is not and must not.

**Decision**: delete the dead view-local copy `asignar_qr_trazabilidad_a_gde` (`:1952`) and write **one new pure mapper for the save path only**, placed in `www/js/Services/QrAsociacionGdeService.js` immediately below `esResultadoQrAceptado` (`:60`).

Location rationale: the mapper must share the `QR_RESULTADO_*` vocabulary declared at `:7-8`. A new file would either re-declare those constants — recreating exactly the divergence this change eliminates — or depend on script load order. Additive only: no existing function or SQL in that file is modified, and **no `www/index.html` change** (it is already loaded at `index.html:350`).

### D5 — Question 4: `_RESULTADO` vocabulary

No code reads `GDE.QR_TRAZABILIDAD_RESULTADO` for a decision today (`esResultadoQrAceptado` is only ever called with a `validacion` object or with `asociacion` fields). The whitelist in `esResultadoQrAceptado:73-74` is nevertheless the compatibility contract: the two accepted strings keep their exact meaning, new reasons are distinct so they can never be mistaken for acceptance.

| Save-path case | `_VALIDADO` | `_RESULTADO` | Geographic columns |
|---|---|---|---|
| Validated in geocerca (`:818`, `validado 1`) | 1 | `VALIDADO_GEOCERCA` (existing) | full |
| Warning accepted, `FLAG_CONTROL === 1` (`:877`) | 0 | `PERMITIDO_CON_ADVERTENCIA` (existing) | full |
| Warning accepted, `FLAG_CONTROL !== 1` | 0 | `ADVERTENCIA_SIN_CONTROL` (new) | full |
| Governed fallback (`:537`) | 0 | `SIN_VALIDACION_AUTORIZADA` (new) | NULL |
| Order without rodal catalog (`:2485`) | 0 | `SIN_CATALOGO_RODAL` (new) | NULL |
| Legacy borrador, no QR (`:579`) | 0 | **NULL — no trace written at all** | NULL |

Legacy borrador: no QR was ever presented; `qrTrazabilidadTextoLeido` is `""`. A reason string would record an event that did not happen. Leave `prepararQrPendiente...`'s nulls as-is — they are already the correct representation.

Fallback deserves identity columns when a payload exists: `rechazar_qr_trazabilidad_faena` (`:516-522`) does **not** clear `qrTrazabilidadPayloadValidado`, so a QR that was decrypted and then failed resolution is still in memory. Recording `_ID/_ID_UNICO_MOVIL/_TEXTO/_ROL_ORIGEN/_LATITUD_CARGA/_LONGITUD_CARGA` is the difference between "operator overrode with a non-matching QR" and "operator overrode with no QR at all". Both are auditable outcomes; only one is currently distinguishable.

### D6 — Question 6: edit-a-borrador ordering — the stated race does not exist; a different defect does

**Verified negative**: `cargar_qr_trazabilidad_desde_gde(gde_actual)` runs at `:153` synchronously inside the `DATOS_seleccionar_gde` callback, before `combo_predios(empresa_activa, 1)` at `:156`. `recargar_combo_rodal`'s reveal at `:1068` is reached only through `combo_predios → recargar_combo_predio → combo_clientes → … → combo_rodal:2454 → :2476`, every hop a DB callback. The globals therefore hydrate strictly before that reveal. Also verified: `recargar_combo_predio:1194` sets `.val()` without `.trigger("change")`, so the wiping handler at `:185` does not fire on reload. Save cannot become tappable before hydration on that path.

**Real defect found instead**: `combo_rodal`'s no-catalog branch calls `limpiar_qr_trazabilidad_faena()` at `:2481`, which **erases the globals hydrated at `:153`**, then `:2488 → :1068` reveals. Editing a borrador whose OC has no rodal catalog loses its in-memory trace, and `:2051-2070` then wipes the persisted one on save.

**Fix — data layer, not ordering.** Do not reorder or gate the reveals; that is D5 machinery and the failure mode is a permanently uneditable form. Instead the save-path source resolver carries the persisted trace forward from `gde_actual` when memory is empty, guarded by identity: carry forward only if `GDE_ROL_PREDIO` **and** `GDE_RODAL` are unchanged (same comparison shape as `:2009-2010`). If either changed, the old trace no longer describes this guía — do not carry forward. This single rule also closes the proposal's high-likelihood "re-save wipes the trace" risk; no second mechanism needed.

Secondary, one line: reset `motivoUltimaRevelacionQrTrazabilidadFaena = null` inside `limpiar_qr_trazabilidad_faena` (`:540`), so a stale motive can never label a later save. Safe at every call site: `:185` (clear, no reveal → correct), `:555` and `:2481` (clear then set).

### D7 — Question 7: the three dead functions

| Function | Verdict | Justification |
|---|---|---|
| `asignar_qr_trazabilidad_a_gde` `:1952` | **Delete** | Wrong on four counts: nulls `GDE_SECCION` (violates D3), overwrites guía fields (violates D1), omits `_RESULTADO`, and its guard `:1972` returns *after* nulling (violates D2 — silence). Superseded by the new mapper. |
| `validarQrTrazabilidadAntesDeGuardar` `:1468` | **Delete** | Encodes a save-time QR gate. The confirmed policy is that Save persists whatever state exists and never gates. A dead function contradicting shipped policy is a trap. |
| `validarQrTrazabilidadAntesDeAvanzar` `:1436` | **Delete** | The pre-scan-first "block advance" model, replaced by reveal-gating in D5. |

Cascade: deleting the two validators leaves `validacion_qr_trazabilidad_rodal_obligatoria` (`:1385`) and `rodal_seleccionado_qr_trazabilidad_faena` (`:623`) with zero callers. Delete both. Verified safe against the existing guardrail at `tests/scan-first-faena.test.js:261-273`: its slice runs from `escanear_qr_trazabilidad_faena` (`:638`) to `obtener_lector_qr_trazabilidad_faena`, which excludes the `:623` definition. If the line budget must be cut, these two predicates (~13 lines) are the first thing to drop. `resultado_qr_trazabilidad_permite_avanzar` (`:1419`) is **kept** — the new classifier uses it.

## Data Flow

### Question 3 — exact call-site ordering in `guardar_datos_guia`

```
:1680-1686  catalog block          UNCHANGED  -> GDE_RODAL/_NOMBRE_RODAL/PLAN_MANEJO/AVISO_CORTA/SECCION
:1769       prepararQrPendiente..  UNCHANGED  -> false: early return
                                              -> association ACTIVA|PENDIENTE_LIBERACION: 20 QR cols
                                                 + 3 guia fields restored from gde_actual
                                              -> otherwise: 15 trace cols NULLed, ESTADO=PENDIENTE_QR
:1770 NEW   aplicar_trazabilidad_qr_en_guardado(gde)
:1773-1774  navegar/idUnico flags  UNCHANGED
:1779+      insert / update branch UNCHANGED  -> both read the same `gde`
```

Placement rationale: **after** `:1769` because that call is what destroys; **before** the `:1781` create/update branch so one call site covers both, which is the reason this is a single write point at all.

### Question 5 — why the save-time write matters despite `:1773`

`navegarValidacionQrDespuesGuardar = true` only *schedules* navigation to the association screen. The save-time trace survives:

- the operator abandoning that screen;
- rejection — `DATOS_registrarRechazoQrGde` (`QrAsociacionGde.js:200-207`) sets `_VALIDADO = 0` and `_RESULTADO = 'RECHAZADO'` but **does not null the other 14 columns**, so the trace remains as the audit record of which QR was presented;
- liberation / borrador discard.

More decisively: an association **cannot** be created for the warning-accepted-with-`FLAG_CONTROL !== 1`, fallback, no-catalog or legacy paths, because `generarORecuperarAsociacionQrGde:106` refuses anything `esResultadoQrAceptado` rejects. For those the save-time write is the only record that will ever exist.

**Where it is redundant — stated plainly**: on the fully-validated path where the operator completes the association, `QrAsociacionGde.js:139-177` overwrites all 15 columns with equivalent values seconds later. Our write is transient there. That is the price of covering the other paths, and it still makes the guía self-describing in the window between save and association.

### Sequence: scan → resolve → reveal → Save → persist → (association)

```
operator          view (EmisionDesdeFaena.js)        services / DAO             SQLite
   |  tap scan ->  escanear_qr_trazabilidad_faena :638
   |               mlkit.barcodeScanner.scan
   |  QR text  ->  procesar_qr_trazabilidad_faena :701
   |               validarTextoQrTrazabilidad  ------> QrTrazabilidadService
   |               qrTrazabilidadTextoLeido :720, PayloadValidado :721
   |               resolverRodalPorPuntoQr :735 ------> GeocercaRodalService --> ST_Contains
   |               RESUELTO -> #combo_rodal.val().trigger("change") :781
   |                        -> DATOS_ObtenerDatosRodal -> datosRodalAsignado
   |               validarPuntoQrContraGeocercaRodal :813
   |                 ok  -> Estado=VALIDADO :818, Resultado :819, REVEAL "qr" :821
   |                 adv -> operator CONTINUAR -> Resultado :877, REVEAL "qr_advertencia_aceptada" :885
   |  tap Save ->  guardar_datos_guia :1625   (buttons live inside the hidden container)
   |               catalog block :1680-1686
   |               prepararQrPendiente... :1769   (nulls 15 cols, or restores snapshot)
   |               aplicar_trazabilidad_qr_en_guardado  --> asignar_trazabilidad_qr_a_gde (pure)
   |               DATOS_guarda_gde / DATOS_actualiza_gde -------------------> INSERT/UPDATE GDE
   |               navegarValidacionQrDespuesGuardar = true :1773
   v               (optional) association screen -> QrAsociacionGde.js:139 overwrites the 15 cols
```

## File Changes

| File | Action | Description |
|---|---|---|
| `www/js/Services/QrAsociacionGdeService.js` | Modify (additive) | 3 new `_RESULTADO` constants + pure `asignar_trazabilidad_qr_a_gde`, below `esResultadoQrAceptado:60`. No existing function or SQL changed. |
| `www/js/Vistas/EmisionDesdeFaena.js` | Modify | New: `aplicar_trazabilidad_qr_en_guardado`, `obtener_fuente_trazabilidad_qr_faena`, `traza_persistida_reutilizable_faena`; call at `:1770`; motive reset in `limpiar_qr_trazabilidad_faena`. Delete `:1952`, `:1468`, `:1436`, `:1385`, `:623`. |
| `tests/qr-trace-on-save.test.js` | Create | Contract tests. |
| `package.json` | Modify | Add the new file to `scripts.test` — **flagged per `rules.tasks`**. |
| `www/index.html` | **No change** | No new file is added. |
| `www/js/Datos/GDE.js`, migrations | **No change** | INSERT (`:46-51`) and UPDATE (`:242`) already bind all 15 columns. |

## Interfaces / Contracts

```js
// www/js/Services/QrAsociacionGdeService.js — pure: plain object in, same object out.
// Writes only QR_TRAZABILIDAD_*. Never assigns GDE_RODAL/GDE_SECCION/GDE_AVISO_CORTA/GDE_PLAN_MANEJO.
function asignar_trazabilidad_qr_a_gde(gde, fuente) // -> gde
// fuente: { payload, validacion, estado, permiteAvanzar, textoLeido, motivoRevelacion, trazaPersistida }

// www/js/Vistas/EmisionDesdeFaena.js — impure boundary, reads the page globals.
function obtener_fuente_trazabilidad_qr_faena(gde)   // -> fuente
function traza_persistida_reutilizable_faena(gde)    // -> gde_actual | null  (predio+rodal identity guard)
function aplicar_trazabilidad_qr_en_guardado(gde)    // association ACTIVA|PENDIENTE_LIBERACION -> no-op
```

Precedence inside the mapper, first match wins:

1. `permiteAvanzar === true` → full write; `_RESULTADO` = `VALIDADO_GEOCERCA` | `PERMITIDO_CON_ADVERTENCIA` by `validacion.validado`.
2. geographic evaluation present but not accepted (`estado === "PERMITIDO_CON_ADVERTENCIA"`, `FLAG_CONTROL !== 1`) → full geographic write, `_VALIDADO = 0`, `_RESULTADO = ADVERTENCIA_SIN_CONTROL`.
3. no in-memory trace and `trazaPersistida` carries one → **carry forward all 15 columns verbatim**. Preserve, never re-derive.
4. otherwise → partial by `motivoRevelacion` per the D5 table; unknown or `borrador_legado_sin_qr` → write nothing.

## Testing Strategy

Strict TDD, RED first. Style: production sources into a `node:vm` context, `node:test` + `node:assert/strict`.

**Budget-critical consequence of the pure mapper**: mapper tests need **no DOM**. They use the light inert stub of `tests/qr_backward_compat.test.js` (~40 lines), not the 135-line stateful mock of `tests/scan-first-faena.test.js`. Extracting that mock into a shared helper would move ~135 lines and cost ~270 changed lines against a 400 budget for zero behavioural gain — **do not extract it, and do not build a fourth bootstrap**. Ordering/wiring facts are asserted as source-text slices, the style already shipped at `scan-first-faena.test.js:261-273`.

| Layer | What to test | Approach |
|---|---|---|
| Contract (pure) | Six `_RESULTADO` rows of the D5 table, exact values | `asignar_trazabilidad_qr_a_gde` with literal `fuente` objects |
| Contract (pure) | D3: `GDE_RODAL/_SECCION/_AVISO_CORTA/_PLAN_MANEJO` byte-identical before/after, every branch | snapshot-compare the four keys |
| Contract (pure) | D2: partial trace leaves the 7 geographic columns NULL | assert per column |
| Contract (pure) | Carry-forward: preserved when predio+rodal unchanged; dropped when either changed | `trazaPersistida` fixtures |
| Contract (pure) | Compatibility: `esResultadoQrAceptado` returns false for all 3 new reasons and for `'RECHAZADO'` | direct call |
| Contract (view) | Association ACTIVA / PENDIENTE_LIBERACION → mapper never runs, snapshot intact | `aplicar_trazabilidad_qr_en_guardado` with a stub gde |
| Guardrail (source) | The call sits after `prepararQrPendiente...` and before the `:1781` branch | index comparison in the `guardar_datos_guia` slice |
| Guardrail (source) | The 5 deleted functions have zero occurrences in `www/js/` | full-source scan |
| Guardrail (source) | `limpiar_qr_trazabilidad_faena` resets the motive | function-body slice |

No unit or E2E layer exists in this repo; integration-style contract tests are the whole ladder.

## Threat Matrix

N/A — no routing, shell command, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Non-matrix note: the mapper assigns object properties only; every write reaches SQLite through the existing bound parameters in `GDE.js`. No SQL string is built here.

## Cordova / Android / Gradle Constraints

`cordova-android ^13.0.0`, target Android 13+, Framework7 6.3.14. No plugin added, removed or version-changed; no `plugins-local/`, no `config.xml` Gradle preference, no `firebase/` — the `config.yaml` `rules.proposal` high-risk trigger does **not** fire. No bundler. Node v22.19.0 for tests only.

**High-risk area flagged anyway**: this change writes persisted columns shared with the association state machine (`QR_ASOCIACION_ESTADO`, the 15 `QR_TRAZABILIDAD_*`). The mitigation is structural — the mapper returns immediately when the association is ACTIVA or PENDIENTE_LIBERACION, reading the state from `gde` after `:1769` has already normalised it.

## Migration / Rollout

No schema migration; all columns exist (`Versiones.js:134` and siblings) and both DAO statements already bind them. No payload, transport or `PARAMETRO_GENERAL` change. Base branch is `feature/rodal-scan-first-ui`; integration branch `desarrollo`, remote `github`.

**Rollback plan** (ships to production Android devices):

1. **Code** — revert the PR(s) on the base branch and rebuild. No migration, no payload change, no plugin change.
2. **Data** — the columns are additive. An older APK ignores them; the association screen still overwrites all 15. Verified: no code branches on `GDE.QR_TRAZABILIDAD_RESULTADO`, so the three new reason strings cannot alter behaviour on any build.
3. **Devices already updated** — a guía carrying a save-time trace stays readable by pre-change code; nothing reads these columns to gate behaviour.
4. **Partial rollback** — if only the carry-forward rule misbehaves, `traza_persistida_reutilizable_faena` can be made to return `null` unconditionally, restoring today's (destructive) behaviour without reverting the write.

## Delivery Forecast

Own estimate, **not** the proposal's ~300:

| Slice | Changed lines (add + del) |
|---|---|
| `QrAsociacionGdeService.js` mapper + constants | ~65 |
| `EmisionDesdeFaena.js` (+40 new / −113 deleted) | ~153 |
| `tests/qr-trace-on-save.test.js` | ~225 |
| `package.json` | ~2 |
| **Total** | **~445 (range 380–500)** |

`Decision needed before apply: Yes`
`Chained PRs recommended: Yes`
`400-line budget risk: High`

Over budget. Recommended two-slice chain, each with its own start, finish, verification and rollback:

- **PR A (~300)** — mapper, vocabulary constants, call site, validated + warning-accepted cases, carry-forward rule, their tests, `package.json`. Shippable on its own: "the trace persists on save and survives re-save."
- **PR B (~145)** — partial-trace reasons for `fallback` and `orden_sin_catalogo_rodal`, the five dead-function deletions, motive reset, their tests. PR B targets PR A's branch.

Single PR at ~445 with an explicit `size:exception` is the alternative. The user decides.

## Open Questions

- [ ] Delivery: single ~445-line PR with `size:exception`, or the A/B chain above.
- [ ] Should the `fallback` reason also record *which* fallback (parameter-permitted override vs. no payload at all)? Current design distinguishes them by whether the identity columns are populated, which is inferable but implicit.
- [ ] Recorded, not resolved: `QrAsociacionGde.js:149` and the catalog block disagree on the owner of `GDE_SECCION/GDE_AVISO_CORTA/GDE_PLAN_MANEJO` across phases. Out of scope; worth a follow-up change.
