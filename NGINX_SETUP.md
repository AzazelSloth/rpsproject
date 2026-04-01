# Nginx - Configuration

Guide de configuration Nginx comme reverse proxy optionnel.

L'application fonctionne également sans Nginx : accès direct via http://VPS_IP:3000 (backend) et http://VPS_IP:3001 (frontend).

## 1. Installation Nginx

```bash
sudo apt update
sudo apt install nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

Vérifier le status:

```bash
sudo systemctl status nginx
```

## 2. Configuration rapide

```bash
cd /chemin/vers/ton/repo
sudo bash scripts/vps/setup-nginx.sh
```

C'est tout. Le script:

- Copie la config Nginx
- Valide la syntaxe
- Recharge Nginx

## 3. Accès

Deux options pour accéder aux services :

### Option A - Sans Nginx (accès direct)

Si vous n'utilisez pas Nginx, accédez directement via les ports :

- Backend API: `http://VPS_IP:3000`
- Frontend: `http://VPS_IP:3001`

### Option B - Via Nginx (reverse proxy)

Si Nginx est configuré, accédez via :

- Frontend: `http://VPS_IP`
- API Backend: `http://VPS_IP/api/*`

Exemples :

- `http://192.168.1.100:3000` (backend direct)
- `http://192.168.1.100:3001` (frontend direct)
- `http://192.168.1.100` (via Nginx)
- `http://192.168.1.100/api/campaigns` (API via Nginx)

Trouver l'IP du VPS:

```bash
hostname -I
ip addr show
```

## 4. Logs et debugging

```bash
# Status
sudo systemctl status nginx

# Récents logs d'accès
sudo tail -f /var/log/nginx/rps_access.log

# Logs d'erreur
sudo tail -f /var/log/nginx/rps_error.log

# Vérifier les ports écoutants
sudo netstat -tlnp | grep nginx
```

## 5. Recharger après changements d'app

Si tu relances l'app (PM2), Nginx continue de fonctionner.

Pour recharger manuellement:

```bash
sudo systemctl reload nginx
```

## 6. Configuration du Frontend

Le frontend doit accéder au backend. Deux options :

### Option A - Sans Nginx (accès direct)

Les variables d'environnement suivantes sont déjà configurées par le déploiement :

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000
API_URL=http://127.0.0.1:3000
```

### Option B - Via Nginx

Si vous utilisez Nginx comme reverse proxy, configurez :

```env
NEXT_PUBLIC_API_URL=http://VPS_IP/api
API_URL=http://127.0.0.1:3000
```

Le déploiement automatique configure automatiquement ces variables.

## 7. Firewall (optionnel)

Si UFW est actif, autoriser les ports nécessaires :

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (Nginx)
# Pour accès direct sans Nginx:
sudo ufw allow 3000/tcp  # Backend API
sudo ufw allow 3001/tcp  # Frontend
sudo ufw enable
```

## Cheat sheet - Commandes Nginx

```bash
sudo systemctl start nginx    # Démarrer
sudo systemctl stop nginx     # Arrêter
sudo systemctl restart nginx  # Redémarrer
sudo systemctl reload nginx   # Recharger config (sans couper connexions)
sudo nginx -t                 # Valider la syntaxe
sudo systemctl status nginx   # Afficher l'état
```

## Troubleshooting

### Nginx refuse de redémarrer

```bash
sudo nginx -t  # Check de la syntaxe
sudo systemctl status nginx  # Logs d'erreur
```

### Port 80 déjà utilisé

```bash
sudo lsof -i :80  # Voir ce qui l'utilise
sudo fuser -k 80/tcp  # Tuer le processus
```

### Backend pas accessible sur /api

- Vérifier que le backend tourne: `pm2 ls`
- Vérifier le port 3000: `sudo netstat -tlnp | grep 3000`
- Logs backend: `pm2 logs rps-backend`

### Frontend pas accessible

- Vérifier que le frontend tourne: `pm2 ls`
- Vérifier le port 3001: `sudo netstat -tlnp | grep 3001`
- Logs frontend: `pm2 logs rps-frontend`

## Ajouter SSL/HTTPS plus tard

Quand tu auras un domaine, tu pourras ajouter HTTPS facilement:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d ton-domaine.com
# Puis éditer /etc/nginx/sites-available/rps.conf pour uncomment les lignes SSL
```
