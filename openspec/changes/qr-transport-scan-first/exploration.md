# Exploration — qr-transport-scan-first

Status: investigation complete, pending product decisions
Engram artifact: `sdd/qr-transport-scan-first/explore` (id 84)
Repos in scope: `movil_comaco` (producer / trazabilidad), `movil_comaco_gde` (consumer / guias)

## Request

Two related asks:

1. **Producer (`movil_comaco`)** — add truck plate, trailer plate and driver to the
   trazabilidad QR payload so the dispatcher can see them in the guias app.
2. **Consumer (`movil_comaco_gde`)** — invert the header-entry flow. Today the operator
   selects a rodal and the scanned QR point is validated against it. Wanted: scan the QR
   first, resolve which rodal the point belongs to, auto-select it, then reveal the rest of
   the form. On entry, every field after rodal starts hidden; if the QR does not resolve to
   a rodal, they stay hidden.

## Current state

### A. QR contract (producer)

`www/js/Services/QrTrazabilidadService.js` builds the payload:

```
{ v, tipo, qrId, idUnicoMovil, fechaGeneracion,
  latitudCarga, longitudCarga, accuracyCarga,
  codOrigen, rolOrigen, rolComunaOrigen }
```

It is AES-256-CBC encrypted (key hardcoded, identical in both apps), wrapped in an
HMAC-signed envelope, base64-encoded twice, and prefixed `GFEQR1:`.

A separate, stricter single-letter-key contract (`GFEQRRET1:` / `GFEQRLIB1:`) exists for the
return/confirmation QR. It is **unrelated** to this change and must not be conflated with it.

Truck plate, trailer plate and driver already exist on the GDE row
(`GDE_PATENTE_CAMION`, `GDE_PATENTE_CARRO`, `GDE_RUT_CONDUCTOR`, `GDE_NOM_CONDUCTOR` —
`www/js/Datos/Tablas.js:12`) and are already reachable from the object passed into QR
generation. **No capture gap, no mandatory schema migration for ask 1.**

Size: current QR text is roughly 750-770 characters. Three added fields grow it about
18-20%, to roughly 890-910 characters. That stays well under the QR specification ceiling,
but `www/js/Vistas/QrTrazabilidad.js` renders into a fixed-size box regardless of module
count, so denser modules are a soft field-scan-reliability risk, not a hard failure.

`D:\Trabajos\GFE\qr-roundtrip-tests` is a real cross-repo harness spanning this repo,
`movil_comaco_gde`, and a VB.NET / SQL Server backend (`D:\Trabajos\GFE\GFE_comaco`) whose
contract test covers 19 fields. None of those 19 are plate or driver fields today.

### B. Consumer side (guias)

Two separate QR mechanisms coexist and must not be conflated:

1. **Inline scan-and-validate inside the header form** — `www/js/Vistas/EmisionDesdeFaena.js`
   (route `/EmisionDesdeFaena/...`). Decodes the same `GFEQR1` QR and validates its point
   against an already manually-selected rodal via `DATOS_validarPuntoGeocercaRodal`
   (`www/js/Datos/GeocercaRodal.js:125`). **This is the flow the request describes.**
2. **Downstream association / liberation round-trip** — `ValidacionQrTrazabilidad.js`.
   Unrelated to this change.

The hide-fields mechanism **already exists**: `www/pages/EmisionDesdeFaena.html:119` wraps
everything after rodal in `#contenido_posterior_qr_trazabilidad_faena`, toggled at
`www/js/Vistas/EmisionDesdeFaena.js:496`. It currently defaults to **visible** and hides only
on explicit QR rejection. The request wants the opposite default.

There is **no point-to-rodal reverse lookup**. `DATOS_validarPuntoGeocercaRodal(rolPredio,
rodal, longitud, latitud)` takes the rodal as an input. Inverting the flow requires new DAO
logic that resolves 0 / 1 / many matches, reusing the existing ambiguity-handling pattern.

The rodal name catalog and the geocerca geometry table (`GDE_GEOCERCA_RODAL`) are two
independent data sources joined only by string match.

### C. Compatibility

Consumer validation (`validarPayloadQrTrazabilidad`) only requires `tipo` and `qrId`; it does
not reject unknown keys. Both skew directions are therefore already safe:

- New QR read by an old guias app: extra fields ignored.
- Old QR read by a new guias app: new fields absent, must default gracefully (the existing
  `"-"` pattern at `EmisionDesdeFaena.js:789`).

Additive fields need **no version bump**.

The `GFE_comaco` backend is unaffected by ask 1 as currently scoped (in-app display only),
unless dispatcher visibility is required in the web portal too.

## Affected areas

| Repo | Path | Why |
| --- | --- | --- |
| movil_comaco | `www/js/Services/QrTrazabilidadService.js` | payload shape |
| movil_comaco | `www/js/Vistas/QrTrazabilidad.js` | render density |
| movil_comaco | `www/js/Datos/migraciones/Versiones.js`, `Tablas.js` | only if local persistence of new fields is wanted |
| movil_comaco | `tests/qr-guias-contract.test.js` | contract test update |
| shared | `D:\Trabajos\GFE\qr-roundtrip-tests` | fixture update |
| movil_comaco_gde | `www/js/Vistas/EmisionDesdeFaena.js`, `www/pages/EmisionDesdeFaena.html` | core of ask 2 |
| movil_comaco_gde | `www/js/Datos/GeocercaRodal.js`, `Servicios/GeocercaRodalService.js` | new point-to-rodal lookup |
| movil_comaco_gde | `tests/qr_backward_compat.test.js`, `package.json` | test script is a non-functional stub |
| GFE_comaco | backend contract | only if portal visibility is in scope |

## Approaches

### Ask 1 — QR payload

| # | Approach | Pros | Cons | Effort |
| --- | --- | --- | --- | --- |
| 1 | Additive fields, no version bump | matches tolerant validation; smallest and most reversible; both skew directions already safe | +18-20% QR density with no render compensation | Low |
| 2 | Bump `v`, enforce strictly | explicit; mirrors the stricter sibling contract | removes an existing safety property for no stated benefit; worse field outcome | Medium |
| 3 | Add render size / module-count awareness | mitigates the one real risk of #1 | touches rendering in both apps; needs on-device validation | Low-Medium |

Recommended: **#1**, optionally paired with **#3** as a companion.

### Ask 2 — guias flow inversion

| # | Approach | Pros | Cons | Effort |
| --- | --- | --- | --- | --- |
| 1 | Hard scan-first gate, no fallback | simplest; matches the literal wording | a damaged or unreadable QR permanently blocks the dispatcher; the codebase already has a `QR_TRAZABILIDAD_PERMITIR_AVANCE_SIN_VALIDACION` precedent for avoiding exactly this | Medium |
| 2 | Scan-first with manual fallback | preserves the existing safety-valve philosophy; still satisfies hidden-by-default | slightly more state and UI complexity | Medium |
| 3 | Minimal-diff shape: reuse the existing hide/show plumbing, invert the default, add the point-to-rodal query, move the scan CTA above rodal | lowest regression risk to the untouched association flow; smallest diff | — | Low-Medium |

Recommended: implementation shape **#3** combined with fallback policy **#2**.

## Risks

- QR density / scan reliability from added fields (soft, not a hard capacity failure).
- Two coexisting QR subsystems in guias; implementation must not conflate the inline
  validation flow with the association / liberation round-trip.
- No existing point-to-rodal spatial query. This is genuinely new logic, not a reorder.
- Two independent rodal data sources reconciled only by string match.
- The guias repo has no working local test command; its `npm test` is a stub. Strict TDD
  requires adopting `node --test tests/` there explicitly.
- Backend / dispatcher-portal scope is undetermined and could pull in the `GFE_comaco`
  19-field contract.
- `EmisionDesdeFaena.js:678` references `GDE_NOMBRE_CHOFER`, a field not found in this
  repo's GDE schema. Confirm before relying on it.
- A hard scan-first gate is a real field-operations risk versus a fallback.

## Open product decisions (block sdd-propose)

1. Dispatcher visibility: in-app only (guias, post-scan), or also the backend / web portal?
2. Ask 2: hard scan-first gate, or scan-first with manual fallback?
3. Should trazabilidad persist and display plate / driver locally, or are they pure
   pass-through data inside the QR ciphertext?
4. Driver field: name only, RUT only, or both?
5. Point-to-rodal search scope: bounded to the selected predio / orden de compra, or global
   across all rodales?

## Next

`sdd-propose`, once the five decisions above are resolved.
