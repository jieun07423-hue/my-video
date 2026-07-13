#!/bin/bash
export PATH=/tmp/node-v18.20.4-linux-x64/bin:/bin:/usr/bin:$PATH
cd /home/pkw/small-business-tracker

node node_modules/next/dist/bin/next start --port 3000 --hostname 0.0.0.0 &
SERVER_PID=$!
sleep 5

echo "============================================"
echo "=== LOCOL URL TEST - ALL ENDPOINTS ==="
echo "============================================"

echo ""
echo "=== 1. ROOT ==="
curl -s --max-time 5 -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/

echo "=== 2. DASHBOARD ==="
curl -s --max-time 5 -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/dashboard/quality

echo ""
echo "============================================"
echo "=== AI ANALYSIS API ==="
echo "============================================"
echo "GET stats:"
curl -s --max-time 5 "http://localhost:3000/api/data-quality/ai-analysis?action=stats"
echo ""
echo "GET config:"
curl -s --max-time 5 "http://localhost:3000/api/data-quality/ai-analysis?action=config"
echo ""
echo "POST config update:"
curl -s --max-time 5 -X POST "http://localhost:3000/api/data-quality/ai-analysis" -H "Content-Type: application/json" -d '{"action":"config","config":{"provider":"ollama","model":"llama3.2"}}'
echo ""

echo ""
echo "============================================"
echo "=== PREDICTION API ==="
echo "============================================"
echo "GET stats:"
curl -s --max-time 5 "http://localhost:3000/api/data-quality/prediction?action=stats"
echo ""
echo "GET config:"
curl -s --max-time 5 "http://localhost:3000/api/data-quality/prediction?action=config"
echo ""
echo "POST predict:"
curl -s --max-time 10 -X POST "http://localhost:3000/api/data-quality/prediction" -H "Content-Type: application/json" -d '{"action":"predict","metric":"completeness","historicalData":[{"timestamp":"2026-01-01","value":80},{"timestamp":"2026-02-01","value":82},{"timestamp":"2026-03-01","value":85},{"timestamp":"2026-04-01","value":83},{"timestamp":"2026-05-01","value":87},{"timestamp":"2026-06-01","value":90}]}'
echo ""

echo ""
echo "============================================"
echo "=== REMEDIATION API ==="
echo "============================================"
echo "GET stats:"
curl -s --max-time 5 "http://localhost:3000/api/data-quality/remediation?action=stats"
echo ""
echo "POST create:"
curl -s --max-time 5 -X POST "http://localhost:3000/api/data-quality/remediation" -H "Content-Type: application/json" -d '{"action":"create","name":"테스트 WF","description":"테스트","trigger":{"type":"manual"},"steps":[{"id":"s1","name":"검증","type":"validate","config":{"field":"test"},"onError":"stop"}]}'
echo ""

echo ""
echo "============================================"
echo "=== SLA API ==="
echo "============================================"
echo "GET definitions:"
curl -s --max-time 5 "http://localhost:3000/api/data-quality/sla?action=definitions"
echo ""
echo "GET stats:"
curl -s --max-time 5 "http://localhost:3000/api/data-quality/sla?action=stats"
echo ""
echo "POST create:"
curl -s --max-time 5 -X POST "http://localhost:3000/api/data-quality/sla" -H "Content-Type: application/json" -d '{"action":"create","name":"품질 SLA","description":"월간 목표","metric":"completeness","threshold":90,"operator":"gte","evaluationPeriod":"monthly","targets":[{"id":"t1","name":"전체","type":"overall"}]}'
echo ""
echo "GET report:"
curl -s --max-time 5 "http://localhost:3000/api/data-quality/sla?action=report"
echo ""

echo ""
echo "============================================"
echo "=== COST API ==="
echo "============================================"
echo "GET stats:"
curl -s --max-time 5 "http://localhost:3000/api/data-quality/cost?action=stats"
echo ""
echo "GET categories:"
curl -s --max-time 5 "http://localhost:3000/api/data-quality/cost?action=categories"
echo ""
echo "POST record:"
curl -s --max-time 5 -X POST "http://localhost:3000/api/data-quality/cost" -H "Content-Type: application/json" -d '{"action":"record","categoryId":"cat-prevention","description":"검증 자동화","quantity":1,"unitCost":300000}'
echo ""
echo "GET report:"
curl -s --max-time 5 "http://localhost:3000/api/data-quality/cost?action=report"
echo ""

echo ""
echo "============================================"
echo "=== CORRELATION API ==="
echo "============================================"
echo "GET stats:"
curl -s --max-time 5 "http://localhost:3000/api/data-quality/correlation?action=stats"
echo ""
echo "GET sources:"
curl -s --max-time 5 "http://localhost:3000/api/data-quality/correlation?action=sources"
echo ""
echo "POST add source:"
curl -s --max-time 5 -X POST "http://localhost:3000/api/data-quality/correlation" -H "Content-Type: application/json" -d '{"action":"addSource","name":"품질DB","type":"database","endpoint":"qdb","refreshInterval":3600}'
echo ""
echo "POST analyze:"
curl -s --max-time 5 -X POST "http://localhost:3000/api/data-quality/correlation" -H "Content-Type: application/json" -d '{"action":"analyze","sourceAData":[{"value":80},{"value":82},{"value":85},{"value":83},{"value":87}],"sourceBData":[{"value":75},{"value":78},{"value":80},{"value":82},{"value":85}],"sourceAId":"ds-a","sourceBId":"ds-b","metricA":"completeness","metricB":"accuracy"}'
echo ""

kill $SERVER_PID 2>/dev/null
echo ""
echo "============================================"
echo "=== ALL TESTS COMPLETE ==="
echo "============================================"
