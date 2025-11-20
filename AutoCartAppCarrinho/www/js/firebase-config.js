/*
|--------------------------------------------------------------------------
| Configuração do Firebase (CLIENT-SIDE)
|--------------------------------------------------------------------------
|
|
| IMPORTANTE: Este arquivo deve ser incluído em TODOS os HTMLs
| ANTES de todos os outros scripts (exceto o próprio Firebase).
|
*/

// SDKs do Firebase que vamos precisar (carregados da CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, getIdToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Sua configuração real do app da Web (colada da sua mensagem)
const firebaseConfig = {
  apiKey: "AIzaSyCt0OD_CAVTH6m-t5t-ZDWHADefHWjUdok",
  authDomain: "autocart-123fb.firebaseapp.com",
  projectId: "autocart-123fb",
  storageBucket: "autocart-123fb.firebasestorage.app",
  messagingSenderId: "322875563336",
  appId: "1:322875563336:web:4f4d1d62b9d918bcf6677d"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Exportar os módulos que usaremos em outros arquivos
export { auth, db, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, getIdToken, doc, setDoc, getDoc };