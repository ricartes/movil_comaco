# Tasks: Persist the QR Trace on Save (guias)

Code target: `movil_comaco_gde`, branch `feature/rodal-scan-first-ui` (tip `665d6efb`). This repo (`movil_comaco`) gets zero code changes — only these `openspec/` artifacts.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~445 (range 380-500) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR A (~300) → PR B (~145) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Mapper + 3 constants, call site, validated/warning-accepted/carry-forward cases, D3 structural guard | PR A (~300) | `node --test tests/qr-trace-on-save.test.js` | N/A — no device/e2e harness in this repo; `node:test` contract tests are the full ladder | Revert PR A commits; additive columns only, DAO already binds them, no migration |
| 2 | Partial-trace reasons, 4 reveal-path scenarios, 5 dead-function/predicate deletions, motive reset | PR B (~145) | `node --test tests/qr-trace-on-save.test.js` | N/A — same as Unit 1 | Revert PR B commits independently of PR A; PR A's write point and vocabulary remain intact |

PR B targets PR A's branch (stacked-to-main: PR A merges to `feature/rodal-scan-first-ui` first, PR B then bases off the updated branch and merges next).

**PR A actual delivered size**: 578 changed lines (additions + deletions), against the ~300 estimate — see apply-progress / `sdd-apply` return for the breakdown and honest overrun note. Not compressed to fit; contract-test coverage for 15 columns across multiple branches drove the overrun (test file alone: 446 lines vs. the ~225 budgeted for the whole change's test suite).

**PR B actual delivered size**: 616 changed lines (477 insertions + 139 deletions) against the ~145 estimate, per `git diff --numstat feature/qr-trace-on-save-a` — see apply-progress / `sdd-apply` return for the breakdown. Not compressed to fit (explicit instruction: report overrun, do not compress tests). Composition: `tests/qr-trace-on-save.test.js` +384 (18 new tests covering the two new precedence branches, the WARNING #1/#2/#3 findings from PR A's verify-report, and the 5 deletion guardrails); `QrAsociacionGdeService.js` +90/-24 (net +66: precedence 2 + 4, two shared write helpers factored out of the precedence-1 code that PR A inlined); `EmisionDesdeFaena.js` +3/-115 (net -112: 5 dead-symbol deletions dominate, plus the 1-line motive reset). Same root cause as PR A: contract-test breadth for a 15-column, multi-branch mapper is inherently test-heavy relative to the small production diff. This exceeds both the ~145 unit estimate and the global 400-line review budget on its own — needs the same size:exception treatment as PR A (see Engram #130), or a further split decision from the user/orchestrator.

## Phase 1: Test Harness Foundation (PR A)

- [x] 1.1 Create `tests/qr-trace-on-save.test.js` reusing `tests/rodal-point-resolution.test.js`'s `node:vm` bootstrap (`source()`, light context, no stateful DOM mock) and `toPlainArray()` (read-only reference: `tests/rodal-point-resolution.test.js`).
- [x] 1.2 In the same commit as 1.1, add `tests/qr-trace-on-save.test.js` to `package.json` `scripts.test`'s explicit file list.

## Phase 2: RED — Mapper Contract Tests (PR A)

- [x] 2.1 RED: validated-in-geocerca case — full 15-column write, `_RESULTADO = VALIDADO_GEOCERCA`.
- [x] 2.2 RED: warning-accepted `FLAG_CONTROL === 1` — full write, `_VALIDADO = 0`, `_RESULTADO = PERMITIDO_CON_ADVERTENCIA`.
- [x] 2.3 RED (Requirement C, structural): assert `GDE_RODAL`, `GDE_SECCION`, `GDE_AVISO_CORTA`, `GDE_PLAN_MANEJO` are absent/unchanged on the mapper's input object across every branch.
- [x] 2.4 RED (ordering / active-destruction defect): traced borrador, no active association, re-saved — assert `prepararQrPendienteOConservarAsociacionGde` (`www/js/Vistas/EmisionDesdeFaena.js:2051-2070`, read-only) nulls the 15 columns, then the mapper restores them so the final `gde` is intact.
- [x] 2.5 RED (carry-forward, positive): open a traced borrador, `combo_rodal` no-catalog branch (`:2481`, read-only) wipes globals, predio+rodal unchanged vs. `gde_actual` — mapper carries the 15 columns forward verbatim.
- [x] 2.6 RED (carry-forward, negative): same setup, predio or rodal changed vs. `gde_actual` — mapper does NOT carry forward.
- [x] 2.7 RED (association precedence, positive): save-time trace persisted, association later completes — final `UPDATE GDE` values win (source-slice/fixture assertion referencing `www/js/Datos/QrAsociacionGde.js:139-177`, read-only).
- [x] 2.8 RED (association precedence, negative): association REJECTED (`DATOS_registrarRechazoQrGde` nulls only `_VALIDADO`/`_RESULTADO`, `www/js/Datos/QrAsociacionGde.js:200-207`, read-only) — the other 13 identity columns survive.
- [x] 2.9 RED: `esResultadoQrAceptado` returns `false` for `'RECHAZADO'` (compatibility baseline check).

## Phase 3: GREEN — Mapper & Vocabulary (PR A)

- [x] 3.1 In `www/js/Services/QrAsociacionGdeService.js`, below `esResultadoQrAceptado` (`:60`), add `QR_RESULTADO_ADVERTENCIA_SIN_CONTROL`, `QR_RESULTADO_SIN_VALIDACION_AUTORIZADA`, `QR_RESULTADO_SIN_CATALOGO_RODAL` constants (values used later in PR B; declare all three now to keep the file's constant block together).
- [x] 3.2 Add pure `asignar_trazabilidad_qr_a_gde(gde, fuente)` in the same file: precedence order 1 (`permiteAvanzar === true` → full write, `_RESULTADO` by `validacion.validado`) and 3 (`trazaPersistida` carry-forward, verbatim). Never assigns `GDE_RODAL`/`GDE_SECCION`/`GDE_AVISO_CORTA`/`GDE_PLAN_MANEJO`.
- [x] 3.3 Make tests 2.1, 2.2, 2.3, 2.5, 2.6, 2.9 GREEN.

## Phase 4: GREEN — Call Site & Carry-Forward Resolver (PR A)

- [x] 4.1 In `www/js/Vistas/EmisionDesdeFaena.js`, add `obtener_fuente_trazabilidad_qr_faena(gde)` (impure, reads page globals) and `traza_persistida_reutilizable_faena(gde)` (returns `gde_actual` when `GDE_ROL_PREDIO`+`GDE_RODAL` unchanged, else `null`, same comparison shape as `:2009-2010`).
- [x] 4.2 Add `aplicar_trazabilidad_qr_en_guardado(gde)`: no-op when association is `ACTIVA`/`PENDIENTE_LIBERACION`; otherwise builds `fuente` and calls the mapper.
- [x] 4.3 Insert the call `aplicar_trazabilidad_qr_en_guardado(gde);` in `guardar_datos_guia` immediately after `idUnicoMovilGdeParaValidacion = gde.ID_UNICO_MOVIL;` (`:1774`) and before `if (producto_asignado.PRECIO != null)` (`:1779`) — i.e. after `prepararQrPendienteOConservarAsociacionGde`'s `if`-block closes and before the insert/update branch at `:1781`.
- [x] 4.4 Make tests 2.4, 2.7, 2.8 GREEN.

## Phase 5: Verification (PR A)

- [x] 5.1 Guardrail test: source-slice assertion that the new call sits after `prepararQrPendienteOConservarAsociacionGde` and before the `idgde_acutal != "-1"` branch (`:1781`) in `guardar_datos_guia` (style of `tests/scan-first-faena.test.js:261-273`, read-only reference).
- [x] 5.2 Verify `www/index.html:350` (read-only) already loads `js/Services/QrAsociacionGdeService.js` — no `www/index.html` edit needed; assert via source scan, do not add a script tag.
- [x] 5.3 Run `npm test` — full suite green, `tests/qr-trace-on-save.test.js` included. **Result: 43/43 pass (31 pre-existing + 12 new).**

## Phase 6: RED — Partial-Trace & Reveal-Path Tests (PR B)

- [x] 6.1 RED: warning-accepted `FLAG_CONTROL !== 1` — full geographic write, `_VALIDADO = 0`, `_RESULTADO = ADVERTENCIA_SIN_CONTROL`; assert the 7 geographic columns (`_ROL_PREDIO_VALIDADO`, `_RODAL_VALIDADO`, `_SECCION_VALIDADA`, `_AEF_VALIDADO`, `_PM_VALIDADO`, `_FLAG_CONTROL`, `_FECHA_VALIDACION`) are populated here (contrast with 6.3/6.4).
- [x] 6.2 RED: `esResultadoQrAceptado` returns `false` for `ADVERTENCIA_SIN_CONTROL`, `SIN_VALIDACION_AUTORIZADA`, `SIN_CATALOGO_RODAL`.
- [x] 6.3 RED (D2 partial-trace constraint): governed fallback reveal (`"fallback"`, `:537`) — `_VALIDADO = 0`, `_RESULTADO = SIN_VALIDACION_AUTORIZADA`, all 7 geographic columns NULL.
- [x] 6.4 RED: no-catalog reveal (`"orden_sin_catalogo_rodal"`, `:2485`) — `_VALIDADO = 0`, `_RESULTADO = SIN_CATALOGO_RODAL`, all 7 geographic columns NULL.
- [x] 6.5 RED: legacy-borrador reveal (`"borrador_legado_sin_qr"`, `:579`) — NO trace written at all, zero `QR_TRAZABILIDAD_*` columns touched.
- [x] 6.6 RED: warning-accepted reveal (`"qr_advertencia_aceptada"`, `:885`) with `FLAG_CONTROL !== 1` maps to the 6.1 case (cross-check reveal-path → outcome mapping from `guias-rodal-scan-first` delta).
- [x] 6.7 RED (dead-function deletion, one per symbol): assert zero occurrences in `www/js/` of `asignar_qr_trazabilidad_a_gde` (`:1952`).
- [x] 6.8 RED (dead-function deletion): assert zero occurrences of `validarQrTrazabilidadAntesDeGuardar` (`:1468`).
- [x] 6.9 RED (dead-function deletion): assert zero occurrences of `validarQrTrazabilidadAntesDeAvanzar` (`:1436`).
- [x] 6.10 RED (dead-predicate deletion): assert zero occurrences of `validacion_qr_trazabilidad_rodal_obligatoria` (`:1385`).
- [x] 6.11 RED (dead-predicate deletion): assert zero occurrences of `rodal_seleccionado_qr_trazabilidad_faena` (`:623`); cross-check against `tests/scan-first-faena.test.js:261-273` (read-only) whose slice starts at `:638`, so the deletion cannot break that guardrail.
- [x] 6.12 RED: `limpiar_qr_trazabilidad_faena` (`:540`) resets `motivoUltimaRevelacionQrTrazabilidadFaena = null` (function-body slice assertion).

## Phase 7: GREEN — Partial Trace, Deletions, Motive Reset (PR B)

- [x] 7.1 In `www/js/Services/QrAsociacionGdeService.js`, extend `asignar_trazabilidad_qr_a_gde` with precedence 2 (geographic evaluation present, not accepted → full geographic write, `ADVERTENCIA_SIN_CONTROL`) and 4 (partial by `motivoRevelacion`: `fallback` → `SIN_VALIDACION_AUTORIZADA`; `orden_sin_catalogo_rodal` → `SIN_CATALOGO_RODAL`; `borrador_legado_sin_qr`/unknown → write nothing).
- [x] 7.2 Delete `asignar_qr_trazabilidad_a_gde` (`www/js/Vistas/EmisionDesdeFaena.js:1952`).
- [x] 7.3 Delete `validarQrTrazabilidadAntesDeGuardar` (`:1468`) and `validarQrTrazabilidadAntesDeAvanzar` (`:1436`).
- [x] 7.4 Delete `validacion_qr_trazabilidad_rodal_obligatoria` (`:1385`) and `rodal_seleccionado_qr_trazabilidad_faena` (`:623`).
- [x] 7.5 In `limpiar_qr_trazabilidad_faena` (`:540`), add `motivoUltimaRevelacionQrTrazabilidadFaena = null;`.
- [x] 7.6 Make tests 6.1-6.12 GREEN.

## Phase 8: Verification (PR B)

- [x] 8.1 Run `tests/scan-first-faena.test.js:261-273` (read-only, unmodified) — still passes after the `:623`/`:1385` deletions.
- [x] 8.2 Full-source scan: all 5 deleted symbols have zero occurrences anywhere in `www/js/`.
- [x] 8.3 Run `npm test` — full suite green.
- [x] 8.4 Verify `movil_comaco` (this repo) has zero code changes for this change; only `openspec/changes/guias-qr-trace-on-save/` artifacts were touched (read-only check via `git status`/`git diff --stat`).

## Corrective Re-run (test-only, gate failure closure)

Full-change verify (Engram #133) returned FAIL: 1 CRITICAL — the two "association after save" tests (WARNING #2 remediation) never loaded or invoked the real `www/js/Datos/QrAsociacionGde.js` DAO; they simulated the UPDATE's effect via `Object.assign`/manual nulling, which is true by construction and proves nothing about the real DAO. Closed test-only, on `movil_comaco_gde` branch `feature/qr-trace-on-save-b`, commit `d027dc87` (on top of `fc7abbd2`):

- [x] C.1 Replaced the positive WARNING #2 test: builds the save-time trace with the real mapper (`asignar_trazabilidad_qr_a_gde`), loads `QrAsociacionGde.js` in a `node:vm` context under a capturing `sqlitePlugin` stub (style of `tests/qr_backward_compat.test.js`'s `fakeDatabase`/`rows`), invokes the real `DATOS_crearAsociacionQrGde`, parses the captured `UPDATE GDE SET` column list (not hand-copied) and binds, applies them to `gde`, and asserts the association's values win and that `GDE_SECCION`/`GDE_AVISO_CORTA`/`GDE_PLAN_MANEJO` are set (the mapper never sets them). Confirmed by mutation: commenting out the real DAO call makes the test fail on `assert.ok(updateCapturado, ...)`.
- [x] C.2 Replaced the negative WARNING #2 test the same way: invokes the real `DATOS_registrarRechazoQrGde` through the stub, captures its `UPDATE`, applies the captured pairs, asserts exactly `QR_TRAZABILIDAD_VALIDADO`/`QR_TRAZABILIDAD_RESULTADO` changed and the other 13 trace columns are byte-identical. Confirmed by mutation the same way.
- [x] C.3 Extended test 2.3 (Requirement C, structural) with the two PR B mapper branches (`ADVERTENCIA_SIN_CONTROL` precedence 2, and the partial-write precedence 4 for `SIN_VALIDACION_AUTORIZADA`/`SIN_CATALOGO_RODAL`), asserting on the input object before/after as the existing branches do.
- [x] C.4 Fixed the "WARNING #1 hardening" test (verify check #7): now compares the real DAO SQL against the production `QR_TRAZABILIDAD_CAMPOS_TRAZA` constant (loaded via `loadMapper()`) instead of an independently hand-typed local array.
- [ ] Not addressed (left open, each requires more than a ≤10-line test change): WARNING (verify #2, direction C of the data-loss scenario — prior valid trace, predio/rodal identity changed, new rejected re-scan — remains untested, manually verified defensible); WARNING (verify #5, both PRs' accepted line-count size:exceptions, administrative only, no test change needed); SUGGESTION (split test 6.5's legacy no-write guarantee into its own named unit test, low priority).

Result: `npm test` 61/61 (unchanged count — 2 tests replaced in place, not added; `tests/qr-trace-on-save.test.js` alone: 30/30), `node --test tests/scan-first-faena.test.js` 12/12. Zero production-file changes (`git diff --stat fc7abbd2 HEAD` touches only `tests/qr-trace-on-save.test.js`, +236/-53). Not pushed, no upstream. `movil_comaco` received zero source changes.
