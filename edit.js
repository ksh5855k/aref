// edit.js (최종 수정본)

import { firebaseConfig } from './config.js'; // 설정 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js"; // Auth 추가

// Firebase 앱 및 서비스 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Auth 초기화

let docRefToUpdate = null; // 수정할 문서의 참조를 저장할 변수
let originalData = null; // 원본 데이터를 저장할 변수

// HTML 문서 로딩이 끝나면 실행될 코드
document.addEventListener('DOMContentLoaded', async () => {
    // 로그인 상태 확인
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            alert("수정하려면 로그인이 필요합니다.");
            window.location.href = "login.html";
        }
    });

    const uploadForm = document.getElementById('upload-form'); // 폼 ID 확인
    if (!uploadForm) return; // 폼이 없으면 중단

    // 1. URL에서 수정할 레퍼런스의 id를 가져옵니다.
    const urlParams = new URLSearchParams(window.location.search);
    const id = parseInt(urlParams.get('id'));

    if (isNaN(id)) {
        alert("잘못된 접근입니다.");
        window.location.href = "index.html";
        return;
    }

    try {
        // 2. Firestore에서 해당 id의 데이터를 찾아옵니다.
        const q = query(collection(db, "references"), where("id", "==", id));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            alert("수정할 데이터를 찾을 수 없습니다.");
            window.location.href = "index.html";
            return;
        }

        const docSnapshot = querySnapshot.docs[0];
        docRefToUpdate = docSnapshot.ref; // 문서 참조 저장
        originalData = docSnapshot.data(); // 원본 데이터 저장

        // 3. 찾은 데이터로 폼의 각 입력창을 채워줍니다.
        document.getElementById('upload-category').value = originalData.category || '';
        document.getElementById('upload-title').value = originalData.title || '';
        document.getElementById('upload-summary').value = originalData.summary || '';
        document.getElementById('upload-tags').value = (originalData.tags || []).join(', ');
        document.getElementById('upload-link').value = originalData.externalLink || '';
        // 상세 내용도 수정 가능하도록 추가
        document.getElementById('upload-detail-summary').value = originalData.detailSummary || '';
        document.getElementById('upload-detail-why').value = originalData.detailWhy || '';
        document.getElementById('upload-detail-how').value = originalData.detailHow || '';


    } catch (error) {
        console.error("Error fetching data for edit:", error);
        alert("데이터를 불러오는 중 오류가 발생했습니다.");
        window.location.href = "index.html";
    }

    // 4. '수정 완료' 버튼을 눌렀을 때의 동작을 추가합니다.
    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // 페이지가 새로고침되는 것을 막습니다.

        if (!docRefToUpdate) {
            alert("수정할 문서를 찾지 못했습니다.");
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
            // (이미지 수정은 아직 구현되지 않았습니다)
        };

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '수정 중...';

        try {
            // Firestore에 있는 문서를 업데이트합니다.
            await updateDoc(docRefToUpdate, updatedData);

            alert("수정이 완료되었습니다!");
            window.location.href = `detail.html?id=${id}`; // 수정된 상세 페이지로 돌아갑니다.

        } catch (error) {
            alert("수정에 실패했습니다. 다시 시도해주세요.");
            console.error("Update Error:", error);
            submitBtn.disabled = false;
            submitBtn.textContent = '수정 완료';
        }
    });
});

// edit.html 에 상세 내용 입력을 위한 textarea 추가 필요
// 예: <textarea id="upload-detail-summary" placeholder="상세 캠페인 요약" rows="5"></textarea> 등