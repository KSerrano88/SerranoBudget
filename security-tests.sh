#!/bin/bash
# Security penetration tests for SerranoBudget API

BASE="http://localhost:3000"
PASS=0
FAIL=0
FINDINGS=""

pass() { echo "  [PASS] $1"; PASS=$((PASS + 1)); }
fail() { echo "  [FAIL] $1"; FAIL=$((FAIL + 1)); FINDINGS="$FINDINGS\n- $1"; }

check_header() {
  if echo "$HEADERS" | grep -qi "$1"; then
    pass "$2"
  else
    fail "$3"
  fi
}

echo "============================================"
echo "  SECURITY TEST SUITE"
echo "============================================"

echo ""
echo ">> TEST GROUP 1: Authentication Enforcement"
echo "   All API routes should return 401 without a session"
echo ""

for EP in \
  "GET /api/transactions" \
  "GET /api/transactions/1" \
  "GET /api/transactions/summary" \
  "GET /api/transactions/types" \
  "GET /api/transactions/types-ranked" \
  "GET /api/transactions/monthly-totals" \
  "GET /api/transactions/visualization?startDate=2024-01-01&endDate=2024-12-31" \
  "GET /api/transactions/history?startDate=2024-01-01&endDate=2024-12-31"; do
  METHOD=$(echo "$EP" | cut -d' ' -f1)
  PATH_PART=$(echo "$EP" | cut -d' ' -f2)
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$METHOD" "$BASE$PATH_PART")
  if [ "$STATUS" = "401" ]; then
    pass "$METHOD $PATH_PART -> 401"
  else
    fail "$METHOD $PATH_PART -> $STATUS (expected 401)"
  fi
done

echo ""
echo "   Testing write endpoints without auth..."

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/transactions" \
  -H "Content-Type: application/json" \
  -d '{"TRANSACTION_DATE":"2024-01-01","DESCRIPTION":"hack","TRAN_TYPE":"test","DEBIT":999}')
if [ "$STATUS" = "401" ]; then
  pass "POST /api/transactions -> 401"
else
  fail "POST /api/transactions -> $STATUS (expected 401) -- UNAUTHENTICATED WRITE"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE/api/transactions/1" \
  -H "Content-Type: application/json" \
  -d '{"TRANSACTION_DATE":"2024-01-01","DESCRIPTION":"hack","TRAN_TYPE":"test"}')
if [ "$STATUS" = "401" ]; then
  pass "PUT /api/transactions/1 -> 401"
else
  fail "PUT /api/transactions/1 -> $STATUS (expected 401) -- UNAUTHENTICATED UPDATE"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/transactions/1")
if [ "$STATUS" = "401" ]; then
  pass "DELETE /api/transactions/1 -> 401"
else
  fail "DELETE /api/transactions/1 -> $STATUS (expected 401) -- UNAUTHENTICATED DELETE"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/transactions/last")
if [ "$STATUS" = "401" ]; then
  pass "DELETE /api/transactions/last -> 401"
else
  fail "DELETE /api/transactions/last -> $STATUS (expected 401)"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE/api/transactions/bulk" \
  -H "Content-Type: application/json" \
  -d '{"transactions":[{"id":1,"TRANSACTION_DATE":"2024-01-01","DESCRIPTION":"hack","TRAN_TYPE":"test"}]}')
if [ "$STATUS" = "401" ]; then
  pass "PUT /api/transactions/bulk -> 401"
else
  fail "PUT /api/transactions/bulk -> $STATUS (expected 401)"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/transactions/bulk" \
  -H "Content-Type: application/json" \
  -d '{"ids":[1,2,3]}')
if [ "$STATUS" = "401" ]; then
  pass "DELETE /api/transactions/bulk -> 401"
else
  fail "DELETE /api/transactions/bulk -> $STATUS (expected 401)"
fi

echo ""
echo ">> TEST GROUP 2: Auth Bypass Attempts"
echo ""

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b "authjs.session-token=fake-jwt-token-here" \
  "$BASE/api/transactions")
if [ "$STATUS" = "401" ]; then
  pass "Forged session cookie -> 401"
else
  fail "Forged session cookie -> $STATUS -- AUTH BYPASS WITH FAKE COOKIE"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer fake-token" \
  "$BASE/api/transactions")
if [ "$STATUS" = "401" ]; then
  pass "Fake Bearer token -> 401"
else
  fail "Fake Bearer token -> $STATUS -- AUTH BYPASS WITH FAKE BEARER"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "X-Forwarded-For: 127.0.0.1" \
  -H "X-Forwarded-Host: localhost" \
  "$BASE/api/transactions")
if [ "$STATUS" = "401" ]; then
  pass "Spoofed X-Forwarded headers -> 401"
else
  fail "Spoofed X-Forwarded headers -> $STATUS -- AUTH BYPASS VIA HEADER SPOOFING"
fi

echo ""
echo ">> TEST GROUP 3: Security Headers"
echo ""

HEADERS=$(curl -s -D - -o /dev/null "$BASE/login")

check_header "x-frame-options: DENY" \
  "X-Frame-Options: DENY present" \
  "X-Frame-Options header missing -- CLICKJACKING POSSIBLE"

check_header "x-content-type-options: nosniff" \
  "X-Content-Type-Options: nosniff present" \
  "X-Content-Type-Options header missing -- MIME SNIFFING POSSIBLE"

check_header "referrer-policy" \
  "Referrer-Policy present" \
  "Referrer-Policy header missing"

check_header "strict-transport-security" \
  "Strict-Transport-Security present" \
  "HSTS header missing -- DOWNGRADE ATTACKS POSSIBLE"

check_header "permissions-policy" \
  "Permissions-Policy present" \
  "Permissions-Policy header missing"

echo ""
echo ">> Authenticating for remaining tests..."

CSRF_PAGE=$(curl -s -c /tmp/sec-test-cookies.txt "$BASE/api/auth/csrf")
CSRF_TOKEN=$(echo "$CSRF_PAGE" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

curl -s -b /tmp/sec-test-cookies.txt -c /tmp/sec-test-cookies.txt \
  -X POST "$BASE/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF_TOKEN&username=admin&password=admin" \
  -o /dev/null -L

AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b /tmp/sec-test-cookies.txt \
  "$BASE/api/transactions?days=7")
if [ "$AUTH_STATUS" = "200" ]; then
  pass "Authenticated successfully"
else
  echo "  WARNING: Could not authenticate (status $AUTH_STATUS). Skipping authenticated tests."
  echo ""
  echo "============================================"
  echo "  RESULTS: $PASS passed, $FAIL failed"
  echo "============================================"
  if [ -n "$FINDINGS" ]; then
    echo ""
    echo "FINDINGS:"
    echo -e "$FINDINGS"
  fi
  rm -f /tmp/sec-test-cookies.txt
  exit 0
fi

echo ""
echo ">> TEST GROUP 4: Error Sanitization"
echo "   Errors should NOT leak stack traces or internals"
echo ""

BODY=$(curl -s -b /tmp/sec-test-cookies.txt \
  -X POST "$BASE/api/transactions" \
  -H "Content-Type: application/json" \
  -d 'not-json-at-all')
if echo "$BODY" | grep -qi "stack\|at.*\.ts\|at.*\.js\|node_modules\|queries\.ts"; then
  fail "Invalid JSON response leaks stack trace: $(echo "$BODY" | head -c 200)"
else
  pass "Invalid JSON -> no stack trace leaked"
fi

BODY=$(curl -s -b /tmp/sec-test-cookies.txt \
  -X POST "$BASE/api/transactions" \
  -H "Content-Type: application/json" \
  -d '{"TRANSACTION_DATE":"not-a-date","DESCRIPTION":"test","TRAN_TYPE":"test"}')
if echo "$BODY" | grep -qi "at.*\.ts\|at.*\.js\|node_modules\|DETAIL\|HINT\|postgres"; then
  fail "Bad date response leaks internals: $(echo "$BODY" | head -c 200)"
else
  pass "Bad date format -> no internals leaked"
fi

BODY=$(curl -s -b /tmp/sec-test-cookies.txt "$BASE/api/transactions/99999999999999999999")
if echo "$BODY" | grep -qi "at.*\.ts\|at.*\.js\|postgres\|pg_"; then
  fail "Huge ID response leaks DB info: $(echo "$BODY" | head -c 200)"
else
  pass "Huge ID -> no DB info leaked"
fi

echo ""
echo ">> TEST GROUP 5: Input Validation -- Query Parameters"
echo ""

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b /tmp/sec-test-cookies.txt "$BASE/api/transactions?days=-100")
if [ "$STATUS" = "400" ]; then
  pass "Negative days -> 400"
else
  fail "Negative days -> $STATUS (expected 400)"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b /tmp/sec-test-cookies.txt "$BASE/api/transactions?days=abc")
if [ "$STATUS" = "400" ]; then
  pass "NaN days -> 400"
else
  fail "NaN days -> $STATUS (expected 400)"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b /tmp/sec-test-cookies.txt "$BASE/api/transactions?days=Infinity")
if [ "$STATUS" = "400" ]; then
  pass "Infinity days -> 400"
else
  fail "Infinity days -> $STATUS (expected 400)"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b /tmp/sec-test-cookies.txt "$BASE/api/transactions?days=999999")
if [ "$STATUS" = "400" ]; then
  pass "Huge days (999999) -> 400"
else
  fail "Huge days (999999) -> $STATUS (expected 400)"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b /tmp/sec-test-cookies.txt \
  "$BASE/api/transactions/history?startDate=not-a-date&endDate=2024-12-31")
if [ "$STATUS" = "400" ]; then
  pass "Invalid startDate format -> 400"
else
  fail "Invalid startDate format -> $STATUS (expected 400)"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b /tmp/sec-test-cookies.txt \
  "$BASE/api/transactions/history?startDate=2024-13-45&endDate=2024-12-31")
if [ "$STATUS" = "400" ]; then
  pass "Impossible date (2024-13-45) -> 400"
else
  fail "Impossible date (2024-13-45) -> $STATUS (expected 400)"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b /tmp/sec-test-cookies.txt \
  "$BASE/api/transactions/visualization?startDate=2024-02-30&endDate=2024-12-31")
if [ "$STATUS" = "400" ]; then
  pass "Feb 30 date -> 400"
else
  fail "Feb 30 date -> $STATUS (expected 400)"
fi

echo ""
echo ">> TEST GROUP 6: Input Validation -- Request Bodies"
echo ""

RESP=$(curl -s -w "\n%{http_code}" -b /tmp/sec-test-cookies.txt \
  -X POST "$BASE/api/transactions" \
  -H "Content-Type: application/json" -d '{}')
STATUS=$(echo "$RESP" | tail -1)
if [ "$STATUS" = "400" ]; then
  pass "Empty body POST -> 400"
else
  fail "Empty body POST -> $STATUS (expected 400)"
fi

RESP=$(curl -s -w "\n%{http_code}" -b /tmp/sec-test-cookies.txt \
  -X POST "$BASE/api/transactions" \
  -H "Content-Type: application/json" \
  -d '{"TRANSACTION_DATE":"2024-01-01"}')
STATUS=$(echo "$RESP" | tail -1)
if [ "$STATUS" = "400" ]; then
  pass "Missing DESCRIPTION/TRAN_TYPE -> 400"
else
  fail "Missing DESCRIPTION/TRAN_TYPE -> $STATUS (expected 400)"
fi

RESP=$(curl -s -w "\n%{http_code}" -b /tmp/sec-test-cookies.txt \
  -X POST "$BASE/api/transactions" \
  -H "Content-Type: application/json" \
  -d '{"TRANSACTION_DATE":"2024-01-01","DESCRIPTION":"test","TRAN_TYPE":"test","DEBIT":-500}')
STATUS=$(echo "$RESP" | tail -1)
if [ "$STATUS" = "400" ]; then
  pass "Negative DEBIT amount -> 400"
else
  fail "Negative DEBIT amount -> $STATUS (expected 400) -- ALLOWS NEGATIVE AMOUNTS"
fi

LONG_DESC=$(python3 -c "print('A'*10000)")
RESP=$(curl -s -w "\n%{http_code}" -b /tmp/sec-test-cookies.txt \
  -X POST "$BASE/api/transactions" \
  -H "Content-Type: application/json" \
  -d "{\"TRANSACTION_DATE\":\"2024-01-01\",\"DESCRIPTION\":\"$LONG_DESC\",\"TRAN_TYPE\":\"test\"}")
STATUS=$(echo "$RESP" | tail -1)
if [ "$STATUS" = "400" ]; then
  pass "10KB description -> 400"
else
  fail "10KB description -> $STATUS (expected 400) -- ACCEPTS OVERSIZED INPUT"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b /tmp/sec-test-cookies.txt "$BASE/api/transactions/-1")
if [ "$STATUS" = "400" ]; then
  pass "Negative ID -> 400"
else
  fail "Negative ID -> $STATUS (expected 400)"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b /tmp/sec-test-cookies.txt "$BASE/api/transactions/abc")
if [ "$STATUS" = "400" ]; then
  pass "Non-numeric ID -> 400"
else
  fail "Non-numeric ID -> $STATUS (expected 400)"
fi

RESP=$(curl -s -w "\n%{http_code}" -b /tmp/sec-test-cookies.txt \
  -X DELETE "$BASE/api/transactions/bulk" \
  -H "Content-Type: application/json" \
  -d '{"ids":[-1, 0, "abc"]}')
STATUS=$(echo "$RESP" | tail -1)
if [ "$STATUS" = "400" ]; then
  pass "Bulk delete with bad IDs -> 400"
else
  fail "Bulk delete with bad IDs -> $STATUS (expected 400)"
fi

RESP=$(curl -s -w "\n%{http_code}" -b /tmp/sec-test-cookies.txt \
  -X DELETE "$BASE/api/transactions/bulk" \
  -H "Content-Type: application/json" \
  -d '{"ids":[]}')
STATUS=$(echo "$RESP" | tail -1)
if [ "$STATUS" = "400" ]; then
  pass "Bulk delete empty array -> 400"
else
  fail "Bulk delete empty array -> $STATUS (expected 400)"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b /tmp/sec-test-cookies.txt \
  "$BASE/api/transactions/history?startDate=2024-01-01&endDate=2024-12-31&tranType=';DROP%20TABLE%20transactions;--")
if [ "$STATUS" = "200" ] || [ "$STATUS" = "400" ]; then
  pass "SQL injection in tranType -> $STATUS (parameterized query safe)"
else
  fail "SQL injection in tranType -> $STATUS (unexpected)"
fi

echo ""
echo ">> TEST GROUP 7: Summary endpoint validation"
echo ""

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b /tmp/sec-test-cookies.txt "$BASE/api/transactions/summary?days=-1")
if [ "$STATUS" = "400" ]; then
  pass "Summary with negative days -> 400"
else
  fail "Summary with negative days -> $STATUS (expected 400)"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b /tmp/sec-test-cookies.txt "$BASE/api/transactions/summary?days=NaN")
if [ "$STATUS" = "400" ]; then
  pass "Summary with NaN days -> 400"
else
  fail "Summary with NaN days -> $STATUS (expected 400)"
fi

echo ""
echo "============================================"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "============================================"

if [ -n "$FINDINGS" ]; then
  echo ""
  echo "FINDINGS (security gaps):"
  echo -e "$FINDINGS"
else
  echo ""
  echo "No security gaps found."
fi

rm -f /tmp/sec-test-cookies.txt
