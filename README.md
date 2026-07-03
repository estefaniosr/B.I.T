# Bubble Image Translator

Extensão Chrome Manifest V3 que lê texto na área visível com OCR e sobrepõe traduções. Imagens e textos permanecem no computador do usuário: não há backend, analytics, API paga ou JavaScript remoto.

## Finalidade do projeto

Este projeto é pessoal, gratuito, experimental e educacional. Ele foi desenvolvido como estudo prático sobre extensões de navegador, OCR local, tradução local, Web Workers e manipulação de páginas web. A extensão existe exclusivamente para aprendizado, composição de portfólio e demonstração do conhecimento técnico adquirido.

A extensão não representa uma empresa, loja, negócio, produto ou serviço comercial. Também não é um SaaS, uma ferramenta empresarial nem um serviço profissional oferecido pelo desenvolvedor. Ela não vende produtos ou serviços e não possui anúncios, assinaturas, compras internas, planos pagos ou qualquer outra forma de monetização. O desenvolvedor não recebe pagamentos pelo uso da extensão.

## Privacidade e ausência de monetização

A extensão não envia imagens, textos extraídos por OCR ou dados pessoais para servidores externos. O processamento de OCR e tradução acontece localmente no navegador ou computador do usuário. A extensão não utiliza backend próprio, APIs pagas, rastreamento, analytics ou anúncios. Nenhum dado é coletado para fins comerciais.

Quando o cache opcional está habilitado, os resultados ficam somente no armazenamento local do navegador do usuário. Consulte [PRIVACY.md](PRIVACY.md) para mais detalhes.

## Instalação e build

Requer Node.js 20 ou superior.

```bash
npm install
npm run typecheck
npm run build
```

Para desenvolvimento, `npm run dev` recompila ao salvar. A saída é sempre `dist/`.

## Carregar no Chrome

1. Abra `chrome://extensions`.
2. Ative **Developer mode**.
3. Clique em **Load unpacked**.
4. Selecione a pasta `dist`.

Após cada recompilação, clique em **Reload** no cartão da extensão.

## Testar

Sirva o repositório por HTTP (content scripts não rodam normalmente em `file://`):

```bash
npx vite --host 127.0.0.1
```

Abra `http://127.0.0.1:5173/test-pages/korean-bubbles.html`, clique na extensão e, antes de instalar pesos de tradução, escolha **Inglês → Inglês** para validar OCR e overlay no balão inglês. Com os pesos instalados, escolha **Coreano → Inglês/Português**. Clique em **Traduzir tela**. Use **Limpar traduções** ou a tecla `Esc` para remover o overlay. O primeiro OCR pode levar alguns segundos.

## Modelos locais

O build inclui dados Tesseract para OCR em inglês, coreano, japonês e chinês simplificado. A tradução utiliza a Translator API integrada ao Google Chrome 138 ou superior, com suporte a coreano, japonês, chinês, inglês e português.

Na primeira tradução de cada par de idiomas, o próprio Chrome pode baixar um pacote de idioma. O pacote é administrado pelo navegador e a tradução ocorre localmente depois do download. Imagens e textos reconhecidos nunca são enviados ao Google ou ao desenvolvedor. A extensão não usa API paga nem backend.

## Cache e privacidade

Resultados são indexados por SHA-256 da captura/configuração e guardados em `chrome.storage.local`. Desmarque **Usar cache local** para não reutilizá-los. Para apagar todos os resultados, limpe os dados da extensão no Chrome (ou execute `clearCache()` a partir de uma futura tela de configurações). Veja [PRIVACY.md](PRIVACY.md).

O cache não é analisado, vendido, compartilhado ou utilizado para publicidade, perfilamento ou qualquer finalidade comercial.

## Empacotar e publicar

Execute `npm run zip`; o arquivo `bubble-image-translator.zip` será criado com `manifest.json` na raiz. Teste esse mesmo build com **Load unpacked**, preencha a ficha sugerida em [STORE_LISTING.md](STORE_LISTING.md), acrescente screenshots e envie o ZIP ao Chrome Web Store Developer Dashboard. Não envie uma build que prometa tradução real sem antes empacotar e testar os pesos locais.

## Limitações conhecidas

- A versão inclui Manga OCR local para japonês (inclusive texto vertical e furigana) e Tesseract local para inglês, coreano e chinês simplificado.
- “Auto” tenta o conjunto coreano + inglês; não é detecção universal.
- OCR de texto estilizado, vertical, pequeno ou com pouco contraste pode falhar.
- O overlay é atualizado automaticamente após a rolagem parar; cada atualização reprocessa apenas a viewport visível.
- Páginas internas do Chrome e a Chrome Web Store bloqueiam content scripts.
- A tradução requer Google Chrome 138 ou superior e depende da disponibilidade do pacote de idioma no dispositivo.
- Navegadores Chromium de terceiros, como Brave, podem não implementar a Translator API do Chrome.

## Estrutura

`background.ts` captura e coordena; o Web Worker executa OCR/tradução; `content.ts` desenha o overlay; `lib/` contém abstrações testáveis. Todo JavaScript do build é local.
