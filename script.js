document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES DO DOM ---
    const assuntoInput = document.getElementById('assunto');
    const descricaoInput = document.getElementById('descricao');
    const conclusaoInput = document.getElementById('conclusao');
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    const dataAtualSpan = document.getElementById('dataAtual');
    const imageSection = document.querySelector('.image-section');
    const addServiceBtn = document.querySelector('.btn-add');
    const header = document.querySelector('.header');

    // Modal de Imagem
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeModalSpan = document.querySelector('.close-modal');

    // --- ESTADO DA APLICAÇÃO ---
    const STORAGE_KEY = 'servicosManutencao';
    let servicos = carregarServicos();
    let imagens = [];
    let servicoEmEdicaoIndex = null;

    // --- FUNÇÕES DE INICIALIZAÇÃO ---
    function init() {
        configurarDataAtual();
        configurarEventListeners();
        verificarEdicaoURL(); // Verifica se estamos editando um serviço
    }

    function configurarDataAtual() {
        const hoje = new Date();
        const dataFormatada = hoje.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        dataAtualSpan.textContent = dataFormatada;
    }

    function configurarEventListeners() {
        addServiceBtn.addEventListener('click', adicionarServico);
        imageInput.addEventListener('change', handleImageUpload);
        imageSection.addEventListener('click', () => imageInput.click());

        // Event listeners para o modal
        closeModalSpan.addEventListener('click', fecharModal);
        window.addEventListener('click', (event) => {
            if (event.target === imageModal) {
                fecharModal();
            }
        });

        // Delegação de eventos para botões de ação nos cards
        imagePreview.addEventListener('click', handleImagePreviewClick);
    }

    // --- GERENCIAMENTO DE ESTADO (LocalStorage) ---
    function carregarServicos() {
        const servicosSalvos = localStorage.getItem(STORAGE_KEY);
        return servicosSalvos ? JSON.parse(servicosSalvos) : [];
    }

    function salvarServicos() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(servicos));
    }

    // --- MANIPULAÇÃO DE IMAGENS ---
    async function handleImageUpload(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const originalButtonText = addServiceBtn.innerHTML;
        addServiceBtn.innerHTML = 'Processando imagens...';
        addServiceBtn.disabled = true;

        for (const file of files) {
            try {
                const resizedImage = await redimensionarImagem(file, 1024, 1024, 0.7);
                imagens.push(resizedImage);
            } catch (error) {
                console.error('Erro ao redimensionar imagem:', error);
                alert('Houve um erro ao processar uma das imagens.');
            }
        }

        renderizarImagens();
        addServiceBtn.innerHTML = originalButtonText;
        addServiceBtn.disabled = false;
    }

    function redimensionarImagem(file, maxWidth, maxHeight, quality) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = event => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    let { width, height } = img;
                    if (width > height) {
                        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                    } else {
                        if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = error => reject(error);
            };
            reader.onerror = error => reject(error);
        });
    }

    function renderizarImagens() {
        imagePreview.innerHTML = '';
        imagens.forEach((img, index) => {
            const div = document.createElement('div');
            div.className = 'image-item';
            div.innerHTML = `
                <img src="${img}" alt="Imagem ${index + 1}">
                <button class="remove-img" data-index="${index}">×</button>
            `;
            imagePreview.appendChild(div);
        });
    }

    function handleImagePreviewClick(event) {
        if (event.target.classList.contains('remove-img')) {
            const index = parseInt(event.target.dataset.index, 10);
            removerImagem(index);
        }
    }

    function removerImagem(index) {
        imagens.splice(index, 1);
        renderizarImagens();
    }

    // --- LÓGICA DE SERVIÇOS (CRUD) ---
    function adicionarServico() {
        if (servicoEmEdicaoIndex !== null) {
            atualizarServico();
            return;
        }

        const assunto = assuntoInput.value.trim();
        const descricao = descricaoInput.value.trim();
        const conclusao = conclusaoInput.value.trim();

        if (!assunto || !descricao || !conclusao) {
            const camposFaltando = [!assunto && 'Assunto', !descricao && 'Descrição', !conclusao && 'Conclusão'].filter(Boolean);
            alert(`Por favor, preencha os campos obrigatórios: ${camposFaltando.join(', ')}!`);
            return;
        }

        const servico = {
            id: Date.now(),
            assunto,
            descricao,
            conclusao,
            imagens: [...imagens],
            data: new Date().toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })
        };

        servicos.push(servico);
        salvarServicos();
        limparFormulario();
        alert('Serviço adicionado com sucesso!');
    }

    function atualizarServico() {
        const servico = servicos[servicoEmEdicaoIndex];
        servico.assunto = assuntoInput.value.trim();
        servico.descricao = descricaoInput.value.trim();
        servico.conclusao = conclusaoInput.value.trim();
        servico.imagens = [...imagens];

        salvarServicos();
        limparFormulario();
        alert('Serviço atualizado com sucesso!');
        // Redireciona para a lista após salvar
        window.location.href = 'services.html';
    }

    function verificarEdicaoURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const servicoIdParaEditar = urlParams.get('edit');

        if (servicoIdParaEditar) {
            const id = parseInt(servicoIdParaEditar, 10);
            const index = servicos.findIndex(s => s.id === id);
            if (index !== -1) {
                preencherFormularioParaEdicao(index);
            }
        }
    }

    function preencherFormularioParaEdicao(index) {
        servicoEmEdicaoIndex = index; // Define o índice do serviço que está sendo editado
        const servico = servicos[index]; // Pega os dados do serviço

        assuntoInput.value = servico.assunto;
        descricaoInput.value = servico.descricao;
        conclusaoInput.value = servico.conclusao;
        imagens = [...servico.imagens]; // Carrega as imagens do serviço
        renderizarImagens();

        addServiceBtn.textContent = '✓ Atualizar Serviço';
        header.scrollIntoView({ behavior: 'smooth' });
    }

    function limparFormulario() {
        assuntoInput.value = '';
        descricaoInput.value = '';
        conclusaoInput.value = '';
        imagens = [];
        imageInput.value = '';
        renderizarImagens();

        servicoEmEdicaoIndex = null;
        addServiceBtn.textContent = '✓ Adicionar Serviço';
    }

    function renderizarServicos() {
        if (servicos.length === 0) {
            servicosList.innerHTML = '<div class="no-services">Nenhum serviço registrado ainda.</div>';
            return;
        }

        servicosList.innerHTML = servicos.map((s, index) => `
            <div class="service-card" data-id="${s.id}">
                <p><strong>Assunto:</strong> ${s.assunto}</p>
                <p><strong>Descrição:</strong> ${s.descricao}</p>
                <p><strong>Conclusão:</strong> ${s.conclusao}</p>
                ${s.imagens.length > 0 ? `
                    <div class="service-card-images">
                        ${s.imagens.map(img => `
                            <img src="${img}" alt="Miniatura" class="service-card-thumbnail">
                        `).join('')}
                    </div>` : ''}
                <div class="service-date">Registrado em: ${s.data}</div>
                <div class="service-card-actions">
                    <button class="btn-edit" data-index="${index}">✏️ Editar</button>
                    <button class="btn-delete" data-index="${index}">🗑️ Excluir</button>
                </div>
            </div>
        `).join('');
    }

    function handleServiceListClick(event) {
        const target = event.target;
        const index = target.dataset.index;

        if (target.classList.contains('btn-edit')) {
            editarServico(parseInt(index, 10));
        } else if (target.classList.contains('btn-delete')) {
            excluirServico(parseInt(index, 10));
        } else if (target.classList.contains('service-card-thumbnail')) {
            abrirModal(target.src);
        }
    }

    // --- MODAL DE IMAGEM ---
    function abrirModal(imgSrc) {
        imageModal.style.display = "block";
        modalImage.src = imgSrc;
    }

    function fecharModal() {
        imageModal.style.display = "none";
    }

    // --- INICIA A APLICAÇÃO ---
    init();
});