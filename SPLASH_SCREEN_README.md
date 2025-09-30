# Splash Screen - Configuração e Funcionamento

## 📹 Vídeo da Logo

O vídeo `videologo.mp4` deve ser colocado na pasta:
```
c:\sasapp\public\videologo.mp4
```

## 🎯 Como Funciona

### 1. **Componente SplashScreen** (`/app/components/SplashScreen.tsx`)
- Exibe o vídeo em tela cheia ao abrir o app
- Duração: 3 segundos
- Mostra apenas **uma vez por sessão** (usa sessionStorage)
- Fecha automaticamente após o vídeo terminar
- Overlay branco esconde todo o conteúdo durante a exibição

### 2. **Integração no Layout** (`/app/layout.tsx`)
- Componente renderizado no topo do layout principal
- Aparece antes de qualquer outro conteúdo
- z-index: 9999 (splash) e 9998 (overlay)

### 3. **Página de Menu** (`/app/menu/page.tsx`)
- Estado de loading mostra apenas tela branca
- Evita exibir logo/texto antes do splash screen
- Conteúdo só aparece após splash terminar

## ✅ Características

- ✅ **Tela cheia**: Vídeo ocupa toda a tela
- ✅ **Autoplay**: Inicia automaticamente
- ✅ **Muted**: Sem som (necessário para autoplay)
- ✅ **Fecha automaticamente**: Após 3 segundos
- ✅ **Uma vez por sessão**: Não reaparece ao navegar
- ✅ **iOS/Android**: Compatível com ambos
- ✅ **Responsivo**: Adapta-se a todos os tamanhos

## 🔧 Configuração no Manifest

O arquivo `/public/manifest.json` inclui:
```json
"splash_screen_media": {
  "video": "/videologo.mp4",
  "duration": 3000
}
```

## 📱 Comportamento

### Primeira vez (nova sessão):
1. App abre
2. Splash screen aparece com vídeo
3. Vídeo toca por 3 segundos
4. Splash desaparece
5. Conteúdo do app é exibido

### Navegação subsequente (mesma sessão):
1. Splash não aparece
2. Conteúdo exibido imediatamente

### Nova sessão (após fechar app):
1. sessionStorage é limpo
2. Splash aparece novamente

## 🎨 Personalização

Para alterar a duração do vídeo:
```typescript
// Em SplashScreen.tsx, linha 24
const timer = setTimeout(() => {
  setShowSplash(false);
  setTimeout(() => setHideContent(false), 100);
}, 3000); // Altere 3000 para o tempo desejado em ms
```

Para desabilitar o splash em desenvolvimento:
```typescript
// Em SplashScreen.tsx, adicione no useEffect:
if (process.env.NODE_ENV === 'development') {
  setShowSplash(false);
  setHideContent(false);
  return;
}
```

## 🐛 Troubleshooting

### Vídeo não aparece:
- Verifique se `videologo.mp4` está em `/public/`
- Confirme que o formato é MP4
- Teste em modo anônimo (limpa sessionStorage)

### Conteúdo aparece antes do vídeo:
- Verifique se `hideContent` overlay está ativo
- Confirme z-index do splash (9999)

### Vídeo não fecha automaticamente:
- Verifique duração do setTimeout (3000ms)
- Confirme que evento `onEnded` está funcionando
