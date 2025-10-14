import { app } from './config.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const auth = getAuth(app);

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    
});

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
                console.error("회원가입 에러:", error);
            });
    });

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
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    errorMessage = "이메일 또는 비밀번호가 올바르지 않습니다.";
                }
                alert(errorMessage);
                console.error("로그인 에러:", error);
            });
    });