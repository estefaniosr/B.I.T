# Revisão MV3 / Chrome Web Store

## Resultado

O build é uma extensão Manifest V3 carregável sem backend. O runtime não contém CDN configurada, API paga, analytics, tracking, `host_permissions` persistentes ou código JavaScript baixado em execução.

## Auditoria

- **Código remoto:** nenhum script remoto é referenciado pelo manifest, HTML ou código da extensão. Tesseract.js e Transformers.js são empacotados pelo Vite. As dependências contêm constantes de URL internas, mas `env.allowRemoteModels = false` impede o caminho remoto do Transformers.js; Tesseract recebe `workerPath`, `corePath` e `langPath` locais explícitos.
- **Rede:** o único `fetch` escrito pelo projeto converte uma URL `data:image/png` em `Blob`. Não há endpoint HTTP(S) no código próprio de runtime. Downloads do npm durante desenvolvimento não fazem parte da extensão instalada.
- **Permissões:** `activeTab` limita acesso à aba acionada; `scripting` injeta o content script/CSS somente após o clique; `storage` guarda preferências, status e cache. Não há `host_permissions`.
- **Processamento:** OCR, ONNX/WASM e tradução são executados em workers locais. Dados OCR de eng/kor/jpn/chi_sim são empacotados.
- **Comunicação:** popup → service worker → injeção/captura → content script → worker → content script/overlay. Status fica em `storage.local`, portanto sobrevive ao fechamento do popup.
- **CSP:** `wasm-unsafe-eval` é necessário ao ONNX/Tesseract WASM; `script-src` permanece restrito a `'self'`.
- **Build:** `scripts/verify-build.mjs` verifica arquivos obrigatórios, MV3, ausência de host permissions, content script clássico e URLs HTTP(S) nos entrypoints.

## Riscos restantes antes de publicar

1. Os pesos Transformers não são incluídos por padrão devido ao tamanho. Uma submissão que anuncie tradução coreano/português deve empacotá-los e ser testada antes do envio.
2. URLs inativas presentes no código das bibliotecas podem motivar revisão manual. Explique ao revisor que os caminhos remotos estão desabilitados e que todos os recursos usados são locais.
3. A política de privacidade precisa ser hospedada em uma URL pública para a ficha da loja.
4. Screenshots e testes em Chrome estável ainda são etapas manuais do publicador.

Não publique a build sem pesos como se tradução coreano/português estivesse ativa; ela está pronta para teste técnico local e retorna erro explícito quando o modelo não existe.
