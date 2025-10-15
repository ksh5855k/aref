// 필요한 기능들을 Firebase에서 직접 가져옵니다.
import { app } from './config.js';
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firestore 서비스를 초기화합니다.
const db = getFirestore(app);

// 상세 페이지 데이터를 가져오는 비동기 함수
async function fetchReferenceDetail() {
    const detailContent = document.querySelector('.detail-content');
    if (!detailContent) return; // detail-content가 없으면 함수를 중단합니다.

    const urlParams = new URLSearchParams(window.location.search);
    const id = parseInt(urlParams.get('id'));

    // Firestore에서 id 필드 값이 일치하는 문서를 찾습니다.
    const q = query(collection(db, "references"), where("id", "==", id));
    const querySnapshot = await getDocs(q);

    // 데이터를 성공적으로 찾았을 경우
    if (!querySnapshot.empty) {
        const ref = querySnapshot.docs[0].data();
        
        // '수정하기' 버튼이 포함된 새로운 HTML 콘텐츠를 생성합니다.
        const contentHTML = `
            <h2>${ref.title}</h2>
            <img src="${ref.image}" alt="${ref.title} 이미지">
            
            <div class="edit-button-container">
                <a href="edit.html?id=${id}" class="edit-link">수정하기 ✏️</a>
            </div>

            <h3>[캠페인 요약]</h3>
            <p>${ref.detailSummary}</p>
            
            <h3>[Why it works]</h3>
            <p>${ref.detailWhy}</p>
            
            <h3>[How to apply]</h3>
            <p>${ref.detailHow}</p>

            <div class="button-wrapper">
                <a href="${ref.externalLink}" target="_blank" class="external-link">자세한 내용 확인하기</a>
                <a href="index.html" class="back-to-list">목록으로 돌아가기</a>
            </div>
        `;
        detailContent.innerHTML = contentHTML;
        document.title = `${ref.title} - A!Ref`;
    } else {
        // 데이터를 찾지 못했을 경우
        detailContent.innerHTML = `<p>해당 데이터를 찾을 수 없습니다.</p>`;
    }
}

// 페이지가 열리면 함수를 실행합니다.
fetchReferenceDetail();