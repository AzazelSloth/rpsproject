# Guide - Multi-Projets sur VPS

Ce guide explique comment configurer plusieurs projets sur un même VPS.

## Options d'Architecture

### Option 1: Sous-domaines (Recommandé avec domaine)

Chaque projet a son propre sous-domaine :
- `rps.mondomaine.com` → Projet RPS
- `autre.mondomaine.com` → Autre projet

**Avantages :**
- URL professionnelle
- Isolation claire entre projets
- SSL facile avec Certbot

**Prérequis :**
- Nom de domaine指向 votre VPS
- DNS configuré pour les sous-domaines

### Option 2: Ports différents (Sans domaine)

Chaque projet utilise des ports différents :
- `http://VPS_IP:3000` → RPS Backend
- `http://VPS_IP:3001` → RPS Frontend
- `http://VPS_IP:3002` → Projet 2 Backend
- `http://VPS_IP:3003` → Projet 2 Frontend

**Avantages :**
- Pas besoin de domaine
- Simple à mettre en place

**Inconvénients :**
- URLs moins esthétiques
- Ports à retenir

---

## Option 1: Sous-domaines

### 1. Préparer les DNS

Ajouter des enregistrements DNS pour chaque sous-domaine :

| Type | Nom | Valeur |
|------|-----|--------|
| A | rps | IP_VPS |
| A | autre | IP_VPS |

### 2. Créer la configuration Nginx

Utiliser le template [`nginx.multi.conf`](nginx.multi.conf) :

```bash
# Copier le template
sudo cp scripts/vps/nginx.multi.conf /etc/nginx/sites-available/mon-projet.conf

# Éditer avec les bonnes valeurs
sudo nano /etc/nginx/sites-available/mon-projet.conf
```

Modifier :
- `server_name mon-projet.mondomaine.com`
- `upstream backend` → port utilisé (ex: 3002)
- `upstream frontend` → port utilisé (ex: 3003)

### 3. Activer le site

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/mon-projet.conf /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### 4. Déployer le projet

Pour un nouveau projet, déployer sur des ports différents et configurer PM2.

---

## Option 2: Ports différents

### Planification des Ports

| Projet | Backend | Frontend |
|--------|---------|----------|
| RPS | 3000 | 3001 |
| Projet 2 | 3002 | 3003 |
| Projet 3 | 3004 | 3005 |

### Configuration PM2

Chaque projet doit avoir sa propre configuration PM2 :

```javascript
// projet2/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "projet2-backend",
      cwd: "./backend",
      script: "dist/main.js",
      env: { PORT: 3002, NODE_ENV: "production" }
    },
    {
      name: "projet2-frontend",
      cwd: "./frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3003",
      env: { NODE_ENV: "production" }
    }
  ]
};
```

### Configuration des variables d'environnement

Chaque projet doit pointer vers son propre backend :

```env
# Projet 2 - Frontend
NEXT_PUBLIC_API_URL=http://127.0.0.1:3002
API_URL=http://127.0.0.1:3002
```

---

## GitHub Actions pour Multi-Projets

Pour déployer plusieurs projets, créer des workflows séparés ou adapter avec des variables d'environnement :

```yaml
# .github/workflows/autre-projet.yml
jobs:
  deploy:
    env:
      APP_DIR: $HOME/autre-projet
      BACKEND_PORT: 3002
      FRONTEND_PORT: 3003
```

---

## Résumé des Commandes

```bash
# Lister les sites Nginx actifs
ls /etc/nginx/sites-enabled/

# Désactiver un site
sudo rm /etc/nginx/sites-enabled/mon-projet.conf

# Voir les ports utilisés
sudo netstat -tlnp | grep nginx

# Status PM2 multi-projets
pm2 ls

# Logs d'un projet spécifique
pm2 logs projet2-backend
pm2 logs projet2-frontend