#!/bin/bash
# Script de diagnóstico para identificar bloqueio de IP da Vercel

echo "=== DIAGNÓSTICO DE BLOQUEIO DE IP DA VERCEL ==="
echo ""

# 1. Verificar se CSF está instalado
echo "1. Verificando CSF..."
if command -v csf &> /dev/null; then
    echo "✅ CSF instalado"
    echo "Verificando whitelist do CSF:"
    grep "76.76.21" /etc/csf/csf.allow
    echo ""
else
    echo "❌ CSF não encontrado"
fi

# 2. Verificar regras do iptables
echo "2. Verificando iptables..."
iptables -L INPUT -n | grep "76.76.21"
echo ""

# 3. Verificar logs de bloqueio
echo "3. Verificando logs de bloqueio (últimas 20 linhas)..."
if [ -f /var/log/lfd.log ]; then
    tail -20 /var/log/lfd.log | grep -i "76.76.21\|block\|deny"
fi
echo ""

# 4. Verificar logs do Apache
echo "4. Verificando logs do Apache (últimos erros 403)..."
if [ -f /var/log/apache2/error.log ]; then
    tail -50 /var/log/apache2/error.log | grep "403"
elif [ -f /var/log/httpd/error_log ]; then
    tail -50 /var/log/httpd/error_log | grep "403"
fi
echo ""

# 5. Verificar configuração do Apache
echo "5. Verificando .htaccess..."
find /var/www -name ".htaccess" -exec grep -l "76.76.21" {} \;
echo ""

echo "=== FIM DO DIAGNÓSTICO ==="
echo ""
echo "PRÓXIMOS PASSOS:"
echo "1. Se CSF está instalado, execute: csf -a 76.76.21.0/24 && csf -r"
echo "2. Se não tem CSF, execute: iptables -I INPUT -s 76.76.21.0/24 -j ACCEPT"
echo "3. Verifique se o .htaccess está correto (sem vírgulas no final)"
