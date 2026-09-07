# Archive Report: guias-qr-trace-on-save

**Archived:** 2026-09-07  
**Change Name:** guias-qr-trace-on-save  
**Project:** movil_comaco  
**Execution Mode:** hybrid (OpenSpec + Engram)  
**Status:** ARCHIVED — CLOSED

---

## Executive Summary

The SDD change `guias-qr-trace-on-save` has been successfully archived. Final verification: **PASS WITH WARNINGS**. All 8 requirements and 15 scenarios have genuine runtime-passing test coverage. The prior CRITICAL (untested association-precedence scenario) was closed via a corrective commit that invokes the real DAO through a capturing stub and is mutation-verified. Both new spec files have been merged into `openspec/specs/`, the delta for the existing `guias-rodal-scan-first` capability has been additively merged without overwriting any existing requirements, and the change folder has been moved to archive.

---

## Specifications Merged

### 1. New Capability: `qr-trace-on-save` (Complete)

**Location:** `openspec/specs/qr-trace-on-save/spec.md`

**Requirements:** 7 (save only, catalog ownership, partial trace, write ordering, legacy fields, single mapping, no preemption)

**Scenarios:** 8 (all covered with passing tests)

**Summary:** Single-write-point persistence of the origin-QR trace for scan-first guías. Save (`guardar_datos_guia`) is the only write point; catalog owns `GDE_SECCION`/`GDE_AVISO_CORTA`/`GDE_PLAN_MANEJO`; partial traces are persisted with reasons rather than silence; the write is ordered after the association check and survives it; legacy borrador fields are never nulled; the column set is identical to the association screen's mapping; and the save-time trace does not preempt a later association's overwrite.

---

### 2. Modified Capability: `guias-rodal-scan-first` (Delta Merged)

**Location:** `openspec/specs/guias-rodal-scan-first/spec.md`

**Existing Requirements:** 5 (unchanged)

**New Requirement Added:** 1 ("Reveal Path Determines The Save-Time Trace Outcome")

**New Scenarios Added:** 3

**Total After Merge:** 6 requirements, 8 scenarios (was 5 requirements, 5 scenarios)

**Diff Summary:**
```
--- openspec/specs/guias-rodal-scan-first/spec.md (before merge)
+++ openspec/specs/guias-rodal-scan-first/spec.md (after merge)
@@ Requirement: Reveal Path Determines The Save-Time Trace Outcome @@

Each reveal path this capability governs MUST determine, at save time, a defined 
outcome under `qr-trace-on-save`: an auto-selected resolved rodal maps to a full 
validated trace; the governed manual fallback, the no-catalog reveal, and a 
warning-accepted reveal with `FLAG_CONTROL !== 1` each map to a partial trace 
(`QR_TRAZABILIDAD_VALIDADO = 0` with a reason); a legacy-borrador reveal maps 
to no trace, guía fields left as the catalog path sets them.

[Scenarios added:]
- Resolved-rodal reveal maps to a full trace at save
- Governed fallback reveal maps to a partial trace at save
- Legacy-borrador reveal maps to no trace and untouched guía fields
```

**Merge Verification:** No existing requirements were removed or modified. The delta was additively appended. Merge is non-destructive and complete.

---

## Verification Status

**Final Verdict:** PASS WITH WARNINGS

**Specification Compliance:**
- Requirements: 8 of 8 covered (qr-trace-on-save 7 + guias-rodal-scan-first 1 new)
- Scenarios: 15 of 15 covered (qr-trace-on-save 8 + guias-rodal-scan-first 3 new + inherited path scenarios)
- All scenarios have genuine runtime-passing test coverage

**Critical Issue Resolution:**
- **Prior CRITICAL (FAIL report):** "Association-precedence tests were drift-blind Object.assign simulations"
- **Status:** CLOSED by corrective commit `d027dc87`
- **Closure Basis:** Both "Save-Time Trace Does Not Preempt A Later Association" tests now invoke the real `QrAsociacionGde.js` DAO through a capturing `sqlitePlugin` stub, and the corrective batch is mutation-verified (dropping `QR_TRAZABILIDAD_RESULTADO` from the real SQL makes both tests fail)

**Test Coverage:**
- Full suite: 61/61 pass (`npm test`)
- qr-trace-on-save module tests: 30/30 pass (`tests/qr-trace-on-save.test.js`)
- Related integration tests: 12/12 pass (`tests/scan-first-faena.test.js`)

**Open Warnings (Non-Blocking):**
1. **Direction C edge case (untested):** Prior valid trace with changed predio/rodal + new rejected re-scan. Manually verified defensible; not a formal spec scenario; deferred per apply agent's limited-scope budget.
2. **Test 2.7 fixture quality:** The "Single Mapping" scenario's expected-value fixture is hand-derived from the documented formula rather than the real DAO. Scenario has a genuine passing test; this is a drift-risk nit, not an untested scenario.
3. **Accepted size exceptions:** PR A (578 lines) and PR B (616 lines) both exceed the 400-line budget. Already reviewed and accepted per Engram #130/#134.

**TDD Compliance:** 6/6 checks passed. All corrective tasks (C.1–C.4) have passing tests; RED phase confirmed; GREEN phase confirmed; triangulation adequate; safety net intact; assertion quality verified.

---

## Code State (movil_comaco_gde)

**Branches:**
- `feature/qr-trace-on-save-a` (7120c63e, 578 lines, size:exception accepted)
- `feature/qr-trace-on-save-b` (fc7abbd2, 616 lines, size:exception accepted)
- Corrective: `d027dc87` (tests-only, +236/–53)

**Base:** `feature/rodal-scan-first-ui` (665d6efb), stacked on `prueba` (main branch for PR)

**Remote Status:** Both branches PUSHED to GitHub. NOT merged to `desarrollo`.

**Source Changes:** movil_comaco (this repo) — ZERO commits. Artifact store operations only.

---

## Design Decisions Recorded

1. **Single write point:** `guardar_datos_guia` (call site EmisionDesdeFaena.js:1714, after corrective deletions) is the only persistence point for QR traces.
2. **Catalog ownership:** `GDE_SECCION`, `GDE_AVISO_CORTA`, `GDE_PLAN_MANEJO` are sourced only from the rodal catalog; the trace write never overwrites or nulls them.
3. **Partial trace policy:** When no validated result exists (fallback, no-catalog, or guard-rejected), `QR_TRAZABILIDAD_VALIDADO = 0` is persisted with a `QR_TRAZABILIDAD_RESULTADO` reason instead of silence.
4. **Trace ordering:** The write runs after `prepararQrPendienteOConservarAsociacionGde`, which null-guards the trace and is guarded against being overwritten by its non-association branch.
5. **Shared mapper:** One pure mapper `asignar_trazabilidad_qr_a_gde` in `www/js/Services/QrAsociacionGdeService.js` covers all 15 trace columns, including `QR_TRAZABILIDAD_RESULTADO`. No divergent copies maintained.
6. **Deletion:** Five dead symbols removed in one commit (asignar_qr_trazabilidad_a_gde, validarQrTrazabilidadAntesDeGuardar, validarQrTrazabilidadAntesDeAvanzar, validacion_qr_trazabilidad_rodal_obligatoria, rodal_seleccionado_qr_trazabilidad_faena). Zero call sites; deletion confirmed via grep.
7. **No association interference:** A rejected re-scan never degrades a persisted valid trace. Carry-forward from `gde_actual` is guarded by unchanged predio + rodal.

---

## Follow-Up Items (Recorded, Not Blockers)

1. **Orphaned coercion helpers:** Three unused functions remain in EmisionDesdeFaena.js (valor_o_null_qr_trazabilidad, texto_o_null_qr_trazabilidad, numero_o_null_qr_trazabilidad). Can be cleaned up in a maintenance pass.
2. **Direction C test gap:** Add formal test for "prior valid trace + changed predio/rodal + new rejected re-scan" scenario if scenarios expand.
3. **Test 2.7 fixture refactor:** Derive the expected-value fixture from the real DAO call rather than the documented formula, eliminating drift risk.
4. **Deployment prerequisites (inherited from guias-rodal-scan-first, still external):** Backend `id_emp` verification and `PAG_ID` + `PARAMETRO_GENERAL` row provisioning. This change ships with them.

---

## Artifact Store Operations

### OpenSpec Specs Merged

| Path | Action | Details |
|------|--------|---------|
| `openspec/specs/qr-trace-on-save/spec.md` | CREATED | New capability, 7 requirements, 8 scenarios |
| `openspec/specs/guias-rodal-scan-first/spec.md` | MERGED (additive) | 1 new requirement added; 5 existing unchanged |

### Change Folder Moved

| Path | Action |
|------|--------|
| `openspec/changes/guias-qr-trace-on-save/` | MOVED to `openspec/changes/archive/2026-09-07-guias-qr-trace-on-save/` |

### Verification

- Copy of `qr-trace-on-save/spec.md`: `diff` returned empty (bytes match exactly)
- Move of change folder: Confirmed via `ls` — no longer in `openspec/changes/`; present in `openspec/changes/archive/`
- Delta merge into `guias-rodal-scan-first/spec.md`: Diff shows only the new requirement appended (no deletions, no overwrites)

---

## Engram Observation References

Traceability record for all SDD artifacts and decisions:

| Artifact | Engram ID | Type | Notes |
|----------|-----------|------|-------|
| Proposal | 120 | proposal | Initial intent and scope |
| Specification | 122 | spec | 8 requirements / 15 scenarios (7 + 1 new) |
| Design | 124 | design | Design decisions D1–D7, open questions A–C |
| Tasks | 126 | tasks | 38 implementation tasks + corrective section |
| Apply Progress (merged A+B+corrective) | 129 | apply-progress | TDD cycle documentation for C.1–C.4 |
| Verify Report (final) | 133 | verify-report | PASS WITH WARNINGS; CRITICAL closed; 3 WARNINGs recorded |
| Design Intent | — | decision | Single write point; catalog ownership; partial trace policy |
| Mapper Decision | — | architecture | Shared mapper in QrAsociacionGdeService.js |
| Delivery Decision | — | decision | Chain stacked on guias-rodal-scan-first; both PRs size:exception accepted |
| PR A Exception | — | decision | size:exception for 578 lines; Engram #130 |
| PR B Exception | — | decision | size:exception for 616 lines; Engram #134 |
| QR Trace Save Path Facts | — | discovery | Call site at EmisionDesdeFaena.js:1714; write ordering; guard logic |

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation Applied | Status |
|------|-----------|-------------------|--------|
| Trace wiped on re-save of borrador with trace but no active association | High | Write ordered after `prepararQrPendiente...`; trace preserved via carry-forward from gde_actual | MITIGATED |
| Collision with association snapshot | Medium | Non-association branch returns early; no overlap | MITIGATED |
| `resultado_qr_trazabilidad_permite_avanzar()` rejects advertencia → silent null | Medium | Partial trace policy (Question B) persists `_VALIDADO = 0` with reason | MITIGATED |
| Two divergent mapper copies drift | Medium | Single shared mapper extracted; no duplicates maintained | MITIGATED |
| Test bootstrap dominates the diff | High | Reused PR2's mock; avoided fourth bootstrap | MITIGATED |
| Direction C edge case (identity change + rejected re-scan) | Low | Manually verified defensible; deferred; WARNING recorded | ACCEPTED |

---

## Success Criteria Met

- [x] Guía emitted through scan-first path persists origin QR's 15 trace columns on Save (insert and update)
- [x] Re-saving a borrador with existing trace does not wipe it
- [x] Guía saved with active association keeps its snapshot untouched
- [x] Legacy borrador with no QR saves with `GDE_SECCION`/`GDE_AVISO_CORTA` intact
- [x] Reveal path with no validated trace produces partial trace with reason (policy B), never silence
- [x] `npm test` covers all scenarios; movil_comaco has zero commits
- [x] Specification compliance: 8/8 requirements, 15/15 scenarios covered with passing tests
- [x] No production code drift; code state matches design intent

---

## Closure Summary

**Archive Date:** 2026-09-07  
**Archived By:** sdd-archive (hybrid mode)  
**Final State:** All SDD artifacts merged into openspec/specs/; change folder moved to openspec/changes/archive/; artifact bookkeeping complete; ready for deployment chain continuation.

**Next Step:** Dependent changes (e.g., `qr-transport-scan-first` in the pending queue) may now proceed with this change's spec and design frozen in openspec/. The code remains on separate feature branches pending ordinary deployment workflow.

---

**This archive report is the authoritative record of the change's closure.**
