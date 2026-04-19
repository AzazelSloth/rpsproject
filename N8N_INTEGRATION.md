# 📋 Guide d'Intégration n8n

## ✅ Ce qui a été fait

### 1. Endpoints Créés
Deux endpoints Next.js sont maintenant disponibles :

#### A. Relance Employés
- **URL** : `POST /api/webhook/n8n/remind`
- **Usage** : Envoyer des relances aux employés qui n'ont pas répondu
- **Payload** :
  ```json
  {
    "campaignId": 123,
    "companyId": 456,
    "message": "Rappel personnalisé (optionnel)"
  }
  ```

#### B. Analyse RPS (NOUVEAU)
- **URL** : `POST /api/webhook/n8n/analyze`
- **Usage** : Envoyer les résultats du sondage à n8n pour analyse IA
- **Payload** :
  ```json
  {
    "campaignId": 123,
    "companyId": 456,
    "clientEmail": "client@entreprise.com",
    "results": [
      {
        "firstName": "Jean",
        "lastName": "Dupont",
        "email": "jean.dupont@entreprise.com",
        "employer": "Entreprise A",
        "department": "Direction",
        "Q1": "4",
        "Q2": "3",
        "...": "..."
      }
    ]
  }
  ```

### 2. Variables d'Environnement

Ajouter dans vos fichiers `.env` :

```env
# URL de l'instance n8n
N8N_WEBHOOK_URL=http://localhost:5678
```

---

## 🚀 Configuration pour la Production

### Pour le DevOps (VPS Astral Internet)

1. **Installer et démarrer n8n**
   ```bash
   # Via Docker (recommandé)
   docker run -d \
     --name n8n \
     -p 5678:5678 \
     -v n8n_data:/home/node/.n8n \
     n8nio/n8n
   
   # Ou via npm
   npm install n8n -g
   n8n start
   ```

2. **Importer le workflow**
   - Ouvrir n8n : `http://<VPS_IP>:5678`
   - Importer le fichier `rps-automation/ANALYSE RPS.json`
   - Activer le workflow (toggle "Active")

3. **Configurer les credentials dans n8n**
   - **Mistral Cloud** : Clé API pour l'IA
   - **Google Sheets** : OAuth2 pour lire les données
   - **Google Drive** : OAuth2 pour sauvegarder les rapports
   - **SMTP** : Serveur mail pour envoyer les emails

4. **Ouvrir le port si nécessaire**

   ```bash
   sudo ufw allow 5678/tcp
   ```

5. **Tester la connectivité**

   ```bash
   # Depuis le VPS
   curl http://localhost:5678/health
   
   # Tester le webhook
   curl -X POST http://localhost:5678/webhook/sondage-rps-solutions-tech \
     -H "Content-Type: application/json" \
     -d '{"body":{"body":[],"campaign_id":1}}'
   ```

### Pour le Développeur

1. **Mettre à jour `.env.local`** (développement)

   ```env
   N8N_WEBHOOK_URL=http://localhost:5678
   ```

2. **Démarrer n8n localement**

   ```bash
   n8n start
   ```

3. **Importer le workflow** dans l'interface locale

4. **Tester l'intégration**

   ```bash
   # Test de l'endpoint analyse
   curl -X POST http://localhost:3001/api/webhook/n8n/analyze \
     -H "Content-Type: application/json" \
     -d '{
       "campaignId": 1,
       "clientEmail": "test@test.com",
       "results": [{
         "firstName": "Test",
         "lastName": "User",
         "email": "test@test.com",
         "employer": "Test Corp",
         "department": "IT",
         "Q1": "4",
         "Q2": "3"
       }]
     }'
   ```

---

## 📊 Flux de Données Complet

```text
1. Employé répond au sondage
   ↓
2. Backend collecte les réponses
   ↓
3. Admin clique sur "Générer Rapport"
   ↓
4. Frontend → POST /api/webhook/n8n/analyze
   ↓
5. n8n reçoit les données via Webhook
   ↓
6. n8n → Google Sheets (enregistrement)
   ↓
7. n8n → IA Mistral (analyse RPS)
   ↓
8. n8n → Google Drive (sauvegarde rapport)
   ↓
9. n8n → Backend (enregistrement URL rapport)
   ↓
10. n8n → Email Client (envoi rapport)
```

---

## 🔧 Dépannage

### Problème : "n8n non configuré"

**Solution** : Vérifier que `N8N_WEBHOOK_URL` est défini dans `.env.local`

### Problème : Webhook ne répond pas

**Solution** :

```bash
# Vérifier que n8n tourne
curl http://localhost:5678/health

# Vérifier les logs n8n
docker logs n8n
# ou
n8n start --verbose
```

### Problème : Données manquantes dans le rapport

**Solution** : Vérifier que le payload contient bien `Nom et Prenom` et les champs `Q1`-`Q28`

### Problème : Email non envoyé

**Solution** : Vérifier les credentials SMTP dans n8n

---

## 📁 Fichiers Modifiés/Créés

- ✅ `app/api/webhook/n8n/analyze/route.ts` - **NOUVEAU** Endpoint analyse
- ✅ `app/api/webhook/n8n/remind/route.ts` - Endpoint relance (existant, mis à jour)
- ✅ `.env.n8n.example` - **NOUVEAU** Exemple de configuration
- ✅ `N8N_INTEGRATION.md` - **NOUVEAU** Ce guide
- 📄 `rps-automation/ANALYSE RPS.json` - Workflow n8n (à importer)

---

## ✨ Prochaines Étapes

1. [ ] DevOps installe n8n sur le VPS
2. [ ] DevOps importe et configure le workflow
3. [ ] DevOps configure les credentials (Mistral, Google, SMTP)
4. [ ] Développeur teste l'intégration en local
5. [ ] Développeur connecte le bouton "Générer Rapport" dans l'UI
6. [ ] Tests end-to-end avec des données réelles
