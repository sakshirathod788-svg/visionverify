# VisionVerify

VisionVerify is a TYCS Semester 5 Artificial Intelligence and Machine Learning project for cautiously assessing image authenticity through a real computer-vision inference service. It accepts a user image, validates it, sends it securely from the server to the selected provider, stores only returned model data, and keeps every record private to its signed-in owner.

> **Important limitation.** A VisionVerify result is a probabilistic model output, not definitive proof of authenticity, manipulation, authorship, or intent. The system must not be used as sole evidence in legal, safety, journalistic, security, or other high-stakes decisions.

## Live ML integration

The current live provider is [Sightengine](https://sightengine.com). VisionVerify sends a multipart image request to its documented `check.json` API with `models=deepfake,genai` and validates the provider response before any record is stored. The integration uses two distinct hosted computer-vision models:

| Provider model | Actual scope in VisionVerify | Returned fields retained by VisionVerify |
| --- | --- | --- |
| [Deepfake Detection](https://sightengine.com/docs/deepfake-detection) | Prominent-face, identity-level deepfake or AI-modification scoring in photographic imagery. It is not a general image-editing detector. | `deepfake` score, provider request ID, provider timestamp when supplied. |
| [AI-Generated Image Detection](https://sightengine.com/docs/ai-generated-image-detection) | Pixel-based estimation of whether an image is entirely AI-generated. | `ai_generated` score and optional `ai_generators` scores, provider request ID, provider timestamp when supplied. |

The provider returns probabilities rather than one combined “authenticity confidence” or a universal authenticity verdict. VisionVerify stores and displays those returned scores under their provider field names; it does **not** synthesize an authentic, suspicious, or manipulated classification when the provider has not returned one. The product does **not** invent a combined confidence, model version, accuracy, precision, recall, F1 score, confusion matrix, dataset size, or forensic indicator.

## Operating modes

| State | Behaviour |
| --- | --- |
| Live model connected | Occurs only when valid `SIGHTENGINE_API_USER` and `SIGHTENGINE_API_SECRET` values exist in secure server configuration. The server makes the real API request. |
| `VISIONVERIFY_MODEL_MODE=demo` | Displays **DEMO MODE — NO REAL ML INFERENCE**. The system stores no prediction, confidence, or evidence. |
| `VISIONVERIFY_MODEL_MODE=offline`, missing credentials, timeout, provider error, or invalid provider response | Displays **ML model unavailable — no prediction generated.** No prediction or score is fabricated. |

## Security and privacy

The browser accepts JPG, PNG, and WEBP images up to 5 MB. The server repeats the validation, verifies magic bytes, applies a 25-second model timeout, stores the image in secure object storage, and sends credentials only from server code. Analysis list and detail procedures require authenticated ownership; a user can retrieve only records tied to their own account.

## Data flow

```text
Signed-in user
  → client-side image validation and preview
  → protected server-side validation
  → secure file storage
  → Sightengine deepfake + AI-generated image models
  → schema-validated provider response
  → private database record and revisitable analysis result
```

## Verification

`pnpm check` runs TypeScript validation. `pnpm test` runs local validation and authorization tests. The real provider credential test is intentionally gated to avoid repeated paid API requests; run `VISIONVERIFY_RUN_LIVE_TESTS=true pnpm test -- server/sightengine.credentials.test.ts` after configuring credentials. A passing test confirms that the provider accepts the credentials and returns a real deepfake score on the provider’s documented sample image.
