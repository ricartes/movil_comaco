# Archive Report: Rodal Scan-First Header Entry (guias-rodal-scan-first)

**Archive Date**: 2026-09-07  
**Change**: guias-rodal-scan-first  
**Project**: movil_comaco  
**Artifact Store**: hybrid (OpenSpec + Engram)

## Execution Summary

This change has been fully planned, implemented, verified, and archived. All 26 implementation tasks (Phases 1-11) are complete. Verification confirmed PASS with 13/13 requirements and 17/17 scenarios compliant, zero CRITICAL findings, and 30/30 tests passing. Both chained PRs have been pushed to the remote `github` repository (not `origin`, which is 11 commits stale) with size:exception accepted by the user.

The producer app (`movil_comaco`) has zero source changes, as intended.

## Artifact References

### Primary Artifacts (Engram observation IDs from proposal/spec/design/tasks/verify-report)

This change used Engram as the intermediate artifact store during SDD phases. The following observations were authored during the cycle:

- Proposal (Engram #104) — supersedes `qr-transport-scan-first` (void scope)
- Specification (`sdd/guias-rodal-scan-first/spec`, Engram #105)
- Specification (`sdd/rodal-point-resolution/spec`, part of #105 set)
- Specification (`sdd/tenant-scoped-parameters/spec`, part of #105 set)
- Design (Engram #107, revision 2 after correction)
- Tasks (Engram #110, 37 total items: 26 Phase 1-11 implementation + 3 Phase 0 external-owner + 8 supporting items)
- Apply Progress (Engram #114) — intermediate snapshot, stale claims superseded by final state below
- Verify Report (Engram #116) — full-change PASS after PR1+PR2 complete

Decision/learning observations also persisted during the cycle:
- Engram: `sdd/guias-rodal-scan-first/fail-closed-decision`
- Engram: `sdd/guias-rodal-scan-first/pr1-size-exception`
- Engram: `sdd/guias-rodal-scan-first/pr2-exception-and-scope-revert`
- Engram: `sdd/qr-transport-scan-first/scope-cut` (predecessor change context)

### Archived Artifacts (OpenSpec)

All change artifacts have been moved to the archive folder and verified byte-for-byte:

```
openspec/changes/archive/2026-09-07-guias-rodal-scan-first/
├── proposal.md
├── design.md
├── tasks.md
├── verify-report.md
├── specs/
│   ├── guias-rodal-scan-first/spec.md
│   ├── rodal-point-resolution/spec.md
│   └── tenant-scoped-parameters/spec.md
└── archive-report.md (this file)
```

### Main Specs (OpenSpec)

All three delta specs were full specs (not incremental deltas) and have been copied into the source-of-truth directories:

- `openspec/specs/guias-rodal-scan-first/spec.md` — new
- `openspec/specs/rodal-point-resolution/spec.md` — new
- `openspec/specs/tenant-scoped-parameters/spec.md` — new

**Spec merge verification**: empty diff between delta and main specs confirms byte-for-byte identity and successful copy.

## Verification Summary

**Verdict**: PASS  
**Evidence Revision**: sha256:42184c69e14dafc170a46a30e2278ffded981345f0103be8b6c06fa185f12cab  
**Requirements**: 13/13 compliant  
**Scenarios**: 17/17 compliant  
**Tests**: 30/30 passed (exit code 0)  
**CRITICAL Findings**: 0  
**WARNING Findings**: 2 (both non-blocking, pre-acknowledged)  
**Blockers**: 0

### Spec Coverage

| Specification | Requirements | Scenarios | Status |
|---|---|---|---|
| `guias-rodal-scan-first` | 5 | 7 | COMPLIANT |
| `rodal-point-resolution` | 5 | 5 | COMPLIANT |
| `tenant-scoped-parameters` | 3 | 5 | COMPLIANT |

### Test Evidence

Independent re-run (per verify-report Engram #116) executed:
```
cd D:\Trabajos\GFE\movil_comaco_gde && npm test
node --test --experimental-test-isolation=none \
  tests/qr_backward_compat.test.js \
  tests/rodal-point-resolution.test.js \
  tests/scan-first-faena.test.js

Result: 30/30 tests passed
├── qr_backward_compat.test.js: 10 tests (pre-existing safety net, unmodified)
├── rodal-point-resolution.test.js: 8 tests (PR1 DAO + service layer)
└── scan-first-faena.test.js: 12 tests (PR2 UI + state management)
```

TDD Compliance: All 26 Phase 1-11 tasks map to verified test coverage. RED confirmed (test files present), GREEN confirmed (30/30 pass).

### Design Coherence

All seven architecture decisions (D1–D8) verified in code:
- D1: Point-in-polygon via SpatiaLite `ST_Contains` with `Number()` coercion ✓
- D2: LEFT JOIN preserves orphan geometry rows for sync-defect detection ✓
- D3: Exact code match with TRIM/UPPER dedup; never guess ✓
- D4: Scan surface placement, wiring, guard removal, visibility rewrite ✓
- D5: **Inverting default**: all five MUST-REVEAL paths implemented and tested (design prose said "four" but table already listed 5; implementation followed table) ✓
- D6: Fail-closed fallback with triple-deny (absent, error, unresolved) ✓
- D7: Tenant-scoped read; existing callers untouched; guardrail instead of migration ✓
- D8: Explicit test file list in `package.json` `scripts.test` ✓

### Post-Verification Corrections (All Committed and Re-Verified Green)

Per final-state facts in the archive prompt, the following corrective commits were applied after the initial PR2 merge and re-verified:

1. **Commit `6eccfc2b`**: Reverted out-of-scope `#tx_rut_chofer` / `#tx_nom_chofer` markup  
   **Reason**: Driver data was explicitly cut from change scope. Fabricating markup so dead style code has something to point at is the inverse fix — it leaves two dead things where there was one. Correct fix belongs to whichever change owns driver data.  
   **Impact**: Specification compliant; task 6.2 correctly updated; test 6.1 already had these IDs in the pre-existing out-of-scope allowlist.

2. **Commit `665d6efb`** (with dedicated test): Changed placeholder `Constantes.parametroQrAvanceSinValidacion` value from `0` to `-1`  
   **Reason**: Placeholder value `0` could theoretically collide with an unrelated `PARAMETRO_GENERAL` row that might carry `PAG_ID=0` server-side. A value clearly outside the observed real ID range (existing IDs: 3, 6) is marginally safer as a placeholder, though still not provably collision-free without server-side knowledge (Phase 0.2 external-owner item). Test confirms the constant exists and is numeric.  
   **Impact**: Fail-closed safety preserved; verification WARNING 1 acknowledged and mitigated client-side.

3. **Design document prose correction** (post-verification documentation):  
   `design.md` D5 paragraph stated "four MUST-REVEAL paths" while the table already listed five (including `recargar_combo_rodal` persisted GDE_RODAL). Implementation correctly followed the table. Corrected design prose from "four" to "five" for future readers.  
   **Impact**: Design document internal consistency restored; no code change.

All corrections committed to the feature branch and re-verified: 30/30 tests still pass.

## Task Status at Archive

### Phases 1–11 (Implementation, Assigned to `sdd-apply`)

**Status**: All 26 tasks COMPLETE ✓

| Phase | Task | Status |
|-------|------|--------|
| 1 | Test harness (RED stub + npm test fix + verify green) | ✓ Complete |
| 2 | Point-to-rodal DAO (RED + implementation) | ✓ Complete |
| 3 | Service resolution layer (RED + implementation) | ✓ Complete |
| 4 | Tenant-scoped parameter accessor (RED + implementation + contract test) | ✓ Complete |
| 5 | Constantes entry + placeholder + contract test | ✓ Complete |
| 6 | Scan surface markup (RED + add block + wire button) | ✓ Complete |
| 7 | Remove inverted guard + replace + visibility rewrite | ✓ Complete |
| 8 | Invert default + implement reveal wrapper + five MUST-REVEAL sites | ✓ Complete |
| 9 | Auto-select and ambiguity handling (RED + implementation) | ✓ Complete |
| 10 | Fail-closed fallback gating (RED + implementation) | ✓ Complete |
| 11 | Full-suite verification (npm test + element ID sweep + zero commits in movil_comaco) | ✓ Complete |

### Phase 0 (External-Owner Items, Deployment Prerequisites)

**Status**: Correctly OPEN by design ✓

These are not implementation defects; they are mandatory pre-deployment verifications and data-provisioning tasks:

| Item | Owner | Status | Impact |
|------|-------|--------|--------|
| **0.1 BLOCKING** | Backend/DBA | **OPEN** | Verify server-side whether `Cargar_Parametro_General` (WS at `www/js/WebServices.js:666`) honours `id_emp` filter or ignores it and returns all empresas. Currently posts `id_emp: 1` hardcoded while inserting whatever `item.EMP_ID` the response carries. If backend ignores the filter, a device operating under empresa ≠ 1 would never receive its fallback flag row and fail-closed would block it permanently. Outcome gates whether the empresa-scoped read in Phase 4 can ship as-is or the sync must also be fixed in this change. |
| **0.2 DEPLOYMENT PREREQUISITE** | Backend/DBA | **OPEN** | Request `PAG_ID` assignment for `parametroQrAvanceSinValidacion` and provisioning of the `PARAMETRO_GENERAL` row for every empresa in use before PR2 merges to development. Under fail-closed, an unprovisioned row blocks emission with no fallback. This is a deployment requirement, not a code defect. |
| **0.3** | Confirmed | **RESOLVED** → `github` | Confirm which `movil_comaco_gde` remote (`github/desarrollo` vs `origin/desenvolvimento`) carries the QR files this change touches. Result: all QR-related files sit on `github/desenvolvimento`; both feature branches are pushed there (remote `github`, not `origin`). Outcome: confirmed, branching from correct remote. |

**Recording**: Both 0.1 and 0.2 are recorded as DEPLOYMENT PREREQUISITES in the archive, not loose follow-ups. Under fail-closed architecture, an unprovisioned row blocks emission. Fixing the empresa-scoped read (Phase 4) without confirming the sync delivers rows for non-empresa-1 devices could silently block those devices. These must be verified/completed before production rollout, not treated as future cleanup.

## Code State

### Repositories and Branches

**`movil_comaco_gde`** (code target repo)
- **PR1**: `feature/rodal-scan-first-base` (commit `c0f19a8d`, 528 lines, `size:exception` accepted)
  - Content: DAO layer, service layer, tenant-scoped parameter accessor, test harness fix, Constantes entry
  - Base: local `desarrollo` (2d43aad0)
  - Status: Pushed to remote `github` (not `origin`)
  - Tests: 8 rodal-point-resolution.test.js tests + 10 pre-existing qr_backward_compat.test.js tests

- **PR2**: `feature/rodal-scan-first-ui` (commits `7309c695`, `6eccfc2b`, `665d6efb`; 808 lines cumulative, `size:exception` accepted)
  - Content: Scan UI, inverted default, fallback gating, five MUST-REVEAL sites, corrections
  - Base: PR1 branch (`feature/rodal-scan-first-base`)
  - Status: Pushed to remote `github`; includes post-verification corrections
  - Tests: 12 scan-first-faena.test.js tests + inherited from PR1
  - Cumulative tip: 665d6efb

- **Chain strategy**: stacked-to-main (PR2 targets PR1; user accepted both size exceptions)
- **Neither branch merged to `desarrollo`** at archive time

**`movil_comaco`** (producer repo)
- **Status**: ZERO source changes ✓
- The existing payload already carries the load point; no changes needed to the producer.

### Remote Configuration Hazard

Both feature branches are pushed to remote `github`, but the upstream remote config points to the stale `origin` repository (11 commits behind). This is pre-existing, not introduced by this change. Normal workflow is unaffected as long as developers confirm they are pulling/pushing from/to `github`, not `origin`.

### Dual Services Directory Hazard

`movil_comaco_gde` has both `www/js/Servicios/` and `www/js/Services/` directories with different capitalization. This change adds `www/js/Servicios/GeocercaRodalService.js` and reads from `www/js/Services/HelperService.js:102` (as reference for the tenant-scoped parameter pattern). Both directories coexist in production; this is not new.

## Follow-On Changes

### `guias-qr-trace-on-save` (Built on Top of This Change)

A subsequent change (`guias-qr-trace-on-save`) was developed after and depends on this one. It adds an ADDED delta to the `guias-rodal-scan-first` spec. It will be archived separately immediately after this one.

- PR A: commit `7120c63e`
- PR B: commit `fc7abbd2`
- Corrective: commit `d027dc87`

### Deferred Items (Not Cancelled, Recorded for Posterity)

The following capabilities were identified as valuable but explicitly cut from scope to keep the change focused:

1. **Transport data display/autofill**: Plates, driver name/RUT in guias (would require producer payload expansion and versioning)
2. **QR crypto hardening**: Placeholder dev keys currently shared with the association contract. Free-rotation window still open because nothing is in production yet. Own change with own scope.

## Risks and Learnings

### Non-Blocking Findings from Verification

**WARNING 1**: The placeholder `PAG_ID` value `-1` (after correction from initial `0`) for `Constantes.parametroQrAvanceSinValidacion` is fail-closed-safe against every client-observable failure mode, but depends on Phase 0.2 to provision the real `PAG_ID` before rollout. The initial placeholder value `0` was not provably collision-free against an unrelated parameter that might carry `PAG_ID=0` server-side (observed real IDs: 3, 6; 0 was not verified as reserved). **Corrective action taken**: Changed placeholder to `-1`, which is outside the observed range. Whoever assigns the real `PAG_ID` should confirm it does not collide with any currently-provisioned parameter.

**WARNING 2**: `design.md` D5 prose paragraph undercounted against its own table. The table already listed 5 MUST-REVEAL paths (including `recargar_combo_rodal`), but the paragraph said "four". Implementation correctly followed the table. Design document corrected post-verification for future readers.

### Test Assertion Quality

No tautologies, ghost loops, or assertion-without-production-call patterns found. The element-ID sweep test is a real static guardrail: it would fail if any new dead reference were introduced (test compares against a documented allowlist of ~22 pre-existing dead references).

### Fail-Closed Coherence

Cache initialization and state transitions verified:
- Module cache defaults to `false` (line 42 `EmisionDesdeFaena.js`)
- Cache reset to `false` synchronously at init before async DAO call (line 1402)
- Three explicit deny paths tested (absent -1, error, never-called-back)
- No window exists where button is live before value is known
- The "fail-closed bricks never-synced device" objection was checked: never-synced devices have no predios/OCs/rodales and cannot emit guías with or without this gate

## Closure Checklist

- [x] Task completion gate passed: 26/26 implementation tasks checked
- [x] Verification passed: 13/13 requirements, 17/17 scenarios, 0 CRITICAL
- [x] No CRITICAL issues block archive
- [x] All delta specs copied to main specs (openspec/specs/)
- [x] Spec copy verified with empty diff -r
- [x] Change folder moved to archive with ISO date prefix
- [x] Archive folder verified with empty diff -r (source vs. destination)
- [x] Source directory confirmed absent after move
- [x] Phase 0 external-owner items recorded as deployment prerequisites
- [x] Post-verification corrections documented with commit references
- [x] Follow-on change dependency noted
- [x] Producer repo zero-commit status confirmed
- [x] Both PRs pushed to correct remote (github)
- [x] Size exceptions honored and not re-litigated

## Change Completeness

This change is **CLOSED** and ready for deployment. The next phase is operational rollout:

1. **Phase 0.1**: Backend team verifies `Cargar_Parametro_General` empresa scoping behavior
2. **Phase 0.2**: Assign real `PAG_ID` and provision `PARAMETRO_GENERAL` row for every empresa
3. **Phase 0.3**: Confirmed (github remote is correct)
4. **Deployment**: Merge PR1 then PR2 to `desarrollo`, rebuild, deploy to production devices
5. **Follow-up**: Archive `guias-qr-trace-on-save` change separately

No further SDD cycles are needed for this change. The SDD cycle is complete.

---

**Archive Report Generated**: 2026-09-07 by sdd-archive (Haiku 4.5)  
**Artifact Store**: hybrid (OpenSpec + Engram)  
**Archive Path**: `openspec/changes/archive/2026-09-07-guias-rodal-scan-first/`  
**Engram Topic Key**: `sdd/guias-rodal-scan-first/archive-report`
