# Chrome Web Store Listing

## Nome

Bubble Image Translator

## Descrição curta

Projeto gratuito e educacional para reconhecer e traduzir textos em imagens localmente.

## Descrição completa

Bubble Image Translator é uma extensão gratuita e experimental criada para fins educacionais e de portfólio. Ela reconhece e traduz textos presentes em imagens usando processamento local no navegador do usuário.

Ao ser acionada, a extensão captura a área visível da aba, executa OCR local e posiciona os resultados sobre a página. O usuário pode escolher os idiomas, exibir o texto original e utilizar um cache local opcional.

Este é um projeto pessoal criado exclusivamente para estudo, aprendizado e demonstração técnica em portfólio. A extensão não representa uma empresa, loja ou negócio e não constitui SaaS, produto pago, ferramenta empresarial ou serviço profissional. Ela não possui anúncios, compras internas, assinaturas, planos pagos ou qualquer forma de monetização. O desenvolvedor não recebe pagamentos pelo uso da extensão e não vende produtos ou serviços por meio dela.

A extensão não utiliza backend próprio, APIs pagas, analytics ou rastreamento. Imagens, textos e dados pessoais não são enviados para servidores externos. O processamento de OCR e tradução acontece localmente no navegador ou computador do usuário.

## Funcionalidades

- Manga OCR local especializado em japonês vertical e Tesseract local para os demais idiomas
- Tradução local com a Translator API integrada ao Google Chrome
- Overlay alinhado aproximadamente ao texto reconhecido
- Destino em português do Brasil ou inglês
- Exibição opcional do texto original
- Cache local opcional
- Botão e atalho `Esc` para limpar o overlay
- Requer Google Chrome 138 ou superior; pacotes de idioma podem ser baixados pelo navegador no primeiro uso

## Privacidade e ausência de monetização

- Nenhum dado pessoal é coletado.
- Imagens e textos não são enviados para servidores.
- O cache permanece somente no navegador do usuário.
- Nenhum dado é utilizado para fins comerciais.
- Não há anúncios, assinaturas ou compras internas.
- Não há venda de produtos ou serviços.
- O projeto é gratuito, educacional e destinado a aprendizado e portfólio.
- A extensão não é um SaaS, produto comercial, ferramenta empresarial ou serviço profissional.

**Categoria sugerida:** Produtividade.

## Screenshots sugeridas

1. Popup com os seletores e a mensagem de processamento local.
2. Página de teste antes do reconhecimento.
3. Página de teste com o overlay exibido.
4. Estado de processamento local.
5. Comparação com a opção “Mostrar texto original”.

## Checklist antes da publicação

- [ ] Testar os pares coreano → português e japonês → português no Google Chrome estável.
- [ ] Confirmar a licença do Tesseract.js e dos dados OCR.
- [x] Adicionar ícones PNG de 16, 32, 48 e 128 px ao manifest.
- [ ] Testar o ZIP no Chrome estável.
- [ ] Capturar screenshots em tamanho aceito pela Chrome Web Store.
- [ ] Hospedar esta política de privacidade em uma página pública.
- [ ] Declarar corretamente as permissões e práticas de dados no painel.
- [ ] Executar `npm run typecheck`, `npm run lint` e `npm run build`.
- [ ] Confirmar que nenhuma descrição promete tradução não incluída no pacote final.
- [ ] Enviar o ZIP gerado por `npm run zip`.
