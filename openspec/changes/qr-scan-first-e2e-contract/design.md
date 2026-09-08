# Design: QR Scan-First End-to-End Contract Test

Change `qr-scan-first-e2e-contract` | Store: hybrid | Depends on `proposal.md` and
`specs/qr-scan-first-e2e-contract/spec.md` (ratified — see **Spec Traceability**).

## Technical Approach

Two isolated `node:vm` contexts — one per repo — joined only by the `GFEQR1:` ciphertext string.
Trazabilidad generates and persists a real QR through `generarQrTrazabilidadPorPuntoCarga`; the
string read back out of its SQLite row is handed to the guias context, which decrypts it with its
own code and its own constants, then resolves the point through the real DAO over real SQLite
geometry. No stage returns a canned value.

## Architecture Decisions

### Decision: Two vm contexts, not one

**Choice**: Separate contexts; the ciphertext crosses as a plain `string`. The decrypted payload
never crosses — guias decrypts it itself.
**Alternatives considered**: one shared context (the `qr-guias-contract.test.js` precedent);
two contexts passing the decoded payload object.
**Rationale**: Both repos declare the *same global names* — `QR_TRAZABILIDAD_AES_KEY_HEX`,
`QR_TRAZABILIDAD_HMAC_KEY_HEX`, `desencriptarPayloadQrTrazabilidad`, `utf8Base64QrTrazabilidad`.
In one context the second `runFile` silently overwrites the first, so `encriptarPayloadQrTrazabilidad`
would sign with the *consumer's* key. Key drift — the single most valuable defect this test exists
to catch — would become structurally undetectable. Passing the decoded object is rejected for the
same reason: it would skip the consumer's decrypt.

**Spec tie-in**: the spec does not mandate a vm architecture, but *Real Cryptographic
Producer-to-Consumer Chain* requires that "Both sides MUST use the unmodified production AES/HMAC
constants (no injected test keys)." In a single shared context that sentence cannot be satisfied —
there is only ever *one* surviving pair of constants, so "both sides" is not observable. Two
contexts are therefore required by the spec's intent, not merely preferred by this design.

### Decision: Full producer entry point, not the payload helper

**Choice**: `generarQrTrazabilidadPorPuntoCarga(gde, coordenadaCarga)`, reading
`resultado.qr.PAYLOAD_ENCRIPTADO` — the value that survived a real INSERT/SELECT.
**Alternatives considered**: `generarPayloadEncriptadoQrTrazabilidad` (pure, no DB).
**Rationale**: the device renders the QR from the stored row, so the stored row is the real
artefact. Cost is the real `QR_TRAZABILIDAD_ORIGEN` schema (migration `version8Esquema`,
`www/js/Datos/migraciones/Versiones.js:56-89`), which the harness applies verbatim rather than
hand-writing — `DATOS_guardarQrTrazabilidadOrigen` also runs `PRAGMA table_info` + conditional
`ALTER`, so an approximated schema would not exercise it.

### Decision: Consumer entry point is `validarTextoQrTrazabilidad`

**Choice**: `validarTextoQrTrazabilidad(textoQr)`
(`movil_comaco_gde/www/js/Services/QrTrazabilidadService.js:12`).
**Alternative rejected**: `validarPayloadQrTrazabilidad(payload)` (same file, line 106).
**Rationale**: the spec names only "the real `movil_comaco_gde` decrypt-and-validate function"
generically, but its *Real Cryptographic Producer-to-Consumer Chain* requirement also states the
test "MUST NOT construct a ciphertext string or a pre-decrypted payload object by hand."
`validarPayloadQrTrazabilidad` accepts an **already-decrypted object** and performs no decryption,
so calling it directly is exactly the shortcut that sentence forbids. `validarTextoQrTrazabilidad`
takes the ciphertext and internally calls `desencriptarPayloadQrTrazabilidad` then
`validarPayloadQrTrazabilidad`, satisfying the requirement.

Per that requirement's scenario ("the decoded payload's coordinates match the values the producer
encoded"), each scenario MUST additionally assert
`payload.latitudCarga === punto.latitud && payload.longitudCarga === punto.longitud` before
resolution runs.

### Decision: Production constants, unmodified

**Choice**: no injected test keys, no `installCryptoTestConfiguration`-style override. Add one
explicit assertion that the two contexts' `QR_TRAZABILIDAD_AES_KEY_HEX` / `..._HMAC_KEY_HEX` are
equal. **Not** silently reverted from the proposal.
**Rationale**: directly required by the spec — "Both sides MUST use the unmodified production
AES/HMAC constants (no injected test keys)" — and overriding both sides with a shared test key is
exactly what makes drift invisible.

### Decision: Orphan vs OC-boundary — one resolver state, two fixtures, direct catalog proof

Root cause (Engram `movil-comaco-gde/orphan-vs-oc-boundary-collision` #141, independently confirmed
by the spec): the OC scope lives inside the LEFT JOIN subquery, so an out-of-OC rodal yields
`COD_RODAL: null`, byte-identical to true orphan geometry. Both reach `GEOMETRIA_HUERFANA`.

**This design is governed by the spec requirement *Orphan Geometry and OC-Boundary Collision Are
Independently Verified***, which resolves the collision in exactly the same direction and fixes the
assertion mechanism:

> "The test MUST cover both root causes as distinct scenarios with distinct fixtures, and MUST
> assert — independently of the caller-facing outcome — a fixture-level fact that proves which root
> cause each scenario actually exercises: for the orphan scenario, that zero `RODAL` catalog rows
> exist for that code under any OC; for the boundary scenario, that exactly one `RODAL` catalog row
> exists for that code, scoped to an OC tuple other than the one under test."

**Choice**: one observable resolver state (`GEOMETRIA_HUERFANA`), two distinct fixtures, and the
spec-mandated **direct, OC-unscoped query against the `RODAL` catalog table** as the discriminating
assertion:

```sql
SELECT EMPRESA, TIPO_DOCTO, NRO_OC FROM RODAL WHERE TRIM(UPPER(RODAL)) = ?   -- no OC filter
```

| Scenario | Chain outcome | Mandated direct catalog assertion |
|---|---|---|
| True orphan (`R99`) | `GEOMETRIA_HUERFANA` under `OC_A` | query returns **0 rows** |
| OC boundary (`R77`) | `GEOMETRIA_HUERFANA` under `OC_A` | query returns **exactly 1 row**, whose `(EMPRESA, TIPO_DOCTO, NRO_OC)` differs from `OC_A` |

The earlier draft proposed proving the boundary case by re-running the chain under `OC_B`. That is
**superseded as the primary proof** by the spec's direct-query mechanism, but retained as one extra
assertion on the boundary scenario only (`OC_B` → `RESUELTO`, `rodal === 'R77'`), because it proves
the *resolver* honours the scope rather than only proving the fixture is shaped correctly. The
orphan scenario drops its `OC_B` run as redundant — the zero-row query already covers "under any OC".

### Decision: New support module; do not refactor `qr-guias-contract.test.js`

**Choice**: duplicate the ~45-line `cordovaSqlite` adapter into a new
`tests/support/spatial-sqlite.js`. Leave the existing test byte-identical.
**Alternatives considered**: add `module.exports` to `qr-guias-contract.test.js` and import it.
**Rationale**: that file declares everything as local `function`s with no exports, and it is the
archived green evidence for `guias-rodal-scan-first` and `guias-qr-trace-on-save`. Refactoring it to
save ~45 lines puts shipped evidence at regression risk and adds its diff to this PR. The new
adapter also diverges — it registers spatial functions and serves two databases. Recorded as a
known, accepted duplication; a later cleanup may unify it.

### Decision: Ray-cast shim is explicitly not SpatiaLite

Ported technique (not the file, no runtime dependency on the untracked
`D:\Trabajos\GFE\qr-roundtrip-tests`). **Behaviour gap**: planar even-odd ray casting on raw
lon/lat; no geodesic maths, no spatial index, no CRS handling, boundary-point results undefined,
`Polygon`/`MultiPolygon` only. Device SpatiaLite
(`cordova-sqlite-spatialite-evplus-ext-common-free`) may differ on degenerate or
exactly-on-edge geometry. **Acceptable**: this test asserts the *seam* — coordinate order,
`PERTENECE` coercion, LEFT JOIN scoping, state mapping — not geometric exactness. All fixtures keep
test points well inside or well outside every ring, so no assertion depends on edge behaviour.

## Data Flow

```
trazabilidad vm context                    │  guias vm context
                                           │
gde{ID_UNICO_MOVIL,GDE_ROL,...}            │
  + coordenadaCarga{latitud,longitud}      │
        │                                  │
        ▼                                  │
generarQrTrazabilidadPorPuntoCarga         │
        │                                  │
        ▼                                  │
generarPayloadEncriptadoQrTrazabilidad     │
  → CryptoJS AES-256-CBC + HMAC-SHA256     │
  → "GFEQR1:<base64 envelope>"             │
        │                                  │
        ▼                                  │
DATOS_guardarQrTrazabilidadOrigen ──▶ SQLite A (bd.db)
        │                                  │
        ▼                                  │
DATOS_obtenerQrTrazabilidadPorGde          │
        │                                  │
   qr.PAYLOAD_ENCRIPTADO ═══ string ══════▶│ validarTextoQrTrazabilidad(textoQr)
                                           │        │ desencriptar + validarPayloadQrTrazabilidad
                                           │        ▼  payload{latitudCarga,longitudCarga,rolOrigen}
                                           │ resolverRodalPorPuntoQr(payload, payload.rolOrigen, oc)
                                           │        │
                                           │        ▼
                                           │ DATOS_buscarRodalPorPunto ──▶ SQLite B (bd_gde_comaco.db)
                                           │        ST_Contains(GeomFromGeoJSON(GEOCERCA),
                                           │                    ST_GeomFromText('POINT(lon lat)'))
                                           │        LEFT JOIN RODAL scoped to (EMPRESA,TIPO_DOCTO,NRO_OC)
                                           │        ▼
                                           │ {estado, rodal, nombreRodal, candidatos}  ◀── asserted
```

`rolPredio` is taken from the decrypted `payload.rolOrigen`, not from a literal — the rol must also
survive the crypto boundary.

## Sequence Diagram

```
Test        TrazCtx     SQLite-A     GuiasCtx     SQLite-B
 │             │            │            │            │
 │ generar(gde,pt)          │            │            │
 ├────────────▶│            │            │            │
 │             │ AES+HMAC   │            │            │
 │             ├─INSERT────▶│            │            │
 │             ├─SELECT────▶│            │            │
 │             │◀─PAYLOAD_ENCRIPTADO─────┤            │
 │◀─ "GFEQR1:…" ────────────┤            │            │
 │                                       │            │
 │ validarTextoQrTrazabilidad("GFEQR1:…")│            │
 ├──────────────────────────────────────▶│            │
 │                                       │ HMAC check │
 │                                       │ AES decrypt│
 │◀──────── {ok:true, payload} ──────────┤            │
 │                                       │            │
 │ resolverRodalPorPuntoQr(payload, rol, oc)          │
 ├──────────────────────────────────────▶│            │
 │                                       ├─ST_Contains + LEFT JOIN──▶│
 │                                       │◀─{hits,codigosCatalogo,cantidadHuerfanas}
 │◀──────── {estado, rodal, …} ──────────┤            │
 │ assert estado / rodal / candidatos                 │
```

## File Changes

| File | Action | Lines (est.) | Description |
|------|--------|--------------|-------------|
| `tests/support/spatial-sqlite.js` | Create | ~95 | Ray-cast `spatialContains`, `registerSpatialFunctions(db)`, `cordovaSqlite(db)` adapter, `crearBaseSqlite()` |
| `tests/spatial-sqlite-shim.test.js` | Create | ~45 | Proves the shim directly (inside / outside / hole / MultiPolygon / malformed) |
| `tests/support/qr-e2e-harness.js` | Create | ~200 | Two vm contexts, real schemas, geometry + catalog fixtures, scenario constants |
| `tests/qr-scan-first-e2e.test.js` | Create | ~165 | 5 scenarios + key-drift + coordinate-equality + direct catalog queries |
| `package.json` | Modify | 1 line ×2 PRs | Append files to `scripts.test` |

**Revised total ≈ 505 authored lines** (proposal estimated 400–430). The increase is real, not
padding: (a) two vm contexts instead of one, (b) the actual `QR_TRAZABILIDAD_ORIGEN` schema is 20
columns, not the 5 a naive fixture would use, (c) `strict_tdd` + `rules.apply` forbid an orphaned
support file, so the shim needs its own wired test, (d) ratification added the spec-mandated direct
catalog queries and coordinate-equality assertions (+15).

### package.json edit (exact convention — explicit list, no glob)

PR1 appends ` tests/spatial-sqlite-shim.test.js`; PR2 appends ` tests/qr-scan-first-e2e.test.js`,
both to the end of the existing `scripts.test` string. `openspec/config.yaml`
`testing.projects[0].test_command_raw` must be updated to match (flagged for `sdd-tasks` per
`rules.tasks`).

## Interfaces / Contracts

```js
// tests/support/spatial-sqlite.js
module.exports = {
  spatialContains(geoJsonText, wktPoint) -> 0 | 1,   // registered as ST_Contains
  registerSpatialFunctions(db),  // GeomFromGeoJSON: v=>v ; ST_GeomFromText: v=>v ; ST_Contains
  cordovaSqlite(db),             // { openDatabase() -> { transaction(work, onError, onSuccess) } }
  crearBaseSqlite()              // new DatabaseSync(':memory:') + registerSpatialFunctions
};

// tests/support/qr-e2e-harness.js
module.exports = {
  crearContextoTrazabilidad(),   // vm ctx + SQLite A + version8Esquema + deterministic obtener_IDUNICO
  crearContextoGuias(),          // vm ctx + SQLite B + GDE_GEOCERCA_RODAL + RODAL + seeded fixtures
  GEOCERCAS, CATALOGO, PUNTOS, OC_A, OC_B, GDE_BASE,
  consultarCatalogoSinOc(db, codigo),  // direct OC-unscoped RODAL query -> rows[]
  guiasDisponible()              // false when ../../movil_comaco_gde is absent -> test.skip
};
```

Registration is `db.function('ST_Contains', { deterministic: true }, spatialContains)`.
`GeomFromGeoJSON` and `ST_GeomFromText` are identity passthroughs, so `spatialContains` receives the
raw GeoJSON text and the raw `POINT(lon lat)` WKT — matching the strings the production SQL builds.

`obtener_IDUNICO` is defined in the trazabilidad context as a deterministic counter. It is an ID
generator, not a stage of the chain; determinism is a gain and no assertion depends on it.

## Fixture Data

Schemas applied verbatim from production sources:

- SQLite A: `version8Esquema.queries` from `movil_comaco/www/js/Datos/migraciones/Versiones.js`.
- SQLite B: `GDE_GEOCERCA_RODAL` from `version10` + `version12` ALTERs
  (`movil_comaco_gde/www/js/Datos/Migraciones/Versiones.js`), plus
  `RODAL(EMPRESA TEXT, TIPO_DOCTO TEXT, NRO_OC INTEGER, RODAL TEXT, NOM_RODAL TEXT, ESPECIE TEXT, PLAN_MANEJO TEXT)`
  copied from `movil_comaco_gde/www/js/Datos/Tablas.js:22` (it is created there, not by a migration).

`GDE_BASE = { ID_UNICO_MOVIL: 'GDE_E2E_0n', GDE_COD_ORIGEN: 'ORI-014', GDE_ROL: '11101-25', GDE_ROL_COMUNA: 'CAUQUENES' }`
— one distinct `ID_UNICO_MOVIL` per scenario, because the producer is idempotent per guía.

`OC_A = { empresa: 'FSA', tipoDocto: 'OCE', numOrden: 480512 }` ·
`OC_B = { empresa: 'FSA', tipoDocto: 'OCE', numOrden: 480999 }`

All geometry `ROL_PREDIO = '11101-25'`, axis-aligned GeoJSON `Polygon` rings in `[lon, lat]` order:

Rodal codes follow the spec's literal (`rodal: "R01"`) and the existing
`tests/qr-guias-contract.test.js` convention — **not** the `R-101` form used in this design's first
draft.

| Geocerca | RODAL | lon range | lat range | Catalog |
|---|---|---|---|---|
| A | `R01` | −72.210 … −72.200 | −36.110 … −36.100 | OC_A · `RODAL 01 QUILLAY` |
| B | `R02` | −72.190 … −72.180 | −36.110 … −36.100 | OC_A · `RODAL 02 LAUREL` |
| C | `R03` | −72.206 … −72.196 | −36.108 … −36.098 | OC_A · `RODAL 03 BOLDO` (overlaps A) |
| D | `R99` | −72.170 … −72.160 | −36.110 … −36.100 | **none, any OC** (true orphan) |
| E | `R77` | −72.150 … −72.140 | −36.110 … −36.100 | **OC_B only** (`RODAL 77 ROBLE`) |

Every scenario first asserts the decoded coordinates equal the encoded ones, then asserts the
resolver outcome:

| Scenario | Point (lon, lat) | Inside | OC | Expected outcome + mandated extra assertion |
|---|---|---|---|---|
| Happy | −72.2085, −36.1085 | A only | OC_A | `RESUELTO`, `rodal='R01'`, `nombreRodal='RODAL 01 QUILLAY'` |
| Zero-match | −72.3000, −36.3000 | none | OC_A | `SIN_COINCIDENCIA`, `rodal=null`, `candidatos=[]` |
| Orphan | −72.1650, −36.1050 | D only | OC_A | `GEOMETRIA_HUERFANA` **+** direct OC-unscoped `RODAL` query for `R99` → **0 rows** |
| OC boundary | −72.1450, −36.1050 | E only | OC_A | `GEOMETRIA_HUERFANA` **+** direct OC-unscoped `RODAL` query for `R77` → **exactly 1 row**, tuple ≠ OC_A **+** same point under OC_B → `RESUELTO`, `rodal='R77'` |
| Ambiguous | −72.2020, −36.1020 | A and C | OC_A | `AMBIGUO`, `rodal=null`, `candidatos` = `['R01','R03']` (order-insensitive) |

State vocabulary (`RESUELTO`, `SIN_COINCIDENCIA`, `AMBIGUO`, `GEOMETRIA_HUERFANA`) is reused
verbatim from `openspec/specs/rodal-point-resolution/spec.md` and `GeocercaRodalService.js`, and
**matches the four values the spec uses** — confirmed value-by-value.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Ray-cast shim in isolation | `tests/spatial-sqlite-shim.test.js` — inside, outside, ring-with-hole, MultiPolygon, malformed GeoJSON → 0 |
| Integration | Producer persists a decryptable ciphertext | Covered inside the e2e chain (SQLite A round-trip) |
| E2E | 5 scenarios + key-drift equality + per-scenario coordinate equality + the two direct OC-unscoped catalog queries | `tests/qr-scan-first-e2e.test.js`, real code both sides, zero stubs on the chain |

Skip guard: when `../../movil_comaco_gde` is absent, `guiasDisponible()` returns false and the
e2e file skips with an explicit message instead of throwing an obscure `ENOENT`
(`tests/spatial-sqlite-shim.test.js` has no cross-repo dependency and always runs).

## Version / Platform Constraints

- `cordova-android ^13.0.0`, target Android 13+ — unaffected; no native, Gradle, `plugins-local/`,
  `firebase/`, or `config.xml` change. **Confirmed: no high-risk area per `config.yaml` rules.**
- Device geometry comes from `cordova-sqlite-spatialite-evplus-ext-common-free`; the shim replaces
  it only in Node.
- Requires `node:sqlite` `DatabaseSync.prototype.function()`. Present in the local toolchain
  (`qr-roundtrip-tests` uses it), but `sdd-apply` MUST add a capability guard that skips with a clear
  message rather than crashing on an older Node.

## Spec Traceability

Ratified against `specs/qr-scan-first-e2e-contract/spec.md`. **No conflict found.**

| Spec requirement | Satisfied by | Note |
|---|---|---|
| Real Cryptographic Producer-to-Consumer Chain | Two-context decision + `generarQrTrazabilidadPorPuntoCarga` → `validarTextoQrTrazabilidad` + key-equality assertion + per-scenario coordinate-equality assertion | Two contexts are what make "both sides … unmodified production constants" observable |
| Real Point-to-Rodal Resolution | Real `resolverRodalPorPuntoQr` → real `DATOS_buscarRodalPorPunto` over `DatabaseSync(':memory:')` with the ray-cast `ST_Contains`/`GeomFromGeoJSON` shim; no stubbed DAO | Shim replaces SpatiaLite only; the SQL and the resolver are production code |
| End-to-End Happy Path Resolution | Happy scenario, `rodal='R01'` | Fixture code aligned to the spec's `R01` literal |
| End-to-End Zero-Match Resolution | Zero-match scenario, `rodal=null`, `candidatos=[]` | |
| Orphan Geometry and OC-Boundary Collision Are Independently Verified | Two distinct fixtures (`R99`, `R77`) + the mandated direct OC-unscoped `RODAL` catalog queries | Direct query is the primary proof; the `OC_B` chain re-run is retained as extra |
| Ambiguous Multiple-Match Resolution | Ambiguous scenario, `candidatos=['R01','R03']`, `rodal=null` | |
| Test Wiring | `scripts.test` explicit-list append (both PRs) + `config.yaml` `test_command_raw` + `guiasDisponible()` skip guard | Zero production source change in either app |

Three alignments were made during ratification, all additive — none reversed a design decision:
adopt the spec's `R01` rodal-code literal; add the spec-mandated direct OC-unscoped catalog queries
as the discriminating assertion; add the coordinate-equality assertion from the crypto-chain
scenario.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or
process-integration boundary. Test-only change reading two local repos.

## Migration / Rollout

No migration. **Rollback is trivial and test-only**: delete the new files and revert the
`scripts.test` / `test_command_raw` strings. No production code, schema, or build config is touched,
so nothing shipped to a device can regress.

## Review Workload

Two PRs, both under the 400-line budget — a genuine slice boundary, **no `size:exception` needed**:

- **PR1 ≈ 140 lines** — `tests/support/spatial-sqlite.js` + `tests/spatial-sqlite-shim.test.js` +
  wiring. Self-contained, green, independently rollback-able.
- **PR2 ≈ 365 lines** — `tests/support/qr-e2e-harness.js` + `tests/qr-scan-first-e2e.test.js` +
  wiring. Targets PR1's branch.

## Open Questions

- [ ] `RODAL.NRO_OC` is `INTEGER` while `ordenCompra.numOrden` may arrive as a string from the UI;
      SQLite column affinity currently hides the difference. Fixtures use a Number. Whether the test
      should also pin the string case is a scope question for `sdd-tasks`, not a blocker.
