// upload.js (AI 기능이 제거된 v3.0 최종본 - 오타 수정)

import { firebaseConfig } from './config.js'; // 설정 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
// AI 관련(getFunctions, httpsCallable) import는 필요 없으므로 삭제했습니다.

// Firebase 앱 및 서비스 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
// functions는 호출하지 않으므로 초기화할 필요가 없습니다.

const uploadForm = document.getElementById('upload-form');

// 로그인 상태를 먼저 확인합니다.
onAuthStateChanged(auth, (user) => {
    if (!user) {
        alert("레퍼런스를 공유하려면 로그인이 필요합니다.");
        window.location.href = "login.html";
    }
});

if (uploadForm) {
    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // 페이지 새로고침 방지

        const category = document.getElementById('upload-category').value;
        const title = document.getElementById('upload-title').value;
        const summary = document.getElementById('upload-summary').value;
        const tagsInput = document.getElementById('upload-tags').value;
        const externalLink = document.getElementById('upload-link').value;
        const imageFile = document.getElementById('upload-image').files[0];

        if (!imageFile) {
            alert("이미지를 선택해주세요.");
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '업로드 중...'; // AI 요약 문구 삭제

        try {
            // 1. 이미지 업로드
            // 'images/' 뒤의 잘못된 's/'를 제거했습니다.
            const imageRef = ref(storage, 'images/' + Date.now() + '-' + imageFile.name);
            const snapshot = await uploadBytes(imageRef, imageFile);
            const imageUrl = await getDownloadURL(snapshot.ref);

            // --- AI 요약 기능 (제거됨) ---
            
            // 2. 새로운 ID 생성
            const q = query(collection(db, "references"), orderBy("id", "desc"));
            const querySnapshot = await getDocs(q);
            const maxId = querySnapshot.empty ? 0 : querySnapshot.docs[0].data().id;
            const newId = maxId + 1;

            // 3. 태그 배열로 변환
            const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);

            // 4. Firestore에 저장 (AI 요약 부분은 빈칸으로)
            await addDoc(collection(db, "references"), {
                id: newId,
                category,
                title,
                summary, // 사용자가 입력한 한 줄 요약
                tags,
                externalLink,
                image: imageUrl,
                createdAt: serverTimestamp(),
                detailSummary: "", // 빈칸으로 저장
                detailWhy: "",     // 빈칸으로 저장
                detailHow: ""        // 빈칸으로 저장
            });

            alert("레퍼런스가 성공적으로 공유되었습니다!");
            window.location.href = "index.html";

        } catch (error) {
            alert("업로드에 실패했습니다: " + error.message);
            console.error("업로드 에러:", error);
            submitBtn.disabled = false;
            submitBtn.textContent = '공유하기';
        }
    });
}