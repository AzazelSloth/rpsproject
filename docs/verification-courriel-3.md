# Vérification du troisième courriel — 23 septembre 2026

Le défaut est confirmé : les noms des variables transmis par le backend ne
correspondaient pas à ceux du modèle actif dans SendGrid.

## Constat vérifié

Lecture seule de `GET /v3/templates/d-039191451ef9494097dcee955088d1ac`
avec la configuration SendGrid locale : réponse HTTP 200, modèle dynamique,
version active `ed99f0e3-c7bb-417e-8a70-3ed2f51b0b03`, mise à jour indiquée
par SendGrid : `2026-09-16 02:02:03`.

| Variable du modèle actif | Avant correction | Source après correction |
|---|---|---|
| `firstName` | Absente ; seule `firstname` était fournie | Prénom de l'employé |
| `endDate` | Absente | Date de fin de campagne, en français |
| `surveyLink` | Absente | Lien personnel de participation |
| `championName` | Absente ; seule `champion` était fournie | Nom du champion enregistré pour l'entreprise |
| `championEmail` | Absente ; seule `emailchampion` était fournie | Courriel du champion enregistré pour l'entreprise |
| `companyName` | Absente | Nom de l'entreprise de la campagne |

Le test unitaire existant exigeait exactement les trois anciennes clés. Il
réussissait donc tout en laissant les six variables du modèle actif absentes.
Le test SendGrid éventuellement exécuté par l'utilisateur n'a pas été observé.

## Correction et validation

Le troisième courriel utilise maintenant les variables communes aux courriels
d'invitation et de relance. Ses trois anciens alias sont conservés pour les
anciennes versions de modèle.

- Reproduction avant correction : trois scénarios échouent sur les variables
  attendues par le modèle actif.
- Après correction : 37 tests réussis dans les deux suites ciblées, compilation
  du backend réussie.
- Deux scénarios traversent `CampaignParticipantService.sendReminders` puis le
  véritable `SendGridMailService`, avec et sans coordonnées du champion. Ils
  vérifient le destinataire, le modèle sélectionné et le JSON du POST SendGrid.
  Les dépôts de données sont simulés ; le transport HTTP est intercepté.
- Les coordonnées absentes restent vides ; elles ne sont pas inventées.

Commandes depuis `rps-backend` :

```powershell
npm test -- --runInBand --silent email/sendgrid-mail.service.spec.ts campaign-participant/campaign-participant.service.spec.ts
npm run build
```

Aucun envoi réel, aucune modification du modèle SendGrid ni déploiement n'a
été effectué. Le correctif doit être déployé sur le backend pour s'appliquer
aux prochains envois. La configuration et le courriel reçu en production n'ont
pas été inspectés ; la comparaison porte sur le code local et le modèle accessible
avec la clé SendGrid locale.
