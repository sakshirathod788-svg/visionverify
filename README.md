# VisionVerify

VisionVerify is a research-oriented web application for submitting an image to a connected computer-vision model and presenting its **probabilistic** authenticity assessment. It is designed as a TYCS Semester 5 Artificial Intelligence and Machine Learning project in the computer-vision and digital-image-forensics domain.

> **Research limitation.** Image-authenticity assessments are probabilistic. A result is not proof of authenticity, manipulation, authorship, or intent. Performance depends on the connected model and its training data; false positives, false negatives, and unseen editing methods remain possible.

## Product behavior

| Area | Implemented behavior |
| --- | --- |
| Uploads | Signed-in users can select JPG, PNG, or WEBP images up to 5 MB. The browser and server both validate type and size; the server also verifies image signatures. |
| Model states | The interface displays one of three explicit states: **Live model connected**, **Demo mode — no real inference**, or **Model not connected**. Demo and offline states never generate an authenticity prediction. |
| Live inference | The server uploads the selected image securely, posts it to the configured model endpoint, validates the returned schema, and stores only the returned evidence and scores. |
| Privacy | Analysis queries are protected by authentication and ownership checks. A user can list or revisit only records whose `userId` matches their signed-in account. |
| History | The database stores image metadata, storage reference, timestamp, model provenance, status, returned prediction, confidence, manipulation probability, and supported evidence. |

## Architecture

```text
Signed-in user
  → VisionVerify browser workspace
  → protected server procedure
  → secure object storage + live model adapter
  → validated model response
  → private analysis record
  → dashboard, history, and revisitable detail view
```

The frontend uses React, TypeScript, Tailwind CSS, and tRPC. The server uses Express, tRPC, Drizzle ORM, a MySQL-compatible database, and secure object storage. Authentication is handled through the built-in OAuth integration.

## Configuring a live inference service

Copy the variable names from `.env.example` into the application’s secret configuration. Do not place model URLs or keys in frontend code. Live mode is enabled only when both values below are set.

| Variable | Required for live inference | Purpose |
| --- | --- | --- |
| `VISIONVERIFY_MODEL_MODE` | Yes | Set to `live` to permit real inference. Use `offline` by default; `demo` is interface-only and returns no prediction. |
| `VISIONVERIFY_ML_ENDPOINT` | Yes | HTTPS endpoint for the model service. The server sends a multipart `image` field. |
| `VISIONVERIFY_ML_API_KEY` | Optional | Bearer token passed from the server to the model provider. |

The model endpoint must return JSON in this shape. Scores may be either decimals from `0` to `1` or percentages from `0` to `100`; VisionVerify normalizes them for display. The `analysis` object must contain only indicators actually calculated by the model.

```json
{
  "prediction": "suspicious",
  "confidence": 0.87,
  "manipulationProbability": 0.76,
  "model": "your-model-name",
  "modelVersion": "1.0.0",
  "timestamp": "2026-08-23T12:00:00Z",
  "analysis": {
    "supported_indicator": "value returned by the model"
  }
}
```

Allowed `prediction` values are `likely_authentic`, `suspicious`, `likely_manipulated`, and `unable_to_analyze`. The last value is appropriate when the model itself cannot assess an image.

## Data model and operating notes

The `analyses` table relates each record to the platform user, stores the secure storage key rather than image bytes, and uses a database foreign key with cascade deletion. The browser never receives the model service credentials. The server times out live model calls after 25 seconds and records a transparent failed status rather than inventing a result.

Run `pnpm test` for the safeguard tests and `pnpm check` for TypeScript validation. Apply the database migration after schema updates before using the analysis flow.

