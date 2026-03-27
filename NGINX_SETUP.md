# Nginx - Configuration simple avec IP du serveur

Configuration minimaliste: pas de domaine, pas de SSL, accès direct par IP du serveur.

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

Remplace `YOUR_VPS_IP` par l'IP réelle de ton serveur:

- Frontend: `http://YOUR_VPS_IP`
- API Backend: `http://YOUR_VPS_IP/api/*`

Exemples:
- `http://192.168.1.100`
- `http://192.168.1.100/api/campaigns`

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

Fais en sorte que le frontend accède au backend correctement.

Édite `rps-frontend/nextjs-app/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://YOUR_VPS_IP/api
API_URL=http://127.0.0.1:3000
```

Puis relance le déploiement:
```bash
./scripts/vps/deploy.sh
```

## 7. Firewall (optionnel)

Si UFW est actif, autoriser les ports:

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
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
