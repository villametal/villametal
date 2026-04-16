// Importações necessárias do Firebase modular
import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Emails que são administradores autorizados
const ADMIN_EMAILS = [
  'villametal.emvl@gmail.com'
];

// Dados locais de frequência
let frequencyData = {
  participants: [],
  dates: [],
  attendance: {}
};

let isAdminLoggedIn = false;
let currentUser = null;

// Funções auxiliares

function formatDate(dateString) {
  const d = new Date(dateString + 'T00:00:00');
  return d.toLocaleDateString('pt-BR');
}

// Verifica se o email é de admin
function isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Renderiza tabela - SEMPRE EDITÁVEL PARA PRESENÇA PÚBLICA
function renderTable() {
  const header = document.getElementById('table-header');
  const body = document.getElementById('table-body');

  // Limpar o cabeçalho e corpo
  header.innerHTML = '<th>Data</th>';
  body.innerHTML = '';

  // Cabeçalhos dos participantes
  frequencyData.participants.forEach(participant => {
    const th = document.createElement('th');
    th.textContent = participant;
    header.appendChild(th);
  });

  // Linhas para cada data
  frequencyData.dates.forEach(date => {
    const tr = document.createElement('tr');
    const tdDate = document.createElement('td');
    tdDate.textContent = formatDate(date);
    tdDate.classList.add('date-cell');
    tr.appendChild(tdDate);

    frequencyData.participants.forEach(participant => {
      const td = document.createElement('td');
      const status = frequencyData.attendance[date]?.[participant] || 'not-marked';
      td.className = `presence-cell ${status}`;
      td.dataset.date = date;
      td.dataset.participant = participant;

      // SEMPRE permitir edição de presença (público)
      td.addEventListener('click', () => {
        const newStatus = toggleAttendance(date, participant);
        td.className = `presence-cell ${newStatus}`;
      });

      tr.appendChild(td);
    });

    body.appendChild(tr);
  });
}

// Alternar presença e salvar IMEDIATAMENTE no Firebase
async function toggleAttendance(date, participant) {
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
  
  // Se não existe o objeto attendance para a data, inicializa
  if (!frequencyData.attendance[date]) {
    frequencyData.attendance[date] = {};
  }
  frequencyData.attendance[date][participant] = next;
  
  // Salvar IMEDIATAMENTE no Firebase
  try {
    const docRef = doc(db, 'frequency2026', 'data');
    const path = `attendance.${date}.${participant}`;
    await updateDoc(docRef, {
      [path]: next,
    });
    showMessage('Presença marcada com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao salvar presença:', error);
    showMessage('Erro ao salvar presença: ' + error.message, 'error');
  }
  
  return next;
}

// Adicionar nova data
async function addNewDate() {
  const inputDate = document.getElementById('new-date').value;
  if (!inputDate) {
    showMessage('Por favor, selecione uma data.', 'error');
    return;
  }

  const date = inputDate.trim();
  if (frequencyData.dates.includes(date)) {
    showMessage('Esta data já existe na tabela.', 'error');
    return;
  }

  try {
    frequencyData.dates.push(date);
    frequencyData.dates.sort((a, b) => new Date(a) - new Date(b));

    // inicializar para todos participantes
    frequencyData.participants.forEach(p => {
      if (!frequencyData.attendance[date]) {
        frequencyData.attendance[date] = {};
      }
      frequencyData.attendance[date][p] = 'not-marked';
    });

    // Salvar IMEDIATAMENTE no Firebase
    const docRef = doc(db, 'frequency2026', 'data');
    await setDoc(docRef, frequencyData);

    document.getElementById('new-date').value = '';
    renderTable();
    showMessage('Data adicionada com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao adicionar data:', error);
    showMessage('Erro ao adicionar data: ' + error.message, 'error');
  }
}

// Adicionar novo participante
async function addNewParticipant() {
  const inputName = document.getElementById('new-participant').value;
  const name = inputName.trim();
  if (!name) {
    showMessage('Por favor, digite o nome do participante.', 'error');
    return;
  }
  if (frequencyData.participants.includes(name)) {
    showMessage('Este participante já existe na tabela.', 'error');
    return;
  }

  try {
    frequencyData.participants.push(name);

    // inicializar para todas as datas
    frequencyData.dates.forEach(date => {
      if (!frequencyData.attendance[date]) {
        frequencyData.attendance[date] = {};
      }
      frequencyData.attendance[date][name] = 'not-marked';
    });

    // Salvar IMEDIATAMENTE no Firebase
    const docRef = doc(db, 'frequency2026', 'data');
    await setDoc(docRef, frequencyData);

    document.getElementById('new-participant').value = '';
    renderTable();
    showMessage('Participante adicionado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao adicionar participante:', error);
    showMessage('Erro ao adicionar participante: ' + error.message, 'error');
  }
}

// Carregar dados do Firestore
async function loadDataFromFirestore() {
  try {
    showLoading(true);

    const docRef = doc(db, 'frequency2026', 'data');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      // verificar estrutura
      if ('participants' in data && 'dates' in data && 'attendance' in data) {
        frequencyData = data;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    showMessage('Erro ao carregar dados: ' + error.message, 'error');
  } finally {
    showLoading(false);
    renderTable();
  }
}

// Mostrar interface de administrador
function showAdminInterface(user) {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('admin-panel').classList.remove('hidden');
  document.getElementById('admin-controls').classList.remove('hidden');
  document.getElementById('admin-email').textContent = user.email;
  renderTable();
}

// Mostrar interface pública
function showPublicInterface() {
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('admin-panel').classList.add('hidden');
  document.getElementById('admin-controls').classList.add('hidden');
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
  renderTable();
}

// Mostrar mensagem de sucesso / erro
function showMessage(msg, type) {
  // remover mensagens existentes
  const old = document.querySelectorAll('.error-message, .success-message');
  old.forEach(e => e.remove());

  const div = document.createElement('div');
  div.className = (type === 'error') ? 'error-message' : 'success-message';
  div.textContent = msg;

  const authSection = document.getElementById('auth-section');
  authSection.appendChild(div);

  setTimeout(() => {
    div.remove();
  }, 5000);
}

// Mostrar loading
function showLoading(isLoading) {
  const container = document.getElementById('frequency-table-container');
  if (isLoading) {
    container.innerHTML = '<p class="text-center text-gray-600">Carregando dados...</p>';
  } else {
    // limpa para renderização normal
    container.innerHTML = `<table id="frequency-table">
        <thead>
          <tr id="table-header"><th>Data</th></tr>
        </thead>
        <tbody id="table-body"></tbody>
      </table>`;
  }
}

// Autenticação: login, logout e listener

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showMessage('Email e senha são obrigatórios', 'error');
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Verificar se é admin
    if (isAdminEmail(user.email)) {
      isAdminLoggedIn = true;
      currentUser = user;
      showAdminInterface(user);
      showMessage('Login realizado com sucesso!', 'success');
    } else {
      await signOut(auth);
      showMessage('Email não autorizado como administrador', 'error');
    }
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    showMessage('Erro ao fazer login: ' + error.message, 'error');
  }
}

async function logout() {
  try {
    await signOut(auth);
    isAdminLoggedIn = false;
    currentUser = null;
    showPublicInterface();
    showMessage('Logout realizado', 'success');
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    showMessage('Erro ao fazer logout: ' + error.message, 'error');
  }
}

// Monitorar estado de autenticação
onAuthStateChanged(auth, (user) => {
  if (user && isAdminEmail(user.email)) {
    isAdminLoggedIn = true;
    currentUser = user;
    showAdminInterface(user);
  } else {
    isAdminLoggedIn = false;
    currentUser = null;
    showPublicInterface();
  }
});

// Event listeners
document.getElementById('btn-login').addEventListener('click', login);
document.getElementById('btn-logout').addEventListener('click', logout);
document.getElementById('btn-add-date').addEventListener('click', addNewDate);
document.getElementById('btn-add-participant').addEventListener('click', addNewParticipant);

// Permitir Enter em inputs
document.getElementById('email').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') login();
});
document.getElementById('password').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') login();
});
document.getElementById('new-date').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addNewDate();
});
document.getElementById('new-participant').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addNewParticipant();
});

// Carregar dados ao iniciar
loadDataFromFirestore();
