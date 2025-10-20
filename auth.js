// auth.js (최종 수정본)

import { firebaseConfig } from './config.js'; // 설정 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Firebase 앱 및 서비스 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// HTML 문서 로딩이 끝나면 실행될 코드
document.addEventListener('DOMContentLoaded', () => {

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');

    // 입력 필드나 버튼이 없을 경우(다른 페이지에서 로드될 경우) 오류 방지
    if (!emailInput || !passwordInput || !loginBtn || !signupBtn) {
        return;
    }

    // 회원가입 버튼 클릭 이벤트
    signupBtn.addEventListener('click', () => {
        const email = emailInput.value;
        const password = passwordInput.value;

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                alert("회원가입 성공! 바로 로그인됩니다.");
                window.location.href = "index.html";
            })
            .catch((error) => {
                let errorMessage = "회원가입에 실패했습니다.";
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage = "이미 사용 중인 이메일입니다.";
                } else if (error.code === 'auth/weak-password') {
                    errorMessage = "비밀번호는 6자리 이상이어야 합니다.";
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = "올바른 이메일 형식이 아닙니다.";
                }
                alert(errorMessage);
            });
    });

    // 로그인 버튼 클릭 이벤트
    loginBtn.addEventListener('click', () => {
        const email = emailInput.value;
        const password = passwordInput.value;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                alert("로그인 성공!");
                window.location.href = "index.html";
            })
            .catch((error) => {
                let errorMessage = "로그인에 실패했습니다.";
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    errorMessage = "이메일 또는 비밀번호가 올바르지 않습니다.";
                }
                alert(errorMessage);
            });
    });
});