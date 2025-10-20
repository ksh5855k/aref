// upload.js (최종 AI 호출 버전)

import { firebaseConfig } from './config.js'; // 설정 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-functions.js";

// Firebase 앱 및 서비스 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const functions = getFunctions(app); // Functions 초기화
const summarizeUrlFunction = httpsCallable(functions, 'summarizeUrl'); // Cloud Function 호출 준비

const uploadForm = document.getElementById('upload-form');

// 로그인 상태를 먼저 확인합니다.
onAuthStateChanged(auth, (user) => {
    if (!user) {
        alert("레퍼런스를 공유하려면 로그인이 필요합니다.");
        window.location.href = "login.html";
    }
});

// 폼이 있을 경우에만 이벤트 리스너를 추가합니다. (다른 페이지에서 오류 방지)
if (uploadForm) {
    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // 페이지 새로고침 방지

        const category = document.getElementById('upload-category').value;
        const title = document.getElementById('upload-title').value;
        const summary = document.getElementById('upload-summary').value; // 사용자 요약
        const tagsInput = document.getElementById('upload-tags').value;
        const externalLink = document.getElementById('upload-link').value;
        const imageFile = document.getElementById('upload-image').files[0];

        if (!imageFile || !externalLink) {
            alert("이미지와 원본 링크를 모두 입력해주세요.");
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '업로드 및 AI 요약 중...'; // 버튼 텍스트 변경

        try {
            // 1. 이미지 업로드
            const imageRef = ref(storage, 'images/' + Date.now() + '-' + imageFile.name);
            const snapshot = await uploadBytes(imageRef, imageFile);
            const imageUrl = await getDownloadURL(snapshot.ref);

            // 2. AI 요약 기능 호출
            console.log("AI 요약 요청 시작:", externalLink);
            const aiResult = await summarizeUrlFunction({ url: externalLink });
            console.log("AI 요약 결과 받음:", aiResult.data);
            const aiSummary = aiResult.data.summary || "";
            const aiWhy = aiResult.data.why || "";
            const aiHow = aiResult.data.how || "";

            // 3. 새로운 ID 생성 (내림차순 정렬 후 +1)
            const q = query(collection(db, "references"), orderBy("id", "desc"));
            const querySnapshot = await getDocs(q);
            const maxId = querySnapshot.empty ? 0 : querySnapshot.docs[0].data().id;
            const newId = maxId + 1;

            // 4. 태그 배열로 변환
            const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag); // 빈 태그 제거

            // 5. Firestore에 모든 정보 저장
            await addDoc(collection(db, "references"), {
                id: newId,
                category,
                title,
                summary, // 사용자가 입력한 한 줄 요약
                tags,
                externalLink,
                image: imageUrl,
                createdAt: serverTimestamp(),
                detailSummary: aiSummary,
                detailWhy: aiWhy,
                detailHow: aiHow
            });

            alert("레퍼런스가 AI 요약과 함께 성공적으로 공유되었습니다!");
            window.location.href = "index.html";

        } catch (error) {
            alert("업로드 또는 AI 요약에 실패했습니다: " + error.message);
            console.error("업로드/요약 에러:", error);
            submitBtn.disabled = false;
            submitBtn.textContent = '공유하기';
        }
    });
}