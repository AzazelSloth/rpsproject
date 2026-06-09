# Solutions pour les erreurs 429 et 500 - Documentation des changements

## Problèmes identifiés
1. **Erreur 429 (Too Many Requests)** : L'application envoie trop de requêtes simultanément
2. **Erreur 500 (Internal Server Error)** : Erreurs serveur temporaires sans retry automatique
3. **Pas de gestion des erreurs réseau** : Les erreurs de connexion ne sont pas relancées
4. **Messages d'erreur peu clairs** : L'utilisateur ne sait pas ce qui s'est passé ni quoi faire

## Solutions appliquées (SANS MODIFICATION DU SERVEUR)

### 1. **Throttling côté client** (`lib/request-throttler.ts`)
- **Objectif** : Limiter le nombre de requêtes simultanées pour éviter les erreurs 429
- **Implémentation** : 
  - Maximum 2 requêtes concurrentes par défaut
  - Délai de 500ms entre chaque batch de requêtes
  - File d'attente automatique pour les requêtes excédentaires

### 2. **Retry avec backoff exponentiel** (`lib/retry-http-link.ts`)
- **Objectif** : Réessayer automatiquement les erreurs temporaires
- **Implémentation** :
  - 3 tentatives automatiques
  - Délai initial de 100ms, augmentant exponentiellement (x2) jusqu'à 5s max
  - Ajout de "jitter" aléatoire (0-1s) pour éviter les "thundering herd"
  - Codes d'erreur retentables : 408, 429, 500, 502, 503, 504

### 3. **Gestion améliorée des erreurs** (`lib/error-handler.ts`)
- **Objectif** : Fournir des messages d'erreur clairs et des actions suggérées
- **Implémentation** :
  - Analyse des erreurs tRPC, réseau, timeout, rate-limit
  - Messages français adaptés à chaque type d'erreur
  - Actions suggérées pour l'utilisateur
  - Détection du type d'erreur avec suggestions de résolution

### 4. **Client tRPC mis à jour** (`lib/trpc/client.ts`)
- **Intégration du throttler et retry link**
- **Configuration** :
  - Throttling : 2 requêtes concurrentes max, 500ms entre batches
  - Retry : 3 tentatives avec backoff exponentiel de 100ms à 5s

### 5. **Fonction d'envoi d'invitations améliorée** (`components/rps/survey-builder-demo.tsx`)
- **Améliorations** :
  - Gestion d'erreur granulaire avec `parseApiError()`
  - Retry automatique jusqu'à 3 fois avec délai exponentiel
  - Messages de feedback en temps réel ("Tentative 1/3...")
  - Logging détaillé pour le débogage

## Flux d'exécution

### Avant (sans solution)
```
Utilisateur clique → API Call → Erreur 429/500 → Message d'erreur → Application bloquée
```

### Après (avec solution)
```
Utilisateur clique 
  → Throttler (max 2 requêtes concurrentes)
  → Retry Link (teste la requête)
  → Si erreur retryable → Attendre + Réessayer (3x max)
  → Si succès → Afficher résultat
  → Si erreur finale → Message clair + Action suggérée
```

## Configuration du throttler

Le throttler peut être ajusté dans `lib/trpc/client.ts` :

```typescript
const throttler = getRequestThrottler({
  maxConcurrentRequests: 2,      // Nombre max de requêtes simultanées
  delayBetweenBatchesMs: 500,    // Délai entre les batches (ms)
});
```

## Configuration du retry

Le retry peut être ajusté dans `lib/trpc/client.ts` :

```typescript
retryHttpLink({
  maxRetries: 3,                           // Nombre max de retries
  initialDelayMs: 100,                     // Délai initial (ms)
  maxDelayMs: 5000,                        // Délai max (ms)
  backoffMultiplier: 2,                    // Multiplicateur exponentiel
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],  // Codes à retry
})
```

## Optimisations côté serveur recommandées (OPTIONNEL)

Bien que la solution fonctionne sans modifier le serveur, vous pourriez aussi :

1. **Mettre en place un rate limiter sur le serveur** avec des limites généreuses
2. **Implémenter un circuit breaker** pour les services externes (SendGrid)
3. **Ajouter une file d'attente** pour les emails massifs au lieu d'envoyer tout simultanément
4. **Optimiser la requête SendGrid** pour réduire les timeouts

## Monitoring et débogage

Les erreurs et retries sont loggés dans la console :
```
[tRPC Retry] Attempt 1/3 after 125ms for campaignParticipants.sendInvitations
[Invitation Error] { code: 'RATE_LIMIT_ERROR', statusCode: 429, ... }
```

## Fichiers modifiés/créés

✅ **Créés** :
- `lib/retry-http-link.ts` - Retry link avec backoff exponentiel
- `lib/request-throttler.ts` - Throttler pour limiter les requêtes concurrentes
- `lib/error-handler.ts` - Analyseur d'erreurs amélioré

✅ **Modifiés** :
- `lib/trpc/client.ts` - Intégration du throttler et retry link
- `components/rps/survey-builder-demo.tsx` - Meilleure gestion des erreurs + retry

## Test de la solution

Pour tester :

1. **Erreur 429** : Importer beaucoup de participants rapidement
   - Le throttler va limiter les requêtes
   - Le retry va réessayer automatiquement

2. **Erreur 500 temporaire** : Aucune action requise
   - Le retry va automatiquement réessayer 3 fois
   - L'utilisateur verra "Tentative 1/3 après Xs"

3. **Timeout** : Vérifier la connexion réseau
   - Le retry va réessayer avec délai exponentiel
   - Message : "Délai d'attente dépassé. Le système va réessayer."

## Support et améliorations futures

Pour améliorer davantage :
- Implémenter un cache local pour les données critiques
- Ajouter une stratégie de queue côté client pour les opérations massives
- Implémenter WebSocket pour les notifications en temps réel
