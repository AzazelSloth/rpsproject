# Coordonnées du champion dans SendGrid

Les champs facultatifs sont propres à l'entreprise. Dans la création/modification
du sondage, saisir le nom et/ou le courriel près du contexte, puis cliquer sur
« Enregistrer le contexte ». Les prochains envois récupèrent ces données en base.
Les courriels déjà envoyés ne peuvent pas être modifiés.

## Variables transmises aux invitations et aux relances

- `championName` : nom enregistré, sinon chaîne vide.
- `championEmail` : courriel enregistré, sinon chaîne vide.
- `hasChampion` : vrai si au moins une coordonnée est renseignée.
- Alias disponibles : `champion_name`, `nomChampion`, `champion_email`, `emailChampion`.

Le destinataire, le lien personnel, l'expéditeur et l'adresse de réponse existante
ne changent pas. Le champion ne reçoit pas automatiquement de copie.

## Bloc à intégrer dans les modèles dynamiques existants

Remplacer uniquement le paragraphe contenant les textes statiques
« Nom champion, emailChampion » par ce bloc, en conservant le reste du modèle :

```html
{{#if hasChampion}}
<p>
  Des questions sur la démarche ?<br>
  Contact :
  {{#if championName}}<strong>{{championName}}</strong>{{/if}}
  {{#if championEmail}}
    {{#if championName}}, {{/if}}
    <a href="mailto:{{championEmail}}">{{championEmail}}</a>
  {{/if}}
</p>
{{/if}}
```

Ne pas utiliser de triples accolades : les doubles accolades échappent le HTML.
Si les deux champs sont vides, le paragraphe est masqué. Le contact existant pour
les questions de confidentialité reste inchangé.

Documentation : [SendGrid — Handlebars](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/using-handlebars).

## État de la livraison locale

La migration `1710000000017-AddCompanyChampion.ts` ajoute deux colonnes nullables
sans modifier les réponses ou remplir des contacts fictifs. Elle doit être
appliquée à la base cible avant utilisation du code qui lit ces colonnes.
Les scripts de migration/déploiement existants ne sont pas modifiés.

La migration a été appliquée le 11 septembre 2026 uniquement à la base locale
`rps_platform` sur `localhost:5432`, avec enregistrement dans l'historique TypeORM.
Les lectures, sauvegardes et effacements des champs ont été vérifiés dans une
transaction de test annulée ; aucun contact fictif n'a été conservé et les
données existantes ont été contrôlées inchangées.

Attention : les migrations 14 à 16 ne sont pas enregistrées dans l'historique de
cette base locale, bien que leurs principales colonnes soient présentes. Cet
écart préexistant n'a pas été corrigé dans cette intervention. Ne pas lancer
une migration générale sur cette base sans le régulariser : la migration 14
tenterait notamment de recréer les colonnes d'horodatage existantes.

Aucune migration de production et aucune modification du modèle distant
SendGrid n'ont été effectuées.
Avant un envoi réel, vérifier l'aperçu SendGrid avec les deux champs remplis,
chacun séparément, puis tous deux vides.
