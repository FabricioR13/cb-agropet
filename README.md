# Catálogo Agropet Nossa Casa

Catálogo online da **Agropet Nossa Casa** (Estrada dos Caetanos, 1543 – Residencial Campo Belo, Cachoeirinha/RS), com sacolinha, entrega ou retirada, finalização do pedido no WhatsApp da loja e um painel para os donos cuidarem de preços, estoque, pedidos e do caixa (entradas e saídas).

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html`, `style.css`, `script.js` | A loja (vitrine) que o cliente usa |
| `admin.html`, `admin.css`, `admin.js` | Painel do lojista (link "Área do lojista" no rodapé da loja) |
| `dados.js` | Dados iniciais (produtos, categorias, bairros, cupons, configurações) e o armazenamento |
| `assets/logo-agropet.webp` | Logo (recortado da foto de perfil do Instagram) |

## Como funciona o pedido

1. O cliente escolhe os produtos e monta a **sacolinha**.
2. Escolhe **Entrega** (bairro com taxa, rua, número, referência) ou **Retirada** (dia e horário).
3. Escolhe a forma de pagamento (PIX, cartão ou dinheiro com troco) e informa nome e WhatsApp.
4. Confere o resumo e toca em **Finalizar no WhatsApp**: abre a conversa com a loja (51 98219-8652) já com o pedido escrito e o código `#AGxxxxxx`. O pagamento é combinado ali.

## Painel do lojista (`admin.html`)

Senha de demonstração: `agropet123` (troque em Configurações).

- **Painel**: entradas, saídas, saldo, vendas, lucro, gráfico por dia, pedidos aguardando, estoque baixo, mais vendidos e despesas por categoria.
- **Pedidos**: acompanha os status (Novo → Pago → Saiu/Pronto → Concluído). Ao marcar como pago, a venda entra no caixa e o estoque baixa. "Colar pedido do WhatsApp" registra um pedido a partir da mensagem recebida.
- **Vender**: venda de balcão (PDV).
- **Produtos**: preço, preço "de" (oferta), custo e margem, estoque, repor estoque (lança a compra como saída), reajuste de preços em lote, categorias, fotos.
- **Entradas e saídas**: caixa do mês com categorias, formas de pagamento e exportação para planilha (CSV).
- **Cupons** e **Configurações** (WhatsApp, endereço, bairros e taxas, frete grátis, horários de retirada, formas de pagamento, textos da vitrine, backup).

## Importante: onde os dados ficam

Nesta versão tudo é salvo **no navegador** (localStorage). Na mesma máquina, loja e painel conversam na hora (mudou o preço no painel, a loja atualiza). Mas as mudanças feitas no painel **não chegam ao celular dos clientes** até a loja ser ligada a um banco online (ex.: Firebase). O `dados.js` foi feito para essa troca: basta substituir os métodos `carregar()` e `salvar()` do `AgroDB`.

Os pedidos dos clientes chegam sempre pelo WhatsApp, independentemente disso.

Os preços, estoques, bairros, taxas e horários que vêm de fábrica são **exemplos** — ajuste pelo painel antes de divulgar.

---
Site desenvolvido por **TF Solutions**.
