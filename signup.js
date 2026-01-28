import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const passwordConfirm = document.getElementById('password-confirm').value.trim();
    const signupBtn = document.getElementById('signup-btn');

    if (password !== passwordConfirm) {
        alert("비밀번호가 일치하지 않습니다.");
        return;
    }
    if (password.length < 6) {
        alert("비밀번호는 6자리 이상이어야 합니다.");
        return;
    }

    signupBtn.textContent = "가입 중...";
    signupBtn.disabled = true;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            createdAt: new Date().toISOString()
        });

        alert("회원가입이 완료되었습니다! 로그인해주세요.");
        window.location.href = "login.html";

    } catch (error) {
        console.error("회원가입 에러:", error);
        
        let msg = "회원가입에 실패했습니다.";
        if (error.code === 'auth/email-already-in-use') {
            msg = "이미 사용 중인 이메일입니다.";
        } else if (error.code === 'auth/invalid-email') {
            msg = "이메일 형식이 올바르지 않습니다.";
        } else if (error.code === 'auth/weak-password') {
            msg = "비밀번호가 너무 약합니다.";
        }
        
        alert(msg);
        signupBtn.textContent = "회원가입";
        signupBtn.disabled = false;
    }
});