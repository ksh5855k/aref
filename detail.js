// detail.js (최종 수정본)

import { firebaseConfig } from './config.js'; // 설정 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase 앱 및 서비스 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 상세 페이지 데이터를 가져오는 비동기 함수
async function fetchReferenceDetail() {
    const detailContent = document.querySelector('.detail-content');
    if (!detailContent) return; // 해당 요소가 없으면 함수 종료

    const urlParams = new URLSearchParams(window.location.search);
    const id = parseInt(urlParams.get('id'));

    if (isNaN(id)) { // id가 숫자가 아니면 중단
        detailContent.innerHTML = `<p class="error-message">잘못된 접근입니다.</p>`;
        return;
    }

    try {
        const q = query(collection(db, "references"), where("id", "==", id));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const ref = querySnapshot.docs[0].data();
            const contentHTML = `
                <h2>${ref.title}</h2>
                <img src="${ref.image}" alt="${ref.title} 이미지">

                <div class="edit-button-container">
                    <a href="edit.html?id=${id}" class="edit-link">수정하기 ✏️</a>
                </div>

                <h3>[캠페인 요약]</h3>
                <p>${ref.detailSummary || '내용 없음'}</p>

                <h3>[Why it works]</h3>
                <p>${ref.detailWhy || '내용 없음'}</p>

                <h3>[How to apply]</h3>
                <p>${ref.detailHow || '내용 없음'}</p>

                <div class="button-wrapper">
                    <a href="${ref.externalLink}" target="_blank" class="external-link">자세한 내용 확인하기</a>
                    <a href="index.html" class="back-to-list">목록으로 돌아가기</a>
                </div>
            `;
            detailContent.innerHTML = contentHTML;
            document.title = `${ref.title} - A!Ref`;
        } else {
            detailContent.innerHTML = `<p class="error-message">해당 데이터를 찾을 수 없습니다.</p>`;
        }
    } catch (error) {
        console.error("Error fetching detail:", error);
        detailContent.innerHTML = `<p class="error-message">데이터를 불러오는 중 오류가 발생했습니다.</p>`;
    }
}

// 페이지 로드 시 함수 실행
fetchReferenceDetail();