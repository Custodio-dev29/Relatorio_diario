document.addEventListener('DOMContentLoaded', () => {
    const goToDiarioBtn = document.getElementById('goToDiario');
    const goToManutencaoBtn = document.getElementById('goToManutencao');

    goToDiarioBtn.addEventListener('click', () => {
        window.location.href = 'relatorio_diario/index.html';
    });

    goToManutencaoBtn.addEventListener('click', () => {
        window.location.href = 'relatorio_manutencao/index.html';
    });
});