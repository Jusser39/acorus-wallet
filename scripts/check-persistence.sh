#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"

echo "[check] base url: ${BASE_URL}"

echo "[check] health"
curl -fsS "${BASE_URL}/health"
echo

echo "[check] create anonymous user"
USER_JSON="$(curl -fsS -X POST "${BASE_URL}/api/users/anonymous" \
  -H "Content-Type: application/json" \
  -d '{}')"

USER_ID="$(node -e 'const input = JSON.parse(process.argv[1]); console.log(input.id)' "$USER_JSON")"

echo "[check] user id: ${USER_ID}"

echo "[check] create wallet profile"
PROFILE_JSON="$(curl -fsS -X POST "${BASE_URL}/api/wallet-profiles" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\":\"${USER_ID}\",
    \"name\":\"Persistence Test Wallet\",
    \"type\":\"view_only\",
    \"publicAddress\":\"0x000000000000000000000000000000000000dEaD\",
    \"chainFamily\":\"evm\",
    \"hiddenBalance\":false,
    \"preferredCurrency\":\"USD\"
  }")"

PROFILE_ID="$(node -e 'const input = JSON.parse(process.argv[1]); console.log(input.id)' "$PROFILE_JSON")"

echo "[check] profile id: ${PROFILE_ID}"

echo "[check] create contact"
curl -fsS -X POST "${BASE_URL}/api/contacts" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\":\"${USER_ID}\",
    \"name\":\"Test Contact\",
    \"address\":\"0x000000000000000000000000000000000000bEEF\",
    \"chainFamily\":\"evm\",
    \"note\":\"persistence check\"
  }"
echo

echo "[check] create transaction"
curl -fsS -X POST "${BASE_URL}/api/transactions" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\":\"${USER_ID}\",
    \"walletProfileId\":\"${PROFILE_ID}\",
    \"chainId\":1,
    \"hash\":\"0x1111111111111111111111111111111111111111111111111111111111111111\",
    \"from\":\"0x000000000000000000000000000000000000dEaD\",
    \"to\":\"0x000000000000000000000000000000000000bEEF\",
    \"assetType\":\"native\",
    \"symbol\":\"ETH\",
    \"amount\":\"0.001\",
    \"status\":\"pending\",
    \"direction\":\"out\",
    \"submittedAt\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }"
echo

echo "[check] read wallet profiles"
curl -fsS "${BASE_URL}/api/wallet-profiles?userId=${USER_ID}"
echo

echo "[check] read contacts"
curl -fsS "${BASE_URL}/api/contacts?userId=${USER_ID}"
echo

echo "[check] read transactions"
curl -fsS "${BASE_URL}/api/transactions?userId=${USER_ID}&walletProfileId=${PROFILE_ID}"
echo

echo "[check] create onboarding progress"
curl -fsS -X POST "${BASE_URL}/api/onboarding-progress" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\":\"${USER_ID}\",
    \"step\":\"persistence-check\",
    \"completed\":true
  }"
echo

echo "[check] read onboarding progress"
curl -fsS "${BASE_URL}/api/onboarding-progress?userId=${USER_ID}"
echo

echo "[check] OK"
