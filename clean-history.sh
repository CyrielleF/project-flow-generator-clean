#!/bin/bash

# Ce script nettoie l'historique Git d'un fichier spécifique
# pour supprimer des secrets comme des clés API

# Le commit où se trouve la clé API
COMMIT_ID="13680988b17f201613f4c9456f59a1a3cad72d8a"

# Enregistrer la branche actuelle
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Créer une nouvelle branche temporaire
TEMP_BRANCH="temp-clean-api-keys"
git checkout -b $TEMP_BRANCH

# Utiliser git filter-branch pour réécrire l'historique
# Remplace la ligne contenant la clé API par une ligne sécurisée
git filter-branch --tree-filter "if [ -f src/config/openai.ts ]; then sed -i.bak 's/const FALLBACK_API_KEY = .*$/const FALLBACK_API_KEY = \"\";/g' src/config/openai.ts; fi" HEAD

echo "Historique nettoyé ! La branche temporaire $TEMP_BRANCH a été créée."
echo "Pour utiliser cette branche corrigée :"
echo "1. Vérifiez qu'aucune clé API n'est présente avec : git log -p -- src/config/openai.ts"
echo "2. Forcez le push avec : git push origin $TEMP_BRANCH -f"
echo "3. Sur GitHub, créez une PR pour fusionner $TEMP_BRANCH dans $CURRENT_BRANCH"
echo "4. Une fois fusionnée, retournez sur la branche principale avec : git checkout $CURRENT_BRANCH" 