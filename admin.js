// ─────────────────────────────────────────────────────────────────────────────
// AGROPECUÁRIA CB — PAINEL DO LOJISTA
// Painel, pedidos, venda no balcão, produtos/estoque, entradas e saídas,
// cupons e configurações. Os dados ficam no AgroDB (ver dados.js).
// ─────────────────────────────────────────────────────────────────────────────

(() => {
    const $ = (s, el = document) => el.querySelector(s);
    const $$ = (s, el = document) => [...el.querySelectorAll(s)];
    const esc = agroEscapar;
    const moeda = agroMoeda;
    const pad = (n) => String(n).padStart(2, "0");

    let D = AgroDB.carregar();
    const salvar = () => {
        if (!AgroDB.salvar(D)) toast("Não foi possível salvar neste navegador (armazenamento cheio ou bloqueado).", true);
        atualizarBadges();
    };

    // ─── DATAS ───────────────────────────────────────────────────────────────
    const chaveDia = (d) => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
    const hojeChave = () => chaveDia(new Date());
    const fmtData = (d) => { const x = new Date(d); return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()}`; };
    const fmtDataHora = (d) => { const x = new Date(d); return `${pad(x.getDate())}/${pad(x.getMonth() + 1)} ${pad(x.getHours())}:${pad(x.getMinutes())}`; };
    const isoDeChave = (k) => { const [a, m, d] = k.split("-").map(Number); return new Date(a, m - 1, d, 12, 0).toISOString(); };
    const NOMES_MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const moedaCurta = (v) => Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v)}`;
    const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : 0; };

    // Lista de dias (chaves) entre duas datas
    const diasEntre = (ini, fim) => {
        const out = []; const d = new Date(ini); d.setHours(12, 0, 0, 0);
        const f = new Date(fim); f.setHours(12, 0, 0, 0);
        while (d <= f) { out.push(chaveDia(d)); d.setDate(d.getDate() + 1); }
        return out;
    };

    // ─── TOAST / MODAL / CONFIRMAÇÃO ─────────────────────────────────────────
    let toastT = null;
    const toast = (msg, erro = false) => {
        const t = $("#toast");
        t.className = `toast mostrar${erro ? " toast--erro" : ""}`;
        t.innerHTML = `<i class="fa-solid ${erro ? "fa-circle-exclamation" : "fa-circle-check"}"></i><span>${msg}</span>`;
        clearTimeout(toastT);
        toastT = setTimeout(() => t.classList.remove("mostrar"), 3000);
    };

    const abrirModal = ({ titulo, corpo, rodape = "", largura = 620, aoAbrir }) => {
        $("#modal-titulo").innerHTML = titulo;
        $("#modal-corpo").innerHTML = corpo;
        $("#modal-rodape").innerHTML = rodape;
        $(".modal").style.width = `min(${largura}px, 100%)`;
        $("#modal-fundo").hidden = false;
        if (aoAbrir) aoAbrir($("#modal-corpo"));
        const primeiro = $("#modal-corpo input:not([type=hidden]):not([type=checkbox]), #modal-corpo select, #modal-corpo textarea");
        if (primeiro) setTimeout(() => primeiro.focus(), 50);
    };
    const fecharModal = () => { $("#modal-fundo").hidden = true; $("#modal-corpo").innerHTML = ""; };
    $("#modal-fechar").addEventListener("click", fecharModal);
    $("#modal-fundo").addEventListener("mousedown", (e) => { if (e.target.id === "modal-fundo") fecharModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal-fundo").hidden) fecharModal(); });

    const confirmar = (mensagem, textoBotao, aoConfirmar, perigo = true) => {
        abrirModal({
            titulo: "Confirmar",
            corpo: `<p style="font-weight:700">${mensagem}</p>`,
            rodape: `<button type="button" class="btn btn-fantasma" data-fechar>Cancelar</button><button type="button" class="btn ${perigo ? "btn-perigo" : "btn-primario"}" id="btn-confirmar">${textoBotao}</button>`,
            largura: 440,
        });
        $("#btn-confirmar").onclick = () => { fecharModal(); aoConfirmar(); };
    };
    document.addEventListener("click", (e) => { if (e.target.closest("[data-fechar]")) fecharModal(); });

    // ─── LOGIN ───────────────────────────────────────────────────────────────
    const CHAVE_SESSAO = "cb_admin_sessao";
    // A dica da senha de demonstração só aparece enquanto a senha não foi trocada
    $("#login-dica").hidden = (D.config.senhaAdmin || AGRO_SENHA_PADRAO) !== AGRO_SENHA_PADRAO;
    $("#login-dica-senha").textContent = AGRO_SENHA_PADRAO;
    const entrar = () => {
        $("#tela-login").hidden = true;
        $("#app").hidden = false;
        aplicarMarca();
        irPara(location.hash.replace("#", "") || "painel");
    };
    $("#form-login").addEventListener("submit", (e) => {
        e.preventDefault();
        const senha = $("#login-senha").value;
        if (senha === (D.config.senhaAdmin || AGRO_SENHA_PADRAO)) {
            try { sessionStorage.setItem(CHAVE_SESSAO, "1"); } catch (err) { /* ignora */ }
            entrar();
        } else {
            $("#login-erro").textContent = "Senha incorreta.";
            $("#login-senha").classList.add("erro");
        }
    });
    $("#btn-sair").addEventListener("click", () => {
        try { sessionStorage.removeItem(CHAVE_SESSAO); } catch (err) { /* ignora */ }
        location.hash = "";
        location.reload();
    });

    const aplicarMarca = () => {
        $("#lateral-nome").textContent = D.config.nomeLoja;
        if (D.config.logoUrl) { $("#lateral-logo").src = D.config.logoUrl; $("#login-logo").src = D.config.logoUrl; }
        document.title = `Painel · ${D.config.nomeLoja}`;
    };

    // ─── NAVEGAÇÃO ───────────────────────────────────────────────────────────
    let abaAtual = "painel";
    const RENDER = {};
    const irPara = (aba) => {
        if (!RENDER[aba]) aba = "painel";
        abaAtual = aba;
        $$(".aba").forEach((s) => { s.hidden = s.id !== `aba-${aba}`; });
        $$("#menu button").forEach((b) => b.classList.toggle("ativo", b.dataset.aba === aba));
        history.replaceState(null, "", `#${aba}`);
        RENDER[aba]();
        atualizarBadges();
        window.scrollTo(0, 0);
    };
    $("#menu").addEventListener("click", (e) => { const b = e.target.closest("button[data-aba]"); if (b) irPara(b.dataset.aba); });
    document.addEventListener("click", (e) => { const b = e.target.closest("[data-ir]"); if (b) irPara(b.dataset.ir); });

    // ─── AUXILIARES DE NEGÓCIO ───────────────────────────────────────────────
    const categoriaDe = (id) => D.categorias.find((c) => c.id === id) || { id, nome: "Sem categoria", icone: "fa-paw", cor: "#6B6880" };
    const produtoPorId = (id) => D.produtos.find((p) => p.id === Number(id));
    const controlaEstoque = (p) => p.estoque !== undefined && p.estoque !== null && p.estoque !== "";
    const estoqueBaixo = (p) => controlaEstoque(p) && Number(p.estoque) > 0 && Number(p.estoque) <= Number(p.estoqueMin || 0);
    const estoqueZerado = (p) => controlaEstoque(p) && Number(p.estoque) <= 0;
    const proximoId = (lista) => lista.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
    const iconeProduto = (p) => {
        const c = categoriaDe(p.categoria);
        return `<span class="pdv-prod-icone" style="background:${c.cor}">${p.imagem ? `<img src="${esc(p.imagem)}" alt="">` : `<i class="fa-solid ${esc(c.icone)}"></i>`}</span>`;
    };

    const movimentarEstoque = (itens, sinal, motivo) => {
        itens.forEach((it) => {
            const p = produtoPorId(it.id);
            if (!p || !controlaEstoque(p)) return;
            p.estoque = Math.max(0, Number(p.estoque) + sinal * Number(it.qtd));
            D.movEstoque.unshift({ data: new Date().toISOString(), produtoId: p.id, qtd: sinal * it.qtd, motivo });
        });
        D.movEstoque = D.movEstoque.slice(0, 500);
    };

    const lancar = (dados) => {
        const l = { id: proximoId(D.lancamentos), data: new Date().toISOString(), ...dados };
        D.lancamentos.push(l);
        return l;
    };

    const atualizarBadges = () => {
        const novos = D.pedidos.filter((p) => p.status === "novo").length;
        const b1 = $("#badge-pedidos"); b1.hidden = !novos; b1.textContent = novos;
        const baixos = D.produtos.filter((p) => p.ativo !== false && (estoqueBaixo(p) || estoqueZerado(p))).length;
        const b2 = $("#badge-estoque"); b2.hidden = !baixos; b2.textContent = baixos;
    };

    // ═════════════════════════════════════════════════════════════════════════
    // PAINEL
    // ═════════════════════════════════════════════════════════════════════════
    let periodoPainel = "mes";
    const intervaloPeriodo = (p) => {
        const hoje = new Date();
        if (p === "hoje") return { ini: hoje, fim: hoje, texto: `Hoje, ${fmtData(hoje)}` };
        if (p === "7") { const i = new Date(); i.setDate(i.getDate() - 6); return { ini: i, fim: hoje, texto: "Últimos 7 dias" }; }
        if (p === "mesant") {
            const i = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
            const f = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
            return { ini: i, fim: f, texto: `${NOMES_MES[i.getMonth()]} de ${i.getFullYear()}` };
        }
        const i = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        return { ini: i, fim: hoje, texto: `${NOMES_MES[i.getMonth()]} de ${i.getFullYear()} (até hoje)` };
    };
    const lancNoIntervalo = (ini, fim) => {
        const a = chaveDia(ini), b = chaveDia(fim);
        return D.lancamentos.filter((l) => { const k = chaveDia(l.data); return k >= a && k <= b; });
    };

    const kpi = (classe, icone, rotulo, valor, sub) => `
        <div class="kpi ${classe}">
            <div class="kpi-rotulo"><i class="fa-solid ${icone}"></i>${rotulo}</div>
            <div class="kpi-valor">${valor}</div>
            ${sub ? `<div class="kpi-sub">${sub}</div>` : ""}
        </div>`;

    const barrasH = (pares, cor) => {
        if (!pares.length) return `<p class="vazio-mini">Nada lançado no período.</p>`;
        const max = Math.max(...pares.map((p) => p[1]));
        return pares.map(([nome, v]) => `
            <div class="barra-h">
                <div class="barra-h-topo"><span>${esc(nome)}</span><span>${moeda(v)}</span></div>
                <div class="barra-h-trilho"><span style="width:${Math.max(2, (v / max) * 100)}%;background:${cor}"></span></div>
            </div>`).join("");
    };
    const agrupar = (lista, chave) => {
        const m = new Map();
        lista.forEach((l) => m.set(l[chave] || "Outros", (m.get(l[chave] || "Outros") || 0) + Number(l.valor)));
        return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };

    // Gráfico de barras agrupadas (entradas × saídas por dia), em SVG
    const desenharGrafico = (el, dias, entradas, saidas) => {
        const W = Math.max(300, el.clientWidth || 600), H = 240;
        const m = { t: 10, r: 8, b: 26, l: 58 };
        const iw = W - m.l - m.r, ih = H - m.t - m.b;
        const max = Math.max(100, ...entradas, ...saidas);
        const passo = Math.pow(10, Math.floor(Math.log10(max / 4)));
        const tick = [1, 2, 2.5, 5, 10].map((f) => f * passo).find((t) => max / t <= 5) || passo * 10;
        const topo = Math.ceil(max / tick) * tick;
        const y = (v) => m.t + ih - (v / topo) * ih;
        const bw = iw / dias.length;
        const barra = Math.max(2, Math.min(18, (bw - 6) / 2));
        let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Entradas e saídas por dia">`;
        for (let v = 0; v <= topo; v += tick) {
            svg += `<line class="grade-linha" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="eixo" x="${m.l - 8}" y="${y(v) + 3}" text-anchor="end">${moedaCurta(v)}</text>`;
        }
        const retangulo = (x, v, cor) => {
            if (v <= 0) return "";
            const h = Math.max(2, (v / topo) * ih), yy = m.t + ih - h, r = Math.min(4, h / 2, barra / 2);
            return `<path d="M${x},${m.t + ih} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + barra - r} Q${x + barra},${yy} ${x + barra},${yy + r} V${m.t + ih} Z" fill="${cor}"/>`;
        };
        const cadaRotulo = Math.ceil(dias.length / Math.max(1, Math.floor(iw / 44)));
        dias.forEach((d, i) => {
            const cx = m.l + bw * i + bw / 2;
            svg += retangulo(cx - barra - 1, entradas[i], "var(--cor-entrada)");
            svg += retangulo(cx + 1, saidas[i], "var(--cor-saida)");
            if (i % cadaRotulo === 0) svg += `<text class="eixo" x="${cx}" y="${H - 8}" text-anchor="middle">${d.slice(8, 10)}/${d.slice(5, 7)}</text>`;
            svg += `<rect class="alvo" data-i="${i}" x="${m.l + bw * i}" y="${m.t}" width="${bw}" height="${ih}"/>`;
        });
        svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${m.t + ih}" y2="${m.t + ih}" stroke="#C9C5B8"/></svg><div class="grafico-dica" hidden></div>`;
        el.innerHTML = svg;
        const dica = $(".grafico-dica", el);
        $$(".alvo", el).forEach((r) => {
            r.addEventListener("mouseenter", () => {
                const i = Number(r.dataset.i);
                const saldo = entradas[i] - saidas[i];
                dica.innerHTML = `<b>${fmtData(isoDeChave(dias[i]))}</b><span class="leg leg--entrada"></span> Entradas: ${moeda(entradas[i])}<br><span class="leg leg--saida"></span> Saídas: ${moeda(saidas[i])}<br>Saldo do dia: ${saldo < 0 ? "−" : "+"} ${moeda(Math.abs(saldo))}`;
                const box = el.getBoundingClientRect(), rb = r.getBoundingClientRect();
                dica.style.left = `${Math.min(Math.max(rb.left - box.left + rb.width / 2, 90), box.width - 90)}px`;
                dica.style.top = `${Math.max(56, y(Math.max(entradas[i], saidas[i])) * (box.height / H)) - 6}px`;
                dica.hidden = false;
            });
            r.addEventListener("mouseleave", () => { dica.hidden = true; });
        });
    };

    RENDER.painel = () => {
        const { ini, fim, texto } = intervaloPeriodo(periodoPainel);
        $("#painel-periodo-texto").textContent = texto;
        $$("#painel-periodo button").forEach((b) => b.classList.toggle("ativo", b.dataset.p === periodoPainel));
        const lanc = lancNoIntervalo(ini, fim);
        const entradas = lanc.filter((l) => l.tipo === "entrada");
        const saidas = lanc.filter((l) => l.tipo === "saida");
        const totE = entradas.reduce((a, l) => a + Number(l.valor), 0);
        const totS = saidas.reduce((a, l) => a + Number(l.valor), 0);
        const vendas = entradas.filter((l) => /^Venda/.test(l.categoria));
        const totVendas = vendas.reduce((a, l) => a + Number(l.valor), 0);
        const custoVendido = vendas.reduce((a, l) => a + (l.itens || []).reduce((s, it) => s + (Number(it.custo) || 0) * it.qtd, 0), 0);
        const saldo = totE - totS;

        $("#painel-kpis").innerHTML =
            kpi("kpi--entrada", "fa-arrow-down", "Entradas", moeda(totE), `${entradas.length} lançamentos`) +
            kpi("kpi--saida", "fa-arrow-up", "Saídas", moeda(totS), `${saidas.length} lançamentos`) +
            kpi(`kpi--saldo${saldo < 0 ? " kpi--negativo" : ""}`, "fa-scale-balanced", "Saldo do período", `${saldo < 0 ? "− " : ""}${moeda(Math.abs(saldo))}`, saldo >= 0 ? "Entrou mais do que saiu" : "Saiu mais do que entrou") +
            kpi("", "fa-bag-shopping", "Vendas", String(vendas.length), vendas.length ? `Ticket médio ${moeda(totVendas / vendas.length)}` : "Nenhuma venda") +
            kpi("", "fa-sack-dollar", "Lucro nas vendas", moeda(totVendas - custoVendido), totVendas ? `Margem de ${Math.round(((totVendas - custoVendido) / totVendas) * 100)}% sobre as vendas` : "—");

        const dias = diasEntre(ini, fim);
        const porDia = (lista) => dias.map((d) => lista.filter((l) => chaveDia(l.data) === d).reduce((a, l) => a + Number(l.valor), 0));
        desenharGrafico($("#painel-grafico"), dias, porDia(entradas), porDia(saidas));

        const aguardando = D.pedidos.filter((p) => ["novo", "pago", "enviado"].includes(p.status)).slice(0, 5);
        $("#painel-pedidos").innerHTML = aguardando.length
            ? `<ul class="lista-simples">${aguardando.map((p) => `<li><div>#${esc(p.codigo)} · ${esc(p.cliente)}<small>${fmtDataHora(p.data)} · ${p.entrega.tipo === "entrega" ? "Entrega" : "Retirada"}</small></div><div style="text-align:right">${pillStatus(p.status)}<div class="valor">${moeda(p.total)}</div></div></li>`).join("")}</ul>`
            : `<p class="vazio-mini"><i class="fa-solid fa-circle-check"></i> Nenhum pedido aguardando.</p>`;

        const baixos = D.produtos.filter((p) => p.ativo !== false && (estoqueBaixo(p) || estoqueZerado(p))).sort((a, b) => a.estoque - b.estoque);
        $("#painel-estoque").innerHTML = baixos.length
            ? `<ul class="lista-simples">${baixos.slice(0, 6).map((p) => `<li><div>${esc(p.nome)}<small>${esc(p.unidade || "")} · mínimo ${p.estoqueMin || 0}</small></div><div style="display:flex;gap:8px;align-items:center">${estoqueZerado(p) ? `<span class="pill pill--zerado">Esgotado</span>` : `<span class="pill pill--baixo">${p.estoque} un.</span>`}<button type="button" class="btn btn-fantasma btn-sm" data-repor="${p.id}">Repor</button></div></li>`).join("")}</ul>`
            : `<p class="vazio-mini"><i class="fa-solid fa-circle-check"></i> Estoque em dia.</p>`;

        const cont = new Map();
        vendas.forEach((l) => (l.itens || []).forEach((it) => {
            const c = cont.get(it.nome) || { qtd: 0, valor: 0 };
            c.qtd += it.qtd; c.valor += it.qtd * it.preco; cont.set(it.nome, c);
        }));
        const top = [...cont.entries()].sort((a, b) => b[1].valor - a[1].valor).slice(0, 5);
        $("#painel-top").innerHTML = top.length
            ? `<ul class="lista-simples">${top.map(([n, c], i) => `<li><div>${i + 1}. ${esc(n)}<small>${c.qtd} unidades vendidas</small></div><span class="valor">${moeda(c.valor)}</span></li>`).join("")}</ul>`
            : `<p class="vazio-mini">Nenhuma venda no período.</p>`;

        $("#painel-despesas").innerHTML = barrasH(agrupar(saidas, "categoria").slice(0, 6), "var(--cor-saida)");
    };
    $("#painel-periodo").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; periodoPainel = b.dataset.p; RENDER.painel(); });
    let resizeT = null;
    window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (abaAtual === "painel") RENDER.painel(); }, 200); });

    // ═════════════════════════════════════════════════════════════════════════
    // PEDIDOS
    // ═════════════════════════════════════════════════════════════════════════
    const STATUS = {
        novo: { nome: "Novo", icone: "fa-bell" },
        pago: { nome: "Pago", icone: "fa-circle-dollar-to-slot" },
        enviado: { nome: "Saiu / Pronto", icone: "fa-truck-fast" },
        concluido: { nome: "Concluído", icone: "fa-circle-check" },
        cancelado: { nome: "Cancelado", icone: "fa-ban" },
    };
    const pillStatus = (s) => `<span class="pill pill--${s}"><i class="fa-solid ${STATUS[s]?.icone || "fa-circle"}"></i> ${STATUS[s]?.nome || s}</span>`;
    let filtroPedidos = "abertos";

    const confirmarPagamento = (p) => {
        if (p.lancamentoId) return;
        const itens = p.itens.map((it) => {
            const prod = produtoPorId(it.id);
            return { ...it, custo: prod ? prod.custo : 0 };
        });
        const l = lancar({
            tipo: "entrada", categoria: "Venda pelo WhatsApp",
            descricao: `Pedido #${p.codigo} — ${p.cliente}`,
            valor: Math.round(Number(p.total) * 100) / 100,
            formaPagamento: p.pagamento?.forma || "PIX", itens, pedidoCodigo: p.codigo,
        });
        p.lancamentoId = l.id;
        movimentarEstoque(p.itens, -1, `Pedido #${p.codigo}`);
    };
    const desfazerPagamento = (p) => {
        if (!p.lancamentoId) return;
        D.lancamentos = D.lancamentos.filter((l) => l.id !== p.lancamentoId);
        movimentarEstoque(p.itens, +1, `Cancelamento #${p.codigo}`);
        p.lancamentoId = null;
    };
    const mudarStatus = (codigo, novo) => {
        const p = D.pedidos.find((x) => x.codigo === codigo);
        if (!p) return;
        if (novo === "cancelado") desfazerPagamento(p);
        else if (["pago", "enviado", "concluido"].includes(novo)) confirmarPagamento(p);
        else if (novo === "novo") desfazerPagamento(p);
        p.status = novo;
        salvar();
        toast(novo === "pago" ? `Pagamento do pedido #${codigo} lançado no caixa e estoque baixado.` : `Pedido #${codigo}: ${STATUS[novo].nome}.`);
        RENDER.pedidos();
    };

    const linkWhatsCliente = (p, texto) => {
        let tel = String(p.telefone || "").replace(/\D/g, "");
        if (tel.length <= 11) tel = `55${tel}`;
        return `https://wa.me/${tel}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
    };
    const descricaoEntrega = (e) => e.tipo === "entrega"
        ? `${esc(e.rua || "")}${e.numero ? `, nº ${esc(e.numero)}` : ""}${e.complemento ? ` — ${esc(e.complemento)}` : ""} · ${esc(e.bairro || "")}`
        : `Retirada ${e.data ? fmtData(isoDeChave(e.data)) : ""} ${e.hora ? `às ${esc(e.hora)}` : ""}`;

    RENDER.pedidos = () => {
        const cont = (f) => D.pedidos.filter(f).length;
        const filtros = [
            ["abertos", "Em aberto", (p) => ["novo", "pago", "enviado"].includes(p.status)],
            ["novo", "Novos", (p) => p.status === "novo"],
            ["pago", "Pagos", (p) => p.status === "pago"],
            ["enviado", "Saiu / Pronto", (p) => p.status === "enviado"],
            ["concluido", "Concluídos", (p) => p.status === "concluido"],
            ["cancelado", "Cancelados", (p) => p.status === "cancelado"],
            ["todos", "Todos", () => true],
        ];
        $("#pedidos-filtro").innerHTML = filtros.map(([k, n, f]) => `<button type="button" data-f="${k}" class="${filtroPedidos === k ? "ativo" : ""}">${n}<em>${cont(f)}</em></button>`).join("");
        const f = filtros.find((x) => x[0] === filtroPedidos)[2];
        const lista = D.pedidos.filter(f).sort((a, b) => new Date(b.data) - new Date(a.data));
        $("#lista-pedidos").innerHTML = lista.length ? lista.map((p) => {
            const proximo = { novo: ["pago", "fa-circle-dollar-to-slot", "Confirmar pagamento"], pago: ["enviado", "fa-truck-fast", p.entrega.tipo === "entrega" ? "Saiu para entrega" : "Pronto p/ retirada"], enviado: ["concluido", "fa-circle-check", "Concluir"] }[p.status];
            return `
            <article class="pedido${p.status === "novo" ? " pedido--novo" : ""}">
                <div class="pedido-topo">
                    <div><div class="pedido-codigo">#${esc(p.codigo)}</div><div class="pedido-data">${fmtDataHora(p.data)} · ${p.origem === "whatsapp" ? "colado do WhatsApp" : "pelo catálogo"}</div></div>
                    ${pillStatus(p.status)}
                </div>
                <div class="pedido-cliente">${esc(p.cliente)}</div>
                <div class="pedido-linha"><i class="fa-solid ${p.entrega.tipo === "entrega" ? "fa-truck" : "fa-store"}"></i>${descricaoEntrega(p.entrega)}</div>
                <div class="pedido-linha"><i class="fa-solid fa-wallet"></i>${esc(p.pagamento?.forma || "")}${p.pagamento?.troco ? ` · troco p/ ${moeda(p.pagamento.troco)}` : ""}</div>
                <div class="pedido-itens">${p.itens.map((it) => `${it.qtd}x ${esc(it.nome)}`).join("<br>")}</div>
                <div class="pedido-rodape">
                    <span class="pedido-total">${moeda(p.total)}</span>
                    <div class="pedido-acoes">
                        <a class="icone-btn" href="${linkWhatsCliente(p, `Olá, ${p.cliente.split(" ")[0]}! Aqui é da ${D.config.nomeLoja}, sobre o seu pedido #${p.codigo}.`)}" target="_blank" rel="noopener" title="Chamar cliente no WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
                        <button type="button" class="icone-btn" data-ped-ver="${esc(p.codigo)}" title="Ver detalhes"><i class="fa-solid fa-eye"></i></button>
                        ${proximo ? `<button type="button" class="btn btn-primario btn-sm" data-ped-status="${esc(p.codigo)}" data-novo="${proximo[0]}"><i class="fa-solid ${proximo[1]}"></i> ${proximo[2]}</button>` : ""}
                    </div>
                </div>
            </article>`;
        }).join("") : `<div class="painel-card"><p class="vazio-mini"><i class="fa-solid fa-inbox"></i> Nenhum pedido neste filtro.</p></div>`;
    };
    $("#pedidos-filtro").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; filtroPedidos = b.dataset.f; RENDER.pedidos(); });
    $("#lista-pedidos").addEventListener("click", (e) => {
        const st = e.target.closest("[data-ped-status]");
        if (st) return mudarStatus(st.dataset.pedStatus, st.dataset.novo);
        const ver = e.target.closest("[data-ped-ver]");
        if (ver) verPedido(ver.dataset.pedVer);
    });

    const verPedido = (codigo) => {
        const p = D.pedidos.find((x) => x.codigo === codigo);
        if (!p) return;
        const e = p.entrega;
        abrirModal({
            titulo: `Pedido #${esc(p.codigo)} ${pillStatus(p.status)}`,
            corpo: `
                <div class="detalhe-grupo"><h4>Cliente</h4>${esc(p.cliente)}<br>${esc(p.telefone || "")}</div>
                <div class="detalhe-grupo"><h4>Itens</h4>
                    <ul class="lista-simples">${p.itens.map((it) => `<li><span>${it.qtd}x ${esc(it.nome)} <small>${esc(it.unidade || "")} · ${esc(it.codigo || "")}</small></span><span class="valor">${moeda(it.qtd * it.preco)}</span></li>`).join("")}</ul>
                    <ul class="lista-simples">
                        <li><span>Subtotal</span><span class="valor">${moeda(p.subtotal)}</span></li>
                        ${p.desconto ? `<li><span>Desconto ${esc(p.cupom || "")}</span><span class="valor">− ${moeda(p.desconto)}</span></li>` : ""}
                        ${e.tipo === "entrega" ? `<li><span>Entrega</span><span class="valor">${p.taxaEntrega ? moeda(p.taxaEntrega) : esc(e.taxaTexto || "Grátis")}</span></li>` : ""}
                        <li><strong>Total</strong><strong class="valor">${moeda(p.total)}</strong></li>
                    </ul>
                </div>
                <div class="detalhe-grupo"><h4>${e.tipo === "entrega" ? "Entrega" : "Retirada"}</h4>${descricaoEntrega(e)}${e.referencia ? `<br>Referência: ${esc(e.referencia)}` : ""}</div>
                <div class="detalhe-grupo"><h4>Pagamento</h4>${esc(p.pagamento?.forma || "")}${p.pagamento?.troco ? ` · troco para ${moeda(p.pagamento.troco)}` : ""}${p.obs ? `<br>Obs.: ${esc(p.obs)}` : ""}</div>
                <label class="campo"><span>Alterar status</span>
                    <select id="ped-status-sel">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === p.status ? "selected" : ""}>${v.nome}</option>`).join("")}</select>
                    <span class="campo-ajuda">Pago, Saiu/Pronto e Concluído lançam a venda no caixa e baixam o estoque (uma única vez). Cancelado desfaz o lançamento e devolve o estoque.</span>
                </label>`,
            rodape: `<button type="button" class="btn btn-fantasma esquerda" id="ped-excluir"><i class="fa-solid fa-trash"></i> Excluir</button><button type="button" class="btn btn-fantasma" data-fechar>Fechar</button><button type="button" class="btn btn-primario" id="ped-salvar">Salvar status</button>`,
        });
        $("#ped-salvar").onclick = () => { const v = $("#ped-status-sel").value; fecharModal(); if (v !== p.status) mudarStatus(p.codigo, v); };
        $("#ped-excluir").onclick = () => confirmar(`Excluir o pedido #${esc(p.codigo)}? Se ele já foi pago, o lançamento no caixa também será removido e o estoque devolvido.`, "Excluir pedido", () => {
            desfazerPagamento(p);
            D.pedidos = D.pedidos.filter((x) => x !== p);
            salvar(); RENDER.pedidos(); toast("Pedido excluído.");
        });
    };

    // Colar pedido recebido no WhatsApp (de outro aparelho) para registrar aqui
    const lerMensagemPedido = (texto) => {
        const valor = (s) => num(String(s).replace(/\./g, "").replace(",", "."));
        const codigo = (texto.match(/Pedido:\s*\*?#?([A-Z0-9]{5,12})/i) || [])[1];
        const itens = [];
        texto.split("\n").forEach((linha) => {
            const m = linha.match(/^\s*[•\-*]\s*(\d+)x\s+(.+?)\s+—\s+R\$\s*([\d.,]+)(?:\s*\[#?(\w+)\])?/);
            if (!m) return;
            const qtd = Number(m[1]);
            const nomeCompleto = m[2].replace(/\s*\([^)]*\)\s*$/, "").trim();
            const prod = (m[4] && D.produtos.find((p) => String(p.id) === m[4] || p.codigo === m[4] || p.codigo === `#${m[4]}`)) || D.produtos.find((p) => p.nome.toLowerCase() === nomeCompleto.toLowerCase());
            const totalLinha = valor(m[3]);
            itens.push({ id: prod ? prod.id : null, codigo: prod ? agroCodigoProduto(prod) : "", nome: prod ? prod.nome : nomeCompleto, unidade: prod ? prod.unidade : "", qtd, preco: Math.round((totalLinha / qtd) * 100) / 100 });
        });
        const total = valor((texto.match(/Total:\s*R\$\s*([\d.,]+)/) || [])[1] || 0);
        const subtotal = valor((texto.match(/Subtotal:\s*R\$\s*([\d.,]+)/) || [])[1] || 0) || itens.reduce((a, i) => a + i.qtd * i.preco, 0);
        const desconto = valor((texto.match(/Desconto[^:]*:\s*-\s*R\$\s*([\d.,]+)/) || [])[1] || 0);
        const cliente = ((texto.match(/Cliente:\*?\s*(.+)/) || [])[1] || "Cliente").replace(/\*/g, "").trim();
        const telefone = ((texto.match(/📱\s*(.+)/) || [])[1] || "").trim();
        const pagamento = ((texto.match(/Pagamento:\*?\s*(.+)/) || [])[1] || "").replace(/\*/g, "").trim();
        const retirada = /Retirada na loja/i.test(texto);
        const bairro = ((texto.match(/Bairro:\s*(.+)/) || [])[1] || "").trim();
        const endereco = retirada ? "" : (texto.split("\n").find((l) => /, nº /.test(l)) || "").trim();
        const [rua, numero] = endereco.split(/, nº /);
        const troco = valor((pagamento.match(/troco para R\$\s*([\d.,]+)/) || [])[1] || 0);
        const taxaEntrega = valor((texto.match(/Entrega:\s*R\$\s*([\d.,]+)/) || [])[1] || 0);
        const dataRet = (texto.match(/(\d{2})\/(\d{2})\/(\d{4}) às (\d{2}:\d{2})/) || []);
        return {
            codigo: codigo ? codigo.toUpperCase() : `WA${Date.now().toString(36).slice(-6).toUpperCase()}`,
            data: new Date().toISOString(), status: "novo", origem: "whatsapp", cliente, telefone, itens,
            subtotal, desconto, taxaEntrega, total: total || subtotal - desconto + taxaEntrega,
            entrega: retirada ? { tipo: "retirada", data: dataRet[3] ? `${dataRet[3]}-${dataRet[2]}-${dataRet[1]}` : "", hora: dataRet[4] || "" } : { tipo: "entrega", bairro, rua: rua || "", numero: numero ? numero.split(" — ")[0] : "", taxa: taxaEntrega },
            pagamento: { forma: pagamento.split(" — ")[0] || "PIX", troco },
        };
    };
    $("#btn-importar-pedido").addEventListener("click", () => {
        abrirModal({
            titulo: `<i class="fa-brands fa-whatsapp"></i> Colar pedido do WhatsApp`,
            corpo: `
                <div class="aviso-box aviso-box--info"><i class="fa-solid fa-circle-info"></i><span>Recebeu um pedido do catálogo no WhatsApp? Copie a mensagem inteira e cole aqui — o painel lê os itens, o cliente e a entrega e cria o pedido.</span></div>
                <label class="campo"><span>Mensagem do pedido</span><textarea id="imp-texto" rows="9" placeholder="Cole aqui a mensagem que começa com “NOVO PEDIDO”..."></textarea></label>
                <div id="imp-previa" class="previa-importacao"></div>`,
            rodape: `<button type="button" class="btn btn-fantasma" data-fechar>Cancelar</button><button type="button" class="btn btn-secundario" id="imp-salvar" disabled><i class="fa-solid fa-check"></i> Registrar pedido</button>`,
        });
        let lido = null;
        $("#imp-texto").addEventListener("input", (e) => {
            const t = e.target.value;
            lido = t.trim() ? lerMensagemPedido(t) : null;
            const ok = lido && lido.itens.length;
            $("#imp-salvar").disabled = !ok;
            $("#imp-previa").innerHTML = !t.trim() ? "" : ok
                ? `<div class="detalhe-grupo"><h4>Pré-visualização</h4>#${esc(lido.codigo)} · ${esc(lido.cliente)} · ${lido.entrega.tipo === "entrega" ? "Entrega" : "Retirada"}<ul class="lista-simples">${lido.itens.map((i) => `<li><span>${i.qtd}x ${esc(i.nome)} ${i.id ? "" : `<small style="color:var(--alerta)">produto não encontrado no cadastro (não baixa estoque)</small>`}</span><span class="valor">${moeda(i.qtd * i.preco)}</span></li>`).join("")}<li><strong>Total</strong><strong class="valor">${moeda(lido.total)}</strong></li></ul></div>`
                : `<div class="aviso-box"><i class="fa-solid fa-triangle-exclamation"></i> Não encontrei itens nessa mensagem. Cole o texto completo do pedido.</div>`;
        });
        $("#imp-salvar").onclick = () => {
            if (!lido) return;
            if (D.pedidos.some((p) => p.codigo === lido.codigo)) { toast(`O pedido #${lido.codigo} já está registrado.`, true); return; }
            D.pedidos.unshift(lido);
            salvar(); fecharModal(); filtroPedidos = "novo"; RENDER.pedidos();
            toast(`Pedido #${lido.codigo} registrado.`);
        };
    });

    // ═════════════════════════════════════════════════════════════════════════
    // VENDA NO BALCÃO (PDV)
    // ═════════════════════════════════════════════════════════════════════════
    let vendaPDV = [];
    RENDER.pdv = () => {
        const termo = $("#pdv-busca").value.trim().toLowerCase();
        const lista = D.produtos.filter((p) => p.ativo !== false && (!termo || `${p.nome} ${p.unidade} ${agroCodigoProduto(p)}`.toLowerCase().includes(termo)));
        $("#pdv-grade").innerHTML = lista.map((p) => `
            <button type="button" class="pdv-prod" data-pdv-add="${p.id}" ${estoqueZerado(p) ? "disabled" : ""}>
                <span class="pdv-prod-topo">${iconeProduto(p)}<strong>${esc(p.nome)}</strong></span>
                <small>${esc(p.unidade || "")} · ${controlaEstoque(p) ? `${p.estoque} em estoque` : "sem controle"}</small>
                <span class="preco">${moeda(p.preco)}${agroTemCombo(p) ? ` <small style="color:var(--muted);font-weight:800">· leve ${Number(p.levaQtd)}: ${moeda(agroPrecoCombo(p))} cada</small>` : ""}</span>
            </button>`).join("") || `<p class="vazio-mini">Nenhum produto encontrado.</p>`;
        $("#pdv-pagamento").innerHTML = ["PIX", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Fiado / a receber"].map((f) => `<option>${f}</option>`).join("");
        renderVendaPDV();
        renderVendasHoje();
    };
    const renderVendaPDV = () => {
        const itens = vendaPDV.map((v) => ({ ...v, p: produtoPorId(v.id) })).filter((v) => v.p);
        $("#pdv-itens").innerHTML = itens.length ? itens.map(({ p, qtd }) => `
            <div class="pdv-item">
                <div class="pdv-item-nome">${esc(p.nome)}<small>${moeda(agroPrecoUnit(p, qtd))} cada · ${esc(p.unidade || "")}${agroTemCombo(p) && qtd >= Number(p.levaQtd) ? ` · leve ${Number(p.levaQtd)} aplicado` : ""}</small></div>
                <div class="qtd"><button type="button" data-pdv-menos="${p.id}">−</button><span>${qtd}</span><button type="button" data-pdv-add="${p.id}">+</button></div>
                <strong style="min-width:78px;text-align:right">${moeda(agroTotalItem(p, qtd))}</strong>
            </div>`).join("") : `<p class="vazio-mini">Toque nos produtos ao lado para adicionar.</p>`;
        const sub = itens.reduce((a, v) => a + agroTotalItem(v.p, v.qtd), 0);
        const total = Math.max(0, sub - num($("#pdv-desconto").value));
        $("#pdv-total").textContent = moeda(total);
        $("#pdv-finalizar").disabled = !itens.length;
    };
    const renderVendasHoje = () => {
        const hoje = D.lancamentos.filter((l) => l.tipo === "entrada" && chaveDia(l.data) === hojeChave()).sort((a, b) => new Date(b.data) - new Date(a.data));
        $("#pdv-hoje-total").textContent = moeda(hoje.reduce((a, l) => a + Number(l.valor), 0));
        $("#pdv-hoje").innerHTML = hoje.length
            ? `<ul class="lista-simples">${hoje.map((l) => `<li><div>${esc(l.descricao)}<small>${fmtDataHora(l.data)} · ${esc(l.categoria)} · ${esc(l.formaPagamento || "")}</small></div><span class="valor valor-entrada">${moeda(l.valor)}</span></li>`).join("")}</ul>`
            : `<p class="vazio-mini">Nenhuma venda registrada hoje.</p>`;
    };
    $("#aba-pdv").addEventListener("click", (e) => {
        const add = e.target.closest("[data-pdv-add]");
        const menos = e.target.closest("[data-pdv-menos]");
        if (add) {
            const id = Number(add.dataset.pdvAdd), p = produtoPorId(id);
            const item = vendaPDV.find((v) => v.id === id);
            const nova = (item ? item.qtd : 0) + 1;
            if (controlaEstoque(p) && nova > Number(p.estoque)) { toast(`Só há ${p.estoque} em estoque.`, true); return; }
            if (item) item.qtd = nova; else vendaPDV.push({ id, qtd: 1 });
            renderVendaPDV();
        }
        if (menos) {
            const id = Number(menos.dataset.pdvMenos), item = vendaPDV.find((v) => v.id === id);
            if (item) { item.qtd--; if (item.qtd <= 0) vendaPDV = vendaPDV.filter((v) => v !== item); }
            renderVendaPDV();
        }
    });
    $("#pdv-busca").addEventListener("input", () => RENDER.pdv());
    $("#pdv-desconto").addEventListener("input", renderVendaPDV);
    $("#pdv-limpar").addEventListener("click", () => { vendaPDV = []; $("#pdv-desconto").value = ""; $("#pdv-cliente").value = ""; renderVendaPDV(); });
    $("#pdv-finalizar").addEventListener("click", () => {
        const itens = vendaPDV.map((v) => { const p = produtoPorId(v.id); return { id: p.id, nome: p.nome, qtd: v.qtd, preco: agroPrecoUnit(p, v.qtd), custo: p.custo }; });
        if (!itens.length) return;
        const sub = itens.reduce((a, i) => a + i.preco * i.qtd, 0);
        const total = Math.round(Math.max(0, sub - num($("#pdv-desconto").value)) * 100) / 100;
        const cliente = $("#pdv-cliente").value.trim();
        lancar({
            tipo: "entrada", categoria: "Venda no balcão",
            descricao: `${itens.map((i) => `${i.qtd}x ${i.nome}`).join(", ")}${cliente ? ` — ${cliente}` : ""}`,
            valor: total, formaPagamento: $("#pdv-pagamento").value, itens,
        });
        movimentarEstoque(itens, -1, "Venda no balcão");
        salvar();
        vendaPDV = []; $("#pdv-desconto").value = ""; $("#pdv-cliente").value = "";
        RENDER.pdv();
        toast(`Venda de ${moeda(total)} registrada no caixa.`);
    });

    // ═════════════════════════════════════════════════════════════════════════
    // PRODUTOS E ESTOQUE
    // ═════════════════════════════════════════════════════════════════════════
    RENDER.produtos = () => {
        const selCat = $("#prod-filtro-cat");
        const catAtual = selCat.value;
        selCat.innerHTML = `<option value="">Todas as categorias</option>` + D.categorias.map((c) => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join("");
        selCat.value = catAtual;
        const termo = $("#prod-busca").value.trim().toLowerCase();
        const est = $("#prod-filtro-est").value;
        const lista = D.produtos.filter((p) => {
            if (catAtual && p.categoria !== catAtual) return false;
            if (termo && !`${p.nome} ${p.unidade} ${agroCodigoProduto(p)}`.toLowerCase().includes(termo)) return false;
            if (est === "baixo" && !estoqueBaixo(p)) return false;
            if (est === "zerado" && !estoqueZerado(p)) return false;
            if (est === "oferta" && !(p.precoAntigo > p.preco)) return false;
            if (est === "inativo" && p.ativo !== false) return false;
            return true;
        });
        const valorEstoqueCusto = D.produtos.reduce((a, p) => a + (controlaEstoque(p) ? Number(p.estoque) * Number(p.custo || 0) : 0), 0);
        const valorEstoqueVenda = D.produtos.reduce((a, p) => a + (controlaEstoque(p) ? Number(p.estoque) * Number(p.preco) : 0), 0);
        $("#resumo-estoque").innerHTML = `
            <span><strong>${D.produtos.length}</strong> produtos</span>
            <span>Estoque a preço de custo: <strong>${moeda(valorEstoqueCusto)}</strong></span>
            <span>Estoque a preço de venda: <strong>${moeda(valorEstoqueVenda)}</strong></span>`;
        $("#tabela-produtos tbody").innerHTML = lista.length ? lista.map((p) => {
            const c = categoriaDe(p.categoria);
            const margem = p.preco > 0 && p.custo ? ((p.preco - p.custo) / p.preco) * 100 : null;
            const pillEst = estoqueZerado(p) ? `<span class="pill pill--zerado">Esgotado</span>` : estoqueBaixo(p) ? `<span class="pill pill--baixo">Baixo</span>` : "";
            return `<tr>
                <td><div class="prod-cel">${iconeProduto(p)}<div>${esc(p.nome)}<small>${esc(p.unidade || "")} · ${esc(agroCodigoProduto(p))}${p.precoAntigo > p.preco ? ` · <span style="color:var(--red)">oferta (de ${moeda(p.precoAntigo)})</span>` : ""}${agroTemCombo(p) ? ` · <span style="color:var(--red)">leve ${Number(p.levaQtd)} por ${moeda(p.levaPreco)}</span>` : ""}${p.destaque ? " · ★ destaque" : ""}</small></div></div></td>
                <td>${esc(c.nome)}</td>
                <td class="num">${moeda(p.custo || 0)}</td>
                <td class="num"><input type="number" class="inline-num" step="0.01" min="0" value="${Number(p.preco).toFixed(2)}" data-preco="${p.id}" aria-label="Preço de ${esc(p.nome)}"></td>
                <td class="num ${margem === null ? "" : margem >= 20 ? "margem-boa" : "margem-baixa"}">${margem === null ? "—" : `${Math.round(margem)}%`}</td>
                <td class="num"><div class="estoque-cel">${pillEst}<input type="number" class="inline-num" style="width:72px!important" step="1" min="0" value="${controlaEstoque(p) ? p.estoque : ""}" placeholder="—" data-estoque="${p.id}" aria-label="Estoque de ${esc(p.nome)}"></div></td>
                <td><label class="switch" title="Mostrar na loja"><input type="checkbox" data-ativo="${p.id}" ${p.ativo !== false ? "checked" : ""}><span></span></label></td>
                <td class="acoes">
                    <button type="button" class="icone-btn" data-repor="${p.id}" title="Repor estoque"><i class="fa-solid fa-truck-ramp-box"></i></button>
                    <button type="button" class="icone-btn" data-editar="${p.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="icone-btn icone-btn--perigo" data-excluir="${p.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        }).join("") : `<tr><td colspan="8"><p class="vazio-mini">Nenhum produto neste filtro.</p></td></tr>`;
    };
    ["#prod-busca", "#prod-filtro-cat", "#prod-filtro-est"].forEach((s) => $(s).addEventListener("input", () => RENDER.produtos()));

    $("#tabela-produtos").addEventListener("change", (e) => {
        const t = e.target;
        if (t.dataset.preco) {
            const p = produtoPorId(t.dataset.preco);
            const v = num(t.value);
            if (v <= 0) { toast("Preço inválido.", true); t.value = p.preco.toFixed(2); return; }
            p.preco = Math.round(v * 100) / 100;
            if (p.precoAntigo && p.precoAntigo <= p.preco) p.precoAntigo = null;
            if (p.levaQtd && !agroTemCombo(p)) { p.levaQtd = null; p.levaPreco = null; }
            salvar(); RENDER.produtos(); toast(`Preço de ${esc(p.nome)} atualizado para ${moeda(p.preco)}.`);
        }
        if (t.dataset.estoque) {
            const p = produtoPorId(t.dataset.estoque);
            const antes = controlaEstoque(p) ? Number(p.estoque) : null;
            p.estoque = t.value === "" ? null : Math.max(0, Math.round(num(t.value)));
            if (antes !== null && p.estoque !== null) D.movEstoque.unshift({ data: new Date().toISOString(), produtoId: p.id, qtd: p.estoque - antes, motivo: "Ajuste manual" });
            salvar(); RENDER.produtos(); toast(`Estoque de ${esc(p.nome)} ajustado.`);
        }
        if (t.dataset.ativo) {
            const p = produtoPorId(t.dataset.ativo);
            p.ativo = t.checked;
            salvar(); toast(`${esc(p.nome)} ${p.ativo ? "aparece" : "não aparece mais"} na loja.`);
        }
    });

    document.addEventListener("click", (e) => {
        const ed = e.target.closest("[data-editar]");
        if (ed) return modalProduto(produtoPorId(ed.dataset.editar));
        const rp = e.target.closest("[data-repor]");
        if (rp) return modalRepor(produtoPorId(rp.dataset.repor));
        const ex = e.target.closest("[data-excluir]");
        if (ex) {
            const p = produtoPorId(ex.dataset.excluir);
            return confirmar(`Excluir <strong>${esc(p.nome)}</strong> do catálogo? Dica: para só esconder da loja, desligue a chave "Na loja".`, "Excluir produto", () => {
                D.produtos = D.produtos.filter((x) => x !== p);
                salvar(); RENDER.produtos(); toast("Produto excluído.");
            });
        }
    });
    $("#btn-novo-produto").addEventListener("click", () => modalProduto(null));

    // Reduz a foto enviada para ~600px (JPEG) para caber no armazenamento
    const comprimirImagem = (arquivo, max = 600) => new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onerror = reject;
        leitor.onload = () => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const escala = Math.min(1, max / Math.max(img.width, img.height));
                const c = document.createElement("canvas");
                c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
                const ctx = c.getContext("2d");
                ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
                ctx.drawImage(img, 0, 0, c.width, c.height);
                resolve(c.toDataURL("image/jpeg", 0.8));
            };
            img.src = leitor.result;
        };
        leitor.readAsDataURL(arquivo);
    });
    const editorFoto = (idPrefixo, valor) => `
        <div class="foto-editor">
            <div class="foto-previa" id="${idPrefixo}-previa">${valor ? `<img src="${esc(valor)}" alt="">` : `<i class="fa-regular fa-image"></i>`}</div>
            <div class="foto-botoes">
                <input type="url" id="${idPrefixo}-url" placeholder="Cole o link de uma foto (opcional)" value="${valor && !valor.startsWith("data:") ? esc(valor) : ""}">
                <div style="display:flex;gap:6px">
                    <label class="btn btn-fantasma btn-sm" style="flex:1"><i class="fa-solid fa-upload"></i> Enviar foto<input type="file" accept="image/*" id="${idPrefixo}-arquivo" hidden></label>
                    <button type="button" class="btn btn-fantasma btn-sm" id="${idPrefixo}-remover"><i class="fa-solid fa-xmark"></i> Remover</button>
                </div>
                <input type="hidden" id="${idPrefixo}-valor" value="${esc(valor || "")}">
            </div>
        </div>`;
    const ligarEditorFoto = (idPrefixo) => {
        const previa = (v) => { $(`#${idPrefixo}-previa`).innerHTML = v ? `<img src="${esc(v)}" alt="">` : `<i class="fa-regular fa-image"></i>`; $(`#${idPrefixo}-valor`).value = v; };
        $(`#${idPrefixo}-url`).addEventListener("input", (e) => previa(e.target.value.trim()));
        $(`#${idPrefixo}-arquivo`).addEventListener("change", async (e) => {
            const f = e.target.files[0]; if (!f) return;
            try { previa(await comprimirImagem(f)); $(`#${idPrefixo}-url`).value = ""; } catch (err) { toast("Não foi possível ler essa imagem.", true); }
        });
        $(`#${idPrefixo}-remover`).addEventListener("click", () => { $(`#${idPrefixo}-url`).value = ""; previa(""); });
    };

    const modalProduto = (p) => {
        const novo = !p;
        p = p || { nome: "", unidade: "", categoria: D.categorias[0]?.id || "", codigo: "", preco: "", precoAntigo: null, levaQtd: null, levaPreco: null, custo: "", estoque: "", estoqueMin: 3, descricao: "", imagem: "", destaque: false, ativo: true };
        abrirModal({
            titulo: novo ? "Novo produto" : "Editar produto",
            largura: 680,
            corpo: `
                <label class="campo"><span>Nome do produto</span><input type="text" id="p-nome" value="${esc(p.nome)}" placeholder="Ex.: Ração Premium Cães Adultos Carne"></label>
                <div class="campo-linha">
                    <label class="campo"><span>Embalagem / peso</span><input type="text" id="p-unidade" value="${esc(p.unidade || "")}" placeholder="Ex.: 10 kg"></label>
                    <label class="campo"><span>Categoria</span><select id="p-categoria">${D.categorias.map((c) => `<option value="${esc(c.id)}" ${c.id === p.categoria ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}</select></label>
                    <label class="campo"><span>Código <em>(opcional)</em></span><input type="text" id="p-codigo" value="${esc(p.codigo || "")}" placeholder="${p.id ? `#${p.id}` : "Automático"}"></label>
                </div>
                <div class="campo-linha">
                    <label class="campo"><span>Preço de venda (R$)</span><input type="number" step="0.01" min="0" id="p-preco" value="${p.preco}"></label>
                    <label class="campo"><span>Preço "de" <em>(oferta)</em></span><input type="number" step="0.01" min="0" id="p-antigo" value="${p.precoAntigo || ""}" placeholder="Deixe vazio sem oferta"></label>
                    <label class="campo"><span>Custo (R$)</span><input type="number" step="0.01" min="0" id="p-custo" value="${p.custo}"></label>
                </div>
                <p class="campo-ajuda" id="p-margem" style="margin:-4px 0 12px"></p>
                <div class="campo-linha">
                    <label class="campo"><span>Promoção “leve mais” <em>(quantidade)</em></span><input type="number" step="1" min="2" id="p-leva-qtd" value="${p.levaQtd || ""}" placeholder="Ex.: 2"></label>
                    <label class="campo"><span>Preço total dessa quantidade (R$)</span><input type="number" step="0.01" min="0" id="p-leva-preco" value="${p.levaPreco || ""}" placeholder="Ex.: 345,90"></label>
                </div>
                <p class="campo-ajuda" id="p-leva-info" style="margin:-4px 0 12px">Opcional. Ex.: “Ou leve 2 und. por 345,90”. Deixe vazio se não houver.</p>
                <div class="campo-linha">
                    <label class="campo"><span>Estoque atual</span><input type="number" step="1" min="0" id="p-estoque" value="${controlaEstoque(p) ? p.estoque : ""}" placeholder="Vazio = não controlar"></label>
                    <label class="campo"><span>Avisar quando chegar a</span><input type="number" step="1" min="0" id="p-min" value="${p.estoqueMin ?? ""}"></label>
                </div>
                <label class="campo"><span>Descrição</span><textarea id="p-desc" rows="3">${esc(p.descricao || "")}</textarea></label>
                <div class="campo"><span>Foto <em>(sem foto, a loja mostra a arte da categoria)</em></span>${editorFoto("p-foto", p.imagem)}</div>
                <div class="linha-switch"><label class="switch"><input type="checkbox" id="p-destaque" ${p.destaque ? "checked" : ""}><span></span></label> Destacar na loja</div>
                <div class="linha-switch"><label class="switch"><input type="checkbox" id="p-ativo" ${p.ativo !== false ? "checked" : ""}><span></span></label> Mostrar na loja</div>`,
            rodape: `<button type="button" class="btn btn-fantasma" data-fechar>Cancelar</button><button type="button" class="btn btn-primario" id="p-salvar"><i class="fa-solid fa-floppy-disk"></i> Salvar</button>`,
            aoAbrir: () => ligarEditorFoto("p-foto"),
        });
        const atualizarMargem = () => {
            const pr = num($("#p-preco").value), cu = num($("#p-custo").value);
            $("#p-margem").textContent = pr > 0 && cu > 0 ? `Margem: ${Math.round(((pr - cu) / pr) * 100)}% · lucro de ${moeda(pr - cu)} por unidade` : "";
        };
        ["#p-preco", "#p-custo"].forEach((s) => $(s).addEventListener("input", atualizarMargem));
        atualizarMargem();
        const lerCombo = () => {
            const q = Math.round(num($("#p-leva-qtd").value)), v = num($("#p-leva-preco").value), pr = num($("#p-preco").value);
            return { q, v, vazio: !q && !v, valido: q >= 2 && v > 0 && pr > 0 && v / q < pr };
        };
        const atualizarCombo = () => {
            const c = lerCombo(), info = $("#p-leva-info");
            if (c.vazio) info.textContent = "Opcional. Ex.: “Ou leve 2 und. por 345,90”. Deixe vazio se não houver.";
            else if (c.valido) info.textContent = `Na loja: “Ou leve ${c.q} und. por ${moeda(c.v)}, saindo cada und. por ${moeda(Math.round((c.v / c.q) * 100) / 100)}”.`;
            else info.textContent = "Para valer, informe 2 ou mais unidades e um total que deixe cada unidade mais barata que o preço de venda.";
        };
        ["#p-preco", "#p-leva-qtd", "#p-leva-preco"].forEach((s) => $(s).addEventListener("input", atualizarCombo));
        atualizarCombo();
        $("#p-salvar").onclick = () => {
            const nome = $("#p-nome").value.trim(), preco = num($("#p-preco").value);
            $("#p-nome").classList.toggle("erro", !nome);
            $("#p-preco").classList.toggle("erro", preco <= 0);
            if (!nome || preco <= 0) { toast("Preencha nome e preço.", true); return; }
            const antigo = num($("#p-antigo").value);
            const combo = lerCombo();
            if (!combo.vazio && !combo.valido) { $("#p-leva-qtd").classList.add("erro"); $("#p-leva-preco").classList.add("erro"); toast("Confira a promoção “leve mais”.", true); return; }
            const dadosP = {
                nome, unidade: $("#p-unidade").value.trim(), categoria: $("#p-categoria").value, codigo: $("#p-codigo").value.trim(),
                preco: Math.round(preco * 100) / 100, precoAntigo: antigo > preco ? Math.round(antigo * 100) / 100 : null,
                levaQtd: combo.valido ? combo.q : null, levaPreco: combo.valido ? Math.round(combo.v * 100) / 100 : null,
                custo: num($("#p-custo").value), estoque: $("#p-estoque").value === "" ? null : Math.max(0, Math.round(num($("#p-estoque").value))),
                estoqueMin: Math.round(num($("#p-min").value)), descricao: $("#p-desc").value.trim(), imagem: $("#p-foto-valor").value,
                destaque: $("#p-destaque").checked, ativo: $("#p-ativo").checked,
            };
            if (novo) D.produtos.push({ id: proximoId(D.produtos), ...dadosP });
            else Object.assign(p, dadosP);
            salvar(); fecharModal(); RENDER.produtos();
            toast(novo ? "Produto cadastrado e já aparece na loja." : "Produto atualizado.");
        };
    };

    const modalRepor = (p) => {
        abrirModal({
            titulo: `Repor estoque`,
            largura: 480,
            corpo: `
                <div class="detalhe-grupo" style="display:flex;gap:10px;align-items:center">${iconeProduto(p)}<div>${esc(p.nome)}<br><small style="color:var(--muted)">Estoque atual: ${controlaEstoque(p) ? p.estoque : "—"}</small></div></div>
                <div class="campo-linha">
                    <label class="campo"><span>Quantidade que chegou</span><input type="number" min="1" step="1" id="r-qtd" value="10"></label>
                    <label class="campo"><span>Custo por unidade (R$)</span><input type="number" min="0" step="0.01" id="r-custo" value="${p.custo || ""}"></label>
                </div>
                <div class="linha-switch"><label class="switch"><input type="checkbox" id="r-lancar" checked><span></span></label> Lançar a compra como saída no caixa</div>
                <div class="campo-linha" id="r-pag-linha">
                    <label class="campo"><span>Pago com</span><select id="r-pag"><option>Boleto</option><option>PIX</option><option>Dinheiro</option><option>Cartão de crédito</option><option>Cartão de débito</option></select></label>
                    <label class="campo"><span>Fornecedor <em>(opcional)</em></span><input type="text" id="r-forn"></label>
                </div>
                <p class="campo-ajuda" id="r-total"></p>`,
            rodape: `<button type="button" class="btn btn-fantasma" data-fechar>Cancelar</button><button type="button" class="btn btn-primario" id="r-salvar"><i class="fa-solid fa-truck-ramp-box"></i> Dar entrada no estoque</button>`,
        });
        const atual = () => { $("#r-total").textContent = `Total da compra: ${moeda(num($("#r-qtd").value) * num($("#r-custo").value))}`; $("#r-pag-linha").hidden = !$("#r-lancar").checked; };
        ["#r-qtd", "#r-custo", "#r-lancar"].forEach((s) => $(s).addEventListener("input", atual));
        atual();
        $("#r-salvar").onclick = () => {
            const qtd = Math.round(num($("#r-qtd").value)), custo = num($("#r-custo").value);
            if (qtd <= 0) { $("#r-qtd").classList.add("erro"); return; }
            p.estoque = (controlaEstoque(p) ? Number(p.estoque) : 0) + qtd;
            if (custo > 0) p.custo = custo;
            D.movEstoque.unshift({ data: new Date().toISOString(), produtoId: p.id, qtd, motivo: "Reposição" });
            if ($("#r-lancar").checked && custo > 0) {
                const forn = $("#r-forn").value.trim();
                lancar({ tipo: "saida", categoria: "Compra de mercadoria", descricao: `${qtd}x ${p.nome}${forn ? ` — ${forn}` : ""}`, valor: Math.round(qtd * custo * 100) / 100, formaPagamento: $("#r-pag").value });
            }
            salvar(); fecharModal(); RENDER[abaAtual]();
            toast(`+${qtd} unidades de ${esc(p.nome)}.`);
        };
    };

    $("#btn-reajuste").addEventListener("click", () => {
        abrirModal({
            titulo: "Reajustar preços",
            largura: 480,
            corpo: `
                <div class="aviso-box aviso-box--info"><i class="fa-solid fa-circle-info"></i><span>Útil quando o fornecedor aumenta a tabela. Use número negativo para baixar preços.</span></div>
                <div class="campo-linha">
                    <label class="campo"><span>Categoria</span><select id="rj-cat"><option value="">Todas</option>${D.categorias.map((c) => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join("")}</select></label>
                    <label class="campo"><span>Reajuste (%)</span><input type="number" step="0.1" id="rj-pct" value="5"></label>
                </div>
                <div class="linha-switch"><label class="switch"><input type="checkbox" id="rj-90" checked><span></span></label> Arredondar para terminar em ,90</div>
                <div class="linha-switch"><label class="switch"><input type="checkbox" id="rj-custo"><span></span></label> Reajustar também o custo</div>
                <p class="campo-ajuda" id="rj-prev"></p>`,
            rodape: `<button type="button" class="btn btn-fantasma" data-fechar>Cancelar</button><button type="button" class="btn btn-primario" id="rj-aplicar">Aplicar reajuste</button>`,
        });
        const alvo = () => D.produtos.filter((p) => !$("#rj-cat").value || p.categoria === $("#rj-cat").value);
        const novoPreco = (v) => { let n = v * (1 + num($("#rj-pct").value) / 100); if ($("#rj-90").checked) n = Math.max(0.9, Math.floor(n) + 0.9); return Math.round(n * 100) / 100; };
        const prev = () => { const a = alvo(); $("#rj-prev").textContent = a.length ? `${a.length} produtos. Ex.: ${a[0].nome} ${moeda(a[0].preco)} → ${moeda(novoPreco(a[0].preco))}` : "Nenhum produto."; };
        ["#rj-cat", "#rj-pct", "#rj-90"].forEach((s) => $(s).addEventListener("input", prev));
        prev();
        $("#rj-aplicar").onclick = () => {
            const a = alvo(), pct = num($("#rj-pct").value);
            a.forEach((p) => {
                p.preco = novoPreco(p.preco);
                if (p.precoAntigo) p.precoAntigo = p.precoAntigo > p.preco ? novoPreco(p.precoAntigo) : null;
                if (p.levaPreco) { p.levaPreco = novoPreco(p.levaPreco); if (!agroTemCombo(p)) { p.levaQtd = null; p.levaPreco = null; } }
                if ($("#rj-custo").checked && p.custo) p.custo = Math.round(p.custo * (1 + pct / 100) * 100) / 100;
            });
            salvar(); fecharModal(); RENDER.produtos(); toast(`${a.length} preços reajustados.`);
        };
    });

    const ICONES_CAT = ["fa-dog", "fa-cat", "fa-dove", "fa-crow", "fa-fish", "fa-horse", "fa-cow", "fa-wheat-awn", "fa-bone", "fa-house-chimney", "fa-pump-soap", "fa-syringe", "fa-seedling", "fa-leaf", "fa-tractor", "fa-paw", "fa-bowl-food", "fa-shield-dog", "fa-box"];
    $("#btn-categorias").addEventListener("click", () => {
        const linhas = () => D.categorias.map((c, i) => `
            <div class="bairro-linha">
                <input type="color" value="${esc(c.cor)}" data-cat-cor="${i}" style="width:44px;height:40px;border:1.5px solid var(--line);border-radius:10px;padding:2px">
                <select data-cat-icone="${i}" style="width:130px">${ICONES_CAT.map((ic) => `<option value="${ic}" ${ic === c.icone ? "selected" : ""}>${ic.replace("fa-", "")}</option>`).join("")}</select>
                <input type="text" value="${esc(c.nome)}" data-cat-nome="${i}">
                <span class="pdv-prod-icone" style="background:${esc(c.cor)}"><i class="fa-solid ${esc(c.icone)}"></i></span>
                <button type="button" class="icone-btn icone-btn--perigo" data-cat-del="${i}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </div>`).join("");
        abrirModal({
            titulo: "Categorias",
            largura: 640,
            corpo: `<p class="campo-ajuda" style="margin-bottom:10px">A cor e o ícone formam a arte dos produtos sem foto na loja.</p><div class="bairros-lista" id="cat-lista">${linhas()}</div><button type="button" class="btn btn-fantasma btn-sm" id="cat-add"><i class="fa-solid fa-plus"></i> Nova categoria</button>`,
            rodape: `<button type="button" class="btn btn-primario" id="cat-ok">Concluir</button>`,
        });
        const lista = $("#cat-lista");
        lista.addEventListener("input", (e) => {
            const t = e.target;
            if (t.dataset.catNome) D.categorias[t.dataset.catNome].nome = t.value;
            if (t.dataset.catCor) D.categorias[t.dataset.catCor].cor = t.value;
            if (t.dataset.catIcone) D.categorias[t.dataset.catIcone].icone = t.value;
            if (t.dataset.catCor || t.dataset.catIcone) { const i = t.dataset.catCor || t.dataset.catIcone; const ic = t.closest(".bairro-linha").querySelector(".pdv-prod-icone"); ic.style.background = D.categorias[i].cor; ic.innerHTML = `<i class="fa-solid ${D.categorias[i].icone}"></i>`; }
            salvar();
        });
        lista.addEventListener("click", (e) => {
            const b = e.target.closest("[data-cat-del]"); if (!b) return;
            const c = D.categorias[b.dataset.catDel];
            const qtd = D.produtos.filter((p) => p.categoria === c.id).length;
            if (qtd) { toast(`Há ${qtd} produtos em "${esc(c.nome)}". Mude a categoria deles antes de excluir.`, true); return; }
            D.categorias.splice(Number(b.dataset.catDel), 1); salvar(); lista.innerHTML = linhas();
        });
        $("#cat-add").onclick = () => { D.categorias.push({ id: `cat${Date.now().toString(36)}`, nome: "Nova categoria", icone: "fa-paw", cor: "#0D0B1E" }); salvar(); lista.innerHTML = linhas(); };
        $("#cat-ok").onclick = () => { fecharModal(); RENDER.produtos(); };
    });

    // ═════════════════════════════════════════════════════════════════════════
    // ENTRADAS E SAÍDAS
    // ═════════════════════════════════════════════════════════════════════════
    const hoje0 = new Date();
    let finMes = { a: hoje0.getFullYear(), m: hoje0.getMonth() };
    let finTipo = "";
    const lancDoMes = () => D.lancamentos.filter((l) => { const d = new Date(l.data); return d.getFullYear() === finMes.a && d.getMonth() === finMes.m; });

    RENDER.financeiro = () => {
        $("#fin-mes-texto").textContent = `${NOMES_MES[finMes.m]} ${finMes.a}`;
        $$("#fin-tipo button").forEach((b) => b.classList.toggle("ativo", b.dataset.t === finTipo));
        const doMes = lancDoMes();
        const e = doMes.filter((l) => l.tipo === "entrada"), s = doMes.filter((l) => l.tipo === "saida");
        const tE = e.reduce((a, l) => a + Number(l.valor), 0), tS = s.reduce((a, l) => a + Number(l.valor), 0);
        $("#fin-kpis").innerHTML =
            kpi("kpi--entrada", "fa-arrow-down", "Entradas do mês", moeda(tE), `${e.length} lançamentos`) +
            kpi("kpi--saida", "fa-arrow-up", "Saídas do mês", moeda(tS), `${s.length} lançamentos`) +
            kpi(`kpi--saldo${tE - tS < 0 ? " kpi--negativo" : ""}`, "fa-scale-balanced", "Saldo do mês", `${tE - tS < 0 ? "− " : ""}${moeda(Math.abs(tE - tS))}`, "Entradas menos saídas");
        $("#fin-cat-saidas").innerHTML = barrasH(agrupar(s, "categoria"), "var(--cor-saida)");
        $("#fin-cat-entradas").innerHTML = barrasH(agrupar(e, "formaPagamento"), "var(--cor-entrada)");

        const termo = $("#fin-busca").value.trim().toLowerCase();
        const lista = doMes
            .filter((l) => !finTipo || l.tipo === finTipo)
            .filter((l) => !termo || `${l.descricao} ${l.categoria} ${l.formaPagamento}`.toLowerCase().includes(termo))
            .sort((a, b) => new Date(b.data) - new Date(a.data));
        $("#tabela-lanc tbody").innerHTML = lista.length ? lista.map((l) => `
            <tr>
                <td style="white-space:nowrap">${fmtData(l.data)}</td>
                <td>${esc(l.descricao)}</td>
                <td><span class="pill ${l.tipo === "entrada" ? "pill--pago" : "pill--baixo"}">${esc(l.categoria)}</span></td>
                <td>${esc(l.formaPagamento || "—")}</td>
                <td class="num ${l.tipo === "entrada" ? "valor-entrada" : "valor-saida"}">${l.tipo === "entrada" ? "+" : "−"} ${moeda(l.valor)}</td>
                <td class="acoes">
                    <button type="button" class="icone-btn" data-lanc-editar="${l.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="icone-btn icone-btn--perigo" data-lanc-excluir="${l.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`).join("") : `<tr><td colspan="6"><p class="vazio-mini">Nenhum lançamento.</p></td></tr>`;
    };
    $("#fin-mes-ant").addEventListener("click", () => { finMes.m--; if (finMes.m < 0) { finMes.m = 11; finMes.a--; } RENDER.financeiro(); });
    $("#fin-mes-prox").addEventListener("click", () => { finMes.m++; if (finMes.m > 11) { finMes.m = 0; finMes.a++; } RENDER.financeiro(); });
    $("#fin-tipo").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; finTipo = b.dataset.t; RENDER.financeiro(); });
    $("#fin-busca").addEventListener("input", () => RENDER.financeiro());

    const modalLancamento = (tipo, l) => {
        const novo = !l;
        l = l || { tipo, data: new Date().toISOString(), categoria: "", descricao: "", valor: "", formaPagamento: "PIX" };
        const cats = l.tipo === "entrada" ? AGRO_CATEGORIAS_ENTRADA : AGRO_CATEGORIAS_SAIDA;
        abrirModal({
            titulo: `${novo ? "Nova" : "Editar"} ${l.tipo === "entrada" ? "entrada" : "saída"}`,
            largura: 520,
            corpo: `
                ${l.pedidoCodigo ? `<div class="aviso-box"><i class="fa-solid fa-link"></i><span>Lançamento ligado ao pedido #${esc(l.pedidoCodigo)}.</span></div>` : ""}
                <label class="campo"><span>Descrição</span><input type="text" id="l-desc" value="${esc(l.descricao)}" placeholder="${l.tipo === "entrada" ? "Ex.: Banho e tosa, venda avulsa" : "Ex.: Conta de luz, compra de sacaria"}"></label>
                <div class="campo-linha">
                    <label class="campo"><span>Valor (R$)</span><input type="number" step="0.01" min="0" id="l-valor" value="${l.valor}"></label>
                    <label class="campo"><span>Data</span><input type="date" id="l-data" value="${chaveDia(l.data)}"></label>
                </div>
                <div class="campo-linha">
                    <label class="campo"><span>Categoria</span><select id="l-cat">${cats.map((c) => `<option ${c === l.categoria ? "selected" : ""}>${c}</option>`).join("")}${l.categoria && !cats.includes(l.categoria) ? `<option selected>${esc(l.categoria)}</option>` : ""}</select></label>
                    <label class="campo"><span>Forma de pagamento</span><select id="l-pag">${["PIX", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Boleto", "Transferência", "Fiado / a receber"].map((f) => `<option ${f === l.formaPagamento ? "selected" : ""}>${f}</option>`).join("")}</select></label>
                </div>`,
            rodape: `<button type="button" class="btn btn-fantasma" data-fechar>Cancelar</button><button type="button" class="btn ${l.tipo === "entrada" ? "btn-entrada" : "btn-saida"}" id="l-salvar">Salvar</button>`,
        });
        $("#l-salvar").onclick = () => {
            const desc = $("#l-desc").value.trim(), valor = num($("#l-valor").value);
            $("#l-desc").classList.toggle("erro", !desc); $("#l-valor").classList.toggle("erro", valor <= 0);
            if (!desc || valor <= 0) { toast("Preencha descrição e valor.", true); return; }
            const d = { descricao: desc, valor: Math.round(valor * 100) / 100, data: isoDeChave($("#l-data").value || hojeChave()), categoria: $("#l-cat").value, formaPagamento: $("#l-pag").value };
            if (novo) lancar({ tipo: l.tipo, ...d }); else Object.assign(l, d);
            const dt = new Date(d.data); finMes = { a: dt.getFullYear(), m: dt.getMonth() };
            salvar(); fecharModal(); RENDER.financeiro();
            toast(`${l.tipo === "entrada" ? "Entrada" : "Saída"} de ${moeda(d.valor)} ${novo ? "lançada" : "atualizada"}.`);
        };
    };
    $$("[data-novo-lanc]").forEach((b) => b.addEventListener("click", () => modalLancamento(b.dataset.novoLanc)));
    $("#tabela-lanc").addEventListener("click", (e) => {
        const ed = e.target.closest("[data-lanc-editar]");
        if (ed) return modalLancamento(null, D.lancamentos.find((l) => l.id === Number(ed.dataset.lancEditar)));
        const ex = e.target.closest("[data-lanc-excluir]");
        if (ex) {
            const l = D.lancamentos.find((x) => x.id === Number(ex.dataset.lancExcluir));
            confirmar(`Excluir o lançamento <strong>${esc(l.descricao)}</strong> (${moeda(l.valor)})?${l.pedidoCodigo ? " O pedido ligado a ele voltará para “Novo”." : ""}`, "Excluir", () => {
                D.lancamentos = D.lancamentos.filter((x) => x !== l);
                if (l.pedidoCodigo) { const p = D.pedidos.find((x) => x.codigo === l.pedidoCodigo); if (p) { p.lancamentoId = null; p.status = "novo"; movimentarEstoque(p.itens, +1, `Estorno #${p.codigo}`); } }
                salvar(); RENDER.financeiro(); toast("Lançamento excluído.");
            });
        }
    });
    $("#fin-csv").addEventListener("click", () => {
        const linhas = [["Data", "Tipo", "Descrição", "Categoria", "Forma de pagamento", "Valor"]];
        lancDoMes().sort((a, b) => new Date(a.data) - new Date(b.data)).forEach((l) => linhas.push([fmtData(l.data), l.tipo === "entrada" ? "Entrada" : "Saída", l.descricao, l.categoria, l.formaPagamento || "", (l.tipo === "entrada" ? 1 : -1) * Number(l.valor)].map((c) => typeof c === "number" ? c.toFixed(2).replace(".", ",") : `"${String(c).replace(/"/g, '""')}"`)));
        const blob = new Blob(["﻿" + linhas.map((l) => l.join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `caixa-${finMes.a}-${pad(finMes.m + 1)}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        toast("Planilha do mês baixada.");
    });

    // ═════════════════════════════════════════════════════════════════════════
    // CUPONS
    // ═════════════════════════════════════════════════════════════════════════
    RENDER.cupons = () => {
        $("#cupons-grade").innerHTML = D.cupons.length ? D.cupons.map((c, i) => `
            <div class="cupom-card${c.ativo === false ? " inativo" : ""}">
                <span class="cupom-codigo">${esc(c.codigo)}</span>
                <span class="cupom-valor">${c.tipo === "fixo" ? `${moeda(c.valor)} de desconto` : `${c.valor}% de desconto`}</span>
                <span class="cupom-regras">${c.valorMinimo ? `Pedido mínimo ${moeda(c.valorMinimo)}` : "Sem pedido mínimo"} · ${c.validade ? `até ${fmtData(isoDeChave(c.validade))}` : "sem validade"}</span>
                <div class="cupom-acoes">
                    <label class="switch" title="Ativo"><input type="checkbox" data-cupom-ativo="${i}" ${c.ativo !== false ? "checked" : ""}><span></span></label>
                    <button type="button" class="icone-btn" data-cupom-editar="${i}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="icone-btn icone-btn--perigo" data-cupom-excluir="${i}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`).join("") : `<div class="painel-card"><p class="vazio-mini">Nenhum cupom criado.</p></div>`;
    };
    const modalCupom = (i) => {
        const novo = i === undefined;
        const c = novo ? { codigo: "", tipo: "percentual", valor: 10, valorMinimo: 0, validade: "", ativo: true } : D.cupons[i];
        abrirModal({
            titulo: novo ? "Novo cupom" : "Editar cupom",
            largura: 480,
            corpo: `
                <label class="campo"><span>Código</span><input type="text" id="c-cod" value="${esc(c.codigo)}" placeholder="Ex.: RACAO10" style="text-transform:uppercase"></label>
                <div class="campo-linha">
                    <label class="campo"><span>Tipo</span><select id="c-tipo"><option value="percentual" ${c.tipo !== "fixo" ? "selected" : ""}>Porcentagem (%)</option><option value="fixo" ${c.tipo === "fixo" ? "selected" : ""}>Valor fixo (R$)</option></select></label>
                    <label class="campo"><span>Valor</span><input type="number" min="0" step="0.01" id="c-valor" value="${c.valor}"></label>
                </div>
                <div class="campo-linha">
                    <label class="campo"><span>Pedido mínimo (R$)</span><input type="number" min="0" step="0.01" id="c-min" value="${c.valorMinimo || ""}"></label>
                    <label class="campo"><span>Válido até <em>(opcional)</em></span><input type="date" id="c-val" value="${c.validade || ""}"></label>
                </div>`,
            rodape: `<button type="button" class="btn btn-fantasma" data-fechar>Cancelar</button><button type="button" class="btn btn-primario" id="c-salvar">Salvar</button>`,
        });
        $("#c-salvar").onclick = () => {
            const codigo = $("#c-cod").value.trim().toUpperCase().replace(/\s+/g, "");
            if (!codigo) { $("#c-cod").classList.add("erro"); return; }
            if (D.cupons.some((x, j) => x.codigo === codigo && j !== i)) { toast("Já existe um cupom com esse código.", true); return; }
            const d = { codigo, tipo: $("#c-tipo").value, valor: num($("#c-valor").value), valorMinimo: num($("#c-min").value), validade: $("#c-val").value, ativo: c.ativo !== false };
            if (novo) D.cupons.push(d); else D.cupons[i] = d;
            salvar(); fecharModal(); RENDER.cupons(); toast("Cupom salvo.");
        };
    };
    $("#btn-novo-cupom").addEventListener("click", () => modalCupom());
    $("#cupons-grade").addEventListener("click", (e) => {
        const ed = e.target.closest("[data-cupom-editar]");
        if (ed) return modalCupom(Number(ed.dataset.cupomEditar));
        const ex = e.target.closest("[data-cupom-excluir]");
        if (ex) { const i = Number(ex.dataset.cupomExcluir); confirmar(`Excluir o cupom ${esc(D.cupons[i].codigo)}?`, "Excluir", () => { D.cupons.splice(i, 1); salvar(); RENDER.cupons(); }); }
    });
    $("#cupons-grade").addEventListener("change", (e) => {
        const t = e.target.closest("[data-cupom-ativo]");
        if (t) { D.cupons[Number(t.dataset.cupomAtivo)].ativo = t.checked; salvar(); RENDER.cupons(); }
    });

    // ═════════════════════════════════════════════════════════════════════════
    // CONFIGURAÇÕES
    // ═════════════════════════════════════════════════════════════════════════
    const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const FORMAS = ["PIX", "Cartão de crédito", "Cartão de débito", "Dinheiro"];
    const linhaBairro = (b) => `
        <div class="bairro-linha">
            <input type="text" class="bairro-nome" value="${esc(b.nome)}" placeholder="Nome do bairro">
            <input type="number" class="bairro-taxa" min="0" step="0.5" value="${b.taxa === null || b.taxa === undefined ? "" : b.taxa}" placeholder="A combinar" title="Taxa (0 = grátis, vazio = a combinar)">
            <button type="button" class="icone-btn icone-btn--perigo" data-bairro-del title="Remover"><i class="fa-solid fa-trash"></i></button>
        </div>`;
    RENDER.config = () => {
        const c = D.config;
        const campo = (id, rotulo, valor, tipo = "text", extra = "") => `<label class="campo"><span>${rotulo}</span><input type="${tipo}" id="cf-${id}" value="${esc(valor ?? "")}" ${extra}></label>`;
        $("#form-config").innerHTML = `
            <div class="config-bloco">
                <h3><i class="fa-solid fa-store"></i> Dados da loja</h3>
                ${campo("nomeLoja", "Nome da loja", c.nomeLoja)}
                ${campo("slogan", "Frase de efeito", c.slogan)}
                <div class="campo-linha">
                    ${campo("whatsapp", "WhatsApp que recebe os pedidos", c.whatsapp, "tel", 'placeholder="5551999999999"')}
                    ${campo("telefoneExibicao", "Telefone exibido", c.telefoneExibicao)}
                </div>
                <p class="campo-ajuda" style="margin:-6px 0 12px">WhatsApp com 55 + DDD + número, só números.</p>
                <div class="campo-linha">
                    ${campo("instagram", "Instagram (sem @)", c.instagram)}
                    ${campo("horarioTexto", "Horário de funcionamento", c.horarioTexto)}
                </div>
                ${campo("endereco", "Endereço", c.endereco)}
                <div class="campo"><span>Logo</span>${editorFoto("cf-logo", c.logoUrl)}</div>
            </div>
            <div class="config-bloco">
                <h3><i class="fa-solid fa-bullhorn"></i> Vitrine</h3>
                ${campo("avisoTopo", "Faixa de aviso no topo", c.avisoTopo)}
                ${campo("heroTag", "Etiqueta do destaque", c.heroTag)}
                ${campo("heroTitulo", "Título principal", c.heroTitulo)}
                <label class="campo"><span>Texto de apoio</span><textarea id="cf-heroSubtitulo" rows="3">${esc(c.heroSubtitulo || "")}</textarea></label>
                <p class="campo-ajuda">O produto da “Oferta da semana” é escolhido entre os produtos em destaque que estão em oferta.</p>
            </div>
            <div class="config-bloco">
                <h3><i class="fa-solid fa-truck-fast"></i> Entrega</h3>
                <div class="linha-switch"><label class="switch"><input type="checkbox" id="cf-entregaDisponivel" ${c.entregaDisponivel !== false ? "checked" : ""}><span></span></label> Fazer entregas</div>
                <div class="campo-linha">
                    ${campo("freteGratisAcima", "Frete grátis acima de (R$)", c.freteGratisAcima || "", "number", 'min="0" step="1" placeholder="Desligado"')}
                    ${campo("pedidoMinimoEntrega", "Pedido mínimo p/ entrega (R$)", c.pedidoMinimoEntrega || "", "number", 'min="0" step="1" placeholder="Sem mínimo"')}
                </div>
                <div class="campo"><span>Bairros atendidos e taxa <em>(0 = grátis · vazio = a combinar)</em></span>
                    <div class="bairros-lista" id="cf-bairros">${(c.bairros || []).map(linhaBairro).join("")}</div>
                    <button type="button" class="btn btn-fantasma btn-sm" id="cf-bairro-add" style="align-self:flex-start"><i class="fa-solid fa-plus"></i> Adicionar bairro</button>
                </div>
            </div>
            <div class="config-bloco">
                <h3><i class="fa-solid fa-store"></i> Retirada na loja</h3>
                <div class="linha-switch"><label class="switch"><input type="checkbox" id="cf-retiradaDisponivel" ${c.retiradaDisponivel !== false ? "checked" : ""}><span></span></label> Permitir retirada</div>
                <div class="campo"><span>Dias de retirada</span><div class="checks">${DIAS.map((d, i) => `<label class="check"><input type="checkbox" class="cf-dia" value="${i}" ${(c.retiradaDias || []).includes(i) ? "checked" : ""}> ${d}</label>`).join("")}</div></div>
                <div class="campo-linha">
                    ${campo("retiradaHoraInicio", "Das", c.retiradaHoraInicio, "time")}
                    ${campo("retiradaHoraFim", "Até", c.retiradaHoraFim, "time")}
                    <label class="campo"><span>Intervalo</span><select id="cf-retiradaIntervalo">${[15, 30, 60].map((m) => `<option value="${m}" ${Number(c.retiradaIntervalo) === m ? "selected" : ""}>${m} min</option>`).join("")}</select></label>
                </div>
                <div class="campo-linha">
                    ${campo("retiradaPausaInicio", "Fecha ao meio-dia das", c.retiradaPausaInicio || "", "time")}
                    ${campo("retiradaPausaFim", "Reabre às", c.retiradaPausaFim || "", "time")}
                </div>
                <div class="linha-switch"><label class="switch"><input type="checkbox" id="cf-retiradaSabadoSemPausa" ${c.retiradaSabadoSemPausa ? "checked" : ""}><span></span></label> Sábado não fecha ao meio-dia</div>
                <p class="campo-ajuda" style="margin:-2px 0 12px">Os horários do intervalo não aparecem para o cliente agendar a retirada. Deixe os dois campos vazios se a loja não fecha.</p>
                <h3 style="margin-top:8px"><i class="fa-solid fa-wallet"></i> Pagamento</h3>
                <div class="campo"><span>Formas aceitas</span><div class="checks">${FORMAS.map((f) => `<label class="check"><input type="checkbox" class="cf-forma" value="${f}" ${(c.formasPagamento || []).includes(f) ? "checked" : ""}> ${f}</label>`).join("")}</div></div>
                <label class="campo"><span>Aviso sobre o pagamento</span><textarea id="cf-avisoPagamento" rows="3">${esc(c.avisoPagamento || "")}</textarea></label>
            </div>
            <div class="config-bloco">
                <h3><i class="fa-solid fa-lock"></i> Acesso ao painel</h3>
                ${campo("senhaAdmin", "Senha do painel", c.senhaAdmin, "text")}
                <p class="campo-ajuda">Esta senha protege o painel neste site de demonstração. Para uso com vários aparelhos, o ideal é ligar um login de verdade (ex.: Firebase).</p>
            </div>
            <div class="config-bloco">
                <h3><i class="fa-solid fa-cloud-arrow-down"></i> Backup dos dados</h3>
                <p class="campo-ajuda" style="margin-bottom:12px">Os dados ficam salvos neste navegador. Baixe um backup de vez em quando (e antes de trocar de computador).</p>
                <div class="botoes">
                    <button type="button" class="btn btn-fantasma" id="cf-exportar"><i class="fa-solid fa-download"></i> Baixar backup</button>
                    <label class="btn btn-fantasma"><i class="fa-solid fa-upload"></i> Restaurar backup<input type="file" accept="application/json,.json" id="cf-importar" hidden></label>
                    <button type="button" class="btn btn-fantasma" id="cf-exemplo" style="color:var(--perigo)"><i class="fa-solid fa-rotate-left"></i> Voltar aos dados de exemplo</button>
                </div>
            </div>`;
        ligarEditorFoto("cf-logo");
        $("#cf-bairro-add").onclick = () => { $("#cf-bairros").insertAdjacentHTML("beforeend", linhaBairro({ nome: "", taxa: "" })); $("#cf-bairros .bairro-linha:last-child input").focus(); };
        $("#cf-bairros").addEventListener("click", (e) => { const b = e.target.closest("[data-bairro-del]"); if (b) b.closest(".bairro-linha").remove(); });
        $("#cf-exportar").onclick = () => {
            const blob = new Blob([JSON.stringify(D, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob); a.download = `backup-agropecuaria-cb-${hojeChave()}.json`; a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            toast("Backup baixado.");
        };
        $("#cf-importar").onchange = (e) => {
            const f = e.target.files[0]; if (!f) return;
            f.text().then((t) => {
                try { D = AgroDB.importar(t); aplicarMarca(); RENDER.config(); atualizarBadges(); toast("Backup restaurado."); }
                catch (err) { toast("Arquivo de backup inválido.", true); }
            });
        };
        $("#cf-exemplo").onclick = () => confirmar("Apagar tudo o que foi alterado e voltar aos dados de exemplo? Produtos, pedidos e lançamentos atuais serão perdidos.", "Voltar aos dados de exemplo", () => {
            D = AgroDB.restaurarExemplo(); aplicarMarca(); RENDER.config(); atualizarBadges(); toast("Dados de exemplo restaurados.");
        });
    };
    $("#btn-salvar-config").addEventListener("click", () => {
        const v = (id) => $(`#cf-${id}`).value.trim();
        const c = D.config;
        const whats = v("whatsapp").replace(/\D/g, "");
        if (whats.length < 12) { $("#cf-whatsapp").classList.add("erro"); toast("WhatsApp inválido: use 55 + DDD + número.", true); return; }
        if (!v("senhaAdmin")) { $("#cf-senhaAdmin").classList.add("erro"); toast("A senha não pode ficar vazia.", true); return; }
        Object.assign(c, {
            nomeLoja: v("nomeLoja") || c.nomeLoja, slogan: v("slogan"), whatsapp: whats, telefoneExibicao: v("telefoneExibicao"),
            instagram: v("instagram").replace("@", ""), horarioTexto: v("horarioTexto"), endereco: v("endereco"), logoUrl: $("#cf-logo-valor").value,
            avisoTopo: v("avisoTopo"), heroTag: v("heroTag"), heroTitulo: v("heroTitulo"), heroSubtitulo: v("heroSubtitulo"),
            entregaDisponivel: $("#cf-entregaDisponivel").checked, retiradaDisponivel: $("#cf-retiradaDisponivel").checked,
            freteGratisAcima: num(v("freteGratisAcima")), pedidoMinimoEntrega: num(v("pedidoMinimoEntrega")),
            bairros: $$("#cf-bairros .bairro-linha").map((l) => ({ nome: $(".bairro-nome", l).value.trim(), taxa: $(".bairro-taxa", l).value === "" ? null : num($(".bairro-taxa", l).value) })).filter((b) => b.nome),
            retiradaDias: $$(".cf-dia:checked").map((x) => Number(x.value)),
            retiradaHoraInicio: v("retiradaHoraInicio") || "08:00", retiradaHoraFim: v("retiradaHoraFim") || "18:00", retiradaIntervalo: Number($("#cf-retiradaIntervalo").value),
            retiradaPausaInicio: v("retiradaPausaInicio"), retiradaPausaFim: v("retiradaPausaFim"), retiradaSabadoSemPausa: $("#cf-retiradaSabadoSemPausa").checked,
            formasPagamento: $$(".cf-forma:checked").map((x) => x.value), avisoPagamento: v("avisoPagamento"), senhaAdmin: v("senhaAdmin"),
        });
        if (!c.formasPagamento.length) c.formasPagamento = ["PIX"];
        salvar(); aplicarMarca(); RENDER.config();
        toast("Configurações salvas. A loja já está atualizada.");
    });

    // ─── SINCRONIA COM A LOJA (outra aba) ────────────────────────────────────
    AgroDB.aoMudarEmOutraAba((novo) => {
        const antes = D.pedidos.length;
        D = novo;
        atualizarBadges();
        if ($("#modal-fundo").hidden && !$("#app").hidden && abaAtual !== "config") RENDER[abaAtual]();
        if (D.pedidos.length > antes) toast(`Novo pedido recebido: #${D.pedidos[0].codigo}`);
    });

    // ─── INÍCIO ──────────────────────────────────────────────────────────────
    aplicarMarca();
    let logado = false;
    try { logado = sessionStorage.getItem(CHAVE_SESSAO) === "1"; } catch (e) { /* ignora */ }
    if (logado) entrar();
})();
