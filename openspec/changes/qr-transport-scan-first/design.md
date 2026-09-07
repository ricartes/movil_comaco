# Design: QR Transport Data and Scan-First Rodal Resolution

Reflects two mid-flight product changes: (1) QR transport values are **auto-selected into the guias form when
they exist in the catalog**, with display-only as the graceful-degradation path; (2) three **crypto hardening**
measures accepted into scope — RUT tokenization, real random keys, and server-side key provisioning — which
become a new change sequenced **first**.

## Verdict on the slice boundary: SPLIT — and Change 2 now needs its own internal PR chain

The proposal set the trigger: keep both asks together "only while it stays one screen plus one query."
Two findings say it does not.

**1. The guias inline scan UI does not exist in markup.** `#row_qr_trazabilidad_faena`,
`#estado_qr_trazabilidad_faena`, `#detalle_qr_trazabilidad_faena` and the scan button appear in **no file**
under `movil_comaco_gde/www/pages/`. The only QR id in that markup is `contenido_posterior_qr_trazabilidad_faena`
(`EmisionDesdeFaena.html:119`). `escanear_qr_trazabilidad_faena` (`EmisionDesdeFaena.js:591`) has **zero call
sites**. The inline scan flow is unreachable dead code today, so the guias ask includes building the surface,
not reordering it.

**2. Auto-selection adds a sequenced async routine wrapped around a compliance gate.** It is no longer one
screen plus one query; it is one screen, one query, a three-step dependent auto-selection across async catalog
loads, and an extraction refactor of the truck-vigencia gate in the app's highest-traffic screen.

Add the structural reason: the Feature Branch Chain model requires child PRs to target the previous PR's
branch. Two slices in two different repositories cannot form one chain, so "one change, two sequenced slices"
is unrepresentable in the delivery model.

**3. Crypto hardening must precede both.** Confirmed: `qr-crypto-hardening` becomes a **third change,
sequenced first**. Rotation and key re-provisioning are free only while no QR exists in the field; once the
first QR ships, rotation becomes a coordinated two-app deployment against mixed versions.

**Scope correction to that assumption — it is bigger than the origin QR.** Verified: the same two key constants
are also used by the association/liberation contract, at `movil_comaco/www/js/Services/QrCryptoService.js:37-38`
and `movil_comaco_gde/www/js/Services/QrAsociacionGdeService.js:39-40`, besides the origin-QR sites at
`movil_comaco/.../QrTrazabilidadService.js:140-141` and `:192-193` and `movil_comaco_gde/.../QrTrazabilidadService.js:72-73`.
Key material therefore cannot be scoped to the origin QR: `qr-crypto-hardening` necessarily owns the
`GFEQRRET1:`/`GFEQRLIB1:` keys too, which the proposal declared out of scope and which `qr-roundtrip-tests`
covers. The out-of-scope declaration for `ValidacionQrTrazabilidad.js` still holds at the **behaviour** level —
no flow changes — but not at the **key** level. Its harness tests must move to the provisioned-key path, or the
harness pins the placeholder.

**Precision on "before any QR feature ships"**: since no QR feature is in production at all, changes 0, 1 and 2
can release together in a single production deployment. The binding constraint is narrower — **no build
containing the QR feature may be released with placeholder keys**, and change 0 must merge before changes 1–2.
It does not require its own separate production release.

| # | Change | Repo | Content | Est. changed lines |
|---|---|---|---|---|
| **0** | **`qr-crypto-hardening`** (new, FIRST) | both + harness | Key provider, server provisioning, real keys, RUT token, cold-start, harness re-keying | **~560** |
| **1** | `qr-transport-payload` (keep this change name) | `movil_comaco` + harness | 4 additive keys, alias mapping, density mitigation, fixtures | **~110** |
| **2** | `guias-scan-first-header` (new) | `movil_comaco_gde` | Test bootstrap, scan surface, point-to-rodal DAO, fallback, auto-selection, gate extraction | **~815** |

Component breakdown for change 0 (estimates, not measurements — I have no shell in this session to diff):
key provider + cache + validation ×2 repos ~120; call-site rewiring at the 5 sites above ~30; empresa-scoped
parameter read in guias ~30; `Constantes.js` PAG_IDs ×2 ~12; RUT token + normalization ~45; cold-start handling
×2 apps ~40; tests ~170; harness re-keying ~70; removals ~45.

**Chaining under the 400-line budget** (`ask-on-risk`): every change exceeds it, so all three chain internally.
Minimum **6 PRs**: 0a key provider + parameter plumbing + tests (~280) → 0b RUT token + cold-start + harness
(~280) → 1 (~110, single PR) → 2a test bootstrap (~60) → 2b scan surface + resolution + fallback (~400) →
2c auto-selection + gate extraction (~355). Total ~1485 lines. Each slice is in a single repo, so Feature
Branch Chains work; change 0 is the exception and must chain **per repo**, since it spans both.

Change 2's capability name should widen from `guias-scan-first-header` to include `guias-transport-autofill` —
worth telling `sdd-spec`.

### Flagged operational hazard — diverged guias remotes

`movil_comaco_gde` has two diverged remotes: `github/desarrollo` contains the QR files, `origin/desarrollo` does
not. Every guias file in changes 0 and 2 exists on only one of them. Pushing to the wrong remote either loses
the work or creates a conflicting history. Recorded as a hazard, not a task: the target remote must be fixed
explicitly before any guias work starts.

Branch topology above is the coordinator's `git ls-tree` verification (QR feature absent from `origin/master`
and `origin/prueba`; present on `origin/qr-limpieza`, `github/desarrollo`, `origin/desarrollo`). I could not
re-run it — no shell in this session — so it is relied upon, not independently confirmed.

## Architecture Decisions — Change 0, crypto hardening

### Decision: measures 2 and 3 land TOGETHER, never measure 2 alone

Rotating to real keys while still hardcoding them would place a real production key in git history
**permanently**. The source constants must not be replaced with better constants; they must be **removed** and
replaced by a provider. Measure 2 has no standalone deliverable — "generate real keys" is an operational act
whose only code footprint is the provider from measure 3. Sequencing them apart is the one ordering that
creates a permanent secret leak.

Three keys, domain-separated: `AES` (payload), `HMAC` (envelope), `MATCH` (RUT token). 256-bit, CSPRNG
(`openssl rand -hex 32`), per empresa, provisioned server-side, never committed.

### Decision: keys come from an empresa-scoped parameter read, not the PAG_ID-only helper

`DATOS_seleccionar_valorParametro` queries `WHERE PAG_ID=?` only and silently returns `rs.rows.item(0)` when
several rows match (`movil_comaco_gde/www/js/Datos/Parametros.js:2764-2771`), while `PARAMETRO_GENERAL` carries
an `EMP_ID` column (`Tablas.js:21`). With per-empresa keys on a device holding more than one empresa, that
helper returns an arbitrary empresa's key — a silent decrypt failure with no error surface.

**Choice**: read key material through an empresa-scoped accessor. `movil_comaco` **already has this pattern** —
`getParametroMovilPorNombre(idEmp, nombre)` → `DATOS_seleccionar_Parametro_movil_por_nombre`
(`www/js/Services/HelperService.js:102`) — so the producer reuses it and guias gains the equivalent
`DATOS_seleccionar_valorParametroPorEmpresa(empId, pagId, cb)` with `WHERE EMP_ID=? AND PAG_ID=?`. The
PAG_ID-only helper is **not** to be used for keys. The scan-first fallback flag may keep it; migrating it too is
consistency, not correctness.

Keys are read once per session after sync and cached in memory — not re-queried per QR.

### Decision: cold start fails CLOSED for crypto, while the workflow keeps failing OPEN

You cannot invent a key. A default key is exactly the vulnerability being removed, and emitting QRs under a
placeholder produces artifacts that are either unreadable after rotation or readable by anyone holding the
published default.

| App | Keys absent | Behaviour |
|---|---|---|
| `movil_comaco` (producer) | yes | QR generation unavailable, explicit message "Sincronice datos para habilitar el QR de trazabilidad". Load-point capture is unaffected — only QR emission |
| `movil_comaco_gde` (consumer) | yes | Scan cannot decrypt; same message, then route to the `PARAMETRO_GENERAL` manual fallback, which **fails open** |

The two fail-directions are deliberately opposite: **crypto fails closed** (an absent capability), **workflow
fails open** (an absent configuration). The dispatcher is therefore never blocked by a missing key — the
fallback designed for the damaged-QR case already covers it.

In practice the window is only "installed but never synced", since `WebServices.js:689` populates
`PARAMETRO_GENERAL` at sync, before any QR operation. It is not a real operational state, but it must be handled
explicitly rather than throwing.

### Decision: RUT travels as a truncated HMAC token; the driver NAME still does not

```
normalizarRut(rut)  = String(rut).replace(/[^0-9kK]/g, "").toUpperCase().replace(/^0+/, "")
rutChoferToken      = HMAC-SHA256(K_MATCH, normalizarRut(rut)).substring(0, 16)   // 64 bits
```

Guias derives the same token over each `#combo_chofer` option value — which **are** the RUTs (`js:1551`) — after
`combo_choferes` renders, and matches on the token. Auto-selection behaves identically; the national ID never
enters the payload. O(n) over one transportista's drivers, computed once: no perf concern. 64 bits gives
negligible collision probability for a 10⁴-driver catalog (≈10⁸/2⁶⁵); density cost is +4–6 chars on ~900,
already absorbed by the density mitigation.

**Normalization is the highest-risk detail in this change.** Chilean RUTs appear as `12.345.678-9`,
`12345678-9`, `123456789`, `12345678-K`. If producer and consumer normalize differently, **every match fails
silently** — the same failure class the driver-name alias list already guards. It requires one shared
normalization spec and a contract test asserting all format variants of one RUT yield one token, and that both
implementations agree.

**Disclosed limitation, by design**: the Chilean RUT space is ~30M, so a token is brute-forceable by anyone
holding `K_MATCH`. Measure 1 is therefore **not** a standalone confidentiality control — it only holds combined
with measures 2 and 3. Its independent value is removing the national ID from the payload at rest.

**Residual, stated plainly**: the driver **name** still travels in the payload, because the product decision
requires showing it as reference text when the driver is not in the catalog. So "no PII in the QR" is **not**
achieved — the higher-value identifier is removed, the name is not. Tokenizing the name would forfeit the
reference display the user asked for.

### Decision: bump `v` to 2 and gate on it — overturning the earlier no-version-bump conclusion

The additive/no-bump conclusion was correct for a world containing a deployed reader. Per the branch
verification, that world does not exist: no field device generates or reads these QRs. **The backward-compat
question is therefore moot, and the compatibility machinery should not be preserved for a version nothing
runs.**

Concretely: the payload is changing shape materially anyway (`rutChofer` → `rutChoferToken`), and this is the
last moment a clean break is free. Bump `v` to `2` and validate it. Drop the "legacy payload without transport
keys still decodes" scenario as a *compatibility guarantee* — keep tolerant handling of *unknown* keys, which is
free.

The gate is not a crash: a `v` mismatch reuses the existing `rechazar_qr_trazabilidad_faena` rejection path,
which already routes to the manual fallback. The exploration rejected a bump because it would remove a safety
property **for deployed devices**; with none deployed, the bump costs nothing and buys an explicit contract.
After the first coordinated production release, skew resumes and any *further* strict gating would again become
a liability — this is a one-time free break, not a new policy.

### Operational precondition — parameter transport must be HTTPS (blocking)

The service base URL is runtime configuration (`Obtener_dato_local("urlservidor")`,
`movil_comaco_gde/www/js/WebServices.js:8`), so the scheme is **not knowable from source** and I could not
verify it. If the deployment syncs over plain HTTP, measure 3 transmits the keys in clear on every sync and is a
net **regression** versus embedding them in the APK. Confirm HTTPS with certificate validation before measure 3
ships. This blocks change 0, it is not a nice-to-have.

**Honest limit of measure 3**: its real win is *rotatability without redeploy*, not at-rest secrecy. Keys sit in
a plaintext SQLite table on the device. The bar rises from "anyone holding the APK file" to "anyone with device
or DB access" — a genuine but bounded improvement.

## Architecture Decisions — Changes 1 and 2

### Decision: auto-selection routes through the real selection paths, never through a bare `.val()`

There are **two** compliance gates in this cascade, not one, and they require **different** mechanisms. A bare
`.val()` write fires neither: it would let a truck with an expired permiso de circulación / revisión técnica,
**and** a driver with an expired licence, into a guía unvalidated.

The critical detail: `.trigger("change")` rescues the driver gate but **not** the truck gate, because the truck
gate is not bound to `change` at all. "Drive both gates through their real handler paths" cannot mean "trigger
both". Mechanism is therefore chosen **per control, by what provably fires that control's gate** — the three
controls are not the same kind of thing.

| Gate | Control | Bound to | Does `.trigger("change")` fire it? |
|---|---|---|---|
| `validacionVigenciaCamion` → `camionvencido` (`js:100-114`) | `#combo_patente_camion` | F7 autocomplete **instance** `closed` event (`js:96`) | **No.** Not a DOM `change` listener at all |
| `validacionVigenciaChofer` → `licenciaChoferVencida` (`js:440-452`) | `#combo_chofer` | DOM `change` on the element (`js:428`) | **Yes** |
| none — label only (`js:416-426`) | `#combo_patente_carro` | DOM `change` on the element | Yes (no gate to fire) |

`.trigger("change")` is safe for the two selects: the handlers are bound to the `<select>` elements at page
init, and `combo_patentes_carro` / `combo_choferes` replace only the **options** via `.html(htmls)`
(`js:2130`, `js:2164`), so the element — and its listener — survives the catalog reload.

| Control | Type | Gate | Mechanism | Why this one |
|---|---|---|---|---|
| `#combo_patente_camion` (`html:154`) | `<input maxlength=6>` behind an F7 autocomplete (`js:66`) | `validacionVigenciaCamion` → `camionvencido` **blocks emission** (`js:100-114`) | **Extract** the `closed` body into `aplicar_patente_camion_seleccionada(patente, indicadorRecarga)`; call it from `closed` and from the QR path | `closed` is bound to the **autocomplete instance**, not the input. `$$('#combo_patente_camion').trigger('change')` does not run it at all. Event dispatch here is not inelegant, it is **non-functional**. Extraction is the only shape that guarantees the gate runs |
| `#combo_patente_carro` (`html:203`) | `<select>` smart-select | none — label only (`js:416-426`) | `.val(x).trigger("change")` | handler is bound to the element, so the trigger runs it; it only rebuilds the label — idempotent, no downstream reset, no loop |
| `#combo_chofer` (`html:228`) | `<select>` smart-select | `validacionVigenciaChofer` → `licenciaChoferVencida` (`js:428-452`) | `.val(rut).trigger("change")` | same binding, and the trigger runs the **licence gate** that a bare `.val()` would skip |

**The chofer join key is `rutChoferToken`, not `chofer`.** Verified: the combo's option **value** is the RUT
(`js:1045` sets it from `GDE_RUT_CONDUCTOR`; `js:1551` reads it back into `GDE_RUT_CONDUCTOR`), and the driver
**name** is only the option text (`js:1552`). Matching on the name would be a string guess against a display
label. After change 0 the payload carries no RUT, so guias computes `tokenRutQrTrazabilidad` over each option
value and matches tokens — still an exact key match, just on a derived key. The `chofer` name stays reference
text only.

Consequence for the fallback in the PII open question below: dropping the driver identifier entirely would
remove the combo's only exact join key, so chofer autofill would have to be dropped with it rather than degrade
to name matching.

### Decision: async ordering uses the codebase's own `indicador_recarga` hook, not new promise plumbing

`cargarInformacionTransportista` (`js:2094`) is **fire-and-forget** — it does not return the
`DATOS_ObtenerInformacionPatente` promise, so no caller can await the moment `#combo_patente_carro` and
`#combo_chofer` become populated (`js:2103-2104`). But it already forwards `indicador_recarga` into
`combo_patentes_carro` / `combo_choferes`, which call `recargar_combo_parente_carro()` /
`recargar_combo_choferes()` **after** the catalog is rendered (`js:2136`, `js:2171`). That is precisely a
"preselect once the catalog exists" hook.

**Choice**: add mode `indicador_recarga === 2` ("preselección QR") beside the existing `0` (fresh) and `1`
(reload from `gde_actual`), reading a page-scope `preseleccionTransporteQr`. Existing modes are untouched.

**Alternatives rejected**: promisifying `cargarInformacionTransportista`, `combo_patentes_carro` and
`combo_choferes` — three callback DAO consumers shared by the fresh and reload paths, converted to serve one
new caller, in the highest-traffic screen, to obtain ordering the existing hook already gives. `setTimeout` or
polling for the option to appear — a race dressed as a solution.

### Decision: sequencing and the abort rule

```
rodal RESUELTO ──► revelar contenedor
      │
      ▼  preseleccionTransporteQr = {patenteCamion, patenteCarro, rutChofer, chofer}
DATOS_seleccionar_patente_por_tipo(emp, OCE_TIPODOCTO, NUM_ORDEN, 'CAMION', patenteQr)
      │                                   ← misma fuente y mismo alcance OC que el autocomplete
 ¿match exacto TRIM/UPPER en CODIGO?
      │
   NO ─────────────► input vacio + valor de origen como referencia ──► HALT
      │
   SI ─► set input; aplicar_patente_camion_seleccionada(patente, 2)
              │
              ▼  await validacionVigenciaCamion            ← GATE 1 (async)
        vencido ──► alert("No se puede continuar. " + motivo) + camionvencido(true) ──► HALT
              │       (mismo dialogo y mismo motivo que la seleccion manual)
           vigente
              ▼  cargarInformacionTransportista(..., 2)
                 (el catalogo de carro y chofer NO existe hasta aqui)
      ┌───────┴────────┐
      ▼                ▼        (cada uno, tras render del catalogo, modo 2)
combo_patentes_carro   combo_choferes
      │                │
 ¿existe option?  ¿existe option value == rutChofer?
      │                │
 NO: vacio + ref  NO: vacio + ref
 SI: .val()       SI: .val(rut).trigger("change")
     .trigger("change")     │
     (sin gate)             ▼  await validacionVigenciaChofer   ← GATE 2 (async)
                      vencida ──► alert("No se puede continuar. " + motivo)
                                  + licenciaChoferVencida(true) ──► HALT
```

Two async gates, and the driver catalog does not exist until the truck step resolves — which is why the
sequence is strictly ordered and cannot be parallelised.

**Still no mismatch detection.** If the dispatcher edits an auto-selected value afterwards, nothing compares,
warns, or records. Auto-selection is a pre-fill; the reference line is a display.

### Decision: a failed gate HALTS the sequence, and is indistinguishable from the manual path

**Confirmed product decision** — "si el camión sale vencido, debe arrojar el mensaje, indicando que no se puede
continuar por el motivo".

**Choice**: on a failed vigencia gate the dispatcher sees exactly what a manual selection produces — the same
blocking dialog carrying the same reason string, and the same blocking flag — and the auto-selection sequence
**halts**.

| Gate fails | Dialog | Flag | Sequence |
|---|---|---|---|
| `validacionVigenciaCamion` | `app.dialog.alert("No se puede continuar. " + resultado.mensaje, "Emisión desde faena")` (`js:102`) | `camionvencido(true)` (`js:103`) | **HALT** — trailer plate and driver are not auto-selected |
| `validacionVigenciaChofer` | same shape, `js:443` | `licenciaChoferVencida(true)` (`js:444`) | **HALT** — last step; the selection stays, exactly as a manual pick would |
| plate absent from catalog | none (not a compliance failure) | none | **HALT** — control empty, origin value shown as reference |

**Rationale for the halt**: the guía cannot proceed, so populating downstream fields on an already-blocked form
adds noise without value. It is also required for correctness — `camionvencido(true)` puts `disabled` on
`#item-patente-carro` and `#item-chofer` (`js:2526-2537`), so continuing would auto-fill controls the gate just
closed. Stated here rather than buried, so it is visible for review and the user can correct it.

**Indistinguishability is structural, not duplicated.** Both mechanisms reach the gate through its *existing*
call site — the truck via the extracted `aplicar_patente_camion_seleccionada` (the same body the `closed`
handler now calls), the driver via `.trigger("change")` on the real handler. There is therefore **no second
message string, no auto-selection variant of the dialog, and no path where the reason can be reworded, softened
or swallowed** — the alert is literally the same line of code in both flows. Any implementation that emits its
own message for the auto path has diverged from this design and is caught by the gate-integrity test below.

On halt after a failed gate, the origin values still render as reference text, and `licenciaChoferVencida` /
`camionvencido` keep `#div_botones_emision_faena` hidden — emission stays blocked by the existing mechanism, not
by anything new.

### Decision: catalog-existence is what keeps "no new persistence" true

On save, `gde.GDE_PATENTE_CAMION` (`js:1553`), `GDE_PATENTE_CARRO` and `GDE_RUT_CONDUCTOR` / `GDE_NOMBRE_CHOFER`
(`js:1551-1552`) are written from the **controls**, through the existing flow. Auto-selection therefore does not
persist QR data as new data — it persists the **catalog value the control now holds**, byte-identical to a manual
pick. This is exactly why "siempre y cuando se encuentren" is the correct rule and not a convenience: an
unmatched QR value never enters a control, so it never reaches persistence. It is shown as reference text only.
No schema change, no migration, in either repo.

### Decision: the same hole already exists in the reload path — documented, NOT fixed here

`recargar_datos_gde` writes `$$("#combo_patente_camion").val(gde_actual.GDE_PATENTE_CAMION)` (`js:1193`) and
calls `cargarInformacionTransportista` (`js:1195`) **without** `validacionVigenciaCamion` or `camionvencido`.
`recargar_combo_choferes` writes `.val()` (`js:1045`) **without** `.trigger("change")`, so
`validacionVigenciaChofer` never runs. `validacionVigenciaCamion` has exactly one call site in the file
(`js:100`), inside the autocomplete handler.

So yes — the precedent at `js:1018` and its siblings have the identical hole, in **both** gates. Reopening a
borrador whose truck documents expired since creation does not re-gate. It is pre-existing, not caused by this
change, and fixing it alters behaviour for every existing guía reload — a different blast radius and a separate
decision. **Do not copy that pattern.** Logged as a defect candidate; the extraction above reduces the eventual
fix to a call swap at `js:1193-1195`.

### Decision: driver-name column asymmetry — ordered alias list, producer only

**Verified**: `movil_comaco/www/js/Datos/Tablas.js:12` declares `GDE_NOM_CONDUCTOR`;
`movil_comaco_gde/www/js/Datos/Tablas.js:15` declares `GDE_NOMBRE_CHOFER`. Both names are **already in
circulation inside `movil_comaco` itself** — its `EmisionDesdeFaena.js:678` reads `gde_actual.GDE_NOMBRE_CHOFER`
off a row built from the `GDE_NOM_CONDUCTOR` schema. A single-column read is the predicted silent-empty failure,
and it is reachable today.

**Choice**: one mapping table, ordered alias list, first non-empty wins, in
`movil_comaco/www/js/Services/QrTrazabilidadService.js` beside the payload builder.

```js
var QR_TRAZABILIDAD_MAPEO_TRANSPORTE = {
    patenteCamion: ["GDE_PATENTE_CAMION"],
    patenteCarro:  ["GDE_PATENTE_CARRO"],
    rutChofer:     ["GDE_RUT_CONDUCTOR"],
    chofer:        ["GDE_NOM_CONDUCTOR", "GDE_NOMBRE_CHOFER"]   // no asumir simetria
};
function valorTransporteQrTrazabilidad(gde, clave) { /* first non-empty, trimmed, else null */ }
```

**Consumer mapping: none, by design.** `movil_comaco_gde` reads neutral payload keys, never a column; its
`GDE_NOMBRE_CHOFER` persistence path is untouched. A consumer-side mapping is explicitly rejected.
**Rejected**: a single canonical column (the failure itself); renaming a column (migration, forbidden); a shared
config file (no module system — a new global needs an `index.html` script tag, extra surface for 12 lines).

### Decision: QR density mitigation is MANDATORY here, not conditional on the device test

**Choice**: derive render size from the module count `pintarQrTrazabilidad` **already computes**
(`QrTrazabilidad.js:199`, logging-only today).

```
modulos     = qrGenerado._oQRCode.getModuleCount();
tamanoFinal = min(anchoDisponible - 2*quietZone, max(configuracion.tamano, 3 * modulos));
ajustarElementosRenderQrTrazabilidad(elemento, tamanoFinal);   // ya existe; el canvas escala
```

Floor of 3 px/module. Arithmetic, not opinion: version 27 = 125 modules; the 320 px breakpoint gives
**2.56 px/module — already below the floor before any field is added**; 420 px gives 3.36. The small breakpoint
needs this regardless. ~5 lines in a function this change already touches, no new dependency, versus shipping a
known density regression and hoping. Bound growth at the source too: cap `chofer` at 40 chars.

**What the device test must show** (release gate, not an implementation precondition): a QR built from a payload
with all four fields at worst case (8-char plates, 40-char name, 12-char RUT), rendered at the **320 px
breakpoint**, scanned by the guias ML Kit scanner on the oldest supported field device, **5/5 successes** at
25–40 cm, indoors and in outdoor daylight, screen at 50 % brightness. Any failure → raise the floor or shorten
the `chofer` cap.

### Decision: rodal catalog ↔ geometry join rule

Sources: `RODAL(EMPRESA, TIPO_DOCTO, NRO_OC, RODAL, NOM_RODAL, …)`, whose `RODAL` column **is** the
`#combo_rodal` option value (`Parametros.js:1093`), and `GDE_GEOCERCA_RODAL(ROL_PREDIO, RODAL, GEOCERCA, …)`.
The join key is the rodal **code**, not the display name.

**Rule**: `INNER JOIN ON TRIM(UPPER(g.RODAL)) = TRIM(UPPER(r.RODAL))`, then `DISTINCT` on the catalog code.
`TRIM` because this dataset is known to carry padding (`Parametros.js:1095` already trims); `UPPER` as cheap
defence. **No fuzzy, prefix or partial matching** — anything looser is guessing.

| Outcome | Condition | Behaviour |
|---|---|---|
| `RESUELTO` | exactly 1 distinct catalog code | set `#combo_rodal`, fire its existing `change` handler so `DATOS_ObtenerDatosRodal` + `combo_productos` run identically to a manual pick; reveal the container; then start the transport cascade |
| `AMBIGUO` | > 1 distinct code | **never auto-select**; show the matched codes and require an explicit pick from that reduced list; container hidden until picked |
| `SIN_COINCIDENCIA` | 0 spatial hits | container hidden; message names the reason; route to fallback |
| `GEOMETRIA_HUERFANA` | spatial hits exist, none join a catalog code | distinct outcome — a data-sync defect, not a misplaced driver. Container hidden. **Never** set the combo to the orphan string: it is not a valid option and would write `GDE_RODAL` with no `NOM_RODAL` (`js:1534`) |

A catalog rodal with no geometry is not an error; it simply never appears in the hit set. `FLAG_CONTROL` is
**not** reused — it means "outside the geocerca, continue with warning", and in resolution the point is inside
by definition.

### Decision: `PARAMETRO_GENERAL` fallback fails OPEN when the row is absent

`Constantes.js` gains `parametroQrTrazabilidadAvanceSinValidacion: <PAG_ID>` inside the `Constantes` object
next to `parametroIva: 3`. Read with the existing `DATOS_seleccionar_valorParametro(valor, callback)`
(`Parametros.js:2754`), which returns `-1` when absent. Truthy = `"1"` or `"S"`.

**Choice**: absent row (`-1`) ⇒ fallback **allowed**.

**Rationale**: rows are populated generically by `WebServices.js:689`, so an unsynced device is an expected
state, not an edge case. Fail-closed's failure mode is a dispatcher who cannot emit a guía at all — a business
stoppage, exactly what the confirmed product decision rejected. Fail-open's failure mode is a manual rodal pick,
which **is today's production behaviour** and therefore not a regression. It also removes DBA provisioning from
the release critical path.

The hardcoded `QR_TRAZABILIDAD_PERMITIR_AVANCE_SIN_VALIDACION` (`Constantes.js:16`) becomes the pre-read default
for a page-scope cached variable, preserving the call shape at `js:1268`.
`QR_TRAZABILIDAD_VALIDACION_RODAL_OBLIGATORIA` is out of scope.

## Data Flow — generate → scan → resolve → reveal → autofill

```
movil_comaco (origen)                        movil_comaco_gde (guias)
─────────────────────                        ────────────────────────
PuntosGDE.js:374 captura punto carga
        │
        ▼ QrTrazabilidadService
  valorTransporteQrTrazabilidad(gde, k)   ← alias list resuelve el nombre
  payload {v, tipo, qrId, …, patenteCamion,
           patenteCarro, chofer, rutChofer}
        │ AES-256-CBC + HMAC-SHA256 + base64 x2
        ▼ "GFEQR1:…"  (~890-910 chars, version ~27-28 nivel M)
        │
        ▼ QrTrazabilidad.js:pintarQrTrazabilidad
   px = min(ancho, max(box, 3 * getModuleCount()))   ← mitigacion de densidad
        │
  [QR en pantalla] ── camara (ML Kit) ──►  #btn_escanear_qr_trazabilidad_faena  (NUEVO)
                                                  │
                                                  ▼ procesar_qr_trazabilidad_faena
                                            validarTextoQrTrazabilidad → payload
                                                  │
                                                  ▼ resolverRodalPorPuntoQr(payload, rolPredio,
                                                        empresa, OCE_TIPODOCTO, NUM_ORDEN)
                                                  ▼ DATOS_buscarRodalPorPunto
                                            ST_Contains(GeomFromGeoJSON(g.GEOCERCA),
                                                        ST_GeomFromText('POINT(lon lat)'))
                                            ⋈ RODAL (TRIM/UPPER, DISTINCT)
                                                  │
             ┌──────────┬─────────────────────────┴──────────┬──────────────────┐
             ▼          ▼                                    ▼                  ▼
         RESUELTO    AMBIGUO                        SIN_COINCIDENCIA   GEOMETRIA_HUERFANA
             │          │                                    └────────┬─────────┘
    set #combo_rodal  lista reducida                                  ▼
    trigger change    (pick manual)          DATOS_seleccionar_valorParametro(PAG_ID)
             │                                 -1 | "1" | "S" → permitir seleccion manual
             ▼                                 otro           → permanece oculto
    revelar #contenido_posterior_…
             │
             ▼  cascada de transporte (ver regla de HALT arriba)
    camion → GATE 1 vigencia → transportista → {carro, chofer} → GATE 2 licencia chofer
    no encontrado en catalogo ⇒ campo vacio + valor de origen como referencia
    gate fallido ⇒ mismo dialogo/motivo que la via manual + HALT
```

Rodal resolution reuses the orden de compra already fixed at `js:320`
(`combo_rodal(empresa, OCE_TIPODOCTO, NUM_ORDEN, 0)`), the same scope `DATOS_ObtenerDatosRodal` and the truck
autocomplete's `DATOS_seleccionar_patente_por_tipo` use. `#combo_predio` supplies `ROL_PREDIO` and is selected
before rodal (`html:31`).

## File Changes

### Change 0 — `qr-crypto-hardening` (both repos + harness), chained per repo 0a → 0b

| File | Action | Description |
|---|---|---|
| `movil_comaco/www/js/Services/QrTrazabilidadService.js` | Modify | **Remove** the key constants (`:16-17`); key provider + cache; rewire `:140-141`, `:192-193`; `normalizarRut` + `tokenRutQrTrazabilidad`; `v: 2` |
| `movil_comaco/www/js/Services/QrCryptoService.js` | Modify | Rewire `:37-38` to the provider (association contract) |
| `movil_comaco/www/js/Services/HelperService.js` | Modify | Reuse `getParametroMovilPorNombre` for key rows |
| `movil_comaco_gde/www/js/Services/QrTrazabilidadService.js` | Modify | **Remove** the key constants (`:9-10`); provider; rewire `:72-73`; `v: 2` validation; token match helper |
| `movil_comaco_gde/www/js/Services/QrAsociacionGdeService.js` | Modify | Rewire `:39-40` to the provider |
| `movil_comaco_gde/www/js/Datos/Parametros.js` | Modify | `DATOS_seleccionar_valorParametroPorEmpresa(empId, pagId, cb)` — `WHERE EMP_ID=? AND PAG_ID=?` |
| `www/js/Common/Constantes.js` (gde) + producer equivalent | Modify | Three key PAG_IDs per app |
| Producer QR view + guias scan path | Modify | Cold-start messages; consumer routes to the fallback |
| `movil_comaco/tests/qr-guias-contract.test.js`, `movil_comaco_gde/tests/*` | Create/Modify | Normalization matrix, no-literal-key assertion, cold start |
| `qr-roundtrip-tests/support/*`, `tests/qr_roundtrip.test.js`, `tests/qr_security.test.js` | Modify | Re-key **both** contracts onto provisioned keys |

### Change 1 — `qr-transport-payload` (`movil_comaco` + harness)

| File | Action | Description |
|---|---|---|
| `www/js/Services/QrTrazabilidadService.js` | Modify | Mapping + `valorTransporteQrTrazabilidad`; `patenteCamion`, `patenteCarro`, `chofer`, `rutChoferToken` in the `payload` literal (`:94-110`); 40-char `chofer` cap. Token production itself lands in change 0 |
| `www/js/Vistas/QrTrazabilidad.js` | Modify | Size from `getModuleCount()` (`:199`); re-call `ajustarElementosRenderQrTrazabilidad` |
| `tests/qr-guias-contract.test.js` | Modify | Payload shape + driver alias truth table + density contract |
| `package.json` | Modify | **FLAG (config.yaml tasks rule)** — add the 3 missing files to `"test"` |
| `qr-roundtrip-tests/fixtures/cargas.js` | Modify | Transport columns on `cargaPrincipal` (producer names) + new `cargaChoferAlterno` using `GDE_NOMBRE_CHOFER` |
| `qr-roundtrip-tests/tests/qr_roundtrip.test.js` | Modify | Four keys survive the round trip; legacy payload without them still decodes |
| `qr-roundtrip-tests/tests/backend_payload_contract.test.js` | Modify | Assert the contract is **still 19 fields**, so scope creep into `GFE_comaco` fails the suite |

### Change 2 — `guias-scan-first-header` (`movil_comaco_gde`), chained 2a → 2b → 2c

| File | Action | Slice | Description |
|---|---|---|---|
| `package.json` | Modify | 2a | `"test": "node --test \"tests/*.test.js\""` replacing the `npm init` stub. **Nothing can be RED until this lands** |
| `www/pages/EmisionDesdeFaena.html` | Modify | 2b/2c | **New** scan CTA + status rows above `#block_rodal`; reference lines inside `#block_patente_camion` / `#block_patente_carro` / `#block_chofer`; container at `:119` defaults `display:none` |
| `www/js/Datos/GeocercaRodal.js` | Modify | 2b | `DATOS_buscarRodalPorPunto(rolPredio, empresa, tipoDocto, numOrden, lon, lat)` |
| `www/js/Servicios/GeocercaRodalService.js` | Modify | 2b | `resolverRodalPorPuntoQr` returning the 4 outcomes |
| `www/js/Common/Constantes.js` | Modify | 2b | PAG_ID entry; demote `:16` const to pre-read default |
| `www/js/Vistas/EmisionDesdeFaena.js` | Modify | 2b | Bind the CTA (none exists); invert the default at `:512`; resolution branch replacing the rodal precondition at `:594`/`:677`; cached parameter for `:1268` |
| `www/js/Vistas/EmisionDesdeFaena.js` | Modify | 2c | **Extract** `aplicar_patente_camion_seleccionada` from the `closed` body (`:97-118`); `preseleccionTransporteQr`; `indicador_recarga === 2` in `cargarInformacionTransportista` (`:2094`), `combo_patentes_carro` (`:2136`), `combo_choferes` (`:2171`); `pintar_referencia_transporte_qr` |
| `tests/emision_desde_faena_scan_first.test.js` | Create | 2b | Markup/binding/default-hidden/parameter contract |
| `tests/geocerca_rodal_punto.test.js` | Create | 2b | Resolution truth table |
| `tests/transporte_autoseleccion_qr.test.js` | Create | 2c | Autofill truth table + gate-integrity contract |

## Interfaces / Contracts

```js
// Payload v2 (movil_comaco). `v: 2` IS validated — see the version decision above.
// Unknown keys stay tolerated. null when absent; guias shows "-".
{ v: 2,
  patenteCamion: String|null, patenteCarro: String|null,
  chofer: String|null /* <=40, reference text only, still plaintext PII */,
  rutChoferToken: String|null /* 16 hex chars, HMAC(K_MATCH, normalizarRut(rut)); combo key */ }

// Change 0, both repos
obtenerClavesQrTrazabilidad(empId) -> Promise<{aes, hmac, match}>   // throws when unprovisioned
normalizarRut(rut) -> String            // ONE shared spec; divergence = silent total match failure
tokenRutQrTrazabilidad(rut, kMatch) -> String

// movil_comaco_gde
resolverRodalPorPuntoQr(payloadQr, rolPredio, empresa, tipoDocto, numOrden)
  -> { estado: "RESUELTO"|"AMBIGUO"|"SIN_COINCIDENCIA"|"GEOMETRIA_HUERFANA",
       rodal: String|null,     // non-null ONLY when RESUELTO
       candidatos: String[],   // catalog codes, populated when AMBIGUO
       mensaje: String }

aplicar_patente_camion_seleccionada(patente, indicadorRecarga) -> Promise<{ ok: Boolean }>
  // ok === false => vigencia failed or no plate; caller MUST abort the cascade
```

## Testing Strategy

Contract/source-assertion style, matching both repos. `node --test tests/` is **broken** on Node v22.19.0
(`ERR_UNSUPPORTED_DIR_IMPORT`); the working forms are an explicit file list or `node --test "tests/*.test.js"`.
`movil_comaco` keeps the explicit list (CI's `suite-node` job parses it) plus the 3 missing files.

| Layer | What | Approach |
|---|---|---|
| Contract | Driver alias truth table | 3 fixtures: only `GDE_NOM_CONDUCTOR` → non-empty `chofer`; only `GDE_NOMBRE_CHOFER` → non-empty; neither → `null`. Plus a source assertion that both names appear in the mapping, so a `Tablas.js` rename is caught |
| Contract | Density | source contains the `getModuleCount()`-derived sizing; px/module ≥ 3 at the 320 px breakpoint for a 125-module code |
| Contract | Scan surface (2b) | `EmisionDesdeFaena.html` contains the CTA id; the JS binds it; container default is `none` |
| Unit | Rodal resolution (2b) | Truth table over a stubbed SQLite adapter mirroring `qr-roundtrip-tests/support/sqliteTestDatabase.js` |
| Unit | Autofill (2c) | Matrix: plate in / not in catalog × vigencia camión ok / vencido × carro option present / absent × chofer RUT present / absent × vigencia chofer ok / vencida. Asserts unmatched ⇒ control empty **and** reference shown; camión vencido ⇒ `camionvencido(true)` **and** carro/chofer never set (halt); chofer vencida ⇒ `licenciaChoferVencida(true)` and the selection retained |
| Contract | **Gate integrity** (2c) | `validacionVigenciaCamion` appears exactly **once** in `EmisionDesdeFaena.js` (inside the extracted function) and `validacionVigenciaChofer` exactly once (inside the `change` handler); the autocomplete `closed` body calls `aplicar_patente_camion_seleccionada`; the chofer autofill path contains `.trigger("change")`; the literal `"No se puede continuar. "` appears exactly **twice** in the file — once per gate. These fail loudly if anyone re-inlines the handler, "optimises" a trigger into a bare `.val()`, or adds an auto-selection variant of the blocking message |
| Contract | **RUT normalization** (chg 0) | Format matrix: `12.345.678-9`, `12345678-9`, `123456789`, lowercase `k`, leading zeros → all yield ONE token; producer and consumer implementations asserted to agree. The highest-risk silent failure in change 0 |
| Contract | Key provisioning (chg 0) | No key literal remains in either repo's source (regex assertion over `QrTrazabilidadService.js`, `QrCryptoService.js`, `QrAsociacionGdeService.js`); keys read through the empresa-scoped accessor; the PAG_ID-only helper is never used for key material |
| Unit | Cold start (chg 0) | Keys absent ⇒ producer refuses to generate with the sync message; consumer refuses to decrypt and routes to the fallback; neither throws |
| Integration | Round trip | Four keys survive encrypt→decrypt under provisioned keys; **both** contracts (`GFEQR1:` and `GFEQRRET1:`/`GFEQRLIB1:`) re-keyed in the harness; `v:2` gate rejects a `v:1` payload through the existing rejection path; backend contract still 19 fields |
| Manual | Density device test | Gate defined above. Not automatable — no Appium/Playwright in either repo |

## Cordova / Android / Gradle constraints

- `cordova-android ^13.0.0` in **both** repos (verified in both `devDependencies`); target Android 13+.
- **No** plugin added or version-changed, **no** `config.xml` Gradle pref, `plugins-local/` or `firebase/`
  touched in either repo. The `config.yaml` high-risk rule does not fire.
- Scanning reuses `cordova-plugin-mcc-mlkit-barcode-scanner@4.0.2` (pinned exact, both repos) through the
  existing `cordova.plugins.mlkit.barcodeScanner.scan` call at `js:606`.
- Spatial query reuses `cordova-sqlite-spatialite-evplus-ext-common-free` with `ST_Contains`,
  `GeomFromGeoJSON`, `ST_GeomFromText` — all already used at `GeocercaRodal.js:142`. No new spatial function.
- Auto-selection uses Framework7 6.3.14 autocomplete and smart-select as already configured. No F7 upgrade.
- Rendering uses `davidshimjs/qrcode` via `<script>` in `www/index.html`. No bundler: new globals must live in
  existing files, which is why no new source file is created.
- Node v22.19.0 for the test runner in both repos.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration
boundary. All work is in-app UI, a local SQLite query, and an in-process payload literal.

## Migration / Rollout

No schema migration in either repo. Order: **Change 0 → Change 1 → Change 2** (2a → 2b → 2c). Change 0 must
merge before any release carrying the QR feature; all three may then release together, since none of this is in
production yet.

Rollback: change 0 is the one with a real coordination cost — reverting it after a QR reaches the field would
require both apps to revert together, which is exactly why it goes first, while that cost is zero. Changes 1
and 2 revert independently; 2c reverts independently of 2b, leaving scan-first working without autofill. The
`PARAMETRO_GENERAL` fallback row still flips server-side with no app release.

Mixed field versions: the `v: 2` gate is a one-time free break taken while nothing is deployed. After the first
coordinated release, additive-and-tolerant remains the rule.

## Open Questions

- [x] ~~New PII in a payload encrypted with a key baked into both APKs.~~ **Resolved** — the user accepted all
      three hardening measures into scope as change 0. Residual, still worth review: the driver **name** remains
      in the payload (required for reference display), and measure 1's token is brute-forceable over the ~30M
      RUT space by anyone holding `K_MATCH`, so it depends on measures 2–3 holding.
- [ ] **Parameter transport scheme is unverified and blocking.** Confirm the sync endpoint is HTTPS with
      certificate validation before change 0 ships; over plain HTTP, server-provisioned keys are a net
      regression versus embedding them.
- [ ] Server/DBA work for change 0: three key rows per empresa in `PARAMETRO_GENERAL`, plus generation and
      custody of the key material. Larger than the single fallback-flag row, and on the critical path — unlike
      the fallback flag, keys cannot fail open.
- [ ] PAG_ID for the fallback parameter must be assigned by the DBA before Change 2 merges. Fail-open keeps it
      off the critical path, but the placeholder cannot ship.
- [ ] Whether the pre-existing reload-path gate hole (`js:1193-1195`, `js:1045`) gets its own change. Not fixed
      here; the extraction makes the fix a call swap.
