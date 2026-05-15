#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
CHECK_MODE="${CHECK_MODE:-full}"
STATE_FILE="${PERSISTENCE_STATE_FILE:-tmp/persistence-check.json}"

mkdir -p "$(dirname "${STATE_FILE}")"

assert_contains_id() {
  local payload="$1"
  local expected_id="$2"
  local label="$3"

  node -e '
    const payload = JSON.parse(process.argv[1]);
    const expectedId = process.argv[2];
    const label = process.argv[3];
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.some((item) => item && item.id === expectedId)) {
      console.error(`[check] missing ${label}: ${expectedId}`);
      process.exit(1);
    }
  ' "$payload" "$expected_id" "$label"
}

read_state_value() {
  local key="$1"

  node -e '
    const fs = require("node:fs");
    const path = process.argv[1];
    const key = process.argv[2];
    const data = JSON.parse(fs.readFileSync(path, "utf8"));
    if (!(key in data)) {
      console.error(`[check] missing state key: ${key}`);
      process.exit(1);
    }
    process.stdout.write(String(data[key]));
  ' "${STATE_FILE}" "$key"
}

verify_state() {
  if [ ! -f "${STATE_FILE}" ]; then
    echo "[check] state file not found: ${STATE_FILE}"
    exit 1
  fi

  local user_id
  local profile_id
  local contact_id
  local transaction_id
  local onboarding_step
  user_id="$(read_state_value userId)"
  profile_id="$(read_state_value profileId)"
  contact_id="$(read_state_value contactId)"
  transaction_id="$(read_state_value transactionId)"
  onboarding_step="$(read_state_value onboardingStep)"

  echo "[check] verify state file: ${STATE_FILE}"

  local wallets_json
  wallets_json="$(curl -fsS "${BASE_URL}/api/wallet-profiles?userId=${user_id}")"
  echo "$wallets_json"
  assert_contains_id "$wallets_json" "$profile_id" "wallet profile"

  local contacts_json
  contacts_json="$(curl -fsS "${BASE_URL}/api/contacts?userId=${user_id}")"
  echo "$contacts_json"
  assert_contains_id "$contacts_json" "$contact_id" "contact"

  local transactions_json
  transactions_json="$(curl -fsS "${BASE_URL}/api/transactions?userId=${user_id}&walletProfileId=${profile_id}")"
  echo "$transactions_json"
  assert_contains_id "$transactions_json" "$transaction_id" "transaction"

  local onboarding_json
  onboarding_json="$(curl -fsS "${BASE_URL}/api/onboarding-progress?userId=${user_id}")"
  echo "$onboarding_json"

  node -e '
    const payload = JSON.parse(process.argv[1]);
    const step = process.argv[2];
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.some((item) => item && item.step === step && item.completed === true)) {
      console.error(`[check] missing onboarding step: ${step}`);
      process.exit(1);
    }
  ' "$onboarding_json" "$onboarding_step"

  echo "[check] verification OK"
}

echo "[check] base url: ${BASE_URL}"

echo "[check] health"
curl -fsS "${BASE_URL}/health"
echo

if [ "${CHECK_MODE}" = "verify" ]; then
  verify_state
  echo "[check] OK"
  exit 0
fi

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
CONTACT_JSON="$(curl -fsS -X POST "${BASE_URL}/api/contacts" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\":\"${USER_ID}\",
    \"name\":\"Test Contact\",
    \"address\":\"0x000000000000000000000000000000000000bEEF\",
    \"chainFamily\":\"evm\",
    \"note\":\"persistence check\"
  }")"
echo "${CONTACT_JSON}"
CONTACT_ID="$(node -e 'const input = JSON.parse(process.argv[1]); console.log(input.id)' "$CONTACT_JSON")"
echo

echo "[check] create transaction"
TRANSACTION_JSON="$(curl -fsS -X POST "${BASE_URL}/api/transactions" \
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
  }")"
echo "${TRANSACTION_JSON}"
TRANSACTION_ID="$(node -e 'const input = JSON.parse(process.argv[1]); console.log(input.id)' "$TRANSACTION_JSON")"
echo

echo "[check] create onboarding progress"
ONBOARDING_JSON="$(curl -fsS -X POST "${BASE_URL}/api/onboarding-progress" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\":\"${USER_ID}\",
    \"step\":\"persistence-check\",
    \"completed\":true
  }")"
echo "${ONBOARDING_JSON}"
echo

node -e '
  const fs = require("node:fs");
  const path = process.argv[1];
  const payload = {
    userId: process.argv[2],
    profileId: process.argv[3],
    contactId: process.argv[4],
    transactionId: process.argv[5],
    onboardingStep: process.argv[6],
  };
  fs.writeFileSync(path, JSON.stringify(payload, null, 2));
' "${STATE_FILE}" "${USER_ID}" "${PROFILE_ID}" "${CONTACT_ID}" "${TRANSACTION_ID}" "persistence-check"

verify_state

echo "[check] OK"
