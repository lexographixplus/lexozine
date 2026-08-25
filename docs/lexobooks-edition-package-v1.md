# LexoBooks Edition Package v1

This is the publishing contract between LexoBooks and LexoZine. It is an immutable
release artifact, not an editable project file.

```json
{
  "format": "lexobooks-edition",
  "version": 1,
  "buildId": "9c49a4f1-...",
  "createdAt": "2026-08-25T20:00:00.000Z",
  "source": {
    "projectId": "local-project-id",
    "projectRevision": "sha-or-version",
    "rendererVersion": "lexobooks-0.x"
  },
  "page": {
    "width": 595.276,
    "height": 841.89,
    "unit": "pt",
    "readingDirection": "ltr"
  },
  "pages": [
    {
      "number": 1,
      "label": "Cover",
      "svgUrl": "https://cdn.example/pages/001.svg",
      "previewUrl": "https://cdn.example/previews/001.webp",
      "text": "Accessible page text, when available."
    }
  ],
  "pdfUrl": "https://cdn.example/issue-print.pdf"
}
```

## Delivery rules

- Page SVGs are rendered by LexoBooks from the same display list as the PDF.
- Every asset URL is immutable and HTTPS in production.
- LexoZine stores this manifest against an issue as the selected fixed-layout
  build. It does not rewrite page geometry.
- The public reader shows the fixed pages as the **Magazine** view and keeps
  LexoZine's reflowed articles as the **Read** view.
- A later direct-publish workflow will upload files using signed object-storage
  URLs before it calls the import endpoint. The import endpoint intentionally
  accepts URLs rather than putting artwork blobs in PostgreSQL.
