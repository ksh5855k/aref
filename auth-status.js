import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const authContainer = document.getElementById('auth-container');

onAuthStateChanged(auth, (user) => {
    if (user) {
        // [로그인 상태]
        // 1. 유저 이름(이메일 앞부분)
        // 2. 내 서랍 (검은 버튼)
        // 3. 로그아웃 (회색 버튼)
        authContainer.innerHTML = `
            <span class="user-name">${user.email.split('@')[0]}님</span>
            <a href="mypage.html" class="header-btn">📂 내 서랍</a>
            <button id="logout-btn" class="header-btn logout-btn-style">로그아웃</button>
        `;

        // 로그아웃 기능 연결
        document.getElementById('logout-btn').addEventListener('click', async () => {
            if (confirm("로그아웃 하시겠습니까?")) {
                try {
                    sessionStorage.setItem('isLoggingOut', 'true');
                    await signOut(auth);
                    alert("로그아웃 되었습니다.");
                    window.location.href = "index.html";
                } catch (error) {
                    console.error("로그아웃 실패", error);
                }
            }
        });

    } else {
        // [비로그인 상태]
        // 회원가입 버튼 삭제됨. 로그인 버튼만 표시.
        authContainer.innerHTML = `
            <a href="login.html" class="header-btn">로그인</a>
        `;
    }
});