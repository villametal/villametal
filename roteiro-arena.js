import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ADMIN_EMAILS = ["villametal.emvl@gmail.com"];
const roteiroRef = doc(collection(db, "roteiroArena"), "current");
const rowsHost = document.getElementById("arena-rows");
const loginForm = document.getElementById("login-form");
const adminPanel = document.getElementById("admin-panel");
const adminActions = document.getElementById("admin-actions");
const pageStatus = document.getElementById("page-status");
const saveStatus = document.getElementById("save-status");

let isAdmin = false;
let dirty = false;
let savedRoteiro = null;
let workingRows = [];
let lastSavedRows = [];

const isAllowedAdmin = (email) => ADMIN_EMAILS.includes((email || "").toLowerCase());
const cloneRows = (rows) => rows.map((row) => ({
  song: String(row.song || ""),
  script: String(row.script || ""),
  obs: String(row.obs || ""),
}));

function fitTextarea(element) {
  element.style.height = "auto";
  element.style.height = `${Math.max(element.scrollHeight + 2, 74)}px`;
}

function setDirty(value) {
  dirty = value;
  adminActions.classList.toggle("hidden", !isAdmin);
  if (isAdmin) adminActions.classList.add("flex");
  saveStatus.textContent = dirty ? "Alterações não salvas." : "";
}

function render() {
  if (!dirty) {
    if (savedRoteiro) {
      workingRows = cloneRows(savedRoteiro.rows || []);
    } else {
      // A lista começa vazia; o administrador cadastra manualmente cada campo.
      workingRows = [];
    }
    lastSavedRows = cloneRows(workingRows);
  }

  rowsHost.replaceChildren();
  if (!workingRows.length) {
    const empty = document.createElement("p");
    empty.className = "p-5 text-center text-gray-300";
    empty.textContent = "Nenhuma linha cadastrada. O administrador pode adicionar uma linha.";
    rowsHost.append(empty);
  }

  workingRows.forEach((row, index) => {
    const line = document.createElement("div");
    line.className = "arena-row";
    line.setAttribute("role", "row");

    const songCell = document.createElement("div");
    songCell.setAttribute("role", "cell");
    const song = document.createElement("textarea");
    song.className = "song-input";
    song.value = row.song;
    song.placeholder = isAdmin ? "Música" : "(música sem título)";
    song.readOnly = !isAdmin;
    song.setAttribute("aria-label", `Música da linha ${index + 1}`);
    song.addEventListener("input", () => {
      workingRows[index].song = song.value;
      fitTextarea(song);
      setDirty(true);
    });
    fitTextarea(song);
    songCell.append(song);

    const scriptCell = document.createElement("div");
    scriptCell.setAttribute("role", "cell");
    const script = document.createElement("textarea");
    script.className = "script-input";
    script.value = row.script;
    script.placeholder = isAdmin ? "Escreva aqui o roteiro desta música…" : "Roteiro ainda não registrado.";
    script.readOnly = !isAdmin;
    script.setAttribute("aria-label", `Roteiro para ${row.song || `música ${index + 1}`}`);
    script.addEventListener("input", () => {
      workingRows[index].script = script.value;
      fitTextarea(script);
      setDirty(true);
    });
    fitTextarea(script);
    scriptCell.append(script);

    const obsCell = document.createElement("div");
    obsCell.setAttribute("role", "cell");
    const obs = document.createElement("textarea");
    obs.className = "obs-input";
    obs.value = row.obs;
    obs.placeholder = isAdmin ? "Obs." : "—";
    obs.readOnly = !isAdmin;
    obs.setAttribute("aria-label", `Observações para ${row.song || `música ${index + 1}`}`);
    obs.addEventListener("input", () => {
      workingRows[index].obs = obs.value;
      fitTextarea(obs);
      setDirty(true);
    });
    fitTextarea(obs);
    obsCell.append(obs);

    line.append(songCell, scriptCell, obsCell);
    rowsHost.append(line);
  });

  // Medir depois de inserir os campos: antes disso, o navegador pode reportar
  // um scrollHeight incorreto para textareas ainda desconectados do documento.
  requestAnimationFrame(() => {
    rowsHost.querySelectorAll("textarea").forEach(fitTextarea);
  });
}

function showMessage(message, isError = false) {
  pageStatus.textContent = message;
  pageStatus.className = `status mt-4 text-center ${isError ? "text-red-300" : "text-green-300"}`;
  window.setTimeout(() => { pageStatus.textContent = ""; }, 6000);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  if (!isAllowedAdmin(email)) {
    showMessage("Este e-mail não está autorizado para edição.", true);
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Falha no login:", error);
    showMessage("Não foi possível entrar. Confira o e-mail e a senha.", true);
  }
});

document.getElementById("btn-logout").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Falha ao sair:", error);
    showMessage("Não foi possível encerrar a sessão.", true);
  }
});

document.getElementById("add-row-btn").addEventListener("click", () => {
  if (!isAdmin) return;
  workingRows.push({ song: "", script: "", obs: "" });
  setDirty(true);
  render();
  const inputs = rowsHost.querySelectorAll(".song-input");
  inputs[inputs.length - 1]?.focus();
  inputs[inputs.length - 1]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

document.getElementById("save-btn").addEventListener("click", async () => {
  if (!isAdmin || !auth.currentUser || !isAllowedAdmin(auth.currentUser.email)) {
    showMessage("Entre com a conta administradora antes de salvar.", true);
    return;
  }
  const button = document.getElementById("save-btn");
  button.disabled = true;
  saveStatus.textContent = "Salvando…";
  try {
    const rows = cloneRows(workingRows);
    await setDoc(roteiroRef, {
      rows,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser.email,
    });
    savedRoteiro = { rows };
    lastSavedRows = cloneRows(rows);
    setDirty(false);
    showMessage("Roteiro salvo com sucesso.");
    render();
  } catch (error) {
    console.error("Falha ao salvar Roteiro Arena:", error);
    saveStatus.textContent = "Falha ao salvar.";
    showMessage("Erro ao salvar. Confirme a configuração das regras do Firestore.", true);
  } finally {
    button.disabled = false;
  }
});

document.getElementById("reset-btn").addEventListener("click", () => {
  workingRows = cloneRows(lastSavedRows);
  setDirty(false);
  render();
  showMessage("Alterações descartadas.");
});

onAuthStateChanged(auth, async (user) => {
  if (user && !isAllowedAdmin(user.email)) {
    await signOut(auth);
    showMessage("Conta sem permissão administrativa.", true);
    return;
  }
  isAdmin = Boolean(user && isAllowedAdmin(user.email));
  loginForm.classList.toggle("hidden", isAdmin);
  adminPanel.classList.toggle("hidden", !isAdmin);
  adminPanel.classList.toggle("flex", isAdmin);
  adminActions.classList.toggle("hidden", !isAdmin);
  if (isAdmin) document.getElementById("admin-email").textContent = user.email;
  render();
});

onSnapshot(roteiroRef, (snapshot) => {
  if (snapshot.exists()) {
    const data = snapshot.data();
    const rows = Array.isArray(data.rows) ? data.rows : [];
    // Migração compatível: transfere a antiga Obs. global para a primeira linha.
    if (data.obs && rows.length && !rows[0].obs) rows[0].obs = String(data.obs);
    savedRoteiro = { rows };
  } else {
    savedRoteiro = null;
  }
  if (!dirty) render();
}, (error) => {
  console.error("Falha ao carregar Roteiro Arena:", error);
  showMessage("Não foi possível carregar o roteiro. Verifique as regras de leitura do Firestore.", true);
});
