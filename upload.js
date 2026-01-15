import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// 1. Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUserId = null;
let currentUserName = "익명 에이전트";

// 2. 로그인 상태 확인
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        currentUserName = user.email ? user.email.split('@')[0] : "에이전트";
        console.log("접속 중인 에이전트:", currentUserName);
    } else {
        alert("임무 자료를 올리려면 로그인이 필요합니다.");
        window.location.href = "login.html";
    }
});

// 3. 업로드 폼 제출 이벤트
const uploadForm = document.getElementById('upload-form');
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('upload-title').value;
    const category = document.getElementById('upload-category').value;
    const summary = document.getElementById('upload-summary').value;
    const tags = document.getElementById('upload-tags').value.split(',').map(tag => tag.trim());
    const externalLink = document.getElementById('upload-link').value;
    
    // 추가된 이미지 URL 가져오기
    const imageUrl = document.getElementById('upload-image-url').value;

    // 상세 내용
    const detailSummary = document.getElementById('upload-detail-summary').value;
    const detailWhy = document.getElementById('upload-detail-why').value;
    const detailHow = document.getElementById('upload-detail-how').value;

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = "본부 보관 중...";

    try {
        // 새 문서의 고유 ID(정수) 생성을 위해 현재 개수 확인
        const q = query(collection(db, "references"), orderBy("id", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        let newId = 1;
        if (!querySnapshot.empty) {
            newId = querySnapshot.docs[0].data().id + 1;
        }

        // 4. Firestore에 데이터 저장 (이미지 파일 대신 URL을 그대로 저장)
        await addDoc(collection(db, "references"), {
            id: newId,
            title,
            category,
            summary,
            tags,
            externalLink,
            image: imageUrl, // 입력받은 URL 주소
            detailSummary,
            detailWhy,
            detailHow,
            author: currentUserName,
            authorId: currentUserId,
            views: 0,
            createdAt: new Date().toISOString()
        });

        alert("임무 자료가 성공적으로 보관되었습니다! ✅");
        window.location.href = "index.html";

    } catch (error) {
        console.error("보관 실패:", error);
        alert("자료 보관 중 오류가 발생했습니다.");
        submitBtn.disabled = false;
        submitBtn.textContent = "다시 시도";
    }
});