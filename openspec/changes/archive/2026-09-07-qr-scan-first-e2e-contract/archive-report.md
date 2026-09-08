# Archive Report: QR Scan-First End-to-End Contract Test

**Change**: qr-scan-first-e2e-contract  
**Status**: CLOSED — archived and ready for production verification  
**Date Archived**: 2026-09-07  
**Artifact Store**: hybrid (openspec + Engram)  
**Project**: movil_comaco

---

## Executive Summary

The `qr-scan-first-e2e-contract` change has been fully implemented, verified, and archived. A single executable contract now binds real QR generation through real decryption to real point-to-rodal resolution across the `movil_comaco` and `movil_comaco_gde` repositories, closing the seam test gap identified in earlier work (`guias-rodal-scan-first`, `guias-qr-trace-on-save`). All 25 implementation tasks are complete, all 7 requirements satisfied by 8 scenarios, tests pass 191/191 with zero regressions, and the specification is ratified.

---

## Artifact Lineage

### Engram Observations (Source of Truth for Content)

| Artifact | Type | Observation ID | Title |
|----------|------|---|---|
| Proposal | proposal | 140 | Proposal: QR Scan-First End-to-End Contract Test |
| Specification | spec | 142 | QR Scan-First End-to-End Contract Specification |
| Design | design | 144 | Design: QR Scan-First End-to-End Contract Test |
| Tasks | tasks | 145 | Tasks: QR Scan-First End-to-End Contract Test |
| Apply Progress | apply-progress | 146 | Apply Progress: QR Scan-First End-to-End Contract Test (PR1 + PR2, complete) |
| Verification Report | verify-report | 149 | Verification Report: qr-scan-first-e2e-contract (PR1 + PR2, complete) |
| Orphan/OC Boundary Discovery | discovery | 141 | Engram `movil-comaco-gde/orphan-vs-oc-boundary-collision` (referenced by design) |
| PR2 Size Exception | exception | pr2-exception | Size exception accepted by orchestrator for PR2 (~365 lines, high scrutiny necessary) |

### OpenSpec Artifacts (Filesystem)

| Artifact | Path | Status |
|----------|------|--------|
| Specification (NEW) | `openspec/specs/qr-scan-first-e2e-contract/spec.md` | Created via mechanical copy from delta |
| Change Folder (archived) | `openspec/changes/archive/2026-09-07-qr-scan-first-e2e-contract/` | Moved (git mv), verified byte-identical |

---

## Completion Summary

### Task Completion Gate — PASSED

**Source**: `openspec/changes/archive/2026-09-07-qr-scan-first-e2e-contract/tasks.md`

| Metric | Value |
|--------|-------|
| Total tasks | 31 (including header/phase groupings) |
| Tasks marked complete (`[x]`) | 31 |
| Tasks incomplete (`[ ]`) | 0 |
| Gate status | **PASS** |

All implementation tasks verified complete. No stale checkboxes requiring reconciliation.

### Specification Compliance — PASSED (7/7 Requirements, 8/8 Scenarios)

Per `verify-report` (Engram #149), specification RATIFIED with ZERO conflicts. All requirements satisfied:

| # | Requirement | Scenario Count | Status |
|---|-------------|---|---|
| 1 | Real Cryptographic Producer-to-Consumer Chain | 1 scenario | COMPLIANT |
| 2 | Real Point-to-Rodal Resolution | 5 scenarios (via resolverRodalPorPuntoQr + real DATOS_buscarRodalPorPunto) | COMPLIANT |
| 3 | End-to-End Happy Path Resolution | 1 scenario | COMPLIANT |
| 4 | End-to-End Zero-Match Resolution | 1 scenario | COMPLIANT |
| 5 | Orphan Geometry and OC-Boundary Collision Are Independently Verified | 2 scenarios (true orphan + OC boundary) | COMPLIANT |
| 6 | Ambiguous Multiple-Match Resolution | 1 scenario | COMPLIANT |
| 7 | Test Wiring | 1 scenario (suite runs under `npm test`) | COMPLIANT |
| **Total** | **7 requirements** | **8 scenarios** | **COMPLIANT** |

### Verification Report — PASSED

**Source**: Engram observation #149; archived at `openspec/changes/archive/2026-09-07-qr-scan-first-e2e-contract/verify-report.md`

| Check | Result |
|-------|--------|
| Verdict | PASS |
| Blockers | 0 |
| Critical findings | 0 |
| Test exit code | 0 |
| Tests passed | 191/191 (18 new + 173 baseline) |
| Requirements covered | 7/7 |
| Scenarios covered | 8/8 |

**Non-blocking warnings/suggestions** (recorded for posterity, do not block archive):
1. PR2 TDD cycle used a single coarse RED/GREEN pair (harness-must-exist-first rationale, disclosed honestly, lower rigor bar than per-scenario cycles in PR1) — **WARNING level, does not affect correctness or regression coverage**
2. Orphan/OC-boundary catalog-row-count assertions use hardcoded literal codes (`'R99'`, `'R77'`) rather than deriving from fixture objects; a contrived compound swap (geometry + point together, query literal unchanged) would not be caught — **SUGGESTION level, not a live defect, hardening opportunity only**

### Code Changes Summary

**Zero production source changes in either app** — test-only addition:

| File | Action | Lines | Status |
|------|--------|-------|--------|
| `movil_comaco/tests/support/spatial-sqlite.js` | Create (new module) | ~95 | ✓ Created |
| `movil_comaco/tests/spatial-sqlite-shim.test.js` | Create (new test) | ~45 | ✓ Created |
| `movil_comaco/tests/support/qr-e2e-harness.js` | Create (new module) | ~200 | ✓ Created |
| `movil_comaco/tests/qr-scan-first-e2e.test.js` | Create (new test) | ~165 | ✓ Created |
| `movil_comaco/package.json` | Modify (test wiring) | 1 line×2 | ✓ Appended to `scripts.test` |
| `openspec/config.yaml` | Modify (test config) | 1 line×2 | ✓ Updated `test_command_raw` |
| `movil_comaco_gde/*` | Read-only | 0 | ✓ Untouched |

**Regression check**: `tests/qr-guias-contract.test.js` (read-only, shipped in `guias-qr-trace-on-save`) — byte-identical, zero diff.

---

## Architecture & Design Rationale

### Two-Context Isolation (Why This Matters)

Both `movil_comaco` and `movil_comaco_gde` declare global crypto constants with **identical names**:
- `QR_TRAZABILIDAD_AES_KEY_HEX`
- `QR_TRAZABILIDAD_HMAC_KEY_HEX`

In a single shared `node:vm` context, the second `runFile` would silently overwrite the first. Key drift between repositories — the single most valuable defect this test exists to catch — would become structurally undetectable. **Design decision**: Two isolated contexts joined only by the ciphertext *string*, never by shared globals or pre-decrypted objects. Spec requirement *Real Cryptographic Producer-to-Consumer Chain* mandates this: "Both sides MUST use the unmodified production AES/HMAC constants" is only observable if there are two separate "sides."

### Orphan vs OC-Boundary Collision (Root Cause & Test Discrimination)

The OC scope filter lives inside the LEFT JOIN subquery in `DATOS_buscarRodalPorPunto`. A true catalog orphan (code matches zero rows under any OC) and an OC-boundary collision (code matches one row, but under a *different* OC tuple) both produce `estado: "GEOMETRIA_HUERFANA"` at the caller level — identical caller-facing outcome, distinct root causes.

**Test discrimination mechanism** (spec-mandated, design-implemented): direct, OC-unscoped SQL query `SELECT * FROM RODAL WHERE TRIM(UPPER(RODAL)) = ?`:
- Orphan scenario (`R99`): returns **0 rows** → true orphan ✓
- OC-boundary scenario (`R77`): returns **exactly 1 row**, whose `(EMPRESA, TIPO_DOCTO, NRO_OC)` differs from the tested OC tuple → boundary collision ✓

This is the "primary proof" per spec. An extra assertion (re-running the chain under OC_B) is retained on the boundary scenario only as redundant verification that the resolver honors the scope.

---

## Spec Merge Verification

**Delta Spec Source**: `openspec/changes/qr-scan-first-e2e-contract/specs/qr-scan-first-e2e-contract/spec.md`  
**Main Spec Destination**: `openspec/specs/qr-scan-first-e2e-contract/spec.md`  
**Merge Type**: NEW capability (no existing main spec to merge into)

**Mechanical Copy Contract Evidence**:
```
$ diff openspec/changes/qr-scan-first-e2e-contract/specs/qr-scan-first-e2e-contract/spec.md \
        openspec/specs/qr-scan-first-e2e-contract/spec.md
(empty diff output)
```
✓ Byte-identical, zero truncation, zero model processing

---

## Archive Move Verification

**Change Folder Source**: `openspec/changes/qr-scan-first-e2e-contract/`  
**Archive Destination**: `openspec/changes/archive/2026-09-07-qr-scan-first-e2e-contract/`  
**Move Method**: `git mv` (tracked in git) — fallback to `mv` checked and not needed

**Readback Contract Evidence**:
```
$ diff -r <snapshot> openspec/changes/archive/2026-09-07-qr-scan-first-e2e-contract/
(empty diff output)
```
✓ Byte-identical, source confirmed gone, destination verified complete

**Archive Contents Verified**:
- ✓ `proposal.md`
- ✓ `specs/qr-scan-first-e2e-contract/spec.md`
- ✓ `design.md`
- ✓ `tasks.md` (31/31 tasks complete, zero unchecked)
- ✓ `verify-report.md`

---

## Final State Facts vs Intermediate Snapshots

Per Final-State Authority hierarchy:

### Rank 1: Persisted Tasks Artifact (Highest Authority)
**Source**: `tasks.md` in archived folder  
**Fact**: 31/31 tasks marked complete, 0 unchecked

### Rank 2: Explicit Final-State Facts in Launch Prompt
- Verification: full-change PASS, 7/7 requirements, 8/8 scenarios, 0 CRITICAL, 1 WARNING (non-blocking hardening note), 2 SUGGESTION
- Sibling repo genuinely present and exercised (orchestrator verified earlier false claim of absence)
- Code state: branch `feature/qr-e2e-shim`, 3 commits on `desarrollo`, NOT pushed, NOT merged

### Rank 3: Intermediate Snapshots — Lowest Authority
**Status**: Observations #146 and #149 record exactly what was true at apply/verify time. All facts are consistent with Rank 1 and Rank 2. No contradictions found.

---

## Delivery Checklist

- [x] Main specs created/updated: `openspec/specs/qr-scan-first-e2e-contract/spec.md`
- [x] Change folder moved to archive: `openspec/changes/archive/2026-09-07-qr-scan-first-e2e-contract/`
- [x] Source directory confirmed gone
- [x] Archive destination byte-identical to pre-move snapshot
- [x] Task Completion Gate passed (31/31 tasks complete, 0 unchecked)
- [x] Specification compliance verified (7/7 requirements, 8/8 scenarios)
- [x] Verification report confirms PASS (191/191 tests, 0 CRITICAL)
- [x] Engram artifact IDs recorded for traceability
- [x] Archive report written to filesystem
- [x] Archive report persisted to Engram

---

## Key Learnings

1. Two isolated vm contexts are required to observe key drift, not optional, because both repositories declare identically-named crypto constants.
2. The OC-scope collision (orphan vs boundary) is structurally undetectable at the caller level without a direct, OC-unscoped catalog query as discriminating proof.
3. An apply agent's claim of "repo not present" must be verified independently; it can mask a transient false negative or path resolution error.
4. Explicit-list test wiring (append to `scripts.test`) preserves review clarity and prevents silent glob surprises compared to wildcard patterns.
5. Hardening opportunity exists for the orphan/boundary test: deriving queried catalog codes from fixture objects instead of parallel hardcoded literals would prevent compound-swap false negatives.

---

**Archive Date**: 2026-09-07  
**Executed By**: sdd-archive executor  
**Cycle Status**: COMPLETE
