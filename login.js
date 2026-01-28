import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginBtn = document.getElementById('login-btn');

    if (!email || !password) {
        alert("이메일과 비밀번호를 모두 입력해주세요.");
        return;
    }

    loginBtn.textContent = "로그인 중...";
    loginBtn.disabled = true;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = "index.html";
    } catch (error) {
        console.error("로그인 에러:", error);
        
        let msg = "로그인에 실패했습니다.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            msg = "이메일 혹은 비밀번호가 일치하지 않습니다.";
        } else if (error.code === 'auth/invalid-email') {
            msg = "이메일 형식이 올바르지 않습니다.";
        }
        
        alert(msg);
        loginBtn.textContent = "로그인";
        loginBtn.disabled = false;
    }
});