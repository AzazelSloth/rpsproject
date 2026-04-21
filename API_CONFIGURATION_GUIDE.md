# 🔧 Configuration API Frontend ↔ Backend

## 📋 Problème identifié

Le frontend NextJS utilise `127.0.0.1:3000` comme URL par défaut pour contacter le backend, ce qui cause des erreurs "Failed to fetch" en production.

---

## ✅ Solutions à appliquer (côté DevOps uniquement)

### 1. Variables d'environnement Frontend (IMPORTANT)

Le frontend a besoin de ces variables pour trouver le backend :

#### **Fichier : `rps-frontend/nextjs-app/.env.local` (production)**

```bash
# URL du backend accessible depuis le navigateur (client-side)
NEXT_PUBLIC_API_URL=http://<IP_VPS>:3000/api

# URL du backend pour le server-side rendering (SSR)
API_URL=http://127.0.0.1:3000/api
```

**Explication :**

- `NEXT_PUBLIC_API_URL` → Utilisé par le **navigateur** (doit être l'IP publique du VPS)
- `API_URL` → Utilisé par le **serveur Next.js** (peut rester en localhost car le backend est sur le même VPS)

**Remplacer `<IP_VPS>` par l'IP publique du serveur**, exemple :

```bash
NEXT_PUBLIC_API_URL=http://104.254.182.46:3000/api
API_URL=http://127.0.0.1:3000/api
```

---

### 2. Variables d'environnement Backend (CORS)

#### **Fichier : `rps-backend/.env` (production)**

```bash
# Autoriser le frontend à contacter le backend
CORS_ORIGIN=http://localhost:3001,http://<IP_VPS>:3001,http://<IP_VPS>:8786
```

**Exemple complet :**

```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=votre_secret_ici
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=votre_password
DB_NAME=rps_platform
DB_SYNCHRONIZE=false
DB_LOGGING=false
AUTH_DISABLED=true
CORS_ORIGIN=http://localhost:3001,http://104.254.182.46:3001,http://104.254.182.46:8786
SWAGGER_ENABLED=true
SWAGGER_PATH=api-docs
```

---

### 3. Vérifications réseau (DevOps)

#### **Firewall VPS**

```bash
# Vérifier que les ports sont ouverts
sudo ufw status

# Ouvrir les ports si nécessaire
sudo ufw allow 3000/tcp  # Backend API
sudo ufw allow 3001/tcp  # Frontend Next.js
sudo ufw allow 8786/tcp  # Accès public (si utilisé)
```

#### **Tester la connectivité**

```bash
# Depuis le VPS (test local)
curl http://127.0.0.1:3000/api/health

# Depuis l'extérieur (test public)
curl http://<IP_VPS>:3000/api/health

# Tester le CORS depuis le navigateur
curl -H "Origin: http://<IP_VPS>:3001" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: Content-Type" -X OPTIONS http://<IP_VPS>:3000/api/auth/login -v
```

---

## 🎯 Comment ça fonctionne

### **Flux de communication :**

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Navigateur utilisateur                                    │
│    → Lit NEXT_PUBLIC_API_URL                                 │
│    → http://<IP_VPS>:3000/api                               │
│    → Fait les appels fetch/axios                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. VPS (Internet)                                            │
│    → Reçoit requête sur port 3000                            │
│    → Backend écoute sur 0.0.0.0:3000 ✅                     │
│    → Vérifie CORS (CORS_ORIGIN dans .env)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Backend NestJS                                            │
│    → Traite la requête                                       │
│    → Renvoie la réponse                                      │
│    → Headers CORS autorisent <IP_VPS>:3001 ✅               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Diagnostic rapide

### **Si "Failed to fetch" apparaît :**

| Vérification | Commande | Résultat attendu |
|--------------|----------|------------------|
| **Backend écoute sur 0.0.0.0** | `pm2 logs rps-backend` | `Backend running on http://0.0.0.0:3000` |
| **Backend accessible localement** | `curl http://127.0.0.1:3000/api/health` | `{"status":"ok"}` |
| **Backend accessible publiquement** | `curl http://<IP_VPS>:3000/api/health` | `{"status":"ok"}` |
| **Frontend utilise la bonne URL** | Console navigateur → Network tab | Requêtes vers `http://<IP_VPS>:3000/api/...` |
| **CORS configuré** | Console navigateur | Pas d'erreur CORS |

---

## 📝 Fichiers de configuration

### **Frontend : `lib/api.ts` (NE PAS MODIFIER)**

Le code est déjà correct, il lit les variables d'environnement :

```typescript
// lib/api.ts - NE PAS TOUCHER
const DEFAULT_API_URL = "http://127.0.0.1:3000/api"; // Fallback local uniquement

export function getApiBaseUrl() {
  const serverUrl = process.env.API_URL?.trim();
  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window === "undefined") {
    // Server-side (SSR)
    if (isAbsoluteHttpUrl(serverUrl)) return trimTrailingSlash(serverUrl);
    if (isAbsoluteHttpUrl(publicUrl)) return trimTrailingSlash(publicUrl);
    return DEFAULT_API_URL;
  }

  // Browser-side (client)
  if (isAbsoluteHttpUrl(publicUrl)) return trimTrailingSlash(publicUrl);
  return DEFAULT_API_URL;
}
```

**Le problème n'est PAS dans le code**, mais dans les variables d'environnement qui ne sont pas configurées en production.

---

## 🚀 Checklist de déploiement

### **Avant de déployer :**

- [ ] **Backend `.env`** configuré avec `CORS_ORIGIN` incluant `<IP_VPS>:3001`
- [ ] **Frontend `.env.local`** configuré avec `NEXT_PUBLIC_API_URL=http://<IP_VPS>:3000/api`
- [ ] **Ports ouverts** dans le firewall (3000, 3001, 8786)
- [ ] **Backend écoute sur 0.0.0.0** (déjà fait dans `main.ts`)
- [ ] **PM2 redémarré** après modification des `.env`

### **Commandes pour appliquer :**

```bash
# 1. Sur le VPS, modifier les fichiers .env
nano ~/rps-rps_dev/rps-backend/.env
nano ~/rps-rps_dev/rps-frontend/nextjs-app/.env.local

# 2. Redémarrer les services
pm2 restart all
pm2 save

# 3. Vérifier les logs
pm2 logs rps-backend --lines 20
pm2 logs rps-frontend --lines 20

# 4. Tester
curl http://127.0.0.1:3000/api/health
curl http://<IP_VPS>:3000/api/health
```

---

## ⚠️ Points importants

1. **`NEXT_PUBLIC_API_URL` doit être l'IP publique** (pas localhost, pas 127.0.0.1)
2. **`API_URL` peut rester en localhost** (utilisé uniquement côté serveur)
3. **Le rebuild Next.js est requis** après changement de `NEXT_PUBLIC_API_URL` car ces variables sont "baked" au build
4. **CORS_ORIGIN doit inclure toutes les origines** (localhost pour dev, IP publique pour prod)

---

## 📞 En cas de problème

### **Erreur : "Failed to fetch"**

→ Vérifier que `NEXT_PUBLIC_API_URL` pointe vers l'IP publique du VPS

### **Erreur : CORS**

→ Vérifier que `CORS_ORIGIN` dans backend `.env` inclut l'IP du frontend

### **Erreur : "Connection refused"**

→ Vérifier que le backend écoute sur `0.0.0.0` et que le port 3000 est ouvert

### **Le frontend utilise encore localhost**

→ Reconstruire le frontend après avoir modifié `.env.local` :

```bash
cd ~/rps-rps_dev/rps-frontend/nextjs-app
rm -rf .next
npm run build
pm2 restart rps-frontend
```

---

**Date :** 2026-04-13  
**À transmettre au :** DevOps en charge du déploiement
