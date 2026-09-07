# Proposal: Rodal Scan-First Header Entry (guias)

Supersedes `qr-transport-scan-first` (void scope). Its `exploration.md` remains valid.

## Intent

In `EmisionDesdeFaena`, the dispatcher picks a rodal manually and the origin QR is only validated against that choice. Invert it: scan first, resolve the rodal that contains the scanned load point, auto-select it, then reveal the rest of the form. Everything after rodal starts hidden.

The existing `GFEQR1:` payload already carries `latitudCarga`, `longitudCarga`, `accuracyCarga`, `codOrigen`, `rolOrigen`, `rolComunaOrigen` (`movil_comaco/www/js/Services/QrTrazabilidadService.js:95-109`). **The producer app needs zero changes.** Single repo, no payload change, no version bump, no backward-compatibility work, no `qr-roundtrip-tests` fixture changes. That is why this change is small.

## Scope

### In Scope (`movil_comaco_gde` only)
- Build the scan surface: `escanear_qr_trazabilidad_faena` (`EmisionDesdeFaena.js:591`) has **zero call sites** and no markup anywhere under `www/pages/`. Largest piece of work.
- New point→rodal reverse lookup, scoped to the already-resolved orden de compra `(empresa, OCE_TIPODOCTO, NUM_ORDEN)` — the same scope `combo_rodal` uses at `EmisionDesdeFaena.js:320`.
- Resolve zero / exactly one / multiple matches. Auto-select only on exactly one. Never guess.
- Invert `#contenido_posterior_qr_trazabilidad_faena` (`EmisionDesdeFaena.html:119`, toggled `EmisionDesdeFaena.js:496`) to hidden by default.
- Move `QR_TRAZABILIDAD_PERMITIR_AVANCE_SIN_VALIDACION` (hardcoded `false`, `Constantes.js:16`) to a server-provisioned `PARAMETRO_GENERAL` row.
- Fix the tenant-blind parameter read (`Parametros.js:2764-2775` ignores `EMP_ID`, takes `rs.rows.item(0)`); model on `movil_comaco/www/js/Services/HelperService.js:102`.
- Make `npm test` functional (currently the `npm init` stub) and add contract tests.

### Out of Scope
Truck plate, trailer plate, driver (all three cut). No RUT/PII, no `validacionVigenciaCamion`/`validacionVigenciaChofer` interaction, no cascade sequencing. `qr-crypto-hardening` (known-adjacent, own change). Association/liberation flow (`ValidacionQrTrazabilidad.js`, `GFEQRRET1:`/`GFEQRLIB1:`). `GFE_comaco` backend. `movil_comaco`.

## Capabilities

### New Capabilities
- `guias-rodal-scan-first`: hidden-by-default header entry, scan CTA above rodal, auto-select on unique match, fallback gating.
- `rodal-point-resolution`: point→rodal reverse lookup within OC scope, 0/1/N handling, geometry-name to combo-option reconciliation.
- `tenant-scoped-parameters`: empresa-scoped `PARAMETRO_GENERAL` read backing the fallback flag.

### Modified Capabilities
None — `openspec/specs/` is empty.

## Approach

Reuse existing plumbing; add only what is missing.

1. `DATOS_buscarRodalPorPunto(...)` in `www/js/Datos/GeocercaRodal.js`, mirroring `DATOS_validarPuntoGeocercaRodal` (`:125`) but with the rodal as **output**: `ST_Contains` across the OC's candidate rodales, returning matches and a count.
2. Service layer resolves the geometry `RODAL` string against the `#combo_rodal` catalog. **No match = not resolved** → fallback path, never a guess.
3. Build the scan block in `EmisionDesdeFaena.html` above `#block_rodal`, wire the orphaned scanner function, and reuse `actualizar_estado_qr_trazabilidad_faena` for status.
4. Flip the default `bloqueado` state; reveal only on a resolved rodal, or on server-permitted manual fallback.
5. Read the fallback flag through a new empresa-scoped parameter accessor. Server side is one data row — `ws_cargar_parametros_generales` (`www/js/WebServices.js:651-694`) inserts rows generically.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `www/js/Datos/GeocercaRodal.js` | New | `DATOS_buscarRodalPorPunto` reverse lookup |
| `www/js/Servicios/GeocercaRodalService.js` | Modified | 0/1/N resolution, catalog reconciliation |
| `www/js/Vistas/EmisionDesdeFaena.js` | Modified | scan wiring, inverted default, auto-select, fallback |
| `www/pages/EmisionDesdeFaena.html` | New markup | scan block above `#block_rodal` |
| `www/js/Common/Constantes.js` | Modified | flag → `PARAMETRO_GENERAL` PAG_ID |
| `www/js/Datos/Parametros.js` | Modified | tenant-scoped read |
| `package.json`, `tests/` | Modified/New | working test command + contract tests |

No `plugins-local/`, `config.xml` Gradle prefs, or `firebase/` changes — **not high risk under `config.yaml` rules.proposal**. The camera plugin is used as-is.

## Changed-Lines Estimate

**~520 changed lines (additions + deletions), range 450-620.** Breakdown: DAO ~75, service ~60, `EmisionDesdeFaena.js` ~140, HTML ~32, parameter plumbing ~45, `package.json` ~2, tests ~170.

**This exceeds the 400-line review budget.** Two chained PRs recommended:
- PR1 — `rodal-point-resolution` + tenant-scoped parameter + test harness fix (~250 lines).
- PR2 — scan-first UI, inverted default, fallback gating (~270 lines), targeting PR1's branch.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Camera or QR fails in the field, dispatcher fully blocked | Med | Server-governed manual fallback (user-approved). Without it, a scratched QR or a broken camera stops emission entirely and needs a device visit; with it, the operator advances unvalidated and the row is flagged. |
| Rodal catalog / `GDE_GEOCERCA_RODAL` string join not 1:1 | Med | Unmatched geometry = not resolved → fallback. Never auto-select a guess. |
| Fallback flag resolves to another empresa's value | High if unfixed | Tenant-scoped read is in scope, not deferred. |
| Multiple rodales contain the point | Med | Explicit N>1 branch; no auto-select. |
| Two diverged remotes in `movil_comaco_gde` — `github/desarrollo` has the QR files, `origin/desarrollo` does not | High | Confirm the working remote before branching. Every file here exists on only one. |
| Strict TDD blocked: `npm test` is a stub | High | Fix first (PR1). `node --test tests/` fails on Node v22.19.0 (`ERR_UNSUPPORTED_DIR_IMPORT`); use `node --test "tests/*.test.js"`. Tests here are contract/integration style. |
| Regression into the untouched association flow | Low | Do not modify `ValidacionQrTrazabilidad.js` / `QrAsociacionGdeService.js`. |
| Dead references to non-existent markup are a recurring smell (`escanear_qr_trazabilidad_faena`; `tx_rut_chofer`/`tx_nom_chofer` styled at `EmisionDesdeFaena.js:125-126`, in no markup file) | Med | Verify every new element ID resolves. |

## Rollback Plan

Ships to production Android devices.

1. **Runtime, no redeploy** — set the `PARAMETRO_GENERAL` fallback row to permit advancing without validation. The form becomes reachable manually again on next parameter sync. First line of defense.
2. **Code** — revert the PR chain (PR2 then PR1) on `desarrollo` and rebuild. No SQLite migration and no payload change, so there is nothing to un-migrate and no data to reconcile.
3. **Field devices already updated** — no persisted-state divergence: this change writes no new columns. An older APK reads the same rows.

## Dependencies

- One `PARAMETRO_GENERAL` data row provisioned server-side before rollout (data task, not web development).
- `GDE_GEOCERCA_RODAL` geometry populated for the OC's rodales; otherwise every scan falls back.
- Confirmed correct `movil_comaco_gde` remote.

## Success Criteria

- [ ] On entry, everything after rodal is hidden.
- [ ] A valid QR whose point falls in exactly one OC-scoped rodal auto-selects it and reveals the form.
- [ ] Zero matches, multiple matches, or an unreconcilable catalog name leave the form hidden and offer only the governed fallback.
- [ ] The fallback flag resolves per empresa on a multi-empresa device.
- [ ] `npm test` runs and covers scan-first resolution and visibility.
- [ ] `movil_comaco` has zero commits in this change.
