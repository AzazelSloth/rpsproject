# Deployment VPS Ubuntu

Ce guide permet de lancer backend + frontend sur un VPS Ubuntu avec PM2.

## 1. Pre-requis serveur

- Ubuntu Server avec sudo
- Node.js 22+
- npm
- git
- PostgreSQL accessible par le backend

## 2. Configuration des variables

Configurer les fichiers suivants sur le VPS:

- `rps-backend/rps-backend/.env`
- `rps-frontend/nextjs-app/.env.local`

Variables minimales backend:

- `PORT=3000`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SYNCHRONIZE=false`
- `DB_LOGGING=false`

Variables minimales frontend:

- `NEXT_PUBLIC_API_URL=https://votre-domaine-api` (ou `http://IP_VPS:3000`)
- `API_URL=http://127.0.0.1:3000`

## 3. Lancement manuel sur le VPS

Depuis la racine du projet:

```bash
chmod +x scripts/vps/deploy.sh
./scripts/vps/deploy.sh
```

Le script:

- met a jour le code (`git fetch/pull`)
- installe les dependances backend/frontend
- build backend/frontend
- demarre/recharge les services avec PM2

## 4. Commandes utiles PM2

```bash
pm2 ls
pm2 logs rps-backend --lines 200
pm2 logs rps-frontend --lines 200
pm2 restart rps-backend
pm2 restart rps-frontend
pm2 save
```

## 5. Auto-start apres reboot serveur

```bash
pm2 startup systemd -u $USER --hp $HOME
pm2 save
```

Executer ensuite la commande affichee par `pm2 startup` (avec sudo) pour finaliser l integration systemd.
