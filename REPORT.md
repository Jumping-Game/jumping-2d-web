# Alignment Report

## Deviations Identified

- The web client allowed members to trigger `start_request`, violating the room-master guard in NETWORK_PROTOCOL.md.
- Snapshot handling accepted delta frames before receiving an initial FULL snapshot after start/reconnect, risking missing players.
- Remote player sprites stayed visible when omitted from a FULL snapshot, causing roster drift between clients.

## Fixes Applied

- Added a role check before issuing `start_request` and covered the flow with unit tests.
- Tracked FULL snapshot reception inside `NetClient`, dropping early deltas until the first FULL frame arrives for start and reconnect paths.
- Reconciled FULL snapshots in `GameScene` by hiding players absent from the broadcast to mirror the authoritative roster.
- Extended the test suite with protocol alignment cases (start flow, reconnect, roster counts, character carry-over) to guard regressions.
- Documented local protocol expectations and updated supporting guidance in `docs/LOCAL_RUN.md`.
