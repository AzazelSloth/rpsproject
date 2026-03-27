# Nginx et SSL (Let's Encrypt) - Guide complet

## 1. Installation Nginx

```bash
sudo apt update
sudo apt install nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

Verifier le status:
```bash
sudo systemctl status nginx
```

## 2. Configuration de base (sans SSL)

```bash
# Copier la configuration
sudo cp scripts/vps/nginx.rps.conf /etc/nginx/sites-available/rps.conf

# Activer la configuration
sudo ln -s /etc/nginx/sites-available/rps.conf /etc/nginx/sites-enabled/

# Tester la syntaxe
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

A ce stade:
- Frontend accessible sur http://YOUR_VPS_IP:80 (redirige vers frontend port 3001)
- API accessible sur http://YOUR_VPS_IP:80/api/* (redirige vers backend port 3000)

## 3. Configuration SSL avec Let's Encrypt (HTTPS)

### 3.1 Installer Certbot

```bash
sudo apt install certbot python3-certbot-nginx
```

### 3.2 Generer le certificat

Remplace `your-domain.com` par ton domaine reel:

```bash
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com
```

Accepte les conditions de Let's Encrypt et fournis une adresse email valide.

### 3.3 Mettre a jour la config Nginx

Editer `/etc/nginx/sites-available/rps.conf` et decommenter les lignes SSL:

```nginx
ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/your-domain.com/chain.pem;
```

Decommenter aussi la redirection HTTP -> HTTPS:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name _;
    return 301 https://$host$request_uri;
}
```

### 3.4 Tester et recharger

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 4. Auto-renouvellement des certificats

Let's Encrypt emet des certificats valables 90 jours. Configurer le renouvellement automatique:

```bash
# Verifier que le timer est actif
sudo systemctl status certbot.timer

# Si non actif:
sudo systemctl enable --now certbot.timer

# Tester le renouvellement (dry-run):
sudo certbot renew --dry-run
```

## 5. Verification et logs

```bash
# Verifier le certificat
sudo certbot certificates

# Logs Nginx
sudo tail -f /var/log/nginx/rps_access.log
sudo tail -f /var/log/nginx/rps_error.log

# Verifier les ports
sudo netstat -tlnp | grep -E ':(80|443|3000|3001)'
```

## 6. Configuration du domaine DNS

Pointer ton domaine vers l'IP du VPS via ton registraire:

```
A record: your-domain.com -> YOUR_VPS_IP
A record: www.your-domain.com -> YOUR_VPS_IP
```

## 7. Firewall (si UFW est actif)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## Cheat sheet - Commandes Nginx

```bash
sudo systemctl start nginx    # Demarrer
sudo systemctl stop nginx     # Arreter
sudo systemctl restart nginx  # Redemarrer
sudo systemctl reload nginx   # Recharger config (sans couper connexions)
sudo nginx -t                 # Valider la syntaxe

# Afficher l'etat
sudo systemctl status nginx

# Logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Le domaine ne resout pas
- Verifier les enregistrements DNS: `nslookup your-domain.com`
- Attendre la propagation DNS (5-30 min)

### Erreur "Connection refused" sur l'API
- Verifier que le backend est en cours d'execution: `pm2 logs rps-backend`
- Verifier les ports: `sudo netstat -tlnp`

### Certificate expired
- Renouveler manuellement: `sudo certbot renew --force-renewal`
- Verifier le timer: `sudo systemctl status certbot.timer`

### Performance lente
- Verifier la compression gzip est activee
- Verifier les logs d'erreur: `sudo tail -f /var/log/nginx/rps_error.log`
