// ─────────────────────────────────────────────────────────────────────────────
// AGROPECUÁRIA CB — DADOS DA LOJA + ARMAZENAMENTO
// ─────────────────────────────────────────────────────────────────────────────
// Este arquivo é compartilhado pela vitrine (index.html) e pelo painel
// (admin.html). Ele guarda:
//   1) os DADOS INICIAIS da loja (produtos, categorias, configurações, cupons)
//      — usados na primeira vez que o site abre, ou ao "restaurar dados de
//      exemplo" no painel;
//   2) a camada de ARMAZENAMENTO (AgroDB), que salva tudo no navegador
//      (localStorage). Vitrine e painel abertos no mesmo navegador enxergam os
//      mesmos dados na hora: mudou o preço no painel, a vitrine atualiza.
//
// Para colocar a loja no ar com vários aparelhos sincronizados (dono mexe no
// celular, cliente vê no dele), basta trocar os métodos carregar()/salvar()
// do AgroDB por um banco online (ex.: Firebase) — o resto do código não muda.
// ─────────────────────────────────────────────────────────────────────────────

const AGRO_STORAGE_KEY = "agropecuaria_cb_v1";
// Mudou os dados iniciais (bairros, taxas, textos)? Aumente este número: os
// navegadores que já abriram o site descartam o que tinham salvo e recarregam.
const AGRO_VERSAO_DADOS = 2;
const AGRO_SENHA_PADRAO = "cb2026";

// Crédito da TF Solutions (produtora do site) — usado só no rodapé.
const TF_SOLUTIONS_WHATSAPP = "5551982165186";

// ─── CONFIGURAÇÕES PADRÃO ────────────────────────────────────────────────────
// Nome, WhatsApp, endereço e horário vêm do perfil do Instagram
// (@agropecuaria.cb.458). Tudo pode ser alterado em Configurações, no painel.
const AGRO_CONFIG_PADRAO = {
    nomeLoja: "Agropecuária CB",
    slogan: "Pet shop com tele-entrega",
    whatsapp: "5551995806024",
    telefoneExibicao: "(51) 99580-6024",
    instagram: "agropecuaria.cb.458",
    endereco: "Aquamarine, 458 – Jardim Betânia, Cachoeirinha/RS",
    horarioTexto: "Seg a Sex 8h30–12h e 14h–20h30 · Sáb 8h30–20h30",
    logoUrl: "assets/logo-cb.webp",
    avisoTopo: "Temos tele-entrega · Peça pelo catálogo e finalize no WhatsApp",

    heroTag: "Oferta válida até acabar o estoque",
    heroTitulo: "Mega promoção",
    heroSubtitulo: "Rações, petiscos, acessórios e produtos agro com tele-entrega. Monte sua sacolinha e finalize o pedido pelo WhatsApp.",

    // Entrega
    entregaDisponivel: true,
    retiradaDisponivel: true,
    freteGratisAcima: 0,        // 0 = desligado (sem frete grátis: cada bairro tem a sua taxa, de R$ 5 a R$ 10)
    pedidoMinimoEntrega: 0,     // 0 = sem pedido mínimo
    bairros: [
        { nome: "Jardim Betânia", taxa: 5 },
        { nome: "Granja Esperança", taxa: 6 },
        { nome: "Parque da Matriz", taxa: 6 },
        { nome: "Vila Imbuí", taxa: 7 },
        { nome: "Central Parque", taxa: 7 },
        { nome: "Vila Regina", taxa: 8 },
        { nome: "Parque Marechal Rondon", taxa: 8 },
        { nome: "Vila Vista Alegre", taxa: 9 },
        { nome: "Jardim do Bosque", taxa: 9 },
        { nome: "Distrito Industrial", taxa: 10 },
        { nome: "Outro bairro (a combinar no WhatsApp)", taxa: null },
    ],

    // Retirada na loja (a loja fecha ao meio-dia de segunda a sexta; sábado não)
    retiradaDias: [1, 2, 3, 4, 5, 6],
    retiradaHoraInicio: "08:30",
    retiradaHoraFim: "20:00",
    retiradaIntervalo: 30,
    retiradaPausaInicio: "12:00",
    retiradaPausaFim: "14:00",
    retiradaSabadoSemPausa: true,

    // Pagamento (finalizado pelo WhatsApp)
    formasPagamento: ["PIX", "Cartão de crédito", "Cartão de débito", "Dinheiro"],
    avisoPagamento: "O pagamento é combinado pelo WhatsApp: no PIX enviamos a chave na conversa; no cartão ou dinheiro, você paga na entrega ou na retirada.",

    // Painel
    senhaAdmin: AGRO_SENHA_PADRAO,
};

// ─── CATEGORIAS ──────────────────────────────────────────────────────────────
// "cor" identifica a categoria nos ícones do painel. Na vitrine os cartões
// seguem o padrão das postagens: amarelo-limão, preto, branco e preço vermelho.
const AGRO_CATEGORIAS_PADRAO = [
    { id: "caes", nome: "Cães", icone: "fa-dog", cor: "#E8862F" },
    { id: "gatos", nome: "Gatos", icone: "fa-cat", cor: "#4B3FA8" },
    { id: "aves", nome: "Aves e Pássaros", icone: "fa-dove", cor: "#2E9E52" },
    { id: "campo", nome: "Agro e Campo", icone: "fa-wheat-awn", cor: "#9A6A2F" },
    { id: "petiscos", nome: "Petiscos", icone: "fa-bone", cor: "#D62828" },
    { id: "acessorios", nome: "Acessórios e Casinhas", icone: "fa-house-chimney", cor: "#1F6FB2" },
    { id: "higiene", nome: "Farmácia e Higiene", icone: "fa-kit-medical", cor: "#12877F" },
    { id: "jardim", nome: "Jardim e Horta", icone: "fa-seedling", cor: "#5E9B1C" },
];

// ─── PRODUTOS ────────────────────────────────────────────────────────────────
// preco = preço de venda ("Por") · precoAntigo = "De" (marca MEGA PROMOÇÃO)
// levaQtd / levaPreco = "Ou leve 2 und. por 345,90" (preço especial por quantidade)
// custo = quanto a loja paga (só aparece no painel, para calcular a margem)
// estoque / estoqueMin = controle de estoque (alerta no painel)
// imagem = foto (URL ou enviada pelo painel). Vazio = arte da categoria.
//
// Os itens 1 a 5 trazem os preços das postagens do Instagram da loja. Os demais
// (e todos os custos e estoques) são EXEMPLOS para o painel não abrir vazio.
const AGRO_PRODUTOS_PADRAO = [
    { id: 1, nome: "Ração Golden Power Training Filhote", unidade: "15 kg", categoria: "caes", preco: 182.90, precoAntigo: 192.90, levaQtd: 2, levaPreco: 345.90, custo: 148.00, estoque: 14, estoqueMin: 4, destaque: true, descricao: "Ração Golden Power Training para cães filhotes, saco de 15 kg. Oferta válida até acabar o estoque." },
    { id: 2, nome: "Ração Golden Power Training Adulto", unidade: "15 kg", categoria: "caes", preco: 171.90, precoAntigo: 181.90, levaQtd: 2, levaPreco: 325.90, custo: 139.00, estoque: 16, estoqueMin: 4, destaque: true, descricao: "Ração Golden Power Training para cães adultos, saco de 15 kg. Oferta válida até acabar o estoque." },
    { id: 3, nome: "Ração Golden Mini Bits Porte Pequeno Carne e Arroz", unidade: "15 kg", categoria: "caes", preco: 169.90, precoAntigo: 178.90, custo: 137.00, estoque: 10, estoqueMin: 3, destaque: true, descricao: "Ração Golden Mini Bits para cães de porte pequeno, sabor carne e arroz, saco de 15 kg. Oferta válida até acabar o estoque." },
    { id: 4, nome: "Ração Golden Mini Bits Porte Pequeno Frango e Arroz", unidade: "15 kg", categoria: "caes", preco: 169.90, precoAntigo: 178.90, custo: 137.00, estoque: 10, estoqueMin: 3, descricao: "Ração Golden Mini Bits para cães de porte pequeno, sabor frango e arroz, saco de 15 kg. Oferta válida até acabar o estoque." },
    { id: 5, nome: "Comedouro Automático com Reservatório", unidade: "6 kg", categoria: "acessorios", preco: 49.90, custo: 31.00, estoque: 8, estoqueMin: 3, destaque: true, descricao: "Comedouro com reservatório para até 6 kg de ração: o pote se reabastece sozinho conforme o pet come." },
    { id: 6, nome: "NexGard Antipulgas e Carrapatos", unidade: "1 tablete", categoria: "higiene", preco: 89.90, custo: 68.00, estoque: 12, estoqueMin: 4, descricao: "NexGard original, tablete mastigável contra pulgas e carrapatos. Informe o peso do seu cão no WhatsApp para separarmos a apresentação certa." },
    { id: 7, nome: "Ração Premium Gatos Castrados Salmão", unidade: "10,1 kg", categoria: "gatos", preco: 139.90, custo: 104.00, estoque: 6, estoqueMin: 3, destaque: true, descricao: "Controle de peso e cuidado urinário para gatos castrados. Sabor salmão." },
    { id: 8, nome: "Ração Gatos Adultos Carne (a granel)", unidade: "1 kg", categoria: "gatos", preco: 17.90, custo: 11.00, estoque: 40, estoqueMin: 10, descricao: "Vendida por quilo — leve só o que precisa." },
    { id: 9, nome: "Sachê Gatos Sabores Variados", unidade: "85 g", categoria: "gatos", preco: 2.99, custo: 1.70, estoque: 120, estoqueMin: 30, descricao: "Carne, frango ou peixe ao molho. Escolha o sabor na conversa do WhatsApp." },
    { id: 10, nome: "Areia Higiênica Grãos Finos", unidade: "4 kg", categoria: "higiene", preco: 16.90, custo: 10.50, estoque: 30, estoqueMin: 8, descricao: "Alta absorção e controle de odores. Forma torrões firmes, fácil de limpar." },
    { id: 11, nome: "Mistura para Calopsita e Periquito", unidade: "500 g", categoria: "aves", preco: 12.90, custo: 7.80, estoque: 25, estoqueMin: 6, descricao: "Sementes selecionadas: painço, alpiste, aveia e girassol." },
    { id: 12, nome: "Alpiste Tratado", unidade: "1 kg", categoria: "aves", preco: 11.50, custo: 6.90, estoque: 30, estoqueMin: 8, descricao: "Grãos limpos e selecionados para canários e pássaros em geral." },
    { id: 13, nome: "Ração Galinha Poedeira", unidade: "20 kg", categoria: "aves", preco: 94.90, custo: 72.00, estoque: 10, estoqueMin: 3, descricao: "Mais postura e casca de ovo mais resistente." },
    { id: 14, nome: "Milho em Grão", unidade: "25 kg", categoria: "campo", preco: 69.90, custo: 52.00, estoque: 15, estoqueMin: 5, descricao: "Saca de milho inteiro, ideal para aves, suínos e criação em geral." },
    { id: 15, nome: "Ração para Equinos", unidade: "30 kg", categoria: "campo", preco: 119.90, custo: 90.00, estoque: 5, estoqueMin: 2, descricao: "Energia e manutenção para cavalos de lida e de passeio." },
    { id: 16, nome: "Sal Mineral para Bovinos", unidade: "25 kg", categoria: "campo", preco: 99.90, custo: 76.00, estoque: 2, estoqueMin: 3, descricao: "Suplemento mineral para gado de corte e de leite." },
    { id: 17, nome: "Farelo de Trigo", unidade: "20 kg", categoria: "campo", preco: 54.90, custo: 40.00, estoque: 8, estoqueMin: 3, descricao: "Complemento de fibras para bovinos, equinos e suínos." },
    { id: 18, nome: "Bifinho Sabor Carne", unidade: "500 g", categoria: "petiscos", preco: 24.90, precoAntigo: 29.90, custo: 16.00, estoque: 20, estoqueMin: 5, descricao: "Petisco macio para agradar e treinar o seu cão." },
    { id: 19, nome: "Osso Natural Defumado", unidade: "unidade", categoria: "petiscos", preco: 9.90, custo: 5.50, estoque: 35, estoqueMin: 10, descricao: "Diversão garantida e ajuda na limpeza dos dentes." },
    { id: 20, nome: "Casinha Plástica para Cães Nº 3", unidade: "porte médio", categoria: "acessorios", preco: 169.90, custo: 125.00, estoque: 4, estoqueMin: 2, descricao: "Resistente ao sol e à chuva, fácil de montar e de limpar." },
    { id: 21, nome: "Coleira Ajustável com Guia", unidade: "P / M / G", categoria: "acessorios", preco: 29.90, custo: 17.00, estoque: 14, estoqueMin: 4, descricao: "Nylon reforçado com fecho de segurança. Informe o tamanho no WhatsApp." },
    { id: 22, nome: "Comedouro Inox Antiderrapante", unidade: "900 ml", categoria: "acessorios", preco: 19.90, custo: 11.00, estoque: 18, estoqueMin: 5, descricao: "Base de borracha que não escorrega e não risca o chão." },
    { id: 23, nome: "Shampoo Neutro Pet", unidade: "500 ml", categoria: "higiene", preco: 18.90, custo: 10.90, estoque: 16, estoqueMin: 5, descricao: "Limpeza suave para cães e gatos, pH balanceado." },
    { id: 24, nome: "Tapete Higiênico", unidade: "30 unidades", categoria: "higiene", preco: 49.90, custo: 34.00, estoque: 3, estoqueMin: 4, descricao: "Super absorvente, com atrativo para ajudar no adestramento." },
    { id: 25, nome: "Terra Vegetal Adubada", unidade: "25 kg", categoria: "jardim", preco: 14.90, custo: 8.00, estoque: 30, estoqueMin: 8, descricao: "Pronta para vasos, canteiros e hortas." },
    { id: 26, nome: "Húmus de Minhoca", unidade: "5 kg", categoria: "jardim", preco: 17.90, custo: 10.00, estoque: 20, estoqueMin: 5, descricao: "Adubo orgânico que melhora o solo e fortalece as plantas." },
    { id: 27, nome: "Sementes de Hortaliças", unidade: "envelope", categoria: "jardim", preco: 4.50, custo: 2.20, estoque: 60, estoqueMin: 15, descricao: "Alface, rúcula, tomate, cenoura e mais. Consulte as variedades." },
].map((p) => ({ codigo: "", imagem: "", ativo: true, destaque: false, precoAntigo: null, levaQtd: null, levaPreco: null, ...p }));

// ─── CUPONS ──────────────────────────────────────────────────────────────────
const AGRO_CUPONS_PADRAO = [
    { codigo: "BEMVINDO10", tipo: "percentual", valor: 10, valorMinimo: 80, validade: "", ativo: true },
    { codigo: "CB5", tipo: "fixo", valor: 5, valorMinimo: 50, validade: "", ativo: true },
];

// ─── CATEGORIAS DO FINANCEIRO ────────────────────────────────────────────────
const AGRO_CATEGORIAS_ENTRADA = ["Venda no balcão", "Venda pelo WhatsApp", "Taxa de entrega", "Outras entradas"];
const AGRO_CATEGORIAS_SAIDA = ["Compra de mercadoria", "Aluguel", "Energia e água", "Funcionários", "Frete e combustível", "Impostos e taxas", "Manutenção", "Marketing", "Outras saídas"];

// ─── GERADOR DE HISTÓRICO DE EXEMPLO ─────────────────────────────────────────
// Cria ~2 meses de movimento (vendas, despesas e alguns pedidos) para o painel
// não abrir vazio na demonstração. Usa um sorteio com "semente" fixa, então o
// resultado é sempre parecido.
const agroGerarHistorico = (produtos) => {
    let semente = 20261003;
    const rand = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
    const escolhe = (arr) => arr[Math.floor(rand() * arr.length)];
    const iso = (d) => d.toISOString();
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    const lancamentos = [];
    let idLanc = 1;
    const formas = ["PIX", "PIX", "PIX", "Cartão de débito", "Cartão de crédito", "Dinheiro"];

    for (let diasAtras = 62; diasAtras >= 1; diasAtras--) {
        const dia = new Date(hoje);
        dia.setDate(hoje.getDate() - diasAtras);
        if (dia.getDay() === 0) continue; // domingo fechado
        const qtdVendas = 3 + Math.floor(rand() * 5);
        for (let v = 0; v < qtdVendas; v++) {
            const nItens = 1 + Math.floor(rand() * 3);
            const itens = [];
            for (let i = 0; i < nItens; i++) {
                const p = escolhe(produtos);
                const qtd = 1 + Math.floor(rand() * 2);
                itens.push({ id: p.id, nome: p.nome, qtd, preco: agroPrecoUnit(p, qtd), custo: p.custo });
            }
            const total = itens.reduce((a, it) => a + it.qtd * it.preco, 0);
            const d = new Date(dia);
            d.setHours(8 + Math.floor(rand() * 10), Math.floor(rand() * 60));
            lancamentos.push({
                id: idLanc++, tipo: "entrada", data: iso(d),
                categoria: rand() < 0.35 ? "Venda pelo WhatsApp" : "Venda no balcão",
                descricao: itens.map((it) => `${it.qtd}x ${it.nome}`).join(", "),
                valor: Math.round(total * 100) / 100, formaPagamento: escolhe(formas), itens,
            });
        }
        const d = new Date(dia);
        // Despesas recorrentes
        if (dia.getDate() === 5) {
            lancamentos.push({ id: idLanc++, tipo: "saida", data: iso(d), categoria: "Aluguel", descricao: "Aluguel do ponto", valor: 1800, formaPagamento: "PIX" });
            lancamentos.push({ id: idLanc++, tipo: "saida", data: iso(d), categoria: "Funcionários", descricao: "Salário atendente", valor: 1850, formaPagamento: "PIX" });
        }
        if (dia.getDate() === 10) {
            lancamentos.push({ id: idLanc++, tipo: "saida", data: iso(d), categoria: "Energia e água", descricao: "Conta de luz", valor: 286.4, formaPagamento: "PIX" });
            lancamentos.push({ id: idLanc++, tipo: "saida", data: iso(d), categoria: "Energia e água", descricao: "Conta de água", valor: 92.1, formaPagamento: "PIX" });
        }
        if (dia.getDate() === 20) {
            lancamentos.push({ id: idLanc++, tipo: "saida", data: iso(d), categoria: "Impostos e taxas", descricao: "DAS / MEI", valor: 76.9, formaPagamento: "PIX" });
        }
        if (dia.getDay() === 2) {
            lancamentos.push({ id: idLanc++, tipo: "saida", data: iso(d), categoria: "Compra de mercadoria", descricao: "Reposição de rações — fornecedor", valor: Math.round((1400 + rand() * 900) * 100) / 100, formaPagamento: "Boleto" });
        }
        if (dia.getDay() === 5) {
            lancamentos.push({ id: idLanc++, tipo: "saida", data: iso(d), categoria: "Frete e combustível", descricao: "Combustível entregas", valor: Math.round((110 + rand() * 60) * 100) / 100, formaPagamento: "Cartão de débito" });
        }
    }

    // Alguns pedidos recentes vindos do site, em status diferentes
    const agora = new Date();
    const menosHoras = (h) => { const d = new Date(agora); d.setHours(d.getHours() - h); return iso(d); };
    const itemPedido = (id, qtd) => {
        const p = produtos.find((x) => x.id === id);
        return { id: p.id, codigo: p.codigo || `#${p.id}`, nome: p.nome, unidade: p.unidade, qtd, preco: agroPrecoUnit(p, qtd) };
    };
    const montarPedido = (codigo, horas, status, cliente, telefone, itens, entrega, pagamento) => {
        const subtotal = itens.reduce((a, it) => a + it.qtd * it.preco, 0);
        const taxa = entrega.tipo === "entrega" ? (entrega.taxa || 0) : 0;
        return { codigo, data: menosHoras(horas), status, cliente, telefone, itens, subtotal, desconto: 0, taxaEntrega: taxa, total: subtotal + taxa, entrega, pagamento, origem: "site" };
    };
    const pedidos = [
        montarPedido("CB7K2M9Q", 1, "novo", "Mariana Souza", "(51) 99123-4567",
            [itemPedido(2, 2), itemPedido(18, 2)],
            { tipo: "entrega", bairro: "Jardim Betânia", rua: "Rua das Hortênsias", numero: "210", complemento: "Casa 2", referencia: "Portão verde", taxa: 5 },
            { forma: "PIX" }),
        montarPedido("CB3P8T4W", 3, "confirmado", "Carlos Henrique Lima", "(51) 98877-1122",
            [itemPedido(14, 2), itemPedido(13, 1)],
            { tipo: "entrega", bairro: "Granja Esperança", rua: "Av. Flores da Cunha", numero: "3050", complemento: "", referencia: "", taxa: 6 },
            { forma: "Dinheiro", troco: 250 }),
        montarPedido("CB9R5H2X", 5, "novo", "Patrícia Almeida", "(51) 99654-3210",
            [itemPedido(7, 1), itemPedido(10, 2), itemPedido(9, 6)],
            { tipo: "retirada", data: agora.toISOString().slice(0, 10), hora: "17:30" },
            { forma: "Cartão de crédito" }),
    ];

    return { lancamentos, pedidos };
};

// ─── MONTA O "BANCO" INICIAL ─────────────────────────────────────────────────
const agroDadosIniciais = () => {
    const produtos = AGRO_PRODUTOS_PADRAO.map((p) => ({ ...p }));
    const { lancamentos, pedidos } = agroGerarHistorico(produtos);
    return {
        versao: AGRO_VERSAO_DADOS,
        config: JSON.parse(JSON.stringify(AGRO_CONFIG_PADRAO)),
        categorias: AGRO_CATEGORIAS_PADRAO.map((c) => ({ ...c })),
        produtos,
        cupons: AGRO_CUPONS_PADRAO.map((c) => ({ ...c })),
        lancamentos,
        pedidos,
        movEstoque: [],
    };
};

// ─── CAMADA DE ARMAZENAMENTO ─────────────────────────────────────────────────
// Tudo é salvo no localStorage do navegador. Se o navegador bloquear o
// armazenamento (aba anônima, por exemplo), o site continua funcionando só na
// memória daquela aba.
const AgroDB = (() => {
    let memoria = null;
    const lerStorage = () => {
        try { return localStorage.getItem(AGRO_STORAGE_KEY); } catch (e) { return null; }
    };
    const gravarStorage = (texto) => {
        try { localStorage.setItem(AGRO_STORAGE_KEY, texto); return true; } catch (e) { return false; }
    };
    const completar = (d) => {
        // Garante que campos novos existam em dados salvos por versões anteriores
        d.config = { ...AGRO_CONFIG_PADRAO, ...(d.config || {}) };
        d.categorias = d.categorias || [];
        d.produtos = d.produtos || [];
        d.cupons = d.cupons || [];
        d.lancamentos = d.lancamentos || [];
        d.pedidos = d.pedidos || [];
        d.movEstoque = d.movEstoque || [];
        return d;
    };
    return {
        carregar() {
            const bruto = lerStorage();
            if (bruto) {
                try {
                    const d = JSON.parse(bruto);
                    if (d && d.versao === AGRO_VERSAO_DADOS) { memoria = completar(d); return memoria; }
                } catch (e) { /* dados corrompidos: recomeça */ }
            }
            if (memoria) return memoria;
            memoria = agroDadosIniciais();
            gravarStorage(JSON.stringify(memoria));
            return memoria;
        },
        salvar(dados) {
            memoria = dados;
            return gravarStorage(JSON.stringify(dados));
        },
        restaurarExemplo() {
            memoria = agroDadosIniciais();
            gravarStorage(JSON.stringify(memoria));
            return memoria;
        },
        importar(texto) {
            const d = JSON.parse(texto);
            if (!d || !Array.isArray(d.produtos) || !d.config) throw new Error("Arquivo de backup inválido.");
            d.versao = AGRO_VERSAO_DADOS;
            memoria = completar(d);
            gravarStorage(JSON.stringify(memoria));
            return memoria;
        },
        // Avisa quando outra aba (ex.: o painel) alterou os dados
        aoMudarEmOutraAba(callback) {
            window.addEventListener("storage", (e) => {
                if (e.key === AGRO_STORAGE_KEY) { memoria = null; callback(this.carregar()); }
            });
        },
    };
})();

// ─── UTILITÁRIOS COMPARTILHADOS ──────────────────────────────────────────────
const agroMoeda = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Preço por quantidade ("Ou leve 2 und. por 345,90, saindo cada und. por 172,95"):
// a partir de levaQtd unidades, cada unidade sai por levaPreco / levaQtd.
const agroTemCombo = (p) => Number(p.levaQtd) >= 2 && Number(p.levaPreco) > 0 && Number(p.levaPreco) / Number(p.levaQtd) < Number(p.preco);
const agroPrecoCombo = (p) => Math.round((Number(p.levaPreco) / Number(p.levaQtd)) * 100) / 100;
const agroPrecoUnit = (p, qtd) => (agroTemCombo(p) && Number(qtd) >= Number(p.levaQtd) ? agroPrecoCombo(p) : Number(p.preco));
const agroTotalItem = (p, qtd) => Math.round(agroPrecoUnit(p, qtd) * Number(qtd) * 100) / 100;
const agroCodigoProduto = (p) => p.codigo || `#${p.id}`;
const agroEscapar = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
