// auth-status.js (최종 수정본)

import { firebaseConfig } from './config.js'; // 설정 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Firebase 앱 및 서비스 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const authContainer = document.getElementById('auth-container');

// 로그인 상태 감시 카메라
onAuthStateChanged(auth, (user) => {
    if (authContainer) { // authContainer가 존재하는 페이지에서만 실행
        if (user) {
            // 로그인한 경우
            authContainer.innerHTML = `
                <a href="upload.html" class="header-link">업로드</a>
                <a href="mypage.html" class="header-link">내 서랍</a>
                <button id="logout-btn">로그아웃</button>
            `;
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    signOut(auth).then(() => {
                        alert('로그아웃 되었습니다.');
                        window.location.href = "index.html"; // 로그아웃 후 메인 페이지로
                    }).catch((error) => {
                        console.error('로그아웃 에러:', error);
                    });
                });
            }
        } else {
            // 로그아웃한 경우
            authContainer.innerHTML = `
                <button id="login-page-btn">로그인</button>
            `;
            const loginPageBtn = document.getElementById('login-page-btn');
            if (loginPageBtn) {
                loginPageBtn.addEventListener('click', () => {
                    window.location.href = "login.html"; // 로그인 페이지로
                });
            }
        }
    }
});