// ================= CONFIG =================
const CSV_URL = "https://docs.google.com/spreadsheets/d/15TDcNeKQEjQf3WL_piRaNIRmQ44hzW9KZEJRY38NAI8/export?format=tsv";

let produtos = [];
let carrinho = [];
let produtoTemp = null;


// ================= UTIL =================
function limparPreco(valor) {
    if (!valor) return 0;

    return parseFloat(
        valor
            .toString()
            .replace(/[^\d.,]/g, "")
            .replace(/\./g, "")
            .replace(",", ".")
    ) || 0;
}

function formatarPreco(valor) {
    return valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


// ================= CARREGAR =================
async function carregarDados() {
    const container = document.getElementById("listaProdutos");

    try {
        const res = await fetch(CSV_URL);

        if (!res.ok) throw new Error("Erro na requisição");

        const text = await res.text();
        const linhas = text.split("\n");

        produtos = linhas.slice(1).map(l => {
            const col = l.split("\t");

            const nome = col[1]?.trim();

            if (!nome) return null;

            return {
                nome,
                precoFrac: limparPreco(col[8]),
                precoAtac: limparPreco(col[9])
            };
        }).filter(Boolean);

        if (produtos.length === 0) {
            container.innerHTML = `<div class="loading-aviso">Nenhum produto encontrado</div>`;
            return;
        }

        renderizarProdutos(produtos);

    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="loading-aviso">Erro ao carregar produtos</div>`;
    }
}


// ================= RENDER =================
function renderizarProdutos(lista) {
    const container = document.getElementById("listaProdutos");
    container.innerHTML = "";

    lista.forEach(prod => {
        const div = document.createElement("div");
        div.className = "produto";

        const nomeEsc = prod.nome.replace(/'/g, "\\'");

        div.innerHTML = `
            <div class="produto-nome">${prod.nome}</div>

            <div class="produto-precos">
                <button class="btn-fracionado"
                    onclick="abrirModalQtd('${nomeEsc}', ${prod.precoFrac}, 'Varejo')">
                    Varejo: R$ ${formatarPreco(prod.precoFrac)}
                </button>

                <button class="btn-atacado"
                    onclick="abrirModalQtd('${nomeEsc}', ${prod.precoAtac}, 'Atacado')">
                    Atacado: R$ ${formatarPreco(prod.precoAtac)}
                </button>
            </div>
        `;

        container.appendChild(div);
    });
}


// ================= MODAL =================
function abrirModalQtd(nome, preco, tipo) {
    produtoTemp = { nome, preco, tipo };

    document.getElementById("qtdProdutoNome").innerText = nome;
    document.getElementById("qtdProdutoTipo").innerText = tipo;

    const input = document.getElementById("inputQuantidade");
    input.value = "1";
    input.focus();

    document.getElementById("modalQtd").style.display = "flex";
}

function fecharModalQtd() {
    document.getElementById("modalQtd").style.display = "none";
}


// ================= CARRINHO =================
function atualizarCarrinho() {
    const contador = document.getElementById("contadorCarrinho");
    const lista = document.getElementById("itensCarrinho");
    const totalEl = document.getElementById("totalCarrinho");

    contador.innerText = carrinho.length;
    lista.innerHTML = "";

    let total = 0;

    carrinho.forEach((item, i) => {
        total += item.totalItem;

        const div = document.createElement("div");
        div.className = "linha-item-carrinho";

        div.innerHTML = `
            <div>
                <strong>${item.nome}</strong><br>
                <small>${item.quantidade}x R$ ${formatarPreco(item.preco)} (${item.tipo})</small>
            </div>

            <div>
                <strong>R$ ${formatarPreco(item.totalItem)}</strong>
                <button onclick="removerItem(${i})" class="btn-remover-item">🗑️</button>
            </div>
        `;

        lista.appendChild(div);
    });

    totalEl.innerText = formatarPreco(total);
}

function removerItem(i) {
    carrinho.splice(i, 1);
    atualizarCarrinho();
}


// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {

    carregarDados();

    // BUSCA
    document.getElementById("buscaProduto").addEventListener("input", e => {
        const termo = e.target.value.toLowerCase();

        const filtrados = produtos.filter(p =>
            p.nome.toLowerCase().includes(termo)
        );

        renderizarProdutos(filtrados);
    });

    // CARRINHO
    document.getElementById("btnCarrinho").onclick = () => {
        document.getElementById("modalCarrinho").style.display = "flex";
    };

    document.getElementById("fecharCarrinho").onclick = () => {
        document.getElementById("modalCarrinho").style.display = "none";
    };

    document.getElementById("limparCarrinho").onclick = () => {
        if (confirm("Deseja limpar o carrinho?")) {
            carrinho = [];
            atualizarCarrinho();
        }
    };

    // MODAL QTD
    document.getElementById("cancelarQtd").onclick = fecharModalQtd;

    document.getElementById("confirmarQtd").onclick = () => {
        const input = document.getElementById("inputQuantidade").value;

        let qtd = parseFloat(input.replace(",", "."));

        if (isNaN(qtd) || qtd <= 0) {
            alert("Digite uma quantidade válida");
            return;
        }

        carrinho.push({
            nome: produtoTemp.nome,
            preco: produtoTemp.preco,
            tipo: produtoTemp.tipo,
            quantidade: qtd,
            totalItem: produtoTemp.preco * qtd
        });

        atualizarCarrinho();
        fecharModalQtd();
    };

    // FINALIZAR
    document.getElementById("finalizarPedido").onclick = () => {

        const nomeCliente = document.getElementById("nomeCliente").value.trim();
        const doc = document.getElementById("documentoCliente").value.trim();

        if (!nomeCliente) {
            alert("Informe o nome do cliente");
            return;
        }

        if (carrinho.length === 0) {
            alert("Carrinho vazio");
            return;
        }

        let msg = `*NOVO PEDIDO - DARLLY*%0A`;
        msg += `Cliente: ${nomeCliente}%0A`;

        if (doc) msg += `Doc: ${doc}%0A`;

        msg += `--------------------%0A`;

        carrinho.forEach(item => {
            msg += `• ${item.nome}%0A`;
            msg += `  ${item.quantidade}x R$ ${formatarPreco(item.preco)} (${item.tipo})%0A`;
        });

        const total = document.getElementById("totalCarrinho").innerText;

        msg += `--------------------%0A`;
        msg += `*TOTAL: R$ ${total}*`;

        window.open(`https://wa.me/?text=${msg}`);
    };

});


// ================= PWA =================
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js")
        .then(() => console.log("PWA ativo 🚀"))
        .catch(err => console.log("Erro SW:", err));
}

