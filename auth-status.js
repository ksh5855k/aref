import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const authContainer = document.getElementById('auth-container');

onAuthStateChanged(auth, (user) => {
    if (user) {
        // ★ [수정됨] 닉네임(displayName)이 있으면 닉네임, 없으면 이메일 앞부분 표시
        const displayName = user.displayName ? user.displayName : user.email.split('@')[0];

        authContainer.innerHTML = `
            <span class="user-name">${displayName}님</span>
            <a href="upload.html" class="header-btn">업로드</a>
            <a href="mypage.html" class="header-btn">📂 내 서랍</a>
            <button id="logout-btn" class="header-btn logout-btn-style">로그아웃</button>
        `;

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
        authContainer.innerHTML = `
            <a href="login.html" class="header-btn">로그인</a>
        `;
    }
});