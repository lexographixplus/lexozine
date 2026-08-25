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
- The current handoff is a portable ZIP package: manifest.json, pages/, and
  assets/. LexoZine validates it, uploads approved image/SVG assets to
  Cloudinary, rewrites page references, and stores only the immutable manifest
  in PostgreSQL.
- The JSON endpoint remains available for a later direct-publish workflow that
  has already uploaded versioned files to object storage.
- LexoZine stores the selected fixed-layout build against an issue; it does not
  rewrite page geometry.
- The public reader shows fixed pages in Magazine view and keeps LexoZine's
  accessible reflowed articles in Read view.
- Desktop fonts are not copied automatically. A licensed web-font policy must
  be chosen before a release that depends on non-system fonts.
