# Guide de dépannage rapide - Erreurs 429 et 500

## 🎯 Problème résolu

Votre application avait deux problèmes principaux qui ont été **RÉSOLUS SANS MODIFIER LE SERVEUR** :

1. ❌ **Erreur 429** : "Too Many Requests" → ✅ **Throttler côté client**
2. ❌ **Erreur 500** : "Internal Server Error" → ✅ **Retry automatique avec backoff**

---

## 📝 Résumé des solutions

### 1️⃣ Throttler (Limitation des requêtes)
**Fichier** : `lib/request-throttler.ts`

- ✅ Limite à **2 requêtes simultanées** (configurable)
- ✅ Ajoute un délai de **500ms** entre les batches
- ✅ Évite les erreurs 429 "Too Many Requests"

### 2️⃣ Retry avec Backoff Exponentiel
**Fichier** : `lib/retry-http-link.ts`

- ✅ Réessaye automatiquement jusqu'à **3 fois**
- ✅ Délai : 100ms → 200ms → 400ms (+ jitter aléatoire)
- ✅ Gère les erreurs : 408, 429, 500, 502, 503, 504

### 3️⃣ Gestion d'erreurs améliorée
**Fichier** : `lib/error-handler.ts`

- ✅ Messages d'erreur clairs en français
- ✅ Actions suggérées pour l'utilisateur
- ✅ Distinction entre erreurs réseau, timeout, rate-limit, serveur

### 4️⃣ Client tRPC intégré
**Fichier** : `lib/trpc/client.ts`

- ✅ Throttler + Retry automatiquement activés
- ✅ Prêt à l'emploi, aucune configuration requise

### 5️⃣ Fonction d'envoi d'invitations mise à jour
**Fichier** : `components/rps/survey-builder-demo.tsx`

- ✅ Affiche le statut des retries : "Tentative 1/3..."
- ✅ Messages d'erreur détaillés
- ✅ Récupération automatique en cas d'erreur temporaire

---

## 🚀 Comment ça marche ?

### Avant (SANS solution)
```
Utilisateur clique "Envoyer invitations"
  ↓
100 requêtes envoyées simultanément
  ↓
Erreur 429 "Too Many Requests"
  ↓
Application bloquée ❌
```

### Après (AVEC solution)
```
Utilisateur clique "Envoyer invitations"
  ↓
Throttler : max 2 requêtes/fois
  ↓
Requête #1 → Succès ✅ ou Erreur retryable?
Requête #2 → Attendre 500ms → Requête #3
  ↓
Si erreur 429/500 → Attendre + Réessayer (x3 max) ✅
  ↓
Afficher résultat à l'utilisateur
```

---

## 🛠️ Configuration

Pour ajuster le throttler et les retries :

### Dans `lib/trpc/client.ts`, modifier :

```typescript
// Throttler
const throttler = getRequestThrottler({
  maxConcurrentRequests: 2,      // Réduire = plus lent, moins d'erreurs
  delayBetweenBatchesMs: 500,    // Plus élevé = plus de délai entre requêtes
});

// Retry
retryHttpLink({
  maxRetries: 3,                 // Plus élevé = plus de tentatives
  initialDelayMs: 100,           // Délai initial avant 1er retry
  maxDelayMs: 5000,              // Max 5 secondes entre retries
  backoffMultiplier: 2,          // Délai × 2 à chaque retry
})
```

---

## 📊 Monitoring

### Vérifier les retries dans la console navigateur

Ouvrez **DevTools** (F12) → **Console** et cherchez :

```
[tRPC Retry] Attempt 1/3 after 125ms for campaignParticipants.sendInvitations
[Invitation Error] { code: 'RATE_LIMIT_ERROR', statusCode: 429, ... }
```

---

## ✅ Cas de test

### Test 1 : Erreur 429
**Action** : Importer 500+ employés d'un coup
**Résultat attendu** :
- Les requêtes sont limitées à 2/fois
- Si erreur 429 → Retry automatique
- Message utilisateur : "Tentative 1/3..."

### Test 2 : Erreur 500 temporaire
**Action** : SendGrid hors ligne temporairement
**Résultat attendu** :
- Erreur détectée
- Retry automatique x3
- Message claire : "Erreur serveur temporaire. Le système réessayera automatiquement."

### Test 3 : Timeout réseau
**Action** : Connexion lente ou intermittente
**Résultat attendu** :
- Détection du timeout
- Retry automatique
- Message : "Délai d'attente dépassé. Le système va réessayer."

---

## 📋 Fichiers créés/modifiés

**✅ CRÉÉS** (3 nouveaux fichiers) :
```
lib/retry-http-link.ts          ← Retry avec backoff exponentiel
lib/request-throttler.ts        ← Throttler pour limiter requêtes
lib/error-handler.ts            ← Analyse des erreurs
```

**✅ MODIFIÉS** (2 fichiers) :
```
lib/trpc/client.ts                          ← Intégration throttler + retry
components/rps/survey-builder-demo.tsx      ← Meilleure gestion erreurs
```

---

## 🔧 Prochaines étapes (OPTIONNEL)

Pour aller plus loin (modification serveur requise) :
1. Implémenter un rate limiter robuste côté serveur
2. Mettre en place une queue pour les emails massifs
3. Ajouter un circuit breaker pour SendGrid
4. Implémenter une file d'attente persistante

---

## ❓ FAQ

**Q: L'application est-elle plus lente maintenant ?**
R: Très légèrement (500ms délai entre batches), mais c'est intentionnel pour éviter les erreurs 429. Les utilisateurs verront des messages de progression.

**Q: Et si le serveur est vraiment down ?**
R: Après 3 retries, un message d'erreur clair s'affiche. L'utilisateur peut réessayer manuellement ou vérifier le serveur.

**Q: Puis-je désactiver les retries ?**
R: Oui, en mettant `maxRetries: 0` dans `retryHttpLink`, mais ce n'est pas recommandé.

**Q: La solution fonctionne-t-elle hors ligne ?**
R: Non, elle nécessite une connexion réseau. Mais elle gère les erreurs réseau temporaires (reconnexion auto).

---

## 📞 Support

Si des erreurs persistent :
1. Vérifiez la console (DevTools F12) pour les logs de retry
2. Testez avec un petit batch (10 employés) d'abord
3. Vérifiez la connexion réseau
4. Consultez les logs serveur pour des erreurs non-retryables
