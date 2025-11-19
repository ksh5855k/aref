// edit.js (최종 수정본 - 폼 요소 누락 버그 수정 완료)

import { firebaseConfig } from './config.js'; // 설정 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Firebase 앱 및 서비스 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let docRefToUpdate = null; // 수정할 문서의 참조를 저장할 변수

// HTML 문서 로딩이 끝나면 실행될 코드
document.addEventListener('DOMContentLoaded', async () => {
    const uploadForm = document.getElementById('upload-form');
    if (!uploadForm) return;

    // 1. URL에서 수정할 레퍼런스의 id를 가져옵니다.
    const urlParams = new URLSearchParams(window.location.search);
    const id = parseInt(urlParams.get('id'));

    // 2. 로그인 상태 확인 (인증은 auth-status.js에서도 하지만, 안전을 위해 여기서 다시 한번 체크합니다.)
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            alert("수정하려면 로그인 권한이 필요합니다.");
            window.location.href = "login.html";
            return;
        }

        if (isNaN(id)) {
            alert("잘못된 접근입니다. 올바른 자료 ID가 필요합니다.");
            window.location.href = "index.html";
            return;
        }

        try {
            // 3. Firestore에서 해당 id의 데이터를 찾아옵니다.
            const q = query(collection(db, "references"), where("id", "==", id));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("수정할 임무 자료를 찾을 수 없습니다.");
                window.location.href = "index.html";
                return;
            }

            const docSnapshot = querySnapshot.docs[0];
            docRefToUpdate = docSnapshot.ref; // 문서 참조 저장 (업데이트 시 사용)
            const originalData = docSnapshot.data(); // 원본 데이터

            // 4. 찾은 데이터로 폼의 각 입력란을 채워줍니다. (누락된 입력란이 없으므로 이제 오류 없이 작동!)
            document.getElementById('upload-category').value = originalData.category || '';
            document.getElementById('upload-title').value = originalData.title || '';
            document.getElementById('upload-summary').value = originalData.summary || '';
            document.getElementById('upload-tags').value = (originalData.tags || []).join(', ');
            document.getElementById('upload-link').value = originalData.externalLink || '';
            
            // 상세 내용 TEXTAREA에 값을 채워줍니다.
            document.getElementById('upload-detail-summary').value = originalData.detailSummary || '';
            document.getElementById('upload-detail-why').value = originalData.detailWhy || '';
            document.getElementById('upload-detail-how').value = originalData.detailHow || '';

        } catch (error) {
            console.error("Error fetching data for edit:", error);
            alert("임무 자료를 불러오는 중 오류가 발생했습니다. (콘솔 확인 필요)");
            window.location.href = "index.html";
        }
    });


    // 5. '수정 완료' 버튼을 눌렀을 때의 동작을 추가합니다.
    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!docRefToUpdate) {
            alert("수정할 문서를 찾지 못했습니다. 다시 시도해 주세요.");
            return;
        }

        // 폼에서 수정된 값들을 가져옵니다.
        const updatedData = {
            category: document.getElementById('upload-category').value,
            title: document.getElementById('upload-title').value,
            summary: document.getElementById('upload-summary').value,
            tags: document.getElementById('upload-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
            externalLink: document.getElementById('upload-link').value,
            
            // 상세 내용 업데이트
            detailSummary: document.getElementById('upload-detail-summary').value,
            detailWhy: document.getElementById('upload-detail-why').value,
            detailHow: document.getElementById('upload-detail-how').value,
        };

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '수정 중...';

        try {
            // Firestore에 있는 문서를 업데이트합니다.
            await updateDoc(docRefToUpdate, updatedData);

            alert("임무 자료 수정이 완료되었습니다! ✅");
            window.location.href = `detail.html?id=${id}`; 

        } catch (error) {
            alert("수정에 실패했습니다. 다시 시도해주세요.");
            console.error("Update Error:", error);
            submitBtn.disabled = false;
            submitBtn.textContent = '수정 완료';
        }
    });
});