# VisionVerify

VisionVerify is a TYCS Semester 5 Artificial Intelligence and Machine Learning project for cautiously assessing image authenticity through a real computer-vision inference service. It accepts a user image, validates it, sends it securely from the server to the selected provider, stores only returned model data, and keeps every record private to its signed-in owner.

> **Important limitation.** A VisionVerify result is a probabilistic model output, not definitive proof of authenticity, manipulation, authorship, or intent. The system must not be used as sole evidence in legal, safety, journalistic, security, or other high-stakes decisions.

## Live ML integration

The current live provider is [Sightengine](https://sightengine.com). VisionVerify sends a multipart image request to its documented `check.json` API with `models=deepfake,genai` and validates the provider response before any record is stored. The integration uses two distinct hosted computer-vision models:

| Provider model | Actual scope in VisionVerify | Returned fields retained by VisionVerify |
| --- | --- | --- |
| [Deepfake Detection](https://sightengine.com/docs/deepfake-detection) | Prominent-face, identity-level deepfake or AI-modification scoring in photographic imagery. It is not a general image-editing detector. | `deepfake` score, provider request ID, provider timestamp when supplied. |
| [AI-Generated Image Detection](https://sightengine.com/docs/ai-generated-image-detection) | Pixel-based estimation of whether an image is entirely AI-generated. | `ai_generated` score and optional `ai_generators` scores, provider request ID, provider timestamp when supplied. |

The provider returns probabilities rather than one combined “authenticity confidence” or a universal authenticity verdict. VisionVerify stores and displays those returned scores under their provider field names; it does **not** invent a combined confidence, model version, accuracy, precision, recall, F1 score, confusion matrix, dataset size, or forensic indicator.

For readability, the result interface applies an explicitly disclosed **50% display threshold** to a returned provider score. An AI-generated score at or above that threshold is presented as **Likely AI-Generated**; a deepfake score at or above it is presented as **Potential manipulation signal**. Scores below the threshold are shown as **Not flagged by returned scores**, never as an authenticity claim. This is an interface-level explanation of a real returned score, not a provider-supplied verdict.

## Operating modes

| State | Behaviour |
| --- | --- |
| Live model connected | Occurs only when valid `SIGHTENGINE_API_USER` and `SIGHTENGINE_API_SECRET` values exist in secure server configuration. The server makes the real API request. |
| `VISIONVERIFY_MODEL_MODE=demo` | Displays **DEMO MODE — NO REAL ML INFERENCE**. The system stores no prediction, confidence, or evidence. |
| `VISIONVERIFY_MODEL_MODE=offline`, missing credentials, timeout, provider error, or invalid provider response | Displays **ML model unavailable — no prediction generated.** No prediction or score is fabricated. |

## Security and privacy

The browser accepts JPG, PNG, and WEBP images up to 5 MB. It checks the real file signature and browser decodability before preview. To avoid sending large base64 strings through the batched RPC transport, it sends validated binary bytes to a protected server upload route; the server repeats validation, verifies magic bytes, applies a 25-second model timeout, stores the image in secure object storage, and sends credentials only from server code. Analysis list and detail procedures require authenticated ownership; a user can retrieve only records tied to their own account.

## Data flow

```text
Signed-in user
  → client-side image validation and preview
  → protected binary upload and server-side validation
  → secure file storage
  → Sightengine deepfake + AI-generated image models
  → schema-validated provider response
  → private database record
  → verification result, full report, and revisitable history entry
```

## Verification

`pnpm check` runs TypeScript validation. `pnpm test` runs local validation, upload-route, image-inspection, provider-presentation, and authorization tests. The real provider credential test is intentionally gated to avoid repeated paid API requests; run `VISIONVERIFY_RUN_LIVE_TESTS=true pnpm test -- server/sightengine.credentials.test.ts` after configuring `SIGHTENGINE_API_USER` and `SIGHTENGINE_API_SECRET`. A passing test confirms that the provider accepts the configured credentials and VisionVerify’s live adapter receives a real score on the provider’s documented sample image.

## Post-redesign verification checklist

The gated live-adapter test has been executed successfully with the configured Sightengine credentials. The result, full-report, and history screens have been reviewed with an existing private provider-backed record. Browser automation does not submit customer images automatically, so an authenticated user should complete the final interactive check below using an image they are permitted to analyze:

1. Open **Verify** and choose a valid JPG, PNG, or WEBP image under 5 MB. Confirm that the preview appears.
2. Select **Verify Image**. Confirm the scanning state stays limited to actual validation, live-provider analysis, and report creation.
3. Confirm the result screen displays only returned AI-generated/deepfake scores, a clear unavailable-confidence message when relevant, and the model/provider fields.
4. Open **View Full Report**, then return to **Verification History** and reopen the same report. Confirm the report is visible only while signed in to the account that created it.

If Sightengine returns no usable score, VisionVerify persists an explicit incomplete-provider-response state. If the provider is unavailable or errors, it persists **ML model unavailable — no prediction generated** instead of creating a detection result.


## Large-image upload transport

The browser does not send multi-megabyte image bytes through the managed application gateway. For each verification, it first sends a small authenticated JSON request to `/api/analysis-upload/init`, uploads the validated image directly to the returned presigned object-storage URL, and then sends a small authenticated `/api/analysis-upload/complete` request. The server downloads that exact stored object, repeats signature and size validation, runs the configured Sightengine adapter, and writes the private record. The legacy raw binary endpoint remains available for compatibility, but the current client uses the gateway-safe three-step flow.

This preserves the user-facing 5 MB limit while avoiding the upstream HTML 403 failure observed for larger mobile PNG requests. Both control endpoints return JSON errors for unauthenticated or malformed requests, and the real provider is called only after the stored object is revalidated server-side.


## Mobile upload regression record

On 2026-08-25, the available PNG was submitted through a signed local regression session using the current gateway-safe flow. The image was 313,423 bytes; the authenticated init request returned `200`, the direct presigned-storage upload returned `200`, and the authenticated completion request returned `200`. VisionVerify received a real live Sightengine response with provider timestamp `2026-08-25T16:30:07.130Z` and retained the provider evidence keys `deepfake_score_percent`, `ai_generated_probability_percent`, and `provider_request_id`. The saved record was reopened through the private detail procedure and was found again in the private history list. The larger-payload route regression separately exercises a 1.9 MB PNG body and confirms JSON route handling. This verifies the programmatic upload, persistence, detail, and history path; it does not replace the user’s own mobile-browser visual check.


## Gated client-helper regression

For environments without a desktop browser, the actual client upload helper can be exercised against the running app with a signed test session: `VISIONVERIFY_RUN_LIVE_UPLOAD_TESTS=1 VISIONVERIFY_TEST_OPEN_ID=<existing-user-open-id> pnpm vitest run client/src/lib/analysisUpload.e2e.test.ts`. This test uses the available supported PNG when present, follows the browser helper’s init → direct presigned upload → complete sequence, verifies a live Sightengine-backed completed result with a positive saved id, and reopens that id through the private detail and history procedures. The test requires the existing server environment values `JWT_SECRET` and `VITE_APP_ID`; it does not expose provider credentials.


## Report route and private record contract

The client route `/workspace/report/:id` is intentionally wired to `AnalysisDetail`. It reads the record through the protected `analysis.get` procedure, which returns the same `analysisView` contract used by the history and report-oriented surfaces. That procedure applies the signed-in user boundary with `getAnalysisByIdForUser`, so a report id is only readable when its `userId` belongs to the current authenticated account. The route itself is a client-rendered screen; the record privacy boundary is enforced by the server procedure rather than by hiding a URL.


## Mobile recovery after an older preview tab

If a mobile tab was open before the gateway-safe upload fix, close that tab completely and reopen the current VisionVerify preview URL from the project’s Preview action. Navigate again to `/workspace/analyze`, wait for the model-status badge to load, choose the image, and press **Verify Image**. The extensionless app-shell response is now `Cache-Control: no-store, max-age=0`, so a normal reload should receive the current client bundle. If the tab still shows the old pre-route upload message, open the browser menu, choose Reload, then close and reopen the tab before retrying. A valid signed-in session is still required; the server intentionally rejects unauthenticated init and completion requests.


## Mobile storage transfer fallback

The browser may successfully receive the upload-init response but still be unable to issue the cross-origin presigned S3 `PUT` when the storage endpoint does not expose the required browser CORS policy. VisionVerify now detects that transfer failure and retries through authenticated same-origin `/api/analysis-upload/chunk` requests, each limited to 80 KiB of binary data encoded in a bounded JSON envelope. The server stores each part, reassembles the parts, revalidates the final JPEG, PNG, or WEBP signature and 5 MB limit, stores the final image, and only then calls the real Sightengine adapter. The direct presigned path remains available when the browser can complete it.
