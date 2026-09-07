# Proposal: QR Transport Data and Scan-First Rodal Resolution

## Intent

Dispatchers in the guias app pick a rodal manually, then scan the origin QR to validate it, and never see which truck, trailer or driver was recorded at loading. Two asks: (1) carry transport data inside the existing origin QR so guias can show it at scan time; (2) invert the header flow so the scan comes first and resolves the rodal, keeping later fields hidden until it does. Success: the dispatcher sees origin transport data on screen and reaches a resolved rodal without guesswork, and is never fully blocked in the field.

## Scope

### In Scope
- `movil_comaco`: add additive, neutrally named keys (`patenteCamion`, `patenteCarro`, `chofer`, `rutChofer`) to the `GFEQR1:` payload. No envelope, crypto or `v` change.
- `movil_comaco_gde`: paint those four values on the header screen at scan time, adjacent to the plate/driver blocks the dispatcher is about to fill in.
- `movil_comaco_gde`: new bounded point-to-rodal spatial lookup, scoped by `(empresa, OCE_TIPODOCTO, NUM_ORDEN)`, resolving 0 / 1 / many.
- `movil_comaco_gde`: scan-first ordering, post-rodal content hidden by default, manual fallback governed by a `PARAMETRO_GENERAL` row replacing the hardcoded `QR_TRAZABILIDAD_PERMITIR_AVANCE_SIN_VALIDACION`.
- Test coverage in both repos plus a working test command in guias.

### Out of Scope
- Any persistence of plate/driver data. No schema migration, no new columns, in either repo.
- Mismatch detection or cross-check enforcement between QR and typed values. Display only.
- `GFE_comaco` backend, its 19-field contract, and the dispatcher web portal.
- The association/liberation round trip (`GFEQRRET1:`/`GFEQRLIB1:`, `ValidacionQrTrazabilidad.js`).
- Payload version bump or strict version gating.
- `plugins-local/`, `config.xml` Gradle prefs, `firebase/` — untouched, so the config.yaml high-risk rule does not fire.

## Capabilities

### New Capabilities
- `qr-transport-payload`: origin QR carries truck plate, trailer plate, driver name and RUT as additive, display-only pass-through fields.
- `rodal-point-resolution`: resolve which rodal contains a QR coordinate, bounded to the already-selected predio / orden de compra, with 0 / 1 / many outcomes.
- `guias-scan-first-header`: scan-first header entry, default-hidden post-rodal fields, parameter-governed manual fallback, and on-screen transport display.

### Modified Capabilities
- None. `openspec/specs/` is empty.

## Approach

Additive payload keys only: consumer validation (`validarPayloadQrTrazabilidad`) requires just `tipo` and `qrId` and tolerates unknown keys, so both version-skew directions are already safe without a version bump. Missing values render as `-`, the existing null pattern.

Guias reuses the existing `#contenido_posterior_qr_trazabilidad_faena` hide/show plumbing and inverts its default, adds the new DAO lookup, and auto-selects `#combo_rodal` from a resolved match.

The orden de compra is already resolved before the rodal: `EmisionDesdeFaena.js:320` populates the combo via `combo_rodal(empresa, OCE_TIPODOCTO, NUM_ORDEN, 0)`, and `DATOS_ObtenerDatosRodal` uses the same scope. The reverse lookup therefore reuses an existing boundary and existing DAO signature shape rather than inventing one, which is why the bounded scope is low risk.

Display placement is deliberate: `block_patente_camion`, `block_transporte`/`block_patente_carro` and `block_chofer` are the first blocks inside the hidden container, so origin-captured values land immediately beside the destination fields being typed. Adjacency is the whole dispatcher benefit. No comparison, validation, or mismatch logic is in scope.

**Two repos, independent deploys.** Slice A (`movil_comaco` producer + guias display) ships first and is inert until guias updates. Slice B (guias flow inversion) ships second. Sequencing matters because both slices edit `EmisionDesdeFaena.js`. Slice B alone would justify a separate change if the DAO or fallback work grows; keep it here only while it stays one screen plus one query.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `movil_comaco/www/js/Services/QrTrazabilidadService.js` | Modified | Four additive payload keys from the `gde` row |
| `movil_comaco/www/js/Vistas/QrTrazabilidad.js` | Modified | Size render box from module count (density mitigation) |
| `movil_comaco/tests/qr-guias-contract.test.js` | Modified | New payload-shape assertions |
| `movil_comaco_gde/www/js/Vistas/EmisionDesdeFaena.js` + `www/pages/EmisionDesdeFaena.html` | Modified | Display fields, scan-first ordering, inverted default visibility |
| `movil_comaco_gde/www/js/Datos/GeocercaRodal.js`, `www/js/Servicios/GeocercaRodalService.js` | Modified | New bounded point-to-rodal query |
| `movil_comaco_gde/www/js/Common/Constantes.js` | Modified | PAG_ID entry replacing the hardcoded const |
| `movil_comaco_gde/package.json`, `tests/` | Modified | Working test command plus new coverage |
| `D:\Trabajos\GFE\qr-roundtrip-tests` | Modified | Fixture and scenario updates |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Driver name column differs (`GDE_NOM_CONDUCTOR` vs `GDE_NOMBRE_CHOFER`); symmetric assumption yields a silently empty name | High | Neutral payload keys, per-app column mapping, contract test asserting a non-empty name from each schema |
| QR text grows ~20% (version ~23-24 to ~27-28 at level M) against a fixed render box, hurting field scans | Medium | Size the box from the already-computed module count; validate on a real device before merge |
| Rodal catalog (`DATOS_seleccionar_rodales`) and geometry table (`GDE_GEOCERCA_RODAL`) join by string, not guaranteed 1:1 | Medium | Unmatched result is "not resolved" and routes to fallback; never auto-select a guessed rodal |
| Scan-first blocks a dispatcher with a damaged QR or broken camera | Medium | Server-side `PARAMETRO_GENERAL` fallback, flippable without an app deploy |
| Guias `npm test` is a stub; `node --test tests/` fails on Node 22.19.0 (`ERR_UNSUPPORTED_DIR_IMPORT`) | High | Adopt `node --test "tests/*.test.js"` and fix the guias script before TDD work starts |
| Scope creep into the association/liberation flow | Medium | Explicitly out of scope; do not touch `ValidacionQrTrazabilidad.js` |
| Field devices run mixed versions of the two apps | High | Additive-only payload, graceful `-` defaults, no version gate |

## Rollback Plan

- **Slice A**: revert the producer commit in `movil_comaco` and rebuild. Old QRs stay valid; guias display degrades to `-` with no error. No data written, so nothing to unwind.
- **Slice B**: two levers. First, flip the `PARAMETRO_GENERAL` row server-side to permit manual advance — instant, no app deploy, restores today's manual-first usability. Second, revert the guias commit on `desarrollo` and ship a build.
- No migration exists in either repo, so rollback never leaves orphan columns or partially migrated devices.
- Both apps deploy independently; assume field devices lag. Never rely on lockstep rollback.

## Dependencies

- Backend/DBA provisioning of the new `PARAMETRO_GENERAL` row (a data row, not web development). Slice B's fallback default depends on it.
- `qr-roundtrip-tests` harness fixtures, shared across three repos.
- Integration branch `desarrollo` in both repos.

## Success Criteria

- [ ] Truck plate, trailer plate, driver name and RUT decode from the origin QR and render on the guias header screen at scan time.
- [ ] Driver name is non-empty end to end despite the differing column names.
- [ ] Nothing new is persisted; no migration is added in either repo.
- [ ] A new QR scanned by an old guias build, and an old QR scanned by a new build, both work without error.
- [ ] Scanning first auto-selects the rodal when exactly one geocerca matches within the selected predio / orden de compra.
- [ ] Post-rodal fields stay hidden until a rodal is resolved or the fallback is taken.
- [ ] The manual fallback is driven by the server parameter and can be toggled without an app release.
- [ ] Both repos have a single command that runs their full suite green.
