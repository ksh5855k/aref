import { firebaseConfig } from './config.js'; 
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let docFirestoreId = null; // Firestore의 실제 문서 고유 ID 저장용

document.addEventListener('DOMContentLoaded', async () => {
    const uploadForm = document.getElementById('upload-form');
    if (!uploadForm) return;

    const urlParams = new URLSearchParams(window.location.search);
    const id = parseInt(urlParams.get('id'));

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            alert("수정 권한이 없습니다. 로그인이 필요합니다.");
            window.location.href = "login.html";
            return;
        }

        if (isNaN(id)) {
            alert("잘못된 접근입니다.");
            window.location.href = "index.html";
            return;
        }

        try {
            // 1. 기존 데이터 불러오기
            const q = query(collection(db, "references"), where("id", "==", id));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("수정할 자료를 찾을 수 없습니다.");
                window.location.href = "index.html";
                return;
            }

            const docSnapshot = querySnapshot.docs[0];
            docFirestoreId = docSnapshot.id; // 문서의 진짜 고유키 저장
            const originalData = docSnapshot.data();

            // 2. 폼에 기존 데이터 채우기
            document.getElementById('upload-category').value = originalData.category || '';
            document.getElementById('upload-title').value = originalData.title || '';
            document.getElementById('upload-summary').value = originalData.summary || '';
            document.getElementById('upload-tags').value = (originalData.tags || []).join(', ');
            document.getElementById('upload-image-url').value = originalData.image || ''; // 이미지 URL 채우기
            document.getElementById('upload-link').value = originalData.externalLink || '';
            document.getElementById('upload-detail-summary').value = originalData.detailSummary || '';
            document.getElementById('upload-detail-why').value = originalData.detailWhy || '';
            document.getElementById('upload-detail-how').value = originalData.detailHow || '';

        } catch (error) {
            console.error("데이터 로드 실패:", error);
            alert("자료를 불러오는 중 오류가 발생했습니다.");
        }
    });

    // 3. 수정 완료 버튼 클릭 시 업데이트
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!docFirestoreId) return;

        const updatedData = {
            category: document.getElementById('upload-category').value,
            title: document.getElementById('upload-title').value,
            summary: document.getElementById('upload-summary').value,
            tags: document.getElementById('upload-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
            image: document.getElementById('upload-image-url').value, // 수정된 이미지 URL
            externalLink: document.getElementById('upload-link').value,
            detailSummary: document.getElementById('upload-detail-summary').value,
            detailWhy: document.getElementById('upload-detail-why').value,
            detailHow: document.getElementById('upload-detail-how').value,
        };

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = "본부 데이터 수정 중...";

        try {
            const refDoc = doc(db, "references", docFirestoreId);
            await updateDoc(refDoc, updatedData);

            alert("임무 자료 수정이 완료되었습니다! ✅");
            window.location.href = `detail.html?id=${id}`; 

        } catch (error) {
            console.error("수정 실패:", error);
            alert("수정 중 오류가 발생했습니다.");
            submitBtn.disabled = false;
            submitBtn.textContent = "수정 완료";
        }
    });
});