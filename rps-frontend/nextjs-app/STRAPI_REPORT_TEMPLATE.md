# Strapi Report Template

Créer un single type Strapi expose a l'endpoint `/api/report-template`.

Champs attendus:

- `templateName` : Text
- `executiveSummaryTitle` : Text
- `executiveSummaryBody` : Rich text ou Long text
- `methodologyTitle` : Text
- `methodologyBody` : Rich text ou Long text
- `recommendationsTitle` : Text
- `recommendationsIntro` : Rich text ou Long text
- `consultantNotesTitle` : Text
- `consultantNotesPlaceholder` : Rich text ou Long text
- `conclusionTitle` : Text
- `conclusionBody` : Rich text ou Long text

Variables d'environnement frontend:

- `NEXT_PUBLIC_STRAPI_URL=http://localhost:1337`
- `STRAPI_API_TOKEN=...`

Usage actuel dans l'application:

- Les donnees metier du rapport viennent du backend NestJS.
- Le template editorial vient de Strapi.
- Si Strapi n'est pas configure, le frontend utilise un template local de fallback.
