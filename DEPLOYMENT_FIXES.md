# RPS Deployment Fixes - April 19, 2026

## 🔴 Problèmes identifiés et corrigés

### 1. **GitHub Secrets Non Interpolés dans le Script Bash** ⚠️ CRITIQUE

**Problème:**
```bash
cat > .env.local << 'ENVEOF'  # ❌ Guillemets simples = NO interpolation
NEXT_PUBLIC_API_URL=http://${{ secrets.VPS_HOST }}:3000/api
ENVEOF
```

Les secrets GitHub restaient littéralement `${{ secrets.VPS_HOST }}` dans les fichiers `.env`, au lieu d'être remplacés par leurs vraies valeurs.

**Conséquence:**
- Frontend construit avec `NEXT_PUBLIC_API_URL=http://${{ secrets.VPS_HOST }}:3000/api` (littéral)
- Erreur runtime: `Failed to parse URL from /api/responses`

**Solution appliquée:**
Remplacer les hérédocs avec guillemets simples par des hérédocs sans guillemets:
```bash
cat > .env.local << ENVEOF  # ✅ Pas de guillemets = interpolation correcte
NEXT_PUBLIC_API_URL=http://${{ secrets.VPS_HOST }}:3000/api
ENVEOF
```

**Fichiers modifiés:**
- `.github/workflows/rps_deployment.yml`
  - Backend `.env` (ligne ~245)
  - Frontend `.env.local` (ligne ~365)
  - N8N `.env` (ligne ~175)

---

### 2. **Next.js 15.1.7 ESLint Config Import Error** ⚠️ MODERATE

**Problème:**
```
Error: Cannot find module 'eslint-config-next/core-web-vitals'
Error [InvariantError]: The client reference manifest for route "/login" does not exist
```

La syntaxe ESLint était correcte pour ESLint 8, mais incompatible avec ESLint 9 FlatConfig utilisé par Next.js 15.

**Fichier problématique:** `rps-frontend/nextjs-app/eslint.config.mjs`

**Solution appliquée:**
```javascript
// ❌ AVANT
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ✅ APRÈS
import next from "@next/eslint-plugin-next";
const eslintConfig = defineConfig([
  {
    plugins: {
      "@next/next": next,
    },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,
    },
  },
]);
```

**Fichiers modifiés:**
- `rps-frontend/nextjs-app/eslint.config.mjs` (complet)

---

### 3. **Backend Database Variables Non Transmises à PM2** ⚠️ CRITICAL

**Problème:**
```
Error: connect ECONNREFUSED ***:***
```

Le script créait un `.env` avec les variables de BD (DB_HOST, DB_PORT, etc.), mais:
1. PM2 n'avait pas accès à ces variables
2. Les processus NestJS n'avaient pas les envvars nécessaires pour se connecter

**Solution appliquée:**
Source les variables `.env` du backend avant de lancer PM2:
```bash
# Load .env variables into current shell before starting PM2
set -a
[ -f "$APP_DIR/rps-backend/.env" ] && source "$APP_DIR/rps-backend/.env"
set +a

# Maintenant PM2 héritera des variables d'env
pm2 start ecosystem.config.cjs
```

**Fichiers modifiés:**
- `.github/workflows/rps_deployment.yml` (avant PM2 start, ligne ~515)

---

### 4. **N8N Port Configuration** ⚠️ MODERATE

**Problème:**
Health checks utilisaient hardcoded `http://127.0.0.1:5678` au lieu du port configuré `${{ secrets.N8N_PORT }}`.

**Solution appliquée:**
```bash
# ❌ AVANT
curl http://127.0.0.1:5678/healthz

# ✅ APRÈS
N8N_PORT_CHECK="${{ secrets.N8N_PORT }}"
curl http://127.0.0.1:$N8N_PORT_CHECK/healthz
```

Les variables N8N dans PM2 config ont aussi été mises à jour:
```javascript
N8N_EDITOR_BASE_URL: "${{ secrets.N8N_PROTOCOL }}://${{ secrets.VPS_HOST }}:${{ secrets.N8N_PORT }}/n8n/"
```

**Fichiers modifiés:**
- `.github/workflows/rps_deployment.yml` (health checks + PM2 config)

---

### 5. **Frontend CORS Configuration** ⚠️ MINOR

**Problème:**
CORS_ORIGIN incluait `http://${{ secrets.VPS_HOST }}:8786` au lieu du port du frontend (3001).

**Solution appliquée:**
```bash
# ❌ AVANT
CORS_ORIGIN=http://localhost:3001,http://127.0.0.1:3001,http://${{ secrets.VPS_HOST }}:8786

# ✅ APRÈS
CORS_ORIGIN=http://localhost:3001,http://127.0.0.1:3001,http://${{ secrets.VPS_HOST }}:3001
```

**Fichiers modifiés:**
- `.github/workflows/rps_deployment.yml` (Backend .env)

---

## 📋 Fichiers modifiés

```
.github/workflows/rps_deployment.yml
  ├─ Backend .env creation (removed single quotes from heredoc)
  ├─ Frontend .env.local creation (removed single quotes from heredoc)
  ├─ N8N .env creation (removed single quotes from heredoc)
  ├─ PM2 ecosystem config (N8N port variables)
  ├─ Health checks (N8N port variable)
  ├─ DB env sourcing before PM2 (NEW)
  └─ CORS_ORIGIN configuration

rps-frontend/nextjs-app/eslint.config.mjs
  └─ Complete rewrite for ESLint 9 FlatConfig
```

---

## 🧪 Vérifications avant déploiement

**À tester après le prochain push:**

1. ✅ GitHub Actions build (backend + frontend CI)
2. ✅ SSH deployment exécute sans erreurs
3. ✅ Frontend .env.local contient `NEXT_PUBLIC_API_URL=http://REAL_IP:3000/api` (pas littéral)
4. ✅ Backend démarre sans erreurs de BD (vérifier les logs PM2)
5. ✅ Frontend build utilise les vraies variables d'env baked dans le bundle
6. ✅ Health checks passent pour backend, frontend, et n8n

---

## 🚀 Déploiement suivant

```bash
# Sur la branche main
git add .github/workflows/rps_deployment.yml rps-frontend/nextjs-app/eslint.config.mjs
git commit -m "fix: deployment script env interpolation and eslint config for next15

- Fix GitHub Secrets not being interpolated in bash heredocs (use << EOF not << 'EOF')
- Fix Next.js 15.1.7 ESLint config for FlatConfig compatibility
- Add env sourcing before PM2 start to pass DB variables to backend
- Fix N8N port configuration in health checks and PM2 config
- Fix CORS_ORIGIN to use frontend port (3001) instead of 8786"
git push origin main
```

Le workflow GitHub Actions devrait:
1. ✅ Passer les checks CI/CD
2. ✅ Déployer sur le VPS avec les secrets correctement interpolés
3. ✅ Tous les services devraient démarrer sans erreurs

---

## ⚠️ Notes importantes

- Les secrets GitHub (`${{ secrets.X }}`) sont remplacés par GitHub Actions **avant** d'envoyer le script SSH au VPS
- Pour que cette substitution se fasse, il **ne faut pas** utiliser de guillemets simples autour du EOF du heredoc
- PM2 n'a **pas** d'option native `env_file`, donc on source manuellement les variables avant de lancer PM2
- Next.js 15 utilise ESLint 9 avec FlatConfig qui est incompatible avec la syntaxe ESLint 8
