# Sauvegarde et reprise du questionnaire

Les réponses sont conservées dans un brouillon de participation, séparé des
réponses définitives. Le brouillon et sa version sont accessibles par le lien
individuel du participant. Les listes administratives ne chargent pas son contenu.

Le navigateur conserve chaque modification immédiatement dans son stockage local,
puis synchronise après 800 ms sans saisie. Le bouton avec une icône permet de
synchroniser manuellement. Une nouvelle tentative a lieu au retour de la connexion
et toutes les 15 secondes si des changements restent à synchroniser.

La reprise avance à la prochaine section si la section mémorisée est remplie,
sinon elle conserve cette section. Les refus explicites comptent comme une réponse
pour la navigation, mais restent distincts des réponses dans les résultats.
La navigation arrière reste possible jusqu'à la validation finale.

Les relances utilisent le même jeton et incluent les participations `in_progress`.
Seule la soumission finale crée les réponses définitives, marque la participation
comme terminée et efface le brouillon. Des versions et verrous PostgreSQL protègent
les sauvegardes concurrentes. Les modifications locales non synchronisées sont
réappliquées sur la version distante ; en cas de modification de la même question,
la modification locale en attente est prioritaire.

## Installation et vérification

Dans `rps-backend`, exécuter `npm run migration:run` avant de démarrer la nouvelle
version. La migration `AddParticipationDraft1710000000013` ajoute les deux colonnes.

- Backend : `npm test -- --runInBand` et `npm run build`.
- PostgreSQL : après le build, `node test/participation-draft.postgres.cjs`.
  Ce test crée puis supprime son propre schéma dans la base configurée ; les emails
  sont simulés et les données applicatives ne sont pas modifiées.
- Frontend : `npm run test:survey-response`, `npx tsc --noEmit`, `npm run build`.

## Vérification manuelle dans le navigateur

1. Remplir une section, fermer le lien puis le rouvrir : vérifier la reprise à la
   section suivante et les réponses en revenant en arrière.
2. Répondre à une partie de la page, actualiser : retrouver cette page et la saisie.
3. Couper le réseau, modifier une réponse et fermer immédiatement : vérifier
   l'avertissement du navigateur, puis rouvrir le même lien après reconnexion dans
   le même navigateur et retrouver la modification.
4. Cliquer sur l'icône d'enregistrement puis ouvrir le lien sur un autre appareil :
   retrouver les réponses dont la synchronisation a été confirmée.
5. Ouvrir le lien d'une relance : retrouver la même participation en cours.
6. Modifier une réponse précédente, désélectionner un refus et vérifier la reprise.
7. Valider définitivement : vérifier l'arrêt des relances et l'absence de doublons.

Le stockage local nécessite un navigateur qui l'autorise et dont les données ne
sont pas effacées. Une saisie hors connexion reste sur cet appareil jusqu'à sa
synchronisation. Le rechargement complet du questionnaire nécessite le retour du
réseau. L'avertissement natif dépend du navigateur ; il n'est pas garanti lors
d'un arrêt forcé ou sur mobile. La copie locale est écrite pendant la saisie,
indépendamment de cet avertissement.
