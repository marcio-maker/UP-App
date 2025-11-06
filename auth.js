// auth.js - Autenticação e Funções de Segurança (COM BACKEND LOCAL VIA INDEXEDDB)

// Importa idb para IndexedDB
import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@7/+esm';

// Configurações
const DB_NAME = 'UP_DB';
const DB_VERSION = 1;
const AUTH_STORE = 'users';
const AUTH_STORAGE_KEY = 'up_auth_token'; 

// Função para abrir/criar DB
async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(AUTH_STORE)) {
        db.createObjectStore(AUTH_STORE, { keyPath: 'email' });
      }
    },
  });
}

// Verifica se está logado (baseado no token na sessionStorage)
function isLoggedIn() {
  return !!sessionStorage.getItem(AUTH_STORAGE_KEY);
}

// Hash de senha usando Web Crypto API
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Login com Email
async function loginWithEmail(email, password) {
  if (!email || !password) {
    return { success: false, error: 'Preencha todos os campos.' };
  }

  const db = await getDB();
  const user = await db.get(AUTH_STORE, email);

  if (!user) {
    return { success: false, error: 'Usuário não encontrado.' };
  }

  const hashedPassword = await hashPassword(password);
  if (hashedPassword !== user.password) {
    return { success: false, error: 'Senha incorreta.' };
  }

  // Se o login for bem-sucedido:
  const token = btoa(email + ':' + Date.now()); // Simula a criação de um token
  sessionStorage.setItem(AUTH_STORAGE_KEY, token);
  localStorage.setItem('up_user_data', JSON.stringify(user));
  
  return { success: true, user };
}

// Cadastro com Email
async function signUpWithEmail(email, password, name) {
  if (!email || !password || !name) {
    return { success: false, error: 'Preencha todos os campos obrigatórios.' };
  }

  const db = await getDB();
  const existingUser = await db.get(AUTH_STORE, email);
  
  if (existingUser) {
    return { success: false, error: 'Este e-mail já está cadastrado.' };
  }
  
  const hashedPassword = await hashPassword(password);
  const newUser = { email, password: hashedPassword, name, provider: 'email' };
  
  await db.put(AUTH_STORE, newUser);
  
  // Realiza o login após o cadastro
  const token = btoa(email + ':' + Date.now());
  sessionStorage.setItem(AUTH_STORAGE_KEY, token);
  localStorage.setItem('up_user_data', JSON.stringify(newUser));

  return { success: true, user: newUser };
}

// Obter dados do usuário logado (simulado)
function getUserData() {
    const data = localStorage.getItem('up_user_data');
    return data ? JSON.parse(data) : null;
}

// Atualizar perfil do usuário (simulado)
async function updateUserProfile(updates) {
    const userData = getUserData();
    if (!userData) {
        return { success: false, error: 'Usuário não logado.' };
    }

    const db = await getDB();
    const updatedUser = { ...userData, ...updates };
    
    await db.put(AUTH_STORE, updatedUser);
    localStorage.setItem('up_user_data', JSON.stringify(updatedUser));
    
    return { success: true, user: updatedUser };
}

// Login Social (Google) - Simulado
async function loginWithGoogle() {
  const simulatedEmail = `google_${Math.random().toString(36).substr(2, 5)}@example.com`;
  return signUpOrLoginSocial(simulatedEmail, 'Usuário Google', 'google');
}

// Login Social (Facebook) - Simulado
async function loginWithFacebook() {
  const simulatedEmail = `facebook_${Math.random().toString(36).substr(2, 5)}@example.com`;
  return signUpOrLoginSocial(simulatedEmail, 'Usuário Facebook', 'facebook');
}

// Helper para Social Login (cadastro/login unificado)
async function signUpOrLoginSocial(email, name, provider) {
  const db = await getDB();
  let user = await db.get(AUTH_STORE, email);
  
  if (!user) {
    await db.put(AUTH_STORE, { email, password: '', name, provider }); // Sem senha pra social
    user = { email, name, provider };
  }
  
  const token = btoa(email + ':' + Date.now());
  sessionStorage.setItem(AUTH_STORAGE_KEY, token);
  localStorage.setItem('up_user_data', JSON.stringify(user));
  
  return { success: true, user };
}

// Logout
function logout(clearAll = false) {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem('up_user_data');
  
  if (clearAll) {
    // Adicionar lógica de limpeza total de dados (IndexedDB, se aplicável)
    console.log('Dados do usuário e sessão limpos totalmente.');
  }

  // >>> CORREÇÃO PRINCIPAL: REDIRECIONAMENTO PARA INTRO.HTML <<<
  console.log('Sessão encerrada. Redirecionando para intro.html');
  window.location.replace('intro.html');
}

// ===== EXPORTAÇÃO GLOBAL (CORREÇÃO DE 'auth is not defined') =====
// Exponha as funções publicamente no objeto global 'auth'
// Isso é necessário porque o arquivo usa 'import' (se torna um módulo)
// mas outras partes do código esperam que as funções sejam globais.
window.auth = {
    loginWithEmail: loginWithEmail,
    signUpWithEmail: signUpWithEmail,
    loginWithGoogle: loginWithGoogle,
    loginWithFacebook: loginWithFacebook,
    logout: logout,
    isLoggedIn: isLoggedIn,
    getUserData: getUserData,
    updateUserProfile: updateUserProfile,
    
    // Alias para suportar a chamada "auth.sair()" no HTML
    sair: logout 
};