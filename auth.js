// auth-status.js (내 서랍 버튼 추가됨)
import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const authContainer = document.getElementById('auth-container');

onAuthStateChanged(auth, (user) => {
    if (user) {
        // 로그인 상태
        const userInitial = user.email.charAt(0).toUpperCase(); // 이메일 첫 글자
        
        authContainer.innerHTML = `
            <div class="user-menu" style="display: flex; align-items: center; gap: 15px;">
                <a href="mypage.html" class="nav-btn" style="text-decoration: none; color: #333; font-weight: bold; font-size: 0.9rem;">
                    📂 내 서랍
                </a>
                
                <a href="upload.html" class="upload-btn">업로드</a>
                
                <div class="profile-circle" id="profile-btn">${userInitial}</div>
                <div class="dropdown-menu" id="dropdown-menu">
                    <p class="user-email">${user.email}</p>
                    <button id="logout-btn">로그아웃</button>
                </div>
            </div>
        `;

        // 드롭다운 토글 기능
        const profileBtn = document.getElementById('profile-btn');
        const dropdownMenu = document.getElementById('dropdown-menu');

        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        // 로그아웃 기능
        document.getElementById('logout-btn').addEventListener('click', async () => {
            try {
                await signOut(auth);
                alert("로그아웃 되었습니다.");
                window.location.href = "index.html";
            } catch (error) {
                console.error("로그아웃 실패:", error);
            }
        });

        // 화면 다른 곳 클릭 시 드롭다운 닫기
        document.addEventListener('click', (e) => {
            if (!profileBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });

    } else {
        // 비로그인 상태
        authContainer.innerHTML = `
            <a href="login.html" class="login-btn">로그인 / 회원가입</a>
        `;
    }
});