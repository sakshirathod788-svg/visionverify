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
