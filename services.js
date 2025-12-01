document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES DO DOM ---
    const servicosList = document.getElementById('servicosList');
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeModalSpan = document.querySelector('.close-modal');
    const exportPdfBtn = document.querySelector('.btn-export');
    const importPdfBtn = document.querySelector('.btn-import');
    const pdfInput = document.getElementById('pdfInput');

    // --- ESTADO DA APLICAÇÃO ---
    const STORAGE_KEY = 'servicosManutencao';
    let servicos = carregarServicos();

    // --- FUNÇÕES DE INICIALIZAÇÃO ---
    function init() {
        configurarEventListeners();
        renderizarServicos();
    }

    function configurarEventListeners() {
        // Delegação de eventos para botões de ação nos cards
        servicosList.addEventListener('click', handleServiceListClick);

        // Event listeners para o modal
        closeModalSpan.addEventListener('click', fecharModal);
        window.addEventListener('click', (event) => {
            if (event.target === imageModal) {
                fecharModal();
            }
        });

        // Event listeners para PDF
        exportPdfBtn.addEventListener('click', exportarParaPDF);
        importPdfBtn.addEventListener('click', () => pdfInput.click());
        pdfInput.addEventListener('change', importarDePDF);
    }

    // --- GERENCIAMENTO DE ESTADO (LocalStorage) ---
    function carregarServicos() {
        const servicosSalvos = localStorage.getItem(STORAGE_KEY);
        return servicosSalvos ? JSON.parse(servicosSalvos) : [];
    }

    function salvarServicos() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(servicos));
    }

    // --- LÓGICA DE SERVIÇOS (CRUD) ---
    function editarServico(index) {
        const servicoId = servicos[index].id;
        // Redireciona para a página principal, passando o ID do serviço como parâmetro
        window.location.href = `index.html?edit=${servicoId}`;
    }

    function excluirServico(index) {
        if (confirm(`Tem certeza que deseja excluir o serviço "${servicos[index].assunto}"?`)) {
            servicos.splice(index, 1);
            salvarServicos();
            renderizarServicos(); // Re-renderiza a lista na página atual
        }
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

    // --- LÓGICA DE PDF ---
    function exportarParaPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        const servicosJSON = JSON.stringify(servicos);
        const dataToEmbed = `---SERVICOS_JSON_START---${servicosJSON}---SERVICOS_JSON_END---`;
        doc.setTextColor(255, 255, 255);
        doc.text(dataToEmbed, -100, -100);

        const hoje = new Date();
        const dataFormatada = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const primaryColor = "#4a69bd";
        const secondaryColor = "#788ca3";
        const textColor = "#333333";

        const addHeader = () => {
            doc.setFontSize(10);
            doc.setTextColor(primaryColor);
            doc.text("Logo da Empresa", 15, 15);

            doc.setFontSize(18);
            doc.setTextColor(textColor);
            doc.text("Relatório de Serviços de Manutenção", doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.setTextColor(secondaryColor);
            doc.text(`Data de Exportação: ${dataFormatada}`, doc.internal.pageSize.getWidth() - 15, 15, { align: 'right' });

            doc.setDrawColor(primaryColor);
            doc.setLineWidth(0.5);
            doc.line(15, 25, doc.internal.pageSize.getWidth() - 15, 25);
        };

        const addFooter = () => {
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(secondaryColor);
                doc.text(`Página ${i} de ${totalPages}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            }
        };

        const addPageWithHeader = () => {
            doc.addPage();
            addHeader();
            return 35;
        };

        addHeader();
        let y = 35;

        servicos.forEach((servico) => {
            const cardHeight = calculateCardHeight(servico, doc);

            if (y + cardHeight > doc.internal.pageSize.getHeight() - 20) {
                y = addPageWithHeader();
            }

            doc.setDrawColor("#e3e3e3");
            doc.setLineWidth(0.2);
            doc.roundedRect(15, y, doc.internal.pageSize.getWidth() - 30, cardHeight - 5, 3, 3, 'D');

            let innerY = y + 10;

            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(primaryColor);
            doc.text(servico.assunto, 20, innerY);

            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(secondaryColor);
            doc.text(`Registrado em: ${servico.data}`, doc.internal.pageSize.getWidth() - 20, innerY, { align: 'right' });

            innerY += 6;
            doc.setDrawColor("#e3e3e3");
            doc.setLineWidth(0.1);
            doc.line(20, innerY, doc.internal.pageSize.getWidth() - 20, innerY);
            innerY += 6;

            const addText = (label, text) => {
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(textColor);

                const labelWidth = doc.getTextWidth(label);
                const textContent = doc.splitTextToSize(text || 'Não informado', doc.internal.pageSize.getWidth() - 40 - labelWidth - 2);

                doc.text(label, 20, innerY);
                doc.setFont(undefined, 'normal');
                doc.text(textContent, 20 + labelWidth + 2, innerY);

                innerY += (textContent.length * 5) + 4;
            };

            addText("Descrição:", servico.descricao);
            addText("Conclusão:", servico.conclusao);

            if (servico.imagens && servico.imagens.length > 0) {
                innerY += 2;
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.text("Imagens:", 20, innerY);
                innerY += 6;

                const imgWidth = 40;
                const imgHeight = 40;
                const gap = 4;
                const imagesPerRow = 4;
                const startX = 20;

                servico.imagens.forEach((imgData, i) => {
                    const imgIndexInRow = i % imagesPerRow;

                    if (i > 0 && imgIndexInRow === 0) {
                        innerY += imgHeight + gap;
                    }

                    const currentX = startX + imgIndexInRow * (imgWidth + gap);

                    try {
                        doc.addImage(imgData, 'JPEG', currentX, innerY, imgWidth, imgHeight);
                        doc.setDrawColor(secondaryColor);
                        doc.setLineWidth(0.1);
                        doc.rect(currentX, innerY, imgWidth, imgHeight);
                    } catch (e) {
                        console.error("Erro ao adicionar imagem ao PDF:", e);
                        doc.text("Erro", currentX + imgWidth / 2, innerY + imgHeight / 2, { align: 'center' });
                    }
                });
            }

            y += cardHeight;
        });

        addFooter();

        try {
            const pdfOutput = doc.output('blob');
            const pdfName = `Relatorio_Servicos_${dataFormatada.replace(/\//g, '-')}.pdf`;
            const link = document.createElement('a');
            link.href = URL.createObjectURL(pdfOutput);
            link.download = pdfName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Erro ao gerar Blob, usando doc.save() como fallback", e);
            doc.save(`Relatorio_Servicos_${dataFormatada.replace(/\//g, '-')}.pdf`);
        }
    }

    function calculateCardHeight(servico, doc) {
        let height = 25;

        const addTextHeight = (text, textWidth) => {
            const textContent = doc.splitTextToSize(text || 'Não informado', doc.internal.pageSize.getWidth() - textWidth);
            return (textContent.length * 5) + 4;
        };

        height += addTextHeight(servico.descricao, 55);
        height += addTextHeight(servico.conclusao, 55);

        if (servico.imagens && servico.imagens.length > 0) {
            height += 8;
            const imagesPerRow = 4;
            const numRows = Math.ceil(servico.imagens.length / imagesPerRow);
            height += numRows * (40 + 4);
        }

        return height;
    }

    async function importarDePDF(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const pdfjsLib = window['pdfjs-dist/build/pdf'];
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

                const loadingTask = pdfjsLib.getDocument({ data: e.target.result });
                const pdf = await loadingTask.promise;
                let fullText = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map(item => item.str).join(' ');
                }

                let novosServicos = [];
                const jsonMatch = fullText.match(/---SERVICOS_JSON_START---(.*?)---SERVICOS_JSON_END---/);

                if (jsonMatch && jsonMatch[1]) {
                    novosServicos = JSON.parse(jsonMatch[1]);
                } else {
                    alert('Não foi possível encontrar dados de serviço importáveis neste PDF. O arquivo pode ser de uma versão antiga ou não conter um relatório válido.');
                    return;
                }

                if (novosServicos.length > 0) {
                    servicos = [...servicos, ...novosServicos];
                    salvarServicos();
                    renderizarServicos();
                    alert(`${novosServicos.length} serviço(s) importado(s) com sucesso!`);
                } else {
                    alert('Nenhum serviço foi encontrado nos dados do PDF.');
                }

            } catch (error) {
                console.error('Erro ao importar PDF:', error);
                alert('Falha ao importar o arquivo PDF. O arquivo pode estar corrompido ou em um formato inesperado.');
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // --- INICIA A APLICAÇÃO ---
    init();
});