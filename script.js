// ─────────────────────────────────────────────────────────────────────────────
// AGROPET NOSSA CASA — VITRINE
// Os dados (produtos, categorias, configurações, cupons) vêm do dados.js,
// através do AgroDB. A sacolinha fica salva no navegador do cliente e o pedido
// é finalizado no WhatsApp da loja.
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);
    const esc = agroEscapar;
    const moeda = agroMoeda;

    // ─── ESTADO ──────────────────────────────────────────────────────────────
    let dados = AgroDB.carregar();
    let cfg = dados.config;
    let produtos = [];
    let categorias = [];
    const CHAVE_SACOLA = "agropet_sacolinha_v1";

    const estado = {
        categoria: "todas",
        busca: "",
        ordem: "destaque",
        sacola: [], // [{ id, qtd }]
        cupom: null,
        etapa: 1,
        etapaMax: 1,
        tipoEntrega: "entrega",
        pagamento: "PIX",
        detalheId: null,
        detalheQtd: 1,
    };

    const atualizarReferencias = () => {
        cfg = dados.config;
        produtos = dados.produtos.filter((p) => p.ativo !== false);
        categorias = dados.categorias;
    };
    atualizarReferencias();

    try {
        const salva = JSON.parse(localStorage.getItem(CHAVE_SACOLA) || "[]");
        if (Array.isArray(salva)) estado.sacola = salva.filter((i) => i && i.id && i.qtd > 0);
    } catch (e) { /* sem armazenamento: sacola só na memória */ }

    const salvarSacola = () => {
        try { localStorage.setItem(CHAVE_SACOLA, JSON.stringify(estado.sacola)); } catch (e) { /* ignora */ }
    };

    // ─── AUXILIARES ──────────────────────────────────────────────────────────
    const categoriaDe = (id) => categorias.find((c) => c.id === id) || { id, nome: "Outros", icone: "fa-paw", cor: "#2D2A7B" };
    const produtoPorId = (id) => produtos.find((p) => p.id === id);
    const temEstoqueControlado = (p) => p.estoque !== undefined && p.estoque !== null && p.estoque !== "";
    const esgotado = (p) => temEstoqueControlado(p) && Number(p.estoque) <= 0;
    const emOferta = (p) => p.precoAntigo && Number(p.precoAntigo) > Number(p.preco);
    const descontoPct = (p) => Math.round((1 - p.preco / p.precoAntigo) * 100);
    const linkWhats = (texto) => `https://wa.me/${cfg.whatsapp}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
    const qtdNaSacola = (id) => (estado.sacola.find((i) => i.id === id) || {}).qtd || 0;

    // Arte do produto no estilo das postagens (cor da categoria + patinhas +
    // logo no canto + selo de peso + estrela de oferta). Se o lojista cadastrou
    // uma foto, ela aparece no lugar do ícone.
    const arteProduto = (p) => {
        const cat = categoriaDe(p.categoria);
        const logo = cfg.logoUrl ? `<img class="arte-logo" src="${esc(cfg.logoUrl)}" alt="" loading="lazy">` : "";
        const unidade = p.unidade ? `<span class="arte-unidade">${esc(p.unidade)}</span>` : "";
        const estrela = emOferta(p) ? `<span class="estrela"><span>${descontoPct(p)}%<small>OFF</small></span></span>` : "";
        if (p.imagem) {
            return `<div class="arte arte--foto" style="--cor:${cat.cor}">
                <img class="arte-foto" src="${esc(p.imagem)}" alt="${esc(p.nome)}" loading="lazy">
                ${logo}${unidade}${estrela}</div>`;
        }
        return `<div class="arte" style="--cor:${cat.cor}">
            <span class="arte-nome">${esc(p.nome)}</span>
            <span class="arte-icone"><i class="fa-solid ${esc(cat.icone)}" aria-hidden="true"></i></span>
            ${logo}${unidade}${estrela}</div>`;
    };

    // ─── TOAST ───────────────────────────────────────────────────────────────
    let toastTimer = null;
    const toast = (msg, comBotao = true) => {
        const el = $("#toast");
        el.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>${msg}</span>${comBotao ? `<button type="button" id="toast-ver">Ver sacolinha</button>` : ""}`;
        el.classList.add("mostrar");
        const btn = $("#toast-ver");
        if (btn) btn.onclick = () => { el.classList.remove("mostrar"); abrirSacolinha(); };
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove("mostrar"), 2800);
    };

    // ─── CONFIGURAÇÕES DA LOJA ───────────────────────────────────────────────
    const aplicarConfig = () => {
        document.title = `${cfg.nomeLoja} · Catálogo`;
        $("#nome-loja").textContent = cfg.nomeLoja;
        $("#slogan-loja").textContent = cfg.slogan || "";
        if (cfg.logoUrl) { $("#logo-img").src = cfg.logoUrl; $("#loja-logo").src = cfg.logoUrl; }
        $("#aviso-topo").textContent = cfg.avisoTopo || "";
        $("#horario-topo").textContent = cfg.horarioTexto || "";
        $("#telefone-topo").textContent = cfg.telefoneExibicao || "";
        $("#hero-tag").textContent = cfg.heroTag || "";
        $("#hero-titulo").textContent = cfg.heroTitulo || "";
        $("#hero-sub").textContent = cfg.heroSubtitulo || "";
        $("#loja-endereco").textContent = cfg.endereco || "";
        $("#loja-horario").textContent = cfg.horarioTexto || "";
        $("#ret-endereco").textContent = cfg.endereco || "";
        $("#aviso-pagamento").textContent = cfg.avisoPagamento || "";

        const oi = `Olá! Vim pelo catálogo online da ${cfg.nomeLoja} e queria tirar uma dúvida.`;
        $("#whats-topo").href = linkWhats(oi);
        $("#whats-flutuante").href = linkWhats(oi);
        $("#loja-whats").href = linkWhats(oi);
        $("#loja-insta").href = `https://instagram.com/${(cfg.instagram || "").replace("@", "")}`;
        $("#loja-insta").hidden = !cfg.instagram;
        $("#loja-mapa").href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cfg.endereco || cfg.nomeLoja)}`;
        $("#rodape-copy").textContent = `© ${new Date().getFullYear()} ${cfg.nomeLoja} · ${cfg.endereco || ""}`;
        $("#credito-tf").href = `https://wa.me/${TF_SOLUTIONS_WHATSAPP}?text=${encodeURIComponent(`Olá! Vi o catálogo da ${cfg.nomeLoja} e quero um site assim.`)}`;

        // Entrega / retirada disponíveis
        const btnEnt = $('.opcao-entrega[data-tipo="entrega"]');
        const btnRet = $('.opcao-entrega[data-tipo="retirada"]');
        btnEnt.hidden = cfg.entregaDisponivel === false;
        btnRet.hidden = cfg.retiradaDisponivel === false;
        if (cfg.entregaDisponivel === false && estado.tipoEntrega === "entrega") estado.tipoEntrega = "retirada";
        if (cfg.retiradaDisponivel === false && estado.tipoEntrega === "retirada") estado.tipoEntrega = "entrega";

        // Bairros
        const selBairro = $("#ent-bairro");
        const atual = selBairro.value;
        selBairro.innerHTML = `<option value="">Selecione seu bairro</option>` + (cfg.bairros || [])
            .map((b, i) => `<option value="${i}">${esc(b.nome)}${b.taxa === 0 ? " — grátis" : b.taxa ? ` — ${moeda(b.taxa)}` : ""}</option>`).join("");
        if (atual && selBairro.querySelector(`option[value="${atual}"]`)) selBairro.value = atual;

        // Dias de retirada
        const nomesDias = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
        $("#ret-dias-info").textContent = `Retiradas: ${(cfg.retiradaDias || []).map((d) => nomesDias[d]).join(", ")} · ${cfg.retiradaHoraInicio} às ${cfg.retiradaHoraFim}`;
        const hoje = new Date();
        const hojeISO = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        $("#ret-data").min = hojeISO;

        renderPagamentos();
        aplicarTipoEntrega();
    };

    // ─── CATEGORIAS ──────────────────────────────────────────────────────────
    const renderCategorias = () => {
        const chip = (id, nome, icone, cor) => `
            <button type="button" class="chip${estado.categoria === id ? " ativo" : ""}" data-cat="${esc(id)}" style="--cor:${cor}">
                <span class="chip-icone"><i class="fa-solid ${esc(icone)}"></i></span>${esc(nome)}
            </button>`;
        const usadas = categorias.filter((c) => produtos.some((p) => p.categoria === c.id));
        $("#categorias-bar").innerHTML = chip("todas", "Todos", "fa-paw", "#2D2A7B")
            + (produtos.some(emOferta) ? chip("ofertas", "Ofertas", "fa-bolt", "#D62828") : "")
            + usadas.map((c) => chip(c.id, c.nome, c.icone, c.cor)).join("");
    };

    // ─── HERO: OFERTA DA SEMANA ──────────────────────────────────────────────
    const renderHeroDestaque = () => {
        const candidatos = produtos.filter((p) => !esgotado(p));
        const p = candidatos.find((x) => x.destaque && emOferta(x)) || candidatos.find(emOferta) || candidatos.find((x) => x.destaque) || candidatos[0];
        const box = $("#hero-destaque");
        if (!p) { box.innerHTML = ""; return; }
        box.innerHTML = `
            <span class="post-destaque-rotulo">Oferta da semana</span>
            <article class="post-destaque" data-abrir="${p.id}" tabindex="0" role="button" aria-label="Ver ${esc(p.nome)}">
                ${arteProduto(p)}
                <div class="post-destaque-info">
                    <div><h3>${esc(p.nome)}</h3><small>${esc(p.unidade || "")}</small></div>
                    <div style="text-align:right">
                        ${emOferta(p) ? `<div class="preco-antigo">${moeda(p.precoAntigo)}</div>` : ""}
                        <div class="preco">${moeda(p.preco)}</div>
                    </div>
                </div>
            </article>`;
    };

    // ─── CARDS ───────────────────────────────────────────────────────────────
    const cardProduto = (p, indice = 0) => {
        const cat = categoriaDe(p.categoria);
        const qtd = qtdNaSacola(p.id);
        const sem = esgotado(p);
        const poucas = temEstoqueControlado(p) && !sem && Number(p.estoque) <= 3;
        let acao;
        if (sem) acao = `<span class="tag-esgotado">Esgotado</span>`;
        else if (qtd > 0) acao = `<div class="qtd-seletor"><button type="button" data-menos="${p.id}" aria-label="Diminuir">−</button><span>${qtd}</span><button type="button" data-mais="${p.id}" aria-label="Aumentar">+</button></div>`;
        else acao = `<button type="button" class="btn btn-vermelho" data-add="${p.id}"><i class="fa-solid fa-bag-shopping"></i> Adicionar</button>`;
        return `
            <article class="card${sem ? " card--esgotado" : ""}" style="animation-delay:${Math.min(indice, 12) * 30}ms">
                <button type="button" class="card-arte" data-abrir="${p.id}" aria-label="Ver detalhes de ${esc(p.nome)}" style="position:relative">
                    ${arteProduto(p)}
                </button>
                <div class="card-info">
                    <div class="card-topo"><span class="card-cat" style="color:${cat.cor}">${esc(cat.nome)}</span>${p.destaque ? `<span class="card-selo-destaque">★ Destaque</span>` : ""}</div>
                    <h3 class="card-nome" data-abrir="${p.id}">${esc(p.nome)}</h3>
                    <span class="card-unidade">${esc(p.unidade || "")}</span>
                    <div class="card-precos">
                        <span class="preco">${moeda(p.preco)}</span>
                        ${emOferta(p) ? `<span class="preco-antigo">${moeda(p.precoAntigo)}</span>` : ""}
                    </div>
                    ${poucas ? `<span class="card-estoque"><i class="fa-solid fa-fire"></i> Últimas ${p.estoque} unidades</span>` : ""}
                    <div class="card-acao">${acao}</div>
                </div>
            </article>`;
    };

    const renderOfertas = () => {
        const ofertas = produtos.filter((p) => emOferta(p) && !esgotado(p));
        $("#ofertas").hidden = ofertas.length === 0;
        $("#carrossel-ofertas").innerHTML = ofertas.map(cardProduto).join("");
    };

    const renderProdutos = () => {
        let lista = [...produtos];
        if (estado.categoria === "ofertas") lista = lista.filter(emOferta);
        else if (estado.categoria !== "todas") lista = lista.filter((p) => p.categoria === estado.categoria);

        const termo = estado.busca.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        if (termo) {
            lista = lista.filter((p) => {
                const alvo = `${p.nome} ${p.descricao || ""} ${p.unidade || ""} ${categoriaDe(p.categoria).nome}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
                return termo.split(/\s+/).every((t) => alvo.includes(t));
            });
        }

        const esg = (p) => (esgotado(p) ? 1 : 0);
        const ordens = {
            destaque: (a, b) => esg(a) - esg(b) || (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0) || (emOferta(b) ? 1 : 0) - (emOferta(a) ? 1 : 0),
            menor: (a, b) => esg(a) - esg(b) || a.preco - b.preco,
            maior: (a, b) => esg(a) - esg(b) || b.preco - a.preco,
            ofertas: (a, b) => esg(a) - esg(b) || (emOferta(b) ? descontoPct(b) : 0) - (emOferta(a) ? descontoPct(a) : 0),
            nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
        };
        lista.sort(ordens[estado.ordem] || ordens.destaque);

        const titulo = estado.categoria === "todas" ? "Todos os produtos" : estado.categoria === "ofertas" ? "Ofertas" : categoriaDe(estado.categoria).nome;
        $("#titulo-lista").textContent = estado.busca.trim() ? `Resultados para “${estado.busca.trim()}”` : titulo;
        $("#contador-produtos").textContent = `${lista.length} ${lista.length === 1 ? "produto" : "produtos"}`;

        $("#grade-produtos").innerHTML = lista.length
            ? lista.map(cardProduto).join("")
            : `<div class="vazio"><i class="fa-solid fa-paw"></i><strong>Não encontramos esse produto</strong><p>Tente outra palavra ou fale com a gente no WhatsApp — podemos encomendar pra você!</p></div>`;
    };

    const renderTudo = () => {
        renderCategorias();
        renderHeroDestaque();
        renderOfertas();
        renderProdutos();
        renderSacola();
    };

    // ─── SACOLINHA: ITENS ────────────────────────────────────────────────────
    const itensSacola = () => estado.sacola
        .map((i) => ({ ...i, produto: produtoPorId(i.id) }))
        .filter((i) => i.produto);

    const calcular = () => {
        const itens = itensSacola();
        const subtotal = itens.reduce((a, i) => a + i.qtd * i.produto.preco, 0);
        let desconto = 0;
        if (estado.cupom) {
            if (estado.cupom.valorMinimo && subtotal < estado.cupom.valorMinimo) {
                estado.cupom = null;
                const msg = $("#cupom-msg");
                msg.textContent = "Cupom removido: o pedido ficou abaixo do valor mínimo.";
                msg.className = "cupom-msg erro";
            } else {
                desconto = estado.cupom.tipo === "fixo" ? Math.min(estado.cupom.valor, subtotal) : subtotal * (estado.cupom.valor / 100);
            }
        }
        let taxa = 0, taxaTexto = "";
        if (estado.tipoEntrega === "entrega") {
            const idx = $("#ent-bairro").value;
            const bairro = idx !== "" ? (cfg.bairros || [])[Number(idx)] : null;
            const gratisPorValor = cfg.freteGratisAcima && subtotal - desconto >= cfg.freteGratisAcima;
            if (!bairro) taxaTexto = "Escolha o bairro";
            else if (bairro.taxa === null || bairro.taxa === undefined || bairro.taxa === "") taxaTexto = gratisPorValor ? "Grátis" : "A combinar";
            else if (bairro.taxa === 0 || gratisPorValor) taxaTexto = "Grátis";
            else { taxa = Number(bairro.taxa); taxaTexto = moeda(taxa); }
        } else {
            taxaTexto = "Retirada na loja";
        }
        const total = Math.max(0, subtotal - desconto) + taxa;
        const qtdItens = itens.reduce((a, i) => a + i.qtd, 0);
        return { itens, subtotal, desconto, taxa, taxaTexto, total, qtdItens };
    };

    const renderSacola = () => {
        const c = calcular();
        const lista = $("#lista-itens");
        if (!c.itens.length) {
            lista.innerHTML = `<div class="sacola-vazia"><i class="fa-solid fa-bag-shopping"></i><strong>Sua sacolinha está vazia</strong><p>Que tal começar pelas ofertas da semana?</p><button type="button" class="btn btn-vermelho" id="btn-ir-ofertas"><i class="fa-solid fa-bolt"></i> Ver ofertas</button></div>`;
            $("#btn-ir-ofertas").onclick = () => { fecharSacolinha(); document.getElementById(produtos.some(emOferta) ? "ofertas" : "produtos").scrollIntoView(); };
        } else {
            lista.innerHTML = c.itens.map(({ produto: p, qtd }) => `
                <div class="item">
                    ${arteProduto(p)}
                    <div class="item-info">
                        <p class="item-nome">${esc(p.nome)}</p>
                        <p class="item-unidade">${esc(p.unidade || "")} · ${moeda(p.preco)} cada</p>
                        <div class="item-rodape">
                            <div class="qtd-seletor"><button type="button" data-menos="${p.id}" aria-label="Diminuir">−</button><span>${qtd}</span><button type="button" data-mais="${p.id}" aria-label="Aumentar">+</button></div>
                            <strong class="item-preco">${moeda(p.preco * qtd)}</strong>
                        </div>
                    </div>
                    <button type="button" class="item-remover" data-remover="${p.id}" aria-label="Remover ${esc(p.nome)}"><i class="fa-solid fa-xmark"></i></button>
                </div>`).join("");
        }

        // Totais
        $("#t-subtotal").textContent = moeda(c.subtotal);
        $("#t-desconto-linha").hidden = c.desconto <= 0;
        $("#t-desconto").textContent = `- ${moeda(c.desconto)}${estado.cupom ? ` (${estado.cupom.codigo})` : ""}`;
        $("#t-entrega-linha").hidden = estado.etapa < 2;
        $("#t-entrega").textContent = c.taxaTexto;
        $("#t-total").textContent = moeda(c.total);

        // Header, badge e barra inferior
        const badge = $("#badge-sacolinha");
        if (badge.textContent !== String(c.qtdItens)) {
            badge.textContent = c.qtdItens;
            badge.classList.remove("pulo"); void badge.offsetWidth; badge.classList.add("pulo");
        }
        $("#total-header").textContent = moeda(c.total);
        $("#barra-qtd").textContent = `${c.qtdItens} ${c.qtdItens === 1 ? "item" : "itens"} na sacolinha`;
        $("#barra-total").textContent = moeda(c.total);
        $("#barra-sacolinha").classList.toggle("mostrar", c.qtdItens > 0 && !$("#sacolinha").classList.contains("aberta"));
        document.body.classList.toggle("tem-itens", c.qtdItens > 0);
        $("#btn-avancar").disabled = estado.etapa === 1 && c.itens.length === 0;

        // Informações de frete
        const infoFrete = $("#frete-gratis-info");
        if (estado.tipoEntrega === "entrega" && cfg.freteGratisAcima) {
            const falta = cfg.freteGratisAcima - (c.subtotal - c.desconto);
            infoFrete.innerHTML = falta > 0
                ? `<i class="fa-solid fa-truck"></i><span>Faltam <strong>${moeda(falta)}</strong> para ganhar frete grátis em qualquer bairro atendido.</span>`
                : `<i class="fa-solid fa-gift"></i><span>Oba! Seu pedido ganhou <strong>frete grátis</strong>.</span>`;
        } else infoFrete.innerHTML = "";
        const taxaInfo = $("#ent-taxa-info");
        taxaInfo.textContent = $("#ent-bairro").value !== "" ? `Taxa de entrega: ${c.taxaTexto}` : "";
        taxaInfo.className = `campo-ajuda${c.taxaTexto === "Grátis" ? " ok" : ""}`;
        return c;
    };

    const alterarQtd = (id, delta, origemCard = false) => {
        const p = produtoPorId(id);
        if (!p) return;
        const item = estado.sacola.find((i) => i.id === id);
        const atual = item ? item.qtd : 0;
        const nova = atual + delta;
        if (delta > 0 && temEstoqueControlado(p) && nova > Number(p.estoque)) {
            toast(`Temos só ${p.estoque} ${Number(p.estoque) === 1 ? "unidade" : "unidades"} de ${esc(p.nome)} no momento.`, false);
            return;
        }
        if (nova <= 0) estado.sacola = estado.sacola.filter((i) => i.id !== id);
        else if (item) item.qtd = nova;
        else estado.sacola.push({ id, qtd: nova });
        salvarSacola();
        renderSacola();
        renderProdutos();
        renderOfertas();
        if (delta > 0 && atual === 0 && origemCard) toast(`${esc(p.nome)} na sacolinha!`);
    };

    // ─── CUPOM ───────────────────────────────────────────────────────────────
    const aplicarCupom = () => {
        const codigo = $("#cupom-input").value.trim().toUpperCase();
        const msg = $("#cupom-msg");
        if (!codigo) return;
        const c = (dados.cupons || []).find((x) => (x.codigo || "").toUpperCase() === codigo);
        const subtotal = calcular().subtotal;
        let erro = "";
        if (!c) erro = "Cupom não encontrado.";
        else if (c.ativo === false) erro = "Este cupom não está mais ativo.";
        else if (c.validade && new Date(`${c.validade}T23:59:59`) < new Date()) erro = "Este cupom expirou.";
        else if (c.valorMinimo && subtotal < c.valorMinimo) erro = `Válido para pedidos a partir de ${moeda(c.valorMinimo)}.`;
        if (erro) { estado.cupom = null; msg.textContent = erro; msg.className = "cupom-msg erro"; }
        else {
            estado.cupom = c;
            msg.textContent = `Cupom ${c.codigo} aplicado: ${c.tipo === "fixo" ? moeda(c.valor) : `${c.valor}%`} de desconto!`;
            msg.className = "cupom-msg ok";
        }
        renderSacola();
    };

    // ─── ENTREGA / RETIRADA ──────────────────────────────────────────────────
    const aplicarTipoEntrega = () => {
        $$(".opcao-entrega").forEach((b) => {
            const ativo = b.dataset.tipo === estado.tipoEntrega;
            b.classList.toggle("ativa", ativo);
            b.setAttribute("aria-checked", ativo);
        });
        $("#form-entrega").hidden = estado.tipoEntrega !== "entrega";
        $("#form-retirada").hidden = estado.tipoEntrega !== "retirada";
    };

    const montarHorarios = () => {
        const sel = $("#ret-hora");
        const dataStr = $("#ret-data").value;
        const [hI, mI] = (cfg.retiradaHoraInicio || "08:00").split(":").map(Number);
        const [hF, mF] = (cfg.retiradaHoraFim || "18:00").split(":").map(Number);
        const passo = Number(cfg.retiradaIntervalo) || 30;
        const agora = new Date();
        const ehHoje = dataStr && dataStr === new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        const minAgora = agora.getHours() * 60 + agora.getMinutes() + 30; // 30 min pra separar o pedido
        const anterior = sel.value;
        let html = `<option value="">Selecione</option>`;
        let algum = false;
        for (let m = hI * 60 + mI; m <= hF * 60 + mF; m += passo) {
            if (ehHoje && m < minAgora) continue;
            const hh = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
            html += `<option value="${hh}">${hh}</option>`;
            algum = true;
        }
        if (!algum) html = `<option value="">Sem horários neste dia</option>`;
        sel.innerHTML = html;
        if (anterior && sel.querySelector(`option[value="${anterior}"]`)) sel.value = anterior;
    };

    // ─── PAGAMENTO ───────────────────────────────────────────────────────────
    const ICONES_PAG = { "PIX": "fa-brands fa-pix", "Cartão de crédito": "fa-regular fa-credit-card", "Cartão de débito": "fa-solid fa-credit-card", "Dinheiro": "fa-solid fa-money-bill-wave" };
    const renderPagamentos = () => {
        const formas = cfg.formasPagamento && cfg.formasPagamento.length ? cfg.formasPagamento : ["PIX"];
        if (!formas.includes(estado.pagamento)) estado.pagamento = formas[0];
        $("#opcoes-pagamento").innerHTML = formas.map((f) => `
            <button type="button" class="opcao-pag${f === estado.pagamento ? " ativa" : ""}" data-pag="${esc(f)}">
                <i class="${ICONES_PAG[f] || "fa-solid fa-wallet"}"></i>${esc(f)}
            </button>`).join("");
        $("#troco-campo").hidden = estado.pagamento !== "Dinheiro";
    };

    // ─── VALIDAÇÃO POR ETAPA ─────────────────────────────────────────────────
    const marcarErro = (el, erro) => { el.classList.toggle("erro", erro); return !erro; };
    const validarEtapa = (n) => {
        const c = calcular();
        if (n === 1) {
            if (!c.itens.length) { toast("Adicione pelo menos um produto.", false); return false; }
            return true;
        }
        if (n === 2) {
            if (estado.tipoEntrega === "entrega") {
                const ok = [
                    marcarErro($("#ent-bairro"), $("#ent-bairro").value === ""),
                    marcarErro($("#ent-rua"), $("#ent-rua").value.trim().length < 3),
                    marcarErro($("#ent-numero"), $("#ent-numero").value.trim() === ""),
                ].every(Boolean);
                if (!ok) { toast("Preencha bairro, rua e número.", false); return false; }
                if (cfg.pedidoMinimoEntrega && c.subtotal - c.desconto < cfg.pedidoMinimoEntrega) {
                    toast(`Pedido mínimo para entrega: ${moeda(cfg.pedidoMinimoEntrega)}. Você pode escolher retirada.`, false);
                    return false;
                }
                return true;
            }
            const dataEl = $("#ret-data"), horaEl = $("#ret-hora");
            let ok = marcarErro(dataEl, !dataEl.value) & marcarErro(horaEl, !horaEl.value);
            if (dataEl.value) {
                const [a, m, d] = dataEl.value.split("-").map(Number);
                const dia = new Date(a, m - 1, d).getDay();
                if (!(cfg.retiradaDias || []).includes(dia)) {
                    marcarErro(dataEl, true);
                    toast("A loja não faz retiradas neste dia da semana. Escolha outra data.", false);
                    return false;
                }
            }
            if (!ok) { toast("Escolha o dia e o horário da retirada.", false); return false; }
            return true;
        }
        if (n === 4) {
            const nome = $("#cli-nome"), tel = $("#cli-telefone");
            const ok = [
                marcarErro(nome, nome.value.trim().split(/\s+/).filter(Boolean).length < 2),
                marcarErro(tel, tel.value.replace(/\D/g, "").length < 10),
            ].every(Boolean);
            if (!ok) toast("Informe nome e sobrenome e um WhatsApp válido.", false);
            return ok;
        }
        return true;
    };

    // ─── RESUMO ──────────────────────────────────────────────────────────────
    const dataBR = (iso) => { const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; };
    const descricaoEntrega = () => {
        if (estado.tipoEntrega === "entrega") {
            const b = (cfg.bairros || [])[Number($("#ent-bairro").value)] || {};
            const comp = $("#ent-complemento").value.trim(), ref = $("#ent-referencia").value.trim();
            return {
                titulo: "Entrega",
                linhas: [`${$("#ent-rua").value.trim()}, nº ${$("#ent-numero").value.trim()}${comp ? ` — ${comp}` : ""}`, `Bairro: ${b.nome || ""}`, ref ? `Referência: ${ref}` : ""].filter(Boolean),
            };
        }
        return { titulo: "Retirada na loja", linhas: [`${dataBR($("#ret-data").value)} às ${$("#ret-hora").value}`, cfg.endereco || ""] };
    };
    const descricaoPagamento = () => {
        let t = estado.pagamento;
        if (estado.pagamento === "Dinheiro") {
            const troco = Number($("#troco-input").value);
            t += troco ? ` — troco para ${moeda(troco)}` : " — não precisa de troco";
        }
        return t;
    };

    const renderResumo = () => {
        const c = calcular();
        const ent = descricaoEntrega();
        const obs = $("#obs-input").value.trim();
        $("#resumo").innerHTML = `
            <div class="resumo-bloco">
                <h5>Itens (${c.qtdItens}) <button type="button" data-ir="1">Alterar</button></h5>
                <ul>${c.itens.map(({ produto: p, qtd }) => `<li><span>${qtd}x ${esc(p.nome)} <small style="color:var(--muted)">${esc(p.unidade || "")}</small></span><span>${moeda(p.preco * qtd)}</span></li>`).join("")}</ul>
            </div>
            <div class="resumo-bloco">
                <h5>${ent.titulo} <button type="button" data-ir="2">Alterar</button></h5>
                ${ent.linhas.map((l) => `<p>${esc(l)}</p>`).join("")}
                ${estado.tipoEntrega === "entrega" ? `<p>Taxa: ${c.taxaTexto}</p>` : ""}
            </div>
            <div class="resumo-bloco">
                <h5>Pagamento <button type="button" data-ir="3">Alterar</button></h5>
                <p>${esc(descricaoPagamento())}</p>
                ${estado.cupom ? `<p>Cupom: ${esc(estado.cupom.codigo)} (- ${moeda(c.desconto)})</p>` : ""}
                ${obs ? `<p>Obs.: ${esc(obs)}</p>` : ""}
            </div>
            <div class="resumo-bloco">
                <h5>Seus dados <button type="button" data-ir="4">Alterar</button></h5>
                <p>${esc($("#cli-nome").value.trim())}</p>
                <p>${esc($("#cli-telefone").value.trim())}</p>
            </div>
            <div class="aviso aviso--whats"><i class="fa-brands fa-whatsapp"></i><p>Ao tocar em <strong>Finalizar no WhatsApp</strong>, abrimos a conversa com a loja com todo o pedido escrito. É só enviar!</p></div>`;
    };

    // ─── NAVEGAÇÃO ENTRE ETAPAS ──────────────────────────────────────────────
    const irParaEtapa = (n) => {
        estado.etapa = n;
        if (typeof n === "number" && n > estado.etapaMax) estado.etapaMax = n;
        $$(".etapa").forEach((s) => { s.hidden = s.dataset.etapa !== String(n); });
        const sucesso = n === "ok";
        $("#etapas").hidden = sucesso;
        $("#sacolinha-rodape").hidden = sucesso;
        $$("#etapas li").forEach((li) => {
            const e = Number(li.dataset.etapa);
            li.classList.toggle("ativa", e === n);
            li.classList.toggle("feita", e !== n && e <= estado.etapaMax);
        });
        $("#btn-voltar").hidden = n === 1;
        $("#btn-avancar").hidden = n === 5;
        $("#btn-finalizar").hidden = n !== 5;
        if (n === 2) montarHorarios();
        if (n === 5) renderResumo();
        renderSacola();
        $("#sacolinha-corpo").scrollTop = 0;
    };

    const abrirSacolinha = () => {
        $("#toast").classList.remove("mostrar");
        $("#sacolinha").classList.add("aberta");
        $("#sacolinha").setAttribute("aria-hidden", "false");
        $("#fundo-sacolinha").classList.add("mostrar");
        document.body.classList.add("travado");
        renderSacola();
    };
    const fecharSacolinha = () => {
        $("#sacolinha").classList.remove("aberta");
        $("#sacolinha").setAttribute("aria-hidden", "true");
        $("#fundo-sacolinha").classList.remove("mostrar");
        document.body.classList.remove("travado");
        if (estado.etapa === "ok") novoPedido(false);
        renderSacola();
    };

    // ─── FINALIZAR NO WHATSAPP ───────────────────────────────────────────────
    const gerarCodigo = () => {
        const L = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let s = "AG";
        for (let i = 0; i < 6; i++) s += L[Math.floor(Math.random() * L.length)];
        return s;
    };

    const montarMensagem = (codigo, c) => {
        const ent = descricaoEntrega();
        const obs = $("#obs-input").value.trim();
        const linhas = [
            `🛒 *NOVO PEDIDO — ${cfg.nomeLoja}*`,
            `Pedido: *#${codigo}*`,
            "",
            "*Itens:*",
            ...c.itens.map(({ produto: p, qtd }) => `• ${qtd}x ${p.nome}${p.unidade ? ` (${p.unidade})` : ""} — ${moeda(p.preco * qtd)} [${agroCodigoProduto(p)}]`),
            "",
            `Subtotal: ${moeda(c.subtotal)}`,
        ];
        if (c.desconto > 0) linhas.push(`Desconto (${estado.cupom.codigo}): - ${moeda(c.desconto)}`);
        if (estado.tipoEntrega === "entrega") linhas.push(`Entrega: ${c.taxaTexto}`);
        linhas.push(`*Total: ${moeda(c.total)}*`, "");
        linhas.push(estado.tipoEntrega === "entrega" ? "🚚 *Entrega*" : "🏪 *Retirada na loja*");
        linhas.push(...ent.linhas.filter((l) => l !== cfg.endereco));
        linhas.push("", `💰 *Pagamento:* ${descricaoPagamento()}`);
        if (estado.pagamento === "PIX") linhas.push("_Aguardo a chave PIX para pagar._");
        if (obs) linhas.push("", `📝 *Obs.:* ${obs}`);
        linhas.push("", `👤 *Cliente:* ${$("#cli-nome").value.trim()}`, `📱 ${$("#cli-telefone").value.trim()}`);
        return linhas.join("\n");
    };

    const finalizar = () => {
        for (const n of [1, 2, 4]) {
            if (!validarEtapa(n)) { irParaEtapa(n); return; }
        }
        const c = calcular();
        const codigo = gerarCodigo();
        const mensagem = montarMensagem(codigo, c);
        const url = linkWhats(mensagem);

        // Registra o pedido (aparece no painel da loja, aba Pedidos)
        try {
            const atual = AgroDB.carregar();
            const bairro = (cfg.bairros || [])[Number($("#ent-bairro").value)] || {};
            atual.pedidos.unshift({
                codigo,
                data: new Date().toISOString(),
                status: "novo",
                origem: "site",
                cliente: $("#cli-nome").value.trim(),
                telefone: $("#cli-telefone").value.trim(),
                itens: c.itens.map(({ produto: p, qtd }) => ({ id: p.id, codigo: agroCodigoProduto(p), nome: p.nome, unidade: p.unidade, qtd, preco: p.preco })),
                subtotal: c.subtotal, desconto: c.desconto, cupom: estado.cupom ? estado.cupom.codigo : "",
                taxaEntrega: c.taxa, total: c.total,
                entrega: estado.tipoEntrega === "entrega"
                    ? { tipo: "entrega", bairro: bairro.nome || "", rua: $("#ent-rua").value.trim(), numero: $("#ent-numero").value.trim(), complemento: $("#ent-complemento").value.trim(), referencia: $("#ent-referencia").value.trim(), taxa: c.taxa, taxaTexto: c.taxaTexto }
                    : { tipo: "retirada", data: $("#ret-data").value, hora: $("#ret-hora").value },
                pagamento: { forma: estado.pagamento, troco: estado.pagamento === "Dinheiro" ? Number($("#troco-input").value) || 0 : 0 },
                obs: $("#obs-input").value.trim(),
            });
            AgroDB.salvar(atual);
            dados = atual;
        } catch (e) { /* o pedido segue pelo WhatsApp mesmo assim */ }

        // Guarda os dados do cliente para a próxima compra
        try {
            localStorage.setItem("agropet_cliente_v1", JSON.stringify({
                nome: $("#cli-nome").value.trim(), telefone: $("#cli-telefone").value.trim(),
                rua: $("#ent-rua").value.trim(), numero: $("#ent-numero").value.trim(), complemento: $("#ent-complemento").value.trim(),
                referencia: $("#ent-referencia").value.trim(), bairro: $("#ent-bairro").value,
            }));
        } catch (e) { /* ignora */ }

        $("#sucesso-codigo").textContent = `#${codigo}`;
        $("#sucesso-whats").href = url;
        irParaEtapa("ok");

        // Encaminha o cliente para o WhatsApp da loja
        const janela = window.open(url, "_blank");
        if (!janela) window.location.href = url;
    };

    const novoPedido = (fechar = true) => {
        estado.sacola = [];
        estado.cupom = null;
        estado.etapaMax = 1;
        $("#cupom-input").value = "";
        $("#cupom-msg").textContent = "";
        $("#obs-input").value = "";
        $("#troco-input").value = "";
        salvarSacola();
        irParaEtapa(1);
        renderProdutos();
        renderOfertas();
        if (fechar) fecharSacolinha();
    };

    // ─── DETALHE DO PRODUTO ──────────────────────────────────────────────────
    const abrirDetalhe = (id) => {
        const p = produtoPorId(id);
        if (!p) return;
        const cat = categoriaDe(p.categoria);
        estado.detalheId = id;
        estado.detalheQtd = 1;
        $("#det-arte").innerHTML = arteProduto(p);
        $("#det-cat").textContent = cat.nome;
        $("#det-cat").style.color = cat.cor;
        $("#det-nome").textContent = p.nome;
        $("#det-unidade").textContent = p.unidade || "";
        $("#det-unidade").hidden = !p.unidade;
        $("#det-desc").textContent = p.descricao || "";
        const est = $("#det-estoque");
        if (!temEstoqueControlado(p)) est.textContent = "";
        else if (esgotado(p)) { est.textContent = "Esgotado no momento — chame no WhatsApp para encomendar."; est.className = "det-estoque baixo"; }
        else if (Number(p.estoque) <= 3) { est.innerHTML = `<i class="fa-solid fa-fire"></i> Últimas ${p.estoque} unidades`; est.className = "det-estoque baixo"; }
        else { est.innerHTML = `<i class="fa-solid fa-circle-check"></i> Disponível para entrega`; est.className = "det-estoque"; }
        $("#det-preco").innerHTML = `<span class="preco">${moeda(p.preco)}</span>${emOferta(p) ? `<span class="preco-antigo">${moeda(p.precoAntigo)}</span>` : ""}`;
        $("#det-qtd").textContent = "1";
        $("#det-adicionar").disabled = esgotado(p);
        $("#det-codigo").textContent = `Código: ${agroCodigoProduto(p)}`;
        $("#modal-detalhe").hidden = false;
        $("#fundo-detalhe").classList.add("mostrar");
        document.body.classList.add("travado");
        $("#det-adicionar").focus({ preventScroll: true });
    };
    const fecharDetalhe = () => {
        $("#modal-detalhe").hidden = true;
        $("#fundo-detalhe").classList.remove("mostrar");
        if (!$("#sacolinha").classList.contains("aberta")) document.body.classList.remove("travado");
        estado.detalheId = null;
    };

    // ─── MÁSCARA DE TELEFONE ─────────────────────────────────────────────────
    $("#cli-telefone").addEventListener("input", (e) => {
        const d = e.target.value.replace(/\D/g, "").slice(0, 11);
        let v = d;
        if (d.length > 2) v = `(${d.slice(0, 2)}) ${d.slice(2)}`;
        if (d.length > 7) v = `(${d.slice(0, 2)}) ${d.slice(2, d.length === 11 ? 7 : 6)}-${d.slice(d.length === 11 ? 7 : 6)}`;
        e.target.value = v;
    });

    // ─── EVENTOS ─────────────────────────────────────────────────────────────
    // Cliques nos produtos (grade, carrossel, hero e sacolinha) — delegados
    document.addEventListener("click", (e) => {
        const add = e.target.closest("[data-add]");
        const mais = e.target.closest("[data-mais]");
        const menos = e.target.closest("[data-menos]");
        const remover = e.target.closest("[data-remover]");
        const abrir = e.target.closest("[data-abrir]");
        const ir = e.target.closest("[data-ir]");
        if (add) return alterarQtd(Number(add.dataset.add), 1, true);
        if (mais) return alterarQtd(Number(mais.dataset.mais), 1);
        if (menos) return alterarQtd(Number(menos.dataset.menos), -1);
        if (remover) { estado.sacola = estado.sacola.filter((i) => i.id !== Number(remover.dataset.remover)); salvarSacola(); renderSacola(); renderProdutos(); renderOfertas(); return; }
        if (ir) return irParaEtapa(Number(ir.dataset.ir));
        if (abrir) return abrirDetalhe(Number(abrir.dataset.abrir));
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (!$("#modal-detalhe").hidden) fecharDetalhe();
            else if ($("#sacolinha").classList.contains("aberta")) fecharSacolinha();
        }
        if ((e.key === "Enter" || e.key === " ") && e.target.matches(".post-destaque")) { e.preventDefault(); abrirDetalhe(Number(e.target.dataset.abrir)); }
    });

    $("#categorias-bar").addEventListener("click", (e) => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        estado.categoria = chip.dataset.cat;
        renderCategorias();
        renderProdutos();
        document.getElementById("produtos").scrollIntoView({ behavior: "smooth" });
    });

    let buscaTimer = null;
    $("#busca-input").addEventListener("input", (e) => {
        clearTimeout(buscaTimer);
        buscaTimer = setTimeout(() => {
            estado.busca = e.target.value;
            renderProdutos();
        }, 120);
    });
    $("#busca-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") document.getElementById("produtos").scrollIntoView({ behavior: "smooth" });
    });
    $("#ordenar-select").addEventListener("change", (e) => { estado.ordem = e.target.value; renderProdutos(); });

    $$(".carrossel-setas .seta").forEach((b) => b.addEventListener("click", () => {
        const car = $("#carrossel-ofertas");
        car.scrollBy({ left: Number(b.dataset.dir) * car.clientWidth * 0.8, behavior: "smooth" });
    }));

    $("#btn-abrir-sacolinha").addEventListener("click", abrirSacolinha);
    $("#barra-abrir").addEventListener("click", abrirSacolinha);
    $("#btn-fechar-sacolinha").addEventListener("click", fecharSacolinha);
    $("#fundo-sacolinha").addEventListener("click", fecharSacolinha);

    $("#cupom-btn").addEventListener("click", aplicarCupom);
    $("#cupom-input").addEventListener("keydown", (e) => { if (e.key === "Enter") aplicarCupom(); });

    $$(".opcao-entrega").forEach((b) => b.addEventListener("click", () => {
        estado.tipoEntrega = b.dataset.tipo;
        aplicarTipoEntrega();
        renderSacola();
    }));
    $("#ent-bairro").addEventListener("change", (e) => { e.target.classList.remove("erro"); renderSacola(); });
    $("#ret-data").addEventListener("change", () => { $("#ret-data").classList.remove("erro"); montarHorarios(); });
    ["#ent-rua", "#ent-numero", "#cli-nome", "#cli-telefone", "#ret-hora"].forEach((s) =>
        $(s).addEventListener("input", (e) => e.target.classList.remove("erro")));

    $("#opcoes-pagamento").addEventListener("click", (e) => {
        const b = e.target.closest(".opcao-pag");
        if (!b) return;
        estado.pagamento = b.dataset.pag;
        renderPagamentos();
    });

    $("#btn-avancar").addEventListener("click", () => {
        if (!validarEtapa(estado.etapa)) return;
        if (estado.etapa < 5) irParaEtapa(estado.etapa + 1);
    });
    $("#btn-voltar").addEventListener("click", () => { if (estado.etapa > 1) irParaEtapa(estado.etapa - 1); });
    $("#etapas").addEventListener("click", (e) => {
        const li = e.target.closest("li");
        if (!li) return;
        const n = Number(li.dataset.etapa);
        if (n <= estado.etapaMax) irParaEtapa(n);
    });
    $("#btn-finalizar").addEventListener("click", finalizar);
    $("#btn-novo-pedido").addEventListener("click", () => novoPedido(true));

    $("#btn-fechar-detalhe").addEventListener("click", fecharDetalhe);
    $("#fundo-detalhe").addEventListener("click", fecharDetalhe);
    $("#det-mais").addEventListener("click", () => {
        const p = produtoPorId(estado.detalheId);
        const limite = p && temEstoqueControlado(p) ? Number(p.estoque) - qtdNaSacola(p.id) : 99;
        if (estado.detalheQtd < limite) estado.detalheQtd++;
        else toast("Essa é a quantidade disponível no estoque.", false);
        $("#det-qtd").textContent = estado.detalheQtd;
    });
    $("#det-menos").addEventListener("click", () => {
        if (estado.detalheQtd > 1) estado.detalheQtd--;
        $("#det-qtd").textContent = estado.detalheQtd;
    });
    $("#det-adicionar").addEventListener("click", () => {
        const id = estado.detalheId;
        const qtd = estado.detalheQtd;
        const p = produtoPorId(id);
        if (!p) return;
        if (temEstoqueControlado(p) && qtdNaSacola(id) + qtd > Number(p.estoque)) {
            toast(`Temos só ${p.estoque} unidades de ${esc(p.nome)}.`, false);
            return;
        }
        const item = estado.sacola.find((i) => i.id === id);
        if (item) item.qtd += qtd; else estado.sacola.push({ id, qtd });
        salvarSacola();
        fecharDetalhe();
        renderSacola(); renderProdutos(); renderOfertas();
        toast(`${qtd}x ${esc(p.nome)} na sacolinha!`);
    });

    // Preenche dados de um pedido anterior (conveniência para o cliente)
    try {
        const cli = JSON.parse(localStorage.getItem("agropet_cliente_v1") || "null");
        if (cli) {
            $("#cli-nome").value = cli.nome || "";
            $("#cli-telefone").value = cli.telefone || "";
            $("#ent-rua").value = cli.rua || "";
            $("#ent-numero").value = cli.numero || "";
            $("#ent-complemento").value = cli.complemento || "";
            $("#ent-referencia").value = cli.referencia || "";
            estado.bairroSalvo = cli.bairro;
        }
    } catch (e) { /* ignora */ }

    // Se o painel mudar preços/estoque em outra aba, a vitrine atualiza sozinha
    AgroDB.aoMudarEmOutraAba((novo) => {
        dados = novo;
        atualizarReferencias();
        aplicarConfig();
        renderTudo();
    });

    // Altura real do cabeçalho (muda no celular) para a barra de categorias grudar logo abaixo
    const medirHeader = () => document.documentElement.style.setProperty("--altura-header", `${$(".header").offsetHeight}px`);
    window.addEventListener("resize", medirHeader);

    // ─── INICIALIZAÇÃO ───────────────────────────────────────────────────────
    aplicarConfig();
    medirHeader();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirHeader);
    if (estado.bairroSalvo && $(`#ent-bairro option[value="${estado.bairroSalvo}"]`)) $("#ent-bairro").value = estado.bairroSalvo;
    renderTudo();
    irParaEtapa(1);
});
