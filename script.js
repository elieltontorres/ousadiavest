/* =========================================================
   Sistema Ousadia Vest - Lógica Completa
   Autor Original: Elielton Torres
   ========================================================= */

/* -------------------------
   0. UTILITÁRIOS
------------------------- */
function gerarId() {
    try {
        if (crypto?.randomUUID) return crypto.randomUUID();
    } catch (_) { }
    return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

const formatadorBRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});
const formatar = v => formatadorBRL.format(Number(v) || 0);
const reaisParaCentavos = v => Math.round(Number(v || 0) * 100);
const centavosParaReais = c => Number(c || 0) / 100;

/* -------------------------
   1. LOCALSTORAGE / ESTADO
------------------------- */
const K = {
    PRODUTOS: "ousadia_produtos_v1",
    CARRINHO: "ousadia_carrinho_v1",
    CAIXA: "ousadia_caixaDia_v1",
    VENDAS: "ousadia_vendasDoDia_v1",
    CAIXA_ANT: "ousadia_caixaAnterior_v1",
    ESTOQUE_ANT: "ousadia_estoqueAnterior_v1"
};

let produtos = JSON.parse(localStorage.getItem(K.PRODUTOS) || "[]");
let carrinho = JSON.parse(localStorage.getItem(K.CARRINHO) || "[]");
let caixaDia = Number(localStorage.getItem(K.CAIXA) || 0);
let vendasDoDia = JSON.parse(localStorage.getItem(K.VENDAS) || "[]");
let caixaAnterior = Number(localStorage.getItem(K.CAIXA_ANT) || 0);
let estoqueAnterior = Number(localStorage.getItem(K.ESTOQUE_ANT) || 0);

// Garante estrutura correta nos dados antigos
produtos = produtos.map(p => ({
    ...p,
    id: p.id || gerarId(),
    quantidade: Number(p.quantidade || 0),
    compra: Number(p.compra || 0),
    venda: Number(p.venda || 0),
    ativo: p.quantidade > 0
}));

function salvarTudo() {
    localStorage.setItem(K.PRODUTOS, JSON.stringify(produtos));
    localStorage.setItem(K.CARRINHO, JSON.stringify(carrinho));
    localStorage.setItem(K.CAIXA, caixaDia);
    localStorage.setItem(K.VENDAS, JSON.stringify(vendasDoDia));
    localStorage.setItem(K.CAIXA_ANT, caixaAnterior);
    localStorage.setItem(K.ESTOQUE_ANT, estoqueAnterior);
}

/* -------------------------
   2. DOM ELEMENTS
------------------------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

const tbodyProdutos = $("#tabela-corpo");
const totalEstoqueEl = $("#total-estoque");
const carrinhoListaEl = $("#carrinho-lista");
const miniCarrinhoEl = $("#mini-carrinho");
const carrinhoTotalEl = $("#carrinho-total");
const caixaDiaEl = $("#caixa-dia");
const caixaAnteriorEl = $("#caixa-anterior");
const inputBusca = $("#input-busca"); // Elemento de busca

const modalEditar = $("#modal-editar");
const editarIdEl = $("#editar-id");

const inputNome = $("#nome");
const inputQuantidade = $("#quantidade");
const inputCompra = $("#compra");
const inputVenda = $("#venda");

const btnAdicionar = $("#btn-adicionar");
const btnFinalizar = $("#btn-finalizar");
const btnFechar = $("#btn-fechar");

/* -------------------------
   3. RENDERIZAÇÃO
------------------------- */
function calcularTotalEstoque() {
    let totCent = 0;
    for (const p of produtos)
        totCent += reaisParaCentavos(p.venda) * p.quantidade;
    return {
        totalCentavos: totCent,
        totalReais: centavosParaReais(totCent)
    };
}

function atualizarTabela() {
    if (!tbodyProdutos) return;
    tbodyProdutos.innerHTML = "";
    const frag = document.createDocumentFragment();

    // Filtro de busca
    const termoBusca = inputBusca ? inputBusca.value.trim().toLowerCase() : "";

    // Ordenação: Ativos primeiro
    const lista = [...produtos].sort((a, b) => Number(b.ativo) - Number(a.ativo));

    for (const p of lista) {
        // Se houver busca e o nome não corresponder, pula este item
        if (termoBusca && !p.nome.toLowerCase().includes(termoBusca)) {
            continue;
        }

        const tr = document.createElement("tr");
        if (!p.ativo) tr.classList.add("inativo");

        const criar = (label, texto) => {
            const td = document.createElement("td");
            td.setAttribute("data-label", label);
            td.textContent = texto;
            return td;
        };

        tr.appendChild(criar("Produto", p.nome));
        tr.appendChild(criar("Qtd", p.quantidade));
        tr.appendChild(criar("Custo", formatar(p.compra)));
        tr.appendChild(criar("Venda", formatar(p.venda)));
        tr.appendChild(criar("Lucro Unit.", formatar(p.venda - p.compra)));
        tr.appendChild(criar("Total Venda", formatar(p.venda * p.quantidade)));

        const tdAcoes = document.createElement("td");
        tdAcoes.setAttribute("data-label", "Ações");

        const btnV = document.createElement("button");
        btnV.className = "btn btn-venda";
        btnV.textContent = "Vender";
        btnV.dataset.id = p.id;
        btnV.dataset.action = "vender";
        btnV.disabled = !p.ativo;

        const btnE = document.createElement("button");
        btnE.className = "btn btn-editar";
        btnE.textContent = "Editar";
        btnE.dataset.id = p.id;
        btnE.dataset.action = "editar";

        tdAcoes.append(btnV, btnE);
        tr.appendChild(tdAcoes);

        frag.appendChild(tr);
    }

    if (frag.childElementCount === 0 && termoBusca) {
        // Mensagem se nada for encontrado
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 7;
        td.textContent = "Nenhum produto encontrado.";
        td.style.textAlign = "center";
        td.style.color = "#777";
        td.style.padding = "20px";
        tr.appendChild(td);
        frag.appendChild(tr);
    }

    tbodyProdutos.appendChild(frag);

    const { totalReais } = calcularTotalEstoque();
    if (totalEstoqueEl) totalEstoqueEl.textContent = formatar(totalReais);
    if (caixaDiaEl) caixaDiaEl.textContent = formatar(caixaDia);
    if (caixaAnteriorEl) caixaAnteriorEl.textContent = formatar(caixaAnterior);
}

function atualizarCarrinhoUI() {
    if (!carrinhoListaEl) return;
    carrinhoListaEl.innerHTML = "";

    if (!carrinho.length) {
        if (miniCarrinhoEl) miniCarrinhoEl.style.display = "none";
        if (carrinhoTotalEl) carrinhoTotalEl.textContent = formatar(0);
        return;
    }

    if (miniCarrinhoEl) miniCarrinhoEl.style.display = "block";

    const frag = document.createDocumentFragment();
    let totCent = 0;

    carrinho.forEach((item, i) => {
        const li = document.createElement("li");

        // Texto do produto
        const spanTexto = document.createElement("span");
        spanTexto.textContent = `${item.nome} (${formatar(item.valor)})`;

        // Botão remover
        const btnR = document.createElement("button");
        btnR.textContent = "✖";
        btnR.dataset.action = "remover-carrinho";
        btnR.dataset.index = i;
        btnR.title = "Remover item";
        // Estilo inline mínimo para o botão, já que o CSS cuida do resto
        btnR.style.marginLeft = "10px";
        btnR.style.color = "red";
        btnR.style.background = "none";
        btnR.style.border = "none";
        btnR.style.cursor = "pointer";
        btnR.style.fontWeight = "bold";

        li.appendChild(spanTexto);
        li.appendChild(btnR);
        frag.appendChild(li);

        totCent += reaisParaCentavos(item.valor);
    });

    carrinhoListaEl.appendChild(frag);
    if (carrinhoTotalEl) carrinhoTotalEl.textContent = formatar(centavosParaReais(totCent));
}

function render() {
    atualizarTabela();
    atualizarCarrinhoUI();
    salvarTudo();
}

/* -------------------------
   4. NAVEGAÇÃO
------------------------- */
window.navegar = function (idSecao, btn) {
    $$('.secao').forEach(s => s.classList.remove('active'));
    const secao = document.getElementById(idSecao);
    if (secao) secao.classList.add('active');

    $$('aside nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
};

window.sair = function () {
    if (confirm("Deseja realmente sair?")) {
        $("#sistema").style.display = "none";
        $("#login-tela").style.display = "flex";
        $("#login-usuario").value = "";
        $("#login-senha").value = "";
    }
};

/* -------------------------
   5. OPERAÇÕES
------------------------- */
function adicionarProduto() {
    const nome = inputNome.value.trim();
    const qtd = Number(inputQuantidade.value);
    const compra = Number(inputCompra.value);
    const venda = Number(inputVenda.value);

    if (!nome || qtd < 0 || compra < 0 || venda <= 0)
        return alert("Preencha corretamente os campos.");

    produtos.push({
        id: gerarId(),
        nome,
        quantidade: qtd,
        compra,
        venda,
        ativo: qtd > 0
    });

    inputNome.value = "";
    inputQuantidade.value = "";
    inputCompra.value = "";
    inputVenda.value = "";

    render();
    alert("Produto cadastrado!");
}

function venderProdutoPorId(id) {
    const p = produtos.find(x => x.id === id);
    if (!p || p.quantidade <= 0) return alert("Sem estoque!");

    carrinho.push({ idOriginal: p.id, nome: p.nome, valor: p.venda });

    p.quantidade--;
    p.ativo = p.quantidade > 0;

    render();
}

function removerDoCarrinho(i) {
    i = Number(i);
    if (i < 0 || i >= carrinho.length) return;

    const item = carrinho[i];
    const p = produtos.find(x => x.id === item.idOriginal);

    if (p) {
        p.quantidade++;
        p.ativo = true;
    }

    carrinho.splice(i, 1);
    render();
}

function finalizarVenda() {
    if (!carrinho.length) return alert("Carrinho vazio!");

    const totCent = carrinho.reduce((a, i) => a + reaisParaCentavos(i.valor), 0);
    const total = centavosParaReais(totCent);

    if (!confirm(`Confirmar venda de ${formatar(total)}?`)) return;

    caixaDia = Number((caixaDia + total).toFixed(2));

    const stamp = new Date().toISOString();
    vendasDoDia.push(...carrinho.map(i => ({ ...i, vendidoEm: stamp })));

    carrinho = [];
    render();
    alert("Venda realizada com sucesso!");
}

/* -------------------------
   6. FECHAMENTO + PDF
------------------------- */
function fecharCaixaEGerarPDF() {
    if (!caixaDia && !vendasDoDia.length) return alert("Nenhuma venda hoje.");
    if (!confirm("Fechar caixa e gerar PDF?")) return;

    const { totalReais: estoqueAtual } = calcularTotalEstoque();

    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) return alert("Erro: Conecte-se à internet para gerar o PDF (jsPDF não carregado).");

    const doc = new jsPDF();
    const data = new Date().toLocaleString();

    doc.setFontSize(18);
    doc.text("Fechamento - Ousadia Vest", 14, 18);
    doc.setFontSize(11);
    doc.text(`Data: ${data}`, 14, 26);

    doc.text(`Caixa anterior: ${formatar(caixaAnterior)}`, 14, 40);
    doc.text(`Estoque anterior: ${formatar(estoqueAnterior)}`, 14, 48);

    let y = 62;

    doc.text("Resumo de Vendas Hoje:", 14, y);
    y += 8;

    if (!vendasDoDia.length) {
        doc.text("Nenhuma venda.", 14, y);
        y += 8;
    } else {
        const agrup = {};
        for (const v of vendasDoDia) {
            if (!agrup[v.nome])
                agrup[v.nome] = { qtd: 0, totalCent: 0 };
            agrup[v.nome].qtd++;
            agrup[v.nome].totalCent += reaisParaCentavos(v.valor);
        }
        for (const nome in agrup) {
            if (y > 275) { doc.addPage(); y = 20; }
            doc.text(`${nome} — Qtd: ${agrup[nome].qtd} — Total: ${formatar(centavosParaReais(agrup[nome].totalCent))}`, 14, y);
            y += 7;
        }
    }

    if (y > 260) { doc.addPage(); y = 20; }

    doc.setLineWidth(0.5);
    doc.line(14, y + 4, 196, y + 4);

    doc.setFontSize(14);
    doc.text(`TOTAL DO DIA: ${formatar(caixaDia)}`, 14, y + 16);

    doc.save(`fechamento_${new Date().toLocaleDateString('pt-BR').replace(/\//g, "-")}.pdf`);

    // Atualiza valores para o próximo dia
    caixaAnterior = caixaDia;
    estoqueAnterior = estoqueAtual;
    caixaDia = 0;
    vendasDoDia = [];

    salvarTudo();
    render();

    alert("Fechamento concluído! Caixa zerado para amanhã.");
}

/* -------------------------
   7. EVENTOS
------------------------- */
if (tbodyProdutos) {
    tbodyProdutos.addEventListener("click", e => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.action === "vender") venderProdutoPorId(b.dataset.id);
        if (b.dataset.action === "editar") abrirModalEdicao(b.dataset.id);
    });
}

if (carrinhoListaEl) {
    carrinhoListaEl.addEventListener("click", e => {
        const b = e.target.closest("button");
        if (b?.dataset.action === "remover-carrinho")
            removerDoCarrinho(b.dataset.index);
    });
}

// Evento de busca em tempo real
if (inputBusca) {
    inputBusca.addEventListener("input", () => {
        atualizarTabela(); // Re-renderiza a tabela a cada letra digitada
    });
}

if (btnAdicionar) btnAdicionar.addEventListener("click", adicionarProduto);
if (btnFinalizar) btnFinalizar.addEventListener("click", finalizarVenda);
if (btnFechar) btnFechar.addEventListener("click", fecharCaixaEGerarPDF);

/* -------------------------
   8. MODAL
------------------------- */
function abrirModalEdicao(id) {
    const p = produtos.find(x => x.id === id);
    if (!p) return;

    if (editarIdEl) editarIdEl.value = p.id;
    if ($("#editar-nome")) $("#editar-nome").value = p.nome;
    if ($("#editar-quantidade")) $("#editar-quantidade").value = p.quantidade;
    if ($("#editar-compra")) $("#editar-compra").value = p.compra;
    if ($("#editar-venda")) $("#editar-venda").value = p.venda;

    if (modalEditar) modalEditar.style.display = "flex";
}

const btnSalvar = $("#btn-salvar");
if (btnSalvar) {
    btnSalvar.addEventListener("click", () => {
        const id = editarIdEl.value;
        const p = produtos.find(x => x.id === id);
        if (!p) return;

        const nome = $("#editar-nome").value.trim();
        const qtd = Number($("#editar-quantidade").value);
        const compra = Number($("#editar-compra").value);
        const venda = Number($("#editar-venda").value);

        if (!nome || qtd < 0 || compra < 0 || venda <= 0)
            return alert("Campos inválidos.");

        p.nome = nome;
        p.quantidade = qtd;
        p.compra = compra;
        p.venda = venda;
        p.ativo = qtd > 0;

        modalEditar.style.display = "none";
        render();
    });
}

const btnExcluir = $("#btn-excluir");
if (btnExcluir) {
    btnExcluir.addEventListener("click", () => {
        if (!confirm("Excluir produto permanentemente?")) return;
        const id = editarIdEl.value;
        produtos = produtos.filter(p => p.id !== id);

        modalEditar.style.display = "none";
        render();
    });
}

const btnCancelar = $("#btn-cancelar");
if (btnCancelar) {
    btnCancelar.addEventListener("click", () => {
        if (modalEditar) modalEditar.style.display = "none";
    });
}

window.addEventListener("click", e => {
    if (e.target === modalEditar) modalEditar.style.display = "none";
});

/* -------------------------
   9. LOGIN DO SISTEMA
------------------------- */
const USER = "admin";
const PASS = "123";

const loginTela = document.getElementById("login-tela");
const sistemaTela = document.getElementById("sistema");
const btnLogin = document.getElementById("btn-login");
const inputUsuario = document.getElementById("login-usuario");
const inputSenha = document.getElementById("login-senha");

if (btnLogin) {
    btnLogin.addEventListener("click", (e) => {
        const u = inputUsuario.value.trim();
        const s = inputSenha.value.trim();
        if (u === USER && s === PASS) {
            loginTela.style.display = "none";
            sistemaTela.style.display = "flex";
            render();
        } else {
            alert("Usuário ou senha incorretos! (Tente: admin / 123)");
        }
    });
}

/* -------------------------
   10. INICIALIZAÇÃO
------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    render();
    console.log("Sistema Ousadia Vest Carregado!");
});