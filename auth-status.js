import { app } from './config.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const auth = getAuth(app);
const authContainer = document.getElementById('auth-container');

// onAuthStateChanged: 사용자의 로그인 상태가 바뀔 때마다 자동으로 실행되는 감시 카메라
onAuthStateChanged(auth, (user) => {
    if (user) {
        // 사용자가 로그인한 경우
        authContainer.innerHTML = `
            <button id="logout-btn">로그아웃</button>
        `;
        const logoutBtn = document.getElementById('logout-btn');
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                alert('로그아웃 되었습니다.');
                window.location.href = "index.html";
            });
        });
    } else {
        // 사용자가 로그아웃한 경우
        authContainer.innerHTML = `
            <button id="login-page-btn">로그인</button>
        `;
        const loginPageBtn = document.getElementById('login-page-btn');
        loginPageBtn.addEventListener('click', () => {
            window.location.href = "login.html";
        });
    }
});