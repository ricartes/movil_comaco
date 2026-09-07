# Guias Scan-First Header Specification

## Purpose

The `EmisionDesdeFaena` header entry inverts its default order: scanning the origin QR comes before rodal selection and resolves it via `rodal-point-resolution`. Fields after rodal stay hidden until a rodal is resolved or a server-governed manual fallback is taken. Origin transport data from the QR (`qr-transport-payload`) resolves against the existing destination catalogs: a catalog match auto-selects the field through the same path as a manual selection; no match leaves the field empty and shows the origin value as reference. No comparison or mismatch detection is ever performed.

Two of the three catalog-backed controls are gated: the truck plate blocks emission on an expired permiso de circulación / revisión técnica, and the driver blocks emission on an expired licence. The trailer plate control has no gate. Both gates fire only on DOM `change`/`closed` handlers, which a programmatic value assignment does not trigger — so auto-selection must invoke those handlers, never bypass them, and MUST surface the same blocking dialog and reason text the manual path shows. The driver and trailer catalogs are populated only after the truck-plate cascade completes, so auto-selection is sequenced (truck, then driver, then trailer) and halts immediately at the first gate failure.

`#combo_chofer`'s option values are the driver's RUT, not the driver's name. Because the origin QR no longer carries the RUT itself (only a derived matching token — see `qr-transport-payload`), driver auto-selection matches by comparing that decoded token against a token derived locally from each catalog option's RUT value; it does not match on the decoded driver name. The decoded name (`chofer`) is used only for reference display when no token matches.

## Requirements

### Requirement: Post-Rodal Fields Hidden By Default

On entering the header screen, `#contenido_posterior_qr_trazabilidad_faena` MUST start hidden. This inverts the current default of visible-unless-rejected.

#### Scenario: Fresh entry

- GIVEN the dispatcher opens the `EmisionDesdeFaena` header screen for a new order
- WHEN the screen renders
- THEN `#contenido_posterior_qr_trazabilidad_faena` and everything inside it is hidden

### Requirement: Reveal On Rodal Resolution

The system MUST reveal `#contenido_posterior_qr_trazabilidad_faena` when the scanned QR point resolves to exactly one rodal (per `rodal-point-resolution`) and that rodal is auto-selected.

#### Scenario: Successful scan-first resolution

- GIVEN the dispatcher scans the origin QR before selecting a rodal
- WHEN the point resolves to exactly one in-scope rodal
- THEN `#combo_rodal` is auto-selected and `#contenido_posterior_qr_trazabilidad_faena` becomes visible

### Requirement: Manual Fallback Governed By Server Parameter

The system MUST read a `PARAMETRO_GENERAL` row (replacing the hardcoded `QR_TRAZABILIDAD_PERMITIR_AVANCE_SIN_VALIDACION` constant) to decide whether the dispatcher MAY manually reveal and complete the post-rodal fields when the scan does not resolve a rodal. This MUST be toggleable server-side without an app deploy. The system MUST NOT hard-block the dispatcher when this parameter permits manual advance.

#### Scenario: Fallback permitted

- GIVEN the `PARAMETRO_GENERAL` row for manual advance is set to permit
- AND the scanned QR does not resolve to a rodal
- WHEN the dispatcher requests manual advance
- THEN post-rodal fields become visible and the dispatcher may select a rodal and continue manually

#### Scenario: Fallback not permitted

- GIVEN the `PARAMETRO_GENERAL` row for manual advance is set to deny
- AND the scanned QR does not resolve to a rodal
- WHEN the dispatcher requests manual advance
- THEN post-rodal fields stay hidden and the dispatcher cannot proceed without a resolving scan

### Requirement: Catalog-Conditional Field Auto-Selection

Once the QR decodes successfully, the system MUST resolve `patenteCamion`, `patenteCarro`, and `chofer` against their respective destination catalogs, scoped to the current orden de compra:

- `#combo_patente_camion` (`<input type="text" maxlength="6">`, Framework7 autocomplete over `DATOS_seleccionar_patente_por_tipo(empresa, OCE_TIPODOCTO, NUM_ORDEN, 'CAMION', query, cb)`): MUST auto-select when the QR plate matches an autocomplete candidate.
- `#combo_patente_carro` (`<select>` smart-select): MUST auto-select the matching `<option>` when one exists.
- `#combo_chofer` (`<select>` smart-select, option values are driver RUTs): MUST auto-select the option whose RUT-derived token matches the decoded `rutChoferToken`; it MUST NOT match on the decoded `chofer` name.

When no matching catalog entry exists for a field, the system MUST leave that field empty (not auto-selected) and MUST still be able to select the field manually. For the truck and trailer plates, the origin QR value MUST render as reference text on no match. For the driver, only the decoded `chofer` name MUST render as reference text on no token match — the token itself MUST NOT be rendered to the dispatcher, and there is no RUT reference display, since the RUT never appears in the payload. Regardless of auto-selection outcome, the system MUST NOT compare any origin value against a destination-typed value and MUST NOT perform mismatch detection.

Gate behavior for the truck plate and driver controls, the absence of any gate for the trailer plate, and the required sequencing between the three controls are specified separately below; this requirement governs catalog matching only.

#### Scenario: Truck plate found in catalog

- GIVEN the decoded `patenteCamion` matches a candidate returned by `DATOS_seleccionar_patente_por_tipo` for the current orden de compra
- WHEN transport field resolution runs
- THEN `#combo_patente_camion` auto-selects that plate

#### Scenario: Truck plate not found in catalog

- GIVEN the decoded `patenteCamion` matches no candidate for the current orden de compra
- WHEN transport field resolution runs
- THEN `#combo_patente_camion` stays empty, the origin plate renders as reference text, and the dispatcher can still type or search manually

#### Scenario: Trailer plate found in catalog

- GIVEN the decoded `patenteCarro` matches an option in `#combo_patente_carro`
- WHEN transport field resolution runs
- THEN `#combo_patente_carro` auto-selects that option

#### Scenario: Trailer plate not found in catalog

- GIVEN the decoded `patenteCarro` matches no option in `#combo_patente_carro`
- WHEN transport field resolution runs
- THEN `#combo_patente_carro` stays unselected, the origin plate renders as reference text, and the dispatcher can still select manually

#### Scenario: Driver found in catalog

- GIVEN the token derived locally from an option's RUT value in `#combo_chofer` matches the decoded `rutChoferToken`
- WHEN transport field resolution runs
- THEN `#combo_chofer` auto-selects that option

#### Scenario: Driver not found in catalog

- GIVEN no option's locally derived token matches the decoded `rutChoferToken`
- WHEN transport field resolution runs
- THEN `#combo_chofer` stays unselected, the decoded `chofer` name renders as reference text, and the dispatcher can still select manually

#### Scenario: Derived token is never shown to the dispatcher

- GIVEN a decoded payload includes `rutChoferToken`
- WHEN the header screen renders or resolves the driver field
- THEN the token value is never rendered to the dispatcher and is used only to compute the auto-selection match

#### Scenario: No comparison regardless of outcome

- GIVEN any combination of auto-selected and not-found transport fields
- WHEN the header screen renders
- THEN no origin value is compared against a destination-typed value and no mismatch is flagged

### Requirement: Auto-Selected Truck Plate Triggers Manual-Selection Cascade

When `#combo_patente_camion` auto-selects because the QR plate matched a catalog candidate, the system MUST route that selection through the same code path as a manually chosen plate — the autocomplete `closed` handler — and MUST NOT set the field's value directly without invoking that path. This path MUST run `validacionVigenciaCamion(patente)`, MUST apply `camionvencido(true|false)` blocking identically to a manual selection, MUST run `cargarInformacionTransportista(...)`, and MUST reveal `#block_transporte` and enable the trailer-plate combo — exactly as it does today for a person-driven selection.

#### Scenario: Auto-selected plate passes vigencia

- GIVEN the decoded `patenteCamion` matches a catalog candidate with a valid permiso de circulación and revisión técnica
- WHEN the system auto-selects that plate
- THEN `validacionVigenciaCamion` runs, `camionvencido` evaluates false, `cargarInformacionTransportista` runs, and `#block_transporte` reveals with the trailer-plate combo enabled — identical to a manual selection

#### Scenario: Auto-selected plate fails vigencia

- GIVEN the decoded `patenteCamion` matches a catalog candidate with an expired permiso de circulación or revisión técnica
- WHEN the system auto-selects that plate
- THEN `validacionVigenciaCamion` runs, `camionvencido` evaluates true, and emission is blocked exactly as when a person manually selects an expired plate

#### Scenario: Auto-selection never bypasses the cascade

- GIVEN the decoded `patenteCamion` matches a catalog candidate
- WHEN the system auto-selects that plate
- THEN the field is not populated by a raw value assignment that skips `validacionVigenciaCamion`; the closed-handler cascade always runs first

### Requirement: Auto-Selected Driver Triggers Licence Validation Gate

When `#combo_chofer` auto-selects because a catalog candidate's RUT-derived token matched the decoded `rutChoferToken`, the system MUST route that selection through the same code path as a manually chosen driver — the `change` handler — and MUST NOT set the field's value directly without invoking that path, because a programmatic assignment does not fire `change`. This path MUST run `validacionVigenciaChofer(seleccionado)` and MUST apply `licenciaChoferVencida(true|false)` blocking identically to a manual selection. The licence vigencia gate, the mirrored blocking dialog on failure, and the halt-on-failure sequencing are unaffected by the change from name-based to token-based matching.

#### Scenario: Auto-selected driver passes licence validation

- GIVEN a catalog candidate's RUT-derived token matches the decoded `rutChoferToken` and that driver has a valid licence
- WHEN the system auto-selects that driver
- THEN `validacionVigenciaChofer` runs, `licenciaChoferVencida` evaluates false, and emission is not blocked by this gate — identical to a manual selection

#### Scenario: Auto-selected driver fails licence validation

- GIVEN a catalog candidate's RUT-derived token matches the decoded `rutChoferToken` and that driver has an expired licence
- WHEN the system auto-selects that driver
- THEN `validacionVigenciaChofer` runs, `licenciaChoferVencida` evaluates true, and emission is blocked exactly as when a person manually selects a driver with an expired licence

#### Scenario: Auto-selection never bypasses the licence gate

- GIVEN a catalog candidate's RUT-derived token matches the decoded `rutChoferToken`
- WHEN the system auto-selects that driver
- THEN the field is not populated by a raw value assignment that skips `validacionVigenciaChofer`; the `change`-handler path always runs first

### Requirement: Gate Failure Blocking Message Mirrors The Manual Path Exactly

When the truck-plate vigencia gate or the driver licence gate fails during auto-selection, the system MUST present the identical blocking dialog the manual path presents — `app.dialog.alert("No se puede continuar. " + resultado.mensaje, "Emisión desde faena")` — with the reason text (`resultado.mensaje`) reaching the dispatcher unchanged, and MUST set the same blocking flag (`camionvencido(true)` for the truck, `licenciaChoferVencida(true)` for the driver). An auto-selected expired truck plate or driver MUST be indistinguishable from a manually-selected expired one in message text, reason content, and blocked state. No alternate message, no downgraded variant, and no silent failure are permitted for the auto-selected path.

#### Scenario: Auto-selected expired truck plate mirrors the manual blocking message

- GIVEN the decoded `patenteCamion` matches a catalog candidate with an expired permiso de circulación or revisión técnica
- WHEN the system auto-selects that plate and `validacionVigenciaCamion` evaluates it as expired
- THEN the dispatcher sees `app.dialog.alert("No se puede continuar. " + resultado.mensaje, "Emisión desde faena")` with the unchanged reason text, and `camionvencido(true)` is set — identical to a manually-selected expired plate

#### Scenario: Auto-selected expired driver licence mirrors the manual blocking message

- GIVEN a catalog candidate's RUT-derived token matches the decoded `rutChoferToken` and that driver has an expired licence
- WHEN the system auto-selects that driver and `validacionVigenciaChofer` evaluates the licence as expired
- THEN the dispatcher sees the same blocking dialog format with the unchanged reason text, and `licenciaChoferVencida(true)` is set — identical to a manually-selected expired driver

### Requirement: Trailer Plate Auto-Selection Has No Validation Gate

`#combo_patente_carro`'s `change` handler only rewrites the `#texto_patente_carro` label; it performs no vigencia, licence, or other validity check. Auto-selecting the trailer plate MUST still invoke this handler (so the label stays in sync), but this requirement set MUST NOT be read as implying a validation gate exists for the trailer plate — none does, and none MUST be added by this change.

#### Scenario: Auto-selected trailer plate updates the label without any gate

- GIVEN the decoded `patenteCarro` matches an option in `#combo_patente_carro`
- WHEN the system auto-selects that option
- THEN `#texto_patente_carro` updates to match, and no vigencia, licence, or other validation runs or blocks emission because of this field

### Requirement: Sequenced Auto-Selection Halts On Gate Failure

The trailer and driver catalogs are populated only by `cargarInformacionTransportista(...)`, which itself runs only as part of the truck-plate cascade. The system MUST NOT attempt driver or trailer auto-selection before the truck-plate auto-selection outcome (found-and-gated, or not-found) is known, and MUST attempt driver auto-selection before trailer auto-selection so a driver gate failure can be evaluated before trailer is attempted.

The sequence MUST halt at the first gate failure: when the truck-plate gate evaluates the plate as expired, the system MUST NOT attempt driver or trailer auto-selection. When the driver licence gate evaluates as expired (after a passing truck gate), the system MUST NOT attempt trailer auto-selection. The guía cannot proceed once a gate fails, so remaining auto-selection steps are pointless and MUST NOT run.

A truck plate not found in the catalog is not a gate failure — no blocking dialog is shown — but it likewise means the truck-plate cascade, and therefore `cargarInformacionTransportista`, does not start via auto-selection, so driver and trailer auto-selection are not attempted either.

#### Scenario: Downstream auto-selection waits for truck-plate resolution

- GIVEN the truck plate auto-selects and its cascade begins
- WHEN transport field resolution runs
- THEN driver auto-selection is not attempted until the truck-plate gate has evaluated, and trailer auto-selection is not attempted until the driver step has resolved

#### Scenario: Truck gate failure halts the sequence

- GIVEN the truck-plate vigencia gate evaluates the auto-selected plate as expired
- WHEN the blocking dialog is shown with the failure reason
- THEN driver and trailer auto-selection are not attempted

#### Scenario: Driver gate failure halts the remaining sequence

- GIVEN the truck-plate gate passed and the driver licence gate evaluates the auto-selected driver as expired
- WHEN the blocking dialog is shown with the failure reason
- THEN trailer auto-selection is not attempted

#### Scenario: Truck plate not found stops the sequence without a gate failure

- GIVEN the decoded `patenteCamion` matches no catalog candidate
- WHEN transport field resolution runs
- THEN no blocking dialog is shown, and driver and trailer auto-selection are not attempted because the truck-plate cascade never starts via auto-selection

### Requirement: Consumer Renders Decoded Payload, Not Local Schema

The guias header screen MUST resolve and render `chofer` and the other transport fields using the decoded QR payload as the source value. It MUST NOT substitute or fall back to its own locally named driver column (e.g., `GDE_NOMBRE_CHOFER`) when resolving or displaying the QR-sourced value. This requirement covers the driver's name, used only for reference display; the RUT-derived matching token used for auto-selection is never sourced from, or compared against, that local column.

#### Scenario: Non-empty driver name from decoded payload

- GIVEN a decoded payload with a non-empty `chofer` value
- WHEN the header screen resolves the driver field for reference display, whether or not a token match is found
- THEN the displayed value is non-empty and equals the decoded `chofer` value, regardless of the guias app's own driver-name column naming

### Requirement: Scan-First Ordering

The QR scan action MUST be presented before rodal selection in the header entry flow, replacing the previous order where rodal selection preceded scan validation.

#### Scenario: Scan precedes rodal UI

- GIVEN the dispatcher opens the header screen
- WHEN the screen renders its entry controls
- THEN the scan action is presented before any rodal selection control is usable
