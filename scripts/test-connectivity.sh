#!/bin/bash

# =================================================================
# RPS Project - Connectivity & Integration Test Script
# Ce script teste la chaîne de communication : Client -> API -> n8n
# =================================================================

# Couleurs pour la lisibilité
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# --- Configuration ---
# Remplace par l'IP de ton VPS si tu testes à distance
API_URL=${1:-"http://104.254.182.46:3000/api"}
FRONTEND_URL=${2:-"http://104.254.182.46:3001"}

echo -e "${YELLOW}Vérification de la connectivité RPS Platform...${NC}"
echo "API URL: $API_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "--------------------------------------------------------"

# 1. Test de Santé du Backend
echo -n "[1/5] Test de santé du Backend (Health Check)... "
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ "$HEALTH" == "200" ]; then
    echo -e "${GREEN}OK (200)${NC}"
else
    echo -e "${RED}ERREUR ($HEALTH)${NC}"
    echo "    -> Vérifiez que le service rps-backend tourne avec PM2."
fi

# 2. Test de Santé du Frontend
echo -n "[2/5] Accessibilité du Frontend (Next.js)... "
FRONT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/login")
if [ "$FRONT_STATUS" == "200" ]; then
    echo -e "${GREEN}OK (200)${NC}"
else
    echo -e "${RED}ERREUR ($FRONT_STATUS)${NC}"
    echo "    -> Vérifiez que le service rps-frontend tourne sur le port 3001 ou 8786."
fi

# 3. Test des CORS (Preflight Request)
# Crucial : Simule une requête venant du navigateur (frontend) vers l'API
echo -n "[3/5] Validation des headers CORS... "
CORS_CHECK=$(curl -s -I -X OPTIONS "$API_URL/auth/login" \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: POST" \
    | grep -i "access-control-allow-origin")

if [[ $CORS_CHECK == *"$FRONTEND_URL"* ]]; then
    echo -e "${GREEN}OK (Origin autorisée)${NC}"
else
    echo -e "${RED}ÉCHEC${NC}"
    echo "    -> L'API ne semble pas autoriser $FRONTEND_URL. Vérifiez CORS_ORIGIN dans le .env du backend."
fi

# 4. Test du Proxy n8n via le Frontend
# Le frontend sert souvent de relais vers n8n pour éviter les fuites de clés API
echo -n "[4/5] Test de l'endpoint d'analyse (Frontend -> n8n)... "
# On simule un ping sur l'API Next.js qui doit parler à n8n
N8N_PROXY=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$FRONTEND_URL/api/webhook/n8n/analyze" \
    -H "Content-Type: application/json" \
    -d '{"test": true}')

# On accepte 200 (si n8n répond) ou 401/403 (si protégé), mais pas 404 ou 500
if [ "$N8N_PROXY" == "200" ] || [ "$N8N_PROXY" == "201" ]; then
    echo -e "${GREEN}OK ($N8N_PROXY)${NC}"
elif [ "$N8N_PROXY" == "405" ]; then
    echo -e "${YELLOW}PARTIEL (405 Method Not Allowed - Vérifiez si la route accepte le POST)${NC}"
else
    echo -e "${RED}ERREUR ($N8N_PROXY)${NC}"
    echo "    -> La route API Next.js /api/webhook/n8n/analyze est introuvable ou crashe."
fi

# 5. Test Direct n8n (Interne au VPS)
echo -n "[5/5] Connectivité directe n8n (Health)... "
# On essaie de joindre n8n sur le port par défaut 5678
N8N_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5678/healthz")
if [ "$N8N_HEALTH" == "200" ]; then
    echo -e "${GREEN}OK (n8n est en ligne)${NC}"
else
    echo -e "${YELLOW}WARNING ($N8N_HEALTH)${NC}"
    echo "    -> n8n n'est pas accessible sur localhost:5678. Ignorez si n8n n'est pas sur ce serveur."
fi

echo "--------------------------------------------------------"
echo -e "${YELLOW}Diagnostic terminé.${NC}"

if [ "$HEALTH" == "200" ] && [[ $CORS_CHECK == *"$FRONTEND_URL"* ]]; then
    echo -e "${GREEN}Félicitations ! La liaison de base Front <-> Back est fonctionnelle.${NC}"
else
    echo -e "${RED}Des problèmes de configuration subsistent. Consultez API_CONFIGURATION_GUIDE.md${NC}"
fi