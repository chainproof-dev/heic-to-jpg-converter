#!/bin/bash
# HEIC to JPG API Tests
# Run these tests against the deployed Cloudflare Worker

# Configuration
API_BASE="https://heic-to-jpg-api.chainproof.workers.dev"
SAMPLE_FILE="./sample.heic"
OUTPUT_DIR="./output"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "========================================"
echo "  HEIC to JPG API Tests"
echo "========================================"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
HEALTH_RESPONSE=$(curl -s "$API_BASE/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "  Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}✗ Health check failed${NC}"
    echo "  Response: $HEALTH_RESPONSE"
fi
echo ""

# Test 2: Options Endpoint
echo -e "${YELLOW}Test 2: Options Endpoint${NC}"
OPTIONS_RESPONSE=$(curl -s "$API_BASE/options")
if echo "$OPTIONS_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Options endpoint passed${NC}"
    echo "  Formats: $(echo $OPTIONS_RESPONSE | grep -o '"outputFormats":\[[^]]*\]' | head -c 100)..."
else
    echo -e "${RED}✗ Options endpoint failed${NC}"
    echo "  Response: $OPTIONS_RESPONSE"
fi
echo ""

# Test 3: API Info (Root)
echo -e "${YELLOW}Test 3: API Info (Root)${NC}"
ROOT_RESPONSE=$(curl -s "$API_BASE/")
if echo "$ROOT_RESPONSE" | grep -q '"name":"HEIC to JPG API"'; then
    echo -e "${GREEN}✓ Root endpoint passed${NC}"
else
    echo -e "${RED}✗ Root endpoint failed${NC}"
    echo "  Response: $ROOT_RESPONSE"
fi
echo ""

# Test 4: Convert HEIC to JPG (default quality)
echo -e "${YELLOW}Test 4: Convert HEIC to JPG (default)${NC}"
if [ -f "$SAMPLE_FILE" ]; then
    HTTP_CODE=$(curl -s -w "%{http_code}" -X POST "$API_BASE/convert" \
        -H "Content-Type: application/octet-stream" \
        --data-binary @"$SAMPLE_FILE" \
        -o "$OUTPUT_DIR/output_default.jpg")
    
    if [ "$HTTP_CODE" = "200" ] && [ -s "$OUTPUT_DIR/output_default.jpg" ]; then
        FILE_SIZE=$(stat -c%s "$OUTPUT_DIR/output_default.jpg" 2>/dev/null || stat -f%z "$OUTPUT_DIR/output_default.jpg" 2>/dev/null)
        echo -e "${GREEN}✓ Conversion passed (HTTP $HTTP_CODE)${NC}"
        echo "  Output size: $FILE_SIZE bytes"
    else
        echo -e "${RED}✗ Conversion failed (HTTP $HTTP_CODE)${NC}"
    fi
else
    echo -e "${RED}✗ Sample file not found: $SAMPLE_FILE${NC}"
fi
echo ""

# Test 5: Convert with quality parameter
echo -e "${YELLOW}Test 5: Convert with quality=80${NC}"
if [ -f "$SAMPLE_FILE" ]; then
    HTTP_CODE=$(curl -s -w "%{http_code}" -X POST "$API_BASE/convert?quality=80" \
        -H "Content-Type: application/octet-stream" \
        --data-binary @"$SAMPLE_FILE" \
        -o "$OUTPUT_DIR/output_q80.jpg")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Quality parameter test passed${NC}"
    else
        echo -e "${RED}✗ Quality parameter test failed (HTTP $HTTP_CODE)${NC}"
    fi
fi
echo ""

# Test 6: Convert to PNG format
echo -e "${YELLOW}Test 6: Convert to PNG format${NC}"
if [ -f "$SAMPLE_FILE" ]; then
    HTTP_CODE=$(curl -s -w "%{http_code}" -X POST "$API_BASE/convert?format=png" \
        -H "Content-Type: application/octet-stream" \
        --data-binary @"$SAMPLE_FILE" \
        -o "$OUTPUT_DIR/output.png")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ PNG format test passed${NC}"
    else
        echo -e "${RED}✗ PNG format test failed (HTTP $HTTP_CODE)${NC}"
    fi
fi
echo ""

# Test 7: Invalid file (non-HEIC)
echo -e "${YELLOW}Test 7: Invalid file test${NC}"
HTTP_CODE=$(curl -s -w "%{http_code}" -X POST "$API_BASE/convert" \
    -H "Content-Type: application/octet-stream" \
    -d "not a valid heic file" \
    -o /dev/null)

if [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ Invalid file correctly rejected (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Expected 400, got HTTP $HTTP_CODE${NC}"
fi
echo ""

# Test 8: 404 for unknown route
echo -e "${YELLOW}Test 8: 404 for unknown route${NC}"
HTTP_CODE=$(curl -s -w "%{http_code}" "$API_BASE/unknown/route" -o /dev/null)
if [ "$HTTP_CODE" = "404" ]; then
    echo -e "${GREEN}✓ Unknown route returns 404${NC}"
else
    echo -e "${RED}✗ Expected 404, got HTTP $HTTP_CODE${NC}"
fi
echo ""

echo "========================================"
echo "  Tests Complete"
echo "========================================"
echo "  Output files saved to: $OUTPUT_DIR/"
