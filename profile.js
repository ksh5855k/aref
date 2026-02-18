import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile, sendPasswordResetEmail, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { showToast } from './toast.js';

// ImgBB API 키
const IMGBB_API_KEY = "0a10f7852c88538fd64853b78e9e3cad";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    // UI 요소
    const displayNickname = document.getElementById('display-nickname');
    const displayEmail = document.getElementById('display-email');
    const profileAvatar = document.getElementById('profile-avatar-img');
    const inputNickname = document.getElementById('input-nickname');
    const profileImgInput = document.getElementById('profile-img-input');

    const saveBtn = document.getElementById('save-btn');
    const resetPwBtn = document.getElementById('reset-pw-btn');
    const deleteBtn = document.getElementById('delete-account-btn');
    
    // 탈퇴 모달 관련
    const deleteModal = document.getElementById('delete-modal');
    const deletePasswordInput = document.getElementById('delete-password');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            displayNickname.textContent = user.displayName || '닉네임 없음';
            displayEmail.textContent = user.email;
            inputNickname.value = user.displayName || '';
            
            if (user.photoURL) {
                profileAvatar.src = user.photoURL;
            } else {
                profileAvatar.src = "https://placehold.co/100x100?text=User";
            }
            
            // ★ 통계 로드 함수 호출 부분 삭제됨

        } else {
            alert("로그인이 필요합니다.");
            window.location.href = "login.html";
        }
    });

    // ★ 통계 로드 함수(loadUserStats) 전체 삭제됨

    // 프로필 사진 업로드 & DB 저장
    profileImgInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const originalSrc = profileAvatar.src;
        profileAvatar.style.opacity = "0.5";

        try {
            const formData = new FormData();
            formData.append("image", file);

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: "POST",
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                const newPhotoUrl = data.data.url;
                profileAvatar.src = newPhotoUrl;
                profileAvatar.style.opacity = "1";
                
                const user = auth.currentUser;
                // 1. Auth 프로필 업데이트
                await updateProfile(user, { photoURL: newPhotoUrl });
                
                // 2. Firestore DB 업데이트
                await setDoc(doc(db, "users", user.uid), {
                    photoURL: newPhotoUrl,
                    email: user.email,
                    displayName: user.displayName
                }, { merge: true });

                showToast("프로필 사진이 변경되었습니다! 📸");
            } else {
                throw new Error("이미지 업로드 실패");
            }
        } catch (error) {
            console.error(error);
            showToast("사진 업로드 실패. 다시 시도해주세요.");
            profileAvatar.src = originalSrc;
            profileAvatar.style.opacity = "1";
        }
    });

    saveBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;

        const newNickname = inputNickname.value.trim();

        if (!newNickname) {
            alert("닉네임을 입력해주세요.");
            return;
        }

        saveBtn.textContent = "저장 중...";
        saveBtn.disabled = true;

        try {
            if (newNickname !== user.displayName) {
                await updateProfile(user, { displayName: newNickname });
                displayNickname.textContent = newNickname;
                
                await setDoc(doc(db, "users", user.uid), {
                    displayName: newNickname
                }, { merge: true });
            }
            showToast("프로필이 저장되었습니다! 🎉");
        } catch (error) {
            console.error("저장 실패:", error);
            showToast("저장 중 오류가 발생했습니다.");
        } finally {
            saveBtn.textContent = "저장하기";
            saveBtn.disabled = false;
        }
    });

    resetPwBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;
        if (confirm(`${user.email}로 비밀번호 변경 메일을 보낼까요?`)) {
            try {
                await sendPasswordResetEmail(auth, user.email);
                alert("메일을 보냈습니다! 메일함을 확인해주세요.");
            } catch (e) {
                alert("메일 발송 실패: " + e.message);
            }
        }
    });

    deleteBtn.addEventListener('click', () => {
        deleteModal.style.display = 'flex';
        deletePasswordInput.value = '';
        deletePasswordInput.focus();
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        const password = deletePasswordInput.value;
        if (!password) {
            alert("비밀번호를 입력해주세요.");
            return;
        }

        const user = auth.currentUser;
        const credential = EmailAuthProvider.credential(user.email, password);

        confirmDeleteBtn.textContent = "처리 중...";
        confirmDeleteBtn.disabled = true;

        try {
            await reauthenticateWithCredential(user, credential);
            await deleteUser(user);
            alert("탈퇴 처리가 완료되었습니다. 이용해주셔서 감사합니다.");
            window.location.href = "index.html";
        } catch (error) {
            console.error("탈퇴 실패:", error);
            if (error.code === 'auth/wrong-password') {
                alert("비밀번호가 일치하지 않습니다.");
            } else {
                alert("탈퇴 처리에 실패했습니다. 다시 시도해주세요.");
            }
        } finally {
            confirmDeleteBtn.textContent = "탈퇴하기";
            confirmDeleteBtn.disabled = false;
        }
    });
});