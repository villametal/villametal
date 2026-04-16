// Configuração de dados
let frequencyData = {
    participants: ['João', 'Maria', 'Pedro'],
    dates: ['2026-04-16', '2026-04-23', '2026-04-30'],
    attendance: {
        '2026-04-16': {
            'João': 'present',
            'Maria': 'absent',
            'Pedro': 'not-marked',
        },
        '2026-04-23': {
            'João': 'not-marked',
            'Maria': 'present',
            'Pedro': 'absent',
        },
        '2026-04-30': {
            'João': 'not-marked',
            'Maria': 'not-marked',
            'Pedro': 'not-marked',
        },
    },
};

let isAdminLoggedIn = false;
const ADMIN_EMAILS = ['villametal.emvl@gmail.com'];

// Inicializar página
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderTable();
    updateAuthUI();
});

// Carregar dados (do localStorage ou padrão)
function loadData() {
    const saved = localStorage.getItem('frequencyData2026');
    if (saved) {
        try {
            frequencyData = JSON.parse(saved);
        } catch (e) {
            console.error('Erro ao carregar dados:', e);
        }
    }
}

// Salvar dados no localStorage
function saveData() {
    localStorage.setItem('frequencyData2026', JSON.stringify(frequencyData));
}

// Atualizar UI de autenticação
function updateAuthUI() {
    const loginForm = document.getElementById('loginForm');
    const loggedInSection = document.getElementById('loggedInSection');
    const adminControls = document.getElementById('adminControls');

    if (isAdminLoggedIn) {
        loginForm.classList.add('hidden');
        loggedInSection.classList.remove('hidden');
        adminControls.classList.add('show');
    } else {
        loginForm.classList.remove('hidden');
        loggedInSection.classList.add('hidden');
        adminControls.classList.remove('show');
    }
}

// Fazer login
function handleLogin(event) {
    event.preventDefault();
    clearMessages();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showError('Email e senha são obrigatórios');
        return;
    }

    // Validação local (em produção, usar Firebase)
    if (ADMIN_EMAILS.includes(email.toLowerCase()) && password.length >= 6) {
        isAdminLoggedIn = true;
        document.getElementById('currentUserEmail').textContent = email;
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        updateAuthUI();
        showSuccess('Login realizado com sucesso!');
    } else {
        showError('Email ou senha incorretos');
    }
}

// Fazer logout
function handleLogout() {
    isAdminLoggedIn = false;
    updateAuthUI();
    showSuccess('Logout realizado');
}

// Renderizar tabela de frequência
function renderTable() {
    const table = document.getElementById('frequencyTable');
    const headerRow = document.getElementById('participantHeaders');

    // Limpar conteúdo anterior
    table.innerHTML = '';
    headerRow.innerHTML = '';

    // Adicionar headers dos participantes
    frequencyData.participants.forEach(participant => {
        const th = document.createElement('th');
        th.textContent = participant;
        th.style.textAlign = 'center';
        headerRow.appendChild(th);
    });

    // Adicionar linhas de datas
    frequencyData.dates.forEach(date => {
        const row = document.createElement('tr');

        // Coluna de data
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDate(date);
        dateCell.style.fontWeight = '500';
        row.appendChild(dateCell);

        // Colunas de presença
        frequencyData.participants.forEach(participant => {
            const cell = document.createElement('td');
            cell.style.textAlign = 'center';

            const status = frequencyData.attendance[date]?.[participant] || 'not-marked';
            const button = document.createElement('button');
            button.className = `attendance-btn ${status}`;
            button.textContent = getStatusSymbol(status);
            button.onclick = () => toggleAttendance(date, participant);

            cell.appendChild(button);
            row.appendChild(cell);
        });

        table.appendChild(row);
    });
}

// Alternar status de presença (PÚBLICO - sem login necessário)
function toggleAttendance(date, participant) {
    const current = frequencyData.attendance[date]?.[participant] || 'not-marked';
    let next;

    switch (current) {
        case 'not-marked':
            next = 'present';
            break;
        case 'present':
            next = 'absent';
            break;
        case 'absent':
            next = 'not-marked';
            break;
        default:
            next = 'not-marked';
    }

    // Atualizar dados
    if (!frequencyData.attendance[date]) {
        frequencyData.attendance[date] = {};
    }
    frequencyData.attendance[date][participant] = next;

    // Salvar no localStorage
    saveData();

    // Atualizar UI
    renderTable();
    showSuccess('Presença marcada com sucesso!');
}

// Adicionar nova data (APENAS ADMIN)
function addNewDate() {
    if (!isAdminLoggedIn) {
        showError('Você precisa estar logado como administrador');
        return;
    }

    const newDate = document.getElementById('newDate').value;
    clearMessages();

    if (!newDate) {
        showError('Por favor, selecione uma data');
        return;
    }

    if (frequencyData.dates.includes(newDate)) {
        showError('Esta data já existe');
        return;
    }

    // Adicionar data
    frequencyData.dates.push(newDate);
    frequencyData.dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // Inicializar attendance para todos os participantes
    frequencyData.participants.forEach(participant => {
        if (!frequencyData.attendance[newDate]) {
            frequencyData.attendance[newDate] = {};
        }
        frequencyData.attendance[newDate][participant] = 'not-marked';
    });

    // Salvar e atualizar
    saveData();
    renderTable();
    document.getElementById('newDate').value = '';
    showSuccess('Data adicionada com sucesso!');
}

// Adicionar novo participante (APENAS ADMIN)
function addNewParticipant() {
    if (!isAdminLoggedIn) {
        showError('Você precisa estar logado como administrador');
        return;
    }

    const newParticipant = document.getElementById('newParticipant').value.trim();
    clearMessages();

    if (!newParticipant) {
        showError('Por favor, digite o nome do participante');
        return;
    }

    if (frequencyData.participants.includes(newParticipant)) {
        showError('Este participante já existe');
        return;
    }

    // Adicionar participante
    frequencyData.participants.push(newParticipant);

    // Inicializar attendance para todas as datas
    frequencyData.dates.forEach(date => {
        if (!frequencyData.attendance[date]) {
            frequencyData.attendance[date] = {};
        }
        frequencyData.attendance[date][newParticipant] = 'not-marked';
    });

    // Salvar e atualizar
    saveData();
    renderTable();
    document.getElementById('newParticipant').value = '';
    showSuccess('Participante adicionado com sucesso!');
}

// Funções auxiliares
function formatDate(dateString) {
    const d = new Date(dateString + 'T00:00:00');
    return d.toLocaleDateString('pt-BR');
}

function getStatusSymbol(status) {
    switch (status) {
        case 'present':
            return '✓';
        case 'absent':
            return '✗';
        default:
            return '-';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => errorDiv.classList.remove('show'), 3000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.classList.add('show');
    setTimeout(() => successDiv.classList.remove('show'), 3000);
}

function clearMessages() {
    document.getElementById('errorMessage').classList.remove('show');
    document.getElementById('successMessage').classList.remove('show');
}
