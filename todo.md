# Project TODO

- [x] Define the VisionVerify analysis data model, visibility rules, and modular inference result contract.
- [x] Build the premium public landing page with hero, methodology, technology, limitations, and clear product entry points.
- [x] Build protected account access and a user workspace with a personal dashboard and clear navigation.
- [x] Build accessible drag-and-drop image selection with client-side format and size validation, preview, removal, and request-state feedback.
- [x] Implement a server-side image analysis adapter that truthfully distinguishes an unavailable model, a demo model, and a connected live model.
- [x] Persist only valid analysis records per signed-in user and enforce private history access at every server query.
- [x] Build searchable, filterable, sortable private history and secure analysis-detail revisit views.
- [x] Present only returned analysis evidence with cautious probabilistic wording, model provenance, and a visible model-status badge.
- [x] Add concise setup and operating documentation, including required ML endpoint environment variables and safety limitations.
- [x] Add and run unit tests for analysis validation, model-state behavior, and private history authorization.
- [x] Verify desktop and mobile rendering, resolve UI or runtime issues, and save a release checkpoint.
- [x] Research and document a legitimate image-forensics model/API integration path that returns genuine model output.
- [x] Connect the server-side inference adapter to the selected real model using secure server-only configuration and exact provider response validation.
- [x] Preserve explicit offline and demo behavior: no prediction, no fabricated score, and an “ML model unavailable — no prediction generated.” status.
- [x] Store and display only genuine inference metadata, including returned prediction, confidence when provided, model identity, timestamp, and provider evidence.
- [x] Update the technology and README documentation with actual provider/model details, source links, processing flow, and evidence-based limitations.
- [x] Add integration-focused tests and verify unavailable-model, authorization, invalid-file, responsive, and live-inference paths without inventing model metrics.
- [x] Separate the actual Sightengine response values from any product-level interpretation in persisted data and every result view.
- [x] Define Lavender Dream design tokens with a white canvas, soft lavender and pink gradients, readable navy text, thin borders, rounded surfaces, and restrained motion.
- [x] Redesign the authenticated dashboard shell with the requested sidebar identity, responsive mobile navigation, hero, upload area, feature cards, profile area, and footer while retaining current routes and actions.
- [x] Apply the same light visual system to public, history, analysis detail, technology, and about pages without removing real provider-result messaging.
- [x] Repair client-side file selection so valid JPG/JPEG, PNG, and WEBP images are MIME-checked, decode-checked, previewed correctly, and submitted only within the 5 MB limit.
- [x] Add regression tests for decodable valid image inputs and rejected invalid image data, then verify desktop, tablet, and mobile Lavender Dream layouts.
- [x] Add automated browser-decode tests for successful valid-image preview inspection and decode-failing image rejection.
- [x] Trace and fix the analysis submission mutation that receives an HTML response instead of a structured tRPC result.
- [x] Add regression coverage for server-side analysis mutation failures so the client receives a structured error message rather than a JSON parse error.
- [x] Add automated server endpoint coverage proving invalid binary upload requests return structured JSON error objects.
- [x] Make “Verify an Image” the primary product action and provide an upload-first verification entry point with preview, formats, size, and secure-processing information.
- [x] Add an honest live-analysis screen that exposes only actual upload, provider-request, and report-creation states.
- [x] Create a dedicated verification result and full-report experience that translates provider-returned scores into clearly scoped user-facing states without fabricating missing fields.
- [x] Add progressive technical-details disclosure, provider information, timestamp, image metadata, raw score evidence, and the required probabilistic-results disclaimer.
- [x] Redesign the private history view as “Verification History” with report-oriented search, filters, status badges, real score availability, and report reopening.
- [x] Add polished empty, unsupported-file, upload-failure, provider-failure, missing-response, no-confidence, and inconclusive states while preserving real Sightengine-only results.
- [x] Test the end-to-end verification flow, saved report reopening, unavailable-model behavior, invalid files, and mobile responsiveness without using mock detection results.
- [x] Apply “Verify an Image” wording consistently to the workspace dashboard upload card and all remaining primary entry surfaces.
- [x] Add a transparent, documented score-to-state presentation using only provider-returned score thresholds and show it consistently in result, report, and history views.
- [x] Add an explicit provider-response-missing or insufficient-score state while retaining the existing strict no-prediction behavior for provider failures.
- [x] Execute and document a live post-redesign verification flow through provider response, saved result, report, and history reopening.
- [x] Document the verified live provider adapter, result/report/history reopening flow, and its required credentials and test flag without asserting unexecuted browser interactions.

- [x] Trace and fix the valid 1.94 MB mobile PNG upload being blocked before the protected analysis route, without weakening the 5 MB policy.
- [x] Add regression coverage for real-size image transport and structured pre-route error handling.
- [x] Verify the repaired mobile upload reaches real Sightengine analysis and saves the result.

## Upload bug investigation notes
- Sightengine credentials were revalidated successfully with `VISIONVERIFY_RUN_LIVE_TESTS=true pnpm test -- server/sightengine.credentials.test.ts`.
- User screenshot shows a valid PNG preview at 1.94 MB, followed by a pre-route upload block.
- Preserve server-only credentials, binary upload transport, image signature validation, and private history.

- [x] Resolve current server startup warning if it affects the upload route: `./inference` missing export `unavailableResult`.
- [x] Confirm the active runtime is using the repaired source after restart before final verification.

## Upload bug follow-up
- [x] Confirm the server can start cleanly with the active source and that the protected binary upload route is mounted.
- [x] If the gateway rejects requests before Express, reduce client request envelope overhead or add a compatible upload path while retaining a 5 MB file limit.
- [x] Run the available supported PNG through the repaired route and record the resulting status; the near-2 MB payload is covered by the route regression test.
- [x] Re-run full regression tests and mobile verification before checkpoint.

## Upload bug diagnostics
- [x] Inspect the active client transport and server upload route for request-size or gateway incompatibility.
- [x] Reproduce the supported PNG upload with a valid signed integration harness and capture the route response.
- [x] Implement the smallest compatible fix and verify the real provider workflow.

## Authenticated live-flow verification still required
- [x] Verify the repaired signed-in mobile upload flow programmatically with a real supported image and confirm it reaches Sightengine, saves a record, and opens detail/history API views; browser visual confirmation remains user-only.
- [x] Capture and document the response/status for a valid image after the init → presigned upload → complete flow.
- [x] Re-run `pnpm test && pnpm check` after authenticated live-flow verification and record the outcome.

## Mobile-only programmatic regression
- [x] Exercise the available PNG through the gateway-safe init → direct storage → complete path with a signed integration session and real provider response.
- [x] Record structured unauthenticated and invalid-file responses from the active endpoints.
- [x] Run final tests and document the exact mobile authentication step that remains user-only.

## Actual client-helper verification
- [x] Exercise the actual client upload helper against the running app’s init → presigned upload → complete flow under a signed test session.
- [x] Confirm the client-helper result id is usable for detail/report/history reopening.
- [x] Document that only the user’s own mobile browser can provide final visual confirmation of the authenticated UI state.

- [x] Increase the gated live client-helper test timeout to accommodate the real provider round trip without changing application timeouts.

- [x] Add gated route-level coverage that the report URL for a client-helper-created id resolves to the report screen mapping, not only the detail/history API procedures.
- [x] Document that the report route and detail procedure share the same private record contract, then rerun the final checks.

## Report-route contract documentation
- [x] Document that `/workspace/report/:id` renders `AnalysisDetail` and uses the same private `analysis.get` contract and user-ownership authorization boundary.
- [x] Re-run `pnpm test && pnpm check` after adding the report-route documentation.

## Repeated verification failure
- [x] Reproduce the current mobile verification failure with the available PNG and capture the exact client, route, storage, and provider response stages.
- [x] Fix the confirmed failure without weakening the 5 MB policy or replacing real Sightengine results with fabricated output.
- [x] Add regression coverage for the failing stage and re-run live, persistence, and responsive checks.

## Repeated mobile verification authentication gap
- [x] Confirm the authenticated preview session is supplied by the existing signed harness; do not add a token persistence fallback that could weaken the current cookie boundary.
- [x] Make upload control requests explicitly bypass browser caches for init and completion while retaining same-origin cookies and structured response checks.
- [x] Ensure the analyze screen surfaces upload/auth/provider errors and resets the submitting state; map invalid-session responses to actionable mobile guidance.
- [x] Add regression coverage for structured upload errors and successful client-helper paths, then rerun the live signed test.

## Stale preview response mitigation
- [x] Prevent the HTML preview shell from being cached so mobile browsers receive the current upload client bundle after the direct-storage fix.
- [x] Restart the server, verify the current client transport is served, and rerun live client-helper and full regression tests.

## Fresh mobile-flow evidence
- [x] Add an automated regression asserting extensionless app-shell routes return `Cache-Control: no-store, max-age=0`.
- [x] Capture the current init, direct-storage, and completion statuses after a clean app-shell refresh and provider run.
- [x] Document the exact mobile refresh and re-open steps required for an already-cached preview tab.
- [x] Capture and record explicit HTTP 200 statuses for init, direct presigned storage upload, and completion after a clean app-shell refresh: shell 200, init 200, storage 200, complete 200.

## Mobile gateway rejection reported after final checkpoint
- [x] Reproduce the phone-reported "upload image is blocked before reaching VisionVerify" response against the currently served mobile flow.
- [x] Identify which request, header, URL, or gateway policy causes the pre-route rejection without weakening authentication or the 5 MB limit.
- [x] Implement and test the smallest compatible fix while preserving direct storage and real Sightengine analysis.
- [x] Re-run explicit stage-status evidence, full regression checks, and responsive verification before a new checkpoint.
- [x] Confirmed from the latest mobile network trace: `/api/analysis-upload/init` returns 200, then the cross-origin presigned S3 PUT fails with `TypeError: Failed to fetch`; completion is never reached.
- [x] Add a same-origin chunked storage fallback for browsers that cannot use the presigned PUT because of storage CORS, with bounded JSON chunks and server-side revalidation.
- [x] Add client and server regression coverage for the chunked fallback and preserve the existing direct presigned path when it succeeds.
