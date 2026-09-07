# Proposal: Persist the QR Trace on Save (guias)

Follow-on to `guias-rodal-scan-first` (verified PASS, unmerged). Artifact store: hybrid — also Engram `sdd/guias-qr-trace-on-save/proposal`. Code target: `movil_comaco_gde`, branched from `feature/rodal-scan-first-ui`.

## Intent

Scan-first derives the rodal from a scanned QR but keeps no record of **which** QR. Worse than a gap: `prepararQrPendienteOConservarAsociacionGde` (`EmisionDesdeFaena.js:2051-2070`) actively NULLs all 15 `QR_TRAZABILIDAD_*` columns on every save without an active association. Only the association screen (`QrAsociacionGde.js:139`) ever writes them. Per the user's decision, scanning stays in memory and **Save is the only write point**; the trace persists there, for create and update alike.

## Scope

### In Scope (`movil_comaco_gde` only)
- Populate the trace on the `gde` object in `guardar_datos_guia` (`:1625`) after `prepararQrPendiente...` (`:1769`), covering both the update (`:1784`) and insert branches.
- Revive or relocate the dead mapper `asignar_qr_trazabilidad_a_gde` (`:1952`, zero call sites) and cover `QR_TRAZABILIDAD_RESULTADO`, the one column it omits.
- Resolve ownership of `GDE_SECCION` / `GDE_AVISO_CORTA` / `GDE_PLAN_MANEJO` between the catalog block (`:1680-1686`) and the validated geocerca.
- Contract tests reusing `tests/scan-first-faena.test.js`'s stateful DOM/`node:vm` mock.

### Out of Scope
Association/liberation screen behavior (`ValidacionQrTrazabilidad.js`, `QrAsociacionGde.js`) — reusable, not changeable. DAO and schema (`GDE.js` already binds all 15; migration exists). Transport data, crypto hardening. `movil_comaco`: zero commits.

## Capabilities

### New Capabilities
- `qr-trace-on-save`: single-write-point persistence of the origin-QR trace, field ownership, partial-trace policy.

### Modified Capabilities
- `guias-rodal-scan-first`: adds a save-time persistence obligation to the reveal paths it already governs.

## Approach

One mapper, one call site, explicit precedence. Extract the mapping shared with `QrAsociacionGdeService.js` rather than keep two copies that will diverge. Precedence and partial-trace policy are stated as requirements, not left to the implementer.

## Open Questions for Design

| # | Question | Recommendation |
|---|---|---|
| A | Catalog vs. validated geocerca owns `GDE_SECCION`/`GDE_AVISO_CORTA` | Catalog owns the guía's own fields; the trace columns carry the validated values. Never null a guía field the trace cannot supply. |
| B | Save reachable with no validated trace (fallback `:537`, legacy `:579`, no-catalog `:2485`, advertencia whose `FLAG_CONTROL != 1`) | Persist a partial trace (`_VALIDADO = 0`, `_RESULTADO` reason) instead of silence. Not a promise race — `#btn_m3/#btn_mr/#btn_ton` sit inside the hidden container. |
| C | Legacy borrador with no QR | Hard constraint: writing the trace MUST NOT null `GDE_SECCION`/`GDE_AVISO_CORTA`. The mapper does today (`:1970`). |

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `www/js/Vistas/EmisionDesdeFaena.js` | Modified | Call site in `guardar_datos_guia`; mapper reworked or removed |
| `www/js/Services/QrAsociacionGdeService.js` or new mapper module | Modified/New | Shared trace mapping |
| `www/index.html` | Modified | Only if a new file is added |
| `tests/qr-trace-on-save.test.js`, `package.json` | New/Modified | Contract tests, wired into `npm test` |

No `plugins-local/`, `config.xml` Gradle prefs, or `firebase/` — the `config.yaml` high-risk trigger does **not** fire. High-risk area to flag anyway: this change writes persisted columns shared with the association state machine.

## Changed-Lines Estimate

**~300 (additions + deletions), range 240–380.** Production ~110; tests ~180. Under the 400 budget → single PR, no chain. Ceiling risk: the shared-mapper extraction and question B's partial-trace branch each add ~40.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Trace wiped on re-save of a borrador with a trace but no active association (`:2051-2070` runs before our write) | High if unhandled | Order our write after it and preserve a hydrated trace (`cargar_qr_trazabilidad_desde_gde:583-603`) |
| Collision with the association snapshot (`:2045-2047`) | Med | Never write when `QR_ASOCIACION_ESTADO` is active/pending-liberation; that branch already returns early |
| `resultado_qr_trazabilidad_permite_avanzar()` (`:1419`) rejects an advertencia-accepted guía whose geocerca `FLAG_CONTROL != 1` → silent null | Med | Question B |
| Two divergent mappings drift | Med | Extract one |
| Test bootstrap dominates the diff, as in PR1/PR2 | High | Reuse PR2's mock; do not build a fourth bootstrap |

## Rollback Plan

Ships to production Android devices.
1. **Code** — revert the single PR on its base branch and rebuild. No migration, no payload change.
2. **Data** — columns written are additive; an older APK ignores them and the association screen still overwrites them. No reconciliation needed.
3. **Field devices already updated** — a guía carrying a trace stays readable by pre-change code; nothing reads these columns to gate behavior.

## Dependencies

- `guias-rodal-scan-first` merged or its branch used as the base (its state is what this change persists).
- No new server, schema, or `PARAMETRO_GENERAL` provisioning.

## Success Criteria

- [ ] A guía emitted through the scan-first path persists the origin QR's 15 trace columns on Save, on both insert and update.
- [ ] Re-saving a borrador that already carries a trace does not wipe it.
- [ ] A guía saved with an active association keeps its snapshot untouched.
- [ ] A legacy borrador with no QR saves with `GDE_SECCION`/`GDE_AVISO_CORTA` intact.
- [ ] A reveal path with no validated trace produces the policy chosen in B, never silence.
- [ ] `npm test` covers all of the above; `movil_comaco` has zero commits.
