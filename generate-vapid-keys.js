// Script para gerar chaves VAPID
// Execute: node generate-vapid-keys.js

const crypto = require('crypto');

function urlBase64(buffer) {
    return buffer.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function generateVAPIDKeys() {
    // Gerar par de chaves
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        publicKeyEncoding: {
            type: 'spki',
            format: 'der'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'der'
        }
    });

    // Extrair chaves no formato correto
    const publicKeyBase64 = urlBase64(publicKey.slice(-65));
    const privateKeyBase64 = urlBase64(privateKey.slice(-32));

    return {
        publicKey: publicKeyBase64,
        privateKey: privateKeyBase64
    };
}

// Gerar e exibir as chaves
const keys = generateVAPIDKeys();

console.log('\n🔑 CHAVES VAPID GERADAS COM SUCESSO!');
console.log('=====================================');
console.log('\n📱 CHAVE PÚBLICA (Frontend):');
console.log(keys.publicKey);
console.log('\n🔒 CHAVE PRIVADA (Backend):');
console.log(keys.privateKey);
console.log('\n=====================================');
console.log('📋 PRÓXIMOS PASSOS:');
console.log('1. Copie a CHAVE PÚBLICA para app/components/NotificationManager.tsx');
console.log('   - Substitua: const vapidPublicKey = "SUA_CHAVE_VAPID_PUBLICA_AQUI";');
console.log('   - Por: const vapidPublicKey = "' + keys.publicKey + '";');
console.log('\n2. Copie a CHAVE PRIVADA para os scripts PHP do backend');
console.log('   - Substitua nos arquivos PHP: VAPID_PRIVATE_KEY');
console.log('\n⚠️  IMPORTANTE:');
console.log('   - A chave PRIVADA nunca deve ser exposta no frontend');
console.log('   - Use as mesmas chaves no frontend e backend');
console.log('   - Guarde essas chaves em local seguro');
console.log('=====================================\n'); 