

    let photos = [];
    let reports = [];
    let editingId = null;
    let currentPdfUrl = null;
    let currentPdfName = '';

    const $ = id => document.getElementById(id);

    // Event listeners
    $('photoUpload').onclick = () => $('photoInput').click();
    $('photoInput').onchange = e => handlePhotos(e.target.files);
    $('pdfUpload').onclick = () => $('pdfInput').click();
    $('pdfInput').onchange = e => { if(e.target.files[0]) importPDF(e.target.files[0]); };
    $('btnGenerate').onclick = () => generatePDF();
    $('btnOptions').onclick = () => $('modal').classList.add('show');
    $('btnNew').onclick = newReport;
    $('btnCancel').onclick = () => $('modal').classList.remove('show');
    $('btnSaveNamed').onclick = () => { generatePDF($('fileName').value); $('modal').classList.remove('show'); };
    $('fileName').oninput = () => $('filePreview').textContent = ($('fileName').value || 'arquivo') + '.pdf';
    $('btnDownload').onclick = downloadPDF;
    $('btnSendEmail').onclick = () => $('emailModal').classList.add('show');
    $('btnCancelEmail').onclick = () => $('emailModal').classList.remove('show');
    $('btnSendEmailAction').onclick = () => sendEmail();
    $('btnTakePhoto').onclick = () => window.location.href = 'camera.html';

    function showStatus(msg, type) {
      const s = $('status');
      s.textContent = msg;
      s.className = 'status show ' + type;
      setTimeout(() => s.className = 'status', 4000);
    }

    function showImportInfo(msg, type) {
      const el = $('importInfo');
      el.innerHTML = msg;
      el.style.display = 'block';
      el.style.background = type === 'success' ? 'rgba(16,185,129,0.2)' : 
                            type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)';
      el.style.color = type === 'success' ? '#10b981' : 
                       type === 'error' ? '#ef4444' : '#a5b4fc';
    }

    // IMPORTAR PDF
    async function importPDF(file) {
      showImportInfo('⏳ Carregando PDF...', 'info');
      
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        showImportInfo(`⏳ Processando ${pdf.numPages} página(s)...`, 'info');
        
        let fullText = '';
        photos = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          
          // Extrair texto
          const textContent = await page.getTextContent();
          fullText += textContent.items.map(item => item.str).join(' ') + '\n';
          
          // Renderizar página como imagem
          const scale = 2;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          
          await page.render({ canvasContext: ctx, viewport }).promise;
          photos.push(canvas.toDataURL('image/jpeg', 0.85));
        }

        // Tentar extrair campos
        const subjectMatch = fullText.match(/Assunto:\s*([^\n]+)/i);
        if (subjectMatch) $('subject').value = subjectMatch[1].trim();

        const dateMatch = fullText.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (dateMatch) {
          const [d, m, y] = dateMatch[1].split('/');
          $('dateTime').value = `${y}-${m}-${d}T12:00`;
        }

        const descMatch = fullText.match(/Descrição:\s*([\s\S]*?)(?=Fotos:|Conclusão:|$)/i);
        if (descMatch) $('description').value = descMatch[1].trim().substring(0, 500);

        const concMatch = fullText.match(/Conclusão:\s*([\s\S]*?)$/i);
        if (concMatch) $('conclusion').value = concMatch[1].trim().substring(0, 500);

        renderPhotos();
        
        showImportInfo(`✅ PDF importado! ${pdf.numPages} página(s) convertida(s) em imagens.<br>Edite os campos e clique em "Gerar PDF".`, 'success');
        showStatus('✅ PDF importado com sucesso!', 'success');

      } catch (err) {
        console.error('Erro ao importar PDF:', err);
        showImportInfo('❌ Erro: ' + err.message, 'error');
        showStatus('❌ Erro ao importar PDF', 'error');
      }
    }

    // FOTOS
    function handlePhotos(files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = e => { photos.push(e.target.result); renderPhotos(); };
        reader.readAsDataURL(file);
      });
    }

    function renderPhotos() {
      $('photoCount').textContent = photos.length;
      $('photoGrid').innerHTML = photos.map((p, i) =>
        `<div class="photo-item"><img src="${p}"><button class="photo-remove" onclick="removePhoto(${i})">×</button></div>`
      ).join('');
    }

    function removePhoto(i) { photos.splice(i, 1); renderPhotos(); }

    // GERAR PDF
function generatePDF(customName) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const data = {
            dateTime: $('dateTime').value,
            subject: $('subject').value,
            description: $('description').value,
            conclusion: $('conclusion').value
        };

        // --- Document Settings ---
        const MARGIN = 15;
        const PAGE_WIDTH = doc.internal.pageSize.getWidth();
        const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
        const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
        const COLORS = {
            LIGHT_BLUE: '#E6F2FF',
            BORDER: '#CCCCCC',
            TEXT_DARK: '#333333',
            TEXT_LIGHT: '#00529B' // A darker blue for the title text for contrast
        };
        
        let yPos = MARGIN;
        let pageCount = 1;

        // --- Helper Functions ---
        const addHeader = () => {
            // Data e Hora
            const now = new Date();
            const dateTimeString = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(COLORS.TEXT_DARK);
            doc.text(dateTimeString, MARGIN, MARGIN + 5);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(COLORS.TEXT_DARK);
            const title = 'Relatório Diário de Atividades';
            doc.text(title, PAGE_WIDTH / 2, MARGIN + 5, { align: 'center' });
            yPos = MARGIN + 20;
        };

        const addFooter = () => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(COLORS.BORDER);
            const pageNumText = `Página ${pageCount}`;
            doc.text(pageNumText, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' });
        };
        
        const addPage = () => {
            doc.addPage();
            pageCount++;
            yPos = MARGIN;
            addFooter();
        };

        const checkPageBreak = (elementHeight) => {
            if (yPos + elementHeight > PAGE_HEIGHT - MARGIN - 10) {
                addPage();
            }
        };

        const drawBoxedSection = ({ title, textContent, photoContent }) => {
            const titleHeight = 10;
            const contentPadding = 5;
            let contentHeight = 0;
            let lines = [];

            // Calculate content height
            if (textContent) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                lines = doc.splitTextToSize(textContent, CONTENT_WIDTH - (contentPadding * 2));
                contentHeight = (lines.length * 4) + contentPadding;
            } else if (photoContent) {
                const photoWidth = (CONTENT_WIDTH - (contentPadding * 2) - 10) / 2;
                const photoHeight = photoWidth * 0.75;
                const numRows = Math.ceil(photos.length / 2);
                contentHeight = (numRows * photoHeight) + ((numRows - 1) * 5) + (contentPadding * 2);
            }

            const totalHeight = titleHeight + contentHeight + (contentPadding * 2);
            checkPageBreak(totalHeight);

            // Draw box
            doc.setDrawColor(COLORS.BORDER);
            doc.rect(MARGIN, yPos, CONTENT_WIDTH, totalHeight);
            
            // Draw title bar
            doc.setFillColor(COLORS.LIGHT_BLUE);
            doc.rect(MARGIN + 0.5, yPos + 0.5, CONTENT_WIDTH - 1, titleHeight, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(COLORS.TEXT_LIGHT);
            doc.text(title, MARGIN + contentPadding, yPos + titleHeight - 3);

            // Draw content
            const contentY = yPos + titleHeight + contentPadding + 2;
            if (textContent) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(COLORS.TEXT_DARK);
                doc.text(lines, MARGIN + contentPadding, contentY);
            } else if (photoContent) {
                const photoWidth = (CONTENT_WIDTH - (contentPadding * 2) - 5) / 2;
                const photoHeight = photoWidth * 0.75;
                let xPos = MARGIN + contentPadding;
                let photoY = contentY;

                photos.forEach((photo, index) => {
                    doc.addImage(photo, 'JPEG', xPos, photoY, photoWidth, photoHeight);
                    if ((index + 1) % 2 === 0) {
                        xPos = MARGIN + contentPadding;
                        photoY += photoHeight + 5;
                    } else {
                        xPos += photoWidth + 5;
                    }
                });
            }

            yPos += totalHeight + 10; // Add space between boxes
        };

        // --- PDF Content Generation ---
        addHeader();
        addFooter();

        if (data.subject) {
            drawBoxedSection({ title: 'Assunto', textContent: data.subject });
        }
        if (data.description) {
            drawBoxedSection({ title: 'Descrição', textContent: data.description });
        }
        if (data.conclusion) {
            drawBoxedSection({ title: 'Conclusão', textContent: data.conclusion });
        }
        if (photos.length > 0) {
            drawBoxedSection({ title: 'Fotos', photoContent: true });
        }

        // --- Finalize PDF ---
        const blob = doc.output('blob');
        if (currentPdfUrl) URL.revokeObjectURL(currentPdfUrl);
        currentPdfUrl = URL.createObjectURL(blob);
        currentPdfName = (customName || data.subject || 'relatorio') + '.pdf';

        $('pdfName').textContent = currentPdfName;
        $('btnOpen').href = currentPdfUrl;
        $('pdfBox').classList.add('show');

        const reportData = { id: editingId || Date.now(), ...data, photos: [...photos] };
        const idx = reports.findIndex(r => r.id === reportData.id);
        if (idx >= 0) reports[idx] = reportData;
        else reports.unshift(reportData);
        renderReports();

        showStatus('✅ PDF com seções em boxes gerado!', 'success');

    } catch (err) {
        console.error('Erro ao gerar PDF:', err);
        showStatus('❌ Erro ao gerar PDF: ' + err.message, 'error');
    }
}

    function downloadPDF() {
      if (!currentPdfUrl) return;
      const a = document.createElement('a');
      a.href = currentPdfUrl;
      a.download = currentPdfName;
      a.click();
    }

    // RELATÓRIOS SALVOS
    function renderReports() {
      const list = $('reportList');
      if (!reports.length) {
        list.innerHTML = '<div class="empty-state">Nenhum relatório salvo</div>';
        return;
      }
      list.innerHTML = reports.map((r, i) => `
        <div class="report-item">
          <div class="report-info">
            <h3>${r.subject || 'Sem assunto'}</h3>
            <span>${r.dateTime ? new Date(r.dateTime).toLocaleString('pt-BR') : 'Sem data'} • ${r.photos?.length || 0} foto(s)</span>
          </div>
          <div class="report-actions">
            <button class="btn-edit" onclick="editReport(${i})">✏️</button>
            <button class="btn-delete" onclick="deleteReport(${i})">🗑️</button>
          </div>
        </div>
      `).join('');
    }

    function editReport(i) {
      const r = reports[i];
      editingId = r.id;
      $('dateTime').value = r.dateTime || '';
      $('subject').value = r.subject || '';
      $('description').value = r.description || '';
      $('conclusion').value = r.conclusion || '';
      photos = [...(r.photos || [])];
      renderPhotos();
      $('editingBadge').style.display = 'block';
      $('editingName').textContent = r.subject || 'Relatório';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function deleteReport(i) {
      if (!confirm('Excluir este relatório?')) return;
      reports.splice(i, 1);
      renderReports();
      showStatus('🗑️ Excluído', 'success');
    }

    function newReport() {
      editingId = null;
      $('dateTime').value = '';
      $('subject').value = '';
      $('description').value = '';
      $('conclusion').value = '';
      photos = [];
      renderPhotos();
      $('editingBadge').style.display = 'none';
      $('pdfBox').classList.remove('show');
      $('importInfo').style.display = 'none';
      showStatus('📝 Novo relatório', 'success');
    }

    renderReports();

    function sendEmail() {
        const to = $('emailTo').value;
        if (!to) {
            showStatus('Por favor, insira o email do destinatário.', 'error');
            return;
        }

        if (!currentPdfUrl) {
            showStatus('Gere um PDF antes de enviar.', 'error');
            return;
        }

        const subject = `Relatório: ${$('subject').value || 'Sem assunto'}`;
        const body = `Olá, \n\nSegue em anexo o relatório. \n\nAtenciosamente,`;

        // We can't directly attach a file with mailto, 
        // but we can open the mail client with the fields pre-filled.
        // For a real attachment, a server-side service would be needed.
        const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        const a = document.createElement('a');
        a.href = mailtoLink;
        a.click();

        $('emailModal').classList.remove('show');
        showStatus('Cliente de email aberto!', 'success');
    }

