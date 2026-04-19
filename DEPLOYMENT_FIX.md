# Guide de Déploiement - Correction Erreur 500

## Problème

Erreur `500 Internal Server Error` sur `/trpc/adminSurveys.createCompany` lors de l'ajout d'entreprise sur le serveur de déploiement.

## Cause

Le backend NestJS n'est pas accessible ou n'est pas configuré correctement sur le serveur de production.

## Étapes de Correction

### Étape 1: Vérifier le Backend sur le Serveur

```bash
# Se connecter au serveur
ssh user@104.254.182.46

# Vérifier les processus en cours
pm2 status

# Vérifier si le backend tourne
curl http://localhost:3000/api/health

# Si le backend n'est pas lancé, le démarrer
cd /var/www/rps-project/rps-backend
npm run start:prod
```

### Étape 2: Configurer les Variables d'Environnement du Backend

```bash
# Sur le serveur
cd /var/www/rps-project/rps-backend

# Créer le fichier .env
nano .env

# Copier le contenu de .env.production (voir fichier dans le repo)
```

**Variables critiques à vérifier :**

- `PORT=3000` - Port du backend
- `CORS_ORIGIN=http://104.254.182.46:8786,http://localhost:3001` - **TRÈS IMPORTANT**
- `DB_HOST=localhost` - Base de données accessible
- `DB_USER`, `DB_PASSWORD`, `DB_NAME` - Credentials corrects

### Étape 3: Configurer les Variables d'Environnement du Frontend

```bash
# Sur le serveur
cd /var/www/rps-project/rps-frontend/nextjs-app

# Créer le fichier .env.local
nano .env.local

# Ajouter :
NEXT_PUBLIC_API_URL=http://104.254.182.46:3000/api
API_URL=http://104.254.182.46:3000/api
```

### Étape 4: Redémarrer les Services

```bash
# Redémarrer le backend
cd /var/www/rps-project/rps-backend
pm2 restart rps-backend

# Vérifier les logs
pm2 logs rps-backend

# Redémarrer le frontend
cd /var/www/rps-project/rps-frontend/nextjs-app
pm2 restart rps-frontend

# Vérifier les logs
pm2 logs rps-frontend
```

### Étape 5: Vérifier la Connectivité

```bash
# Tester le backend directement
curl http://localhost:3000/api/companies

# Tester depuis l'extérieur (sur votre machine)
curl http://104.254.182.46:3000/api/companies

# Vérifier les CORS
curl -H "Origin: http://104.254.182.46:8786" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS http://104.254.182.46:3000/api/companies
```

## Checklist de Vérification

- [ ] Backend démarré sur le port 3000
- [ ] Base de données PostgreSQL accessible
- [ ] CORS configuré avec l'URL du frontend (8786)
- [ ] Frontend configuré avec l'URL correcte du backend
- [ ] Pas d'erreur dans les logs PM2
- [ ] Test curl réussit sur le backend

## Commandes Utiles

```bash
# Voir tous les processus
pm2 list

# Voir les logs en temps réel
pm2 logs

# Redémarrer un service
pm2 restart <nom-du-service>

# Arrêter un service
pm2 stop <nom-du-service>

# Voir les détails d'un processus
pm2 info <nom-du-service>

# Moniteur en temps réel
pm2 monit
```

## En Cas de Problème Persistant

1. **Vérifier les logs d'erreur :**

   ```bash
   pm2 logs rps-backend --lines 100
   ```

2. **Vérifier la base de données :**

   ```bash
   sudo -u postgres psql -d rps_platform -c "SELECT * FROM companies LIMIT 5;"
   ```

3. **Vérifier le pare-feu :**

   ```bash
   sudo ufw status
   sudo ufw allow 3000/tcp
   ```

4. **Redémarrer PM2 complètement :**

   ```bash
   pm2 delete all
   pm2 start ecosystem.config.cjs
   pm2 save
   ```

## Structure des Fichiers .env

### Backend (.env)

```env
PORT=3000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=1906
DB_NAME=rps_platform
CORS_ORIGIN=http://104.254.182.46:8786,http://localhost:3001
JWT_SECRET=votre-secret-jwt
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://104.254.182.46:3000/api
API_URL=http://104.254.182.46:3000/api
```

## Support

Si le problème persiste après avoir suivi ce guide :

1. Vérifier que le port 3000 n'est pas utilisé par un autre service
2. Vérifier les permissions de la base de données
3. Vérifier les logs d'erreur détaillés avec `pm2 logs`
4. Tester en local d'abord avant de déployer
