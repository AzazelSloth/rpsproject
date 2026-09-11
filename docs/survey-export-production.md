# Export CSV des réponses en production

L'export utilise deux variables côté backend :

- `TEST_SURVEY_DELETE_ALLOWED_EMAILS` : liste commune aux exports et à la suppression des sondages de test, avec des adresses exactes séparées par des virgules (aucun joker).
- `SURVEY_EXPORT_PSEUDONYM_SECRET` : secret dédié d'au moins 32 caractères pour pseudonymiser les répondants. Sans secret valide, l'export renvoie HTTP 503.

## Déploiement GitHub Actions

Configurer les deux secrets du même nom dans l'environnement GitHub utilisé par le workflow `rps_deployment.yml`. Générer le secret une seule fois, par exemple avec `openssl rand -hex 32`, et conserver sa valeur entre les déploiements pour maintenir les références des répondants. Ne pas réutiliser `JWT_SECRET`.

Le workflow transmet ces valeurs à `deploy.sh`, qui les écrit dans le fichier `.env` de Compose. Compose doit ensuite les injecter dans le conteneur backend : leur présence dans `.env` seule ne suffit pas.

Relancer le déploiement après configuration. Le script vérifie la longueur du secret lorsque des comptes d'export sont configurés, puis applique les migrations avant de recréer les services.

## Vérification

Avec un compte autorisé, ouvrir Résultats et télécharger les deux exports d'un sondage contenant des participations terminées. Vérifier HTTP 200, le téléchargement CSV et les réponses attendues.

- Boutons absents ou HTTP 403 : vérifier la liste des comptes autorisés.
- HTTP 503 : vérifier la présence et la longueur du secret dans le backend, sans afficher sa valeur.
- HTTP 500 : consulter les logs backend et vérifier les migrations, notamment les instantanés des questionnaires et les éléments de soumission.

Les tests HTTP locaux utilisent des dépôts simulés : ils ne valident pas l'état de la base ni la configuration effective du serveur de production.

## Migration du serveur

Conserver `DB_SYNCHRONIZE=false`. Avant le déploiement, sauvegarder la base PostgreSQL et vérifier que cette sauvegarde est restaurable. Ne pas utiliser `migration:revert` pour corriger un export : le retour arrière de la migration 16 supprime les instantanés collectés.

Le déploiement construit la nouvelle image backend, lance `npm run migration:run:prod` dans cette image, puis recrée les services uniquement si la commande réussit. Les migrations en attente sont exécutées dans une transaction. Un contrôle supplémentaire vérifie les colonnes nécessaires à l'export et l'absence de migrations restantes ; une incohérence bloque le déploiement.

Les changements récents comprennent `AddResponseState1710000000011`, les brouillons et durées de participation (13 et 14), `AddQuestionSectionVisibility1710000000015` et `CaptureSurveySubmissions1710000000016`. Cette dernière ajoute `campaign_participants.questionnaire_snapshot`, la table `survey_submission_items`, ses contraintes et son index unique. Elle conserve les réponses existantes ; leur export reste identifié comme historique indéterminé.

Pour un déploiement manuel, depuis `scripts/vps`, avec le fichier `.env` de production configuré et la sauvegarde effectuée :

```bash
docker compose build backend frontend
docker compose run --rm --no-deps backend npm run migration:run:prod
# Continuer uniquement si la commande précédente réussit et affiche :
# [db] Survey export schema verified; no pending migrations.
docker compose up -d --no-build --force-recreate backend frontend nginx
```

Dans la base cible, la requête en lecture seule suivante permet de contrôler les migrations enregistrées :

```sql
SELECT name, timestamp FROM migrations ORDER BY timestamp;
```

Un second lancement de la commande de migration doit afficher qu'aucune migration n'est en attente. Terminer par les deux téléchargements CSV avec un compte autorisé. Aucun accès au serveur ni migration de production n'est effectué par les tests locaux.
