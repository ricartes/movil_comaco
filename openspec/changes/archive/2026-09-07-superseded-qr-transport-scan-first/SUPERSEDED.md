# SUPERSEDED - not completed, specs NOT merged

This change was superseded by guias-rodal-scan-first on 2026-09-07 after the user
cut its transport-data scope (truck plate, trailer plate, driver, RUT token) and
its crypto-hardening scope.

None of the specs in this folder were merged into openspec/specs. In particular
qr-transport-payload and the autofill/vigencia-gate portions of
guias-scan-first-header describe behaviour that was explicitly rejected and must
not be read as a current contract.

What survives from this change:
- exploration.md remains valid and was reused by guias-rodal-scan-first.
- rodal-point-resolution/spec.md was carried over verbatim into
  guias-rodal-scan-first and merged from there.

Deferred, not cancelled (each would be its own future change):
- Transport data (plates, driver) display or autofill in guias, only after the
  scan surface exists and the crypto keys are hardened.
- qr-crypto-hardening: the QR AES/HMAC keys are placeholder development values
  shared with the association/liberation contract; rotation is free only while
  nothing carrying them is in production.
