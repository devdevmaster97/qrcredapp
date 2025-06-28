const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const inputFile = path.join(__dirname, '../public/icons/logo.png');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  // Verificar se o arquivo de origem existe
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Arquivo de entrada não encontrado: ${inputFile}`);
    console.log('📁 Certifique-se de que o arquivo logo.png está na pasta public/icons/');
    return;
  }

  console.log(`📍 Usando arquivo de entrada: ${inputFile}`);
  
  for (const size of sizes) {
    const outputFile = path.join(outputDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Fundo transparente
        })
        .png({
          quality: 90,
          compressionLevel: 6
        })
        .toFile(outputFile);
        
      console.log(`✅ Gerado: ${outputFile}`);
    } catch (error) {
      console.error(`❌ Erro ao gerar ${outputFile}:`, error.message);
    }
  }

  // Também gerar um favicon baseado no logo
  try {
    const faviconFile = path.join(__dirname, '../app/favicon.png');
    await sharp(inputFile)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(faviconFile);
      
    console.log(`✅ Gerado favicon: ${faviconFile}`);
  } catch (error) {
    console.error(`❌ Erro ao gerar favicon:`, error.message);
  }

  console.log('\n🎉 Processo de geração de ícones concluído!');
  console.log('📝 Para que as mudanças tenham efeito:');
  console.log('   1. Limpe o cache do navegador');
  console.log('   2. Reinstale o PWA se já estiver instalado');
}

generateIcons().catch(console.error); 