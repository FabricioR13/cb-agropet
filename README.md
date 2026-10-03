# Catálogo Agropecuária CB

Catálogo online da **Agropecuária CB** (Aquamarine, 458 – Jardim Betânia, Cachoeirinha/RS · Instagram [@agropecuaria.cb.458](https://instagram.com/agropecuaria.cb.458)), com sacolinha, tele-entrega ou retirada, finalização do pedido no WhatsApp da loja e um painel para os donos cuidarem de preços, estoque, pedidos e do caixa (entradas e saídas).

O visual usa as cores do logo (amarelo-limão e preto) e o formato das postagens "MEGA PROMOÇÃO" do Instagram: faixa amarela com título preto, miolo branco com o produto, preço "De / Por" em vermelho e rodapé amarelo com a pílula preta.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html`, `style.css`, `script.js` | A loja (vitrine) que o cliente usa |
| `admin.html`, `admin.css`, `admin.js` | Painel do lojista (link "Área do lojista" no rodapé da loja) |
| `dados.js` | Dados iniciais (produtos, categorias, bairros, cupons, configurações) e o armazenamento |
| `assets/logo-cb.webp` | Logo (recortado do print do perfil do Instagram — vale trocar pelo arquivo original em Configurações) |

## Como funciona o pedido

1. O cliente escolhe os produtos e monta a **sacolinha**. Produtos com "leve 2" já recalculam o preço sozinhos.
2. Escolhe **Tele-entrega** (bairro com taxa de R$ 5 a R$ 10, rua, número, referência) ou **Retirada** (dia e horário — os horários do meio-dia, quando a loja fecha de segunda a sexta, não aparecem).
3. Escolhe a forma de pagamento (PIX, cartão ou dinheiro com troco) e informa nome e WhatsApp.
4. Confere o resumo e toca em **Finalizar no WhatsApp**: o site abre a conversa com a loja (51 99580-6024) já com o pedido escrito e o código `#CBxxxxxx`. O pagamento é combinado ali.

## Painel do lojista (`admin.html`)

Senha de demonstração: `cb2026` (troque em Configurações; depois de trocada, a dica some da tela de entrada).

- **Painel**: entradas, saídas, saldo, vendas, lucro, gráfico por dia, pedidos aguardando, estoque baixo, mais vendidos e despesas por categoria.
- **Pedidos**: acompanha os status (Novo → Pago → Saiu/Pronto → Concluído). Ao marcar como pago, a venda entra no caixa e o estoque baixa. "Colar pedido do WhatsApp" registra um pedido a partir da mensagem recebida.
- **Vender**: venda de balcão (PDV), já com o preço do "leve 2".
- **Produtos**: preço, preço "de" (oferta), promoção "leve mais" (quantidade + preço total), custo e margem, estoque, repor estoque (lança a compra como saída), reajuste de preços em lote, categorias, fotos.
- **Entradas e saídas**: caixa do mês com categorias, formas de pagamento e exportação para planilha (CSV).
- **Cupons** e **Configurações** (WhatsApp, endereço, bairros e taxas, frete grátis, horários de retirada e intervalo do meio-dia, formas de pagamento, textos da vitrine, backup).

## O que é real e o que é exemplo

Vieram do Instagram da loja: nome, WhatsApp, endereço, horário e os preços destes produtos:

| Produto | De | Por | Leve 2 |
|---|---|---|---|
| Golden Power Training Filhote 15 kg | 192,90 | 182,90 | 345,90 |
| Golden Power Training Adulto 15 kg | 181,90 | 171,90 | 325,90 |
| Golden Mini Bits Porte Pequeno Carne e Arroz 15 kg | 178,90 | 169,90 | — |
| Golden Mini Bits Porte Pequeno Frango e Arroz 15 kg | 178,90 | 169,90 | — |
| Comedouro com reservatório 6 kg | — | 49,90 | — |

Todo o resto é **exemplo** e precisa ser confirmado com os donos antes de divulgar: os outros produtos e preços (inclusive o do NexGard), todos os custos e estoques, a lista de bairros atendidos e a taxa de cada um (de R$ 5 a R$ 10, sem frete grátis), os cupons, o histórico de vendas e despesas do painel e as fotos (sem foto, a loja mostra o ícone da categoria).

A seção **Mega promoção** do topo mostra no máximo **5 itens** (primeiro os marcados como destaque, depois os de maior desconto). Outras promoções continuam aparecendo na lista de produtos e no filtro "Promoções".

## Importante: onde os dados ficam

Nesta versão tudo é salvo **no navegador** (localStorage). Na mesma máquina, loja e painel conversam na hora (mudou o preço no painel, a loja atualiza). Mas as mudanças feitas no painel **não chegam ao celular dos clientes** até a loja ser ligada a um banco online (ex.: Firebase). O `dados.js` foi feito para essa troca: basta substituir os métodos `carregar()` e `salvar()` do `AgroDB`.

Os pedidos dos clientes chegam sempre pelo WhatsApp, independentemente disso.

Quando os **dados iniciais** do `dados.js` mudarem (bairros, taxas, textos, produtos de exemplo), aumente o número `AGRO_VERSAO_DADOS`: quem já abriu o site descarta o que estava salvo no navegador e recarrega os dados novos. Atenção: isso também apaga o que foi alterado pelo painel naquele navegador.

---
Site desenvolvido por **TF Solutions**.
