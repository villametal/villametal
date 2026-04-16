// Importações necessárias do Firebase modular
import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let unsubscribeSnapshot = null;

// Funções auxiliares

function formatDate(dateString) {
  try {
    const d = new Date(dateString + 'T00:00:00');
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('pt-BR');
  } catch (e) {
    return dateString;
  }
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

  if (!header || !body) return;

  // Limpar o cabeçalho e corpo
  header.innerHTML = '<th>Data</th>';
  body.innerHTML = '';

  // Cabeçalhos dos participantes
  if (frequencyData.participants && Array.isArray(frequencyData.participants)) {
    frequencyData.participants.forEach(participant => {
      const th = document.createElement('th');
      th.textContent = participant;
      header.appendChild(th);
    });
  }

  // Linhas para cada data
  if (frequencyData.dates && Array.isArray(frequencyData.dates)) {
    frequencyData.dates.forEach(date => {
      const tr = document.createElement('tr');
      const tdDate = document.createElement('td');
      tdDate.textContent = formatDate(date);
      tdDate.classList.add('date-cell');
      tr.appendChild(tdDate);

      frequencyData.participants.forEach(participant => {
        const td = document.createElement('td');
        const status = (frequencyData.attendance && frequencyData.attendance[date] && frequencyData.attendance[date][participant]) || 'not-marked';
        td.className = `presence-cell ${status}`;
        td.dataset.date = date;
        td.dataset.participant = participant;

        // SEMPRE permitir edição de presença (público)
        td.addEventListener('click', () => {
          toggleAttendance(date, participant);
        });

        tr.appendChild(td);
      });

      body.appendChild(tr);
    });
  }
}

// Alternar presença e salvar IMEDIATAMENTE no Firebase
async function toggleAttendance(date, participant) {
  const current = (frequencyData.attendance && frequencyData.attendance[date] && frequencyData.attendance[date][participant]) || 'not-marked';
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
  
  // Otimismo visual: Atualiza localmente primeiro para ser instantâneo
  if (!frequencyData.attendance) frequencyData.attendance = {};
  if (!frequencyData.attendance[date]) frequencyData.attendance[date] = {};
  frequencyData.attendance[date][participant] = next;
  renderTable(); 

  // Salvar no Firebase
  try {
    const docRef = doc(db, 'frequency2026', 'data');
    const path = `attendance.${date}.${participant}`;
    await updateDoc(docRef, {
      [path]: next,
    });
    // showMessage('Presença marcada!', 'success'); // Opcional: remover para ser mais limpo
  } catch (error) {
    console.error('Erro ao salvar presença:', error);
    showMessage('Erro ao salvar: Verifique se as regras do Firestore permitem escrita pública.', 'error');
    // Reverter em caso de erro (o onSnapshot fará isso automaticamente se falhar no servidor)
  }
}

// Adicionar nova data
async function addNewDate() {
  const inputDate = document.getElementById('new-date').value;
  if (!inputDate) {
    showMessage('Selecione uma data.', 'error');
    return;
  }

  const date = inputDate.trim();
  if (frequencyData.dates.includes(date)) {
    showMessage('Data já existe.', 'error');
    return;
  }

  try {
    frequencyData.dates.push(date);
    frequencyData.dates.sort((a, b) => new Date(a) - new Date(b));

    const docRef = doc(db, 'frequency2026', 'data');
    await setDoc(docRef, frequencyData);

    document.getElementById('new-date').value = '';
    showMessage('Data adicionada!', 'success');
  } catch (error) {
    showMessage('Erro: ' + error.message, 'error');
  }
}

// Adicionar novo participante
async function addNewParticipant() {
  const inputName = document.getElementById('new-participant').value;
  const name = inputName.trim();
  if (!name) {
    showMessage('Digite o nome.', 'error');
    return;
  }
  if (frequencyData.participants.includes(name)) {
    showMessage('Participante já existe.', 'error');
    return;
  }

  try {
    frequencyData.participants.push(name);
    const docRef = doc(db, 'frequency2026', 'data');
    await setDoc(docRef, frequencyData);

    document.getElementById('new-participant').value = '';
    showMessage('Participante adicionado!', 'success');
  } catch (error) {
    showMessage('Erro: ' + error.message, 'error');
  }
}

// Carregar dados e ativar Listener
async function initFrequency() {
  const docRef = doc(db, 'frequency2026', 'data');
  
  showLoading(true);

  // 1. Tentar carregar uma vez para garantir que a tela saia do "Carregando"
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      frequencyData = docSnap.data();
    }
    showLoading(false);
    renderTable();
  } catch (error) {
    console.error("Erro no carregamento inicial:", error);
    showLoading(false);
    showMessage("Erro ao carregar dados iniciais.", "error");
  }

  // 2. Ativar o Listener em tempo real para atualizações subsequentes
  if (unsubscribeSnapshot) unsubscribeSnapshot();
  
  unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const newData = docSnap.data();
      // Só renderiza se os dados forem diferentes ou se for a primeira vez
      frequencyData = newData;
      renderTable();
    }
  }, (error) => {
    console.error("Erro no listener:", error);
  });
}

// Mostrar interface de administrador
function showAdminInterface(user) {
  const loginForm = document.getElementById('login-form');
  const adminPanel = document.getElementById('admin-panel');
  const adminControls = document.getElementById('admin-controls');
  const adminEmail = document.getElementById('admin-email');

  if (loginForm) loginForm.classList.add('hidden');
  if (adminPanel) adminPanel.classList.remove('hidden');
  if (adminControls) adminControls.classList.remove('hidden');
  if (adminEmail) adminEmail.textContent = user.email;
}

// Mostrar interface pública
function showPublicInterface() {
  const loginForm = document.getElementById('login-form');
  const adminPanel = document.getElementById('admin-panel');
  const adminControls = document.getElementById('admin-controls');

  if (loginForm) loginForm.classList.remove('hidden');
  if (adminPanel) adminPanel.classList.add('hidden');
  if (adminControls) adminControls.classList.add('hidden');
}

// Mostrar mensagem
function showMessage(msg, type) {
  const old = document.querySelectorAll('.error-message, .success-message');
  old.forEach(e => e.remove());

  const div = document.createElement('div');
  div.className = (type === 'error') ? 'error-message' : 'success-message';
  div.textContent = msg;

  const authSection = document.getElementById('auth-section');
  if (authSection) {
    authSection.appendChild(div);
    setTimeout(() => div.remove(), 5000);
  }
}

// Mostrar loading
function showLoading(isLoading) {
  const container = document.getElementById('frequency-table-container');
  if (!container) return;

  if (isLoading) {
    container.innerHTML = '<p class="text-center text-gray-600">Carregando dados...</p>';
  } else {
    container.innerHTML = `<table id="frequency-table">
        <thead>
          <tr id="table-header"><th>Data</th></tr>
        </thead>
        <tbody id="table-body"></tbody>
      </table>`;
  }
}

// Autenticação
async function login() {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  if (!emailInput || !passwordInput) return;

  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage('Preencha email e senha', 'error');
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!isAdminEmail(userCredential.user.email)) {
      await signOut(auth);
      showMessage('Não autorizado', 'error');
    }
  } catch (error) {
    showMessage('Erro no login', 'error');
  }
}

async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
  }
}

// Monitorar Auth
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

// Listeners
const btnLogin = document.getElementById('btn-login');
if (btnLogin) btnLogin.addEventListener('click', login);

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) btnLogout.addEventListener('click', logout);

const btnAddDate = document.getElementById('btn-add-date');
if (btnAddDate) btnAddDate.addEventListener('click', addNewDate);

const btnAddParticipant = document.getElementById('btn-add-participant');
if (btnAddParticipant) btnAddParticipant.addEventListener('click', addNewParticipant);

// Iniciar
initFrequency();
