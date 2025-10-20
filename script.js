// script.js (최종 수정본)

import { firebaseConfig } from './config.js'; // 설정 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Firebase 앱 및 서비스 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Firestore에서 레퍼런스 데이터를 가져와서 화면에 표시하는 비동기 함수
async function fetchReferences() {
    const cardWrapper = document.querySelector('.card-wrapper');
    if (!cardWrapper) return; // 해당 요소가 없으면 함수 종료

    try {
        const q = query(collection(db, "references"), orderBy("id"));
        const querySnapshot = await getDocs(q);

        let html = '';
        querySnapshot.forEach((doc) => {
            const ref = doc.data();
            html += `
                <div class="reference-card">
                    <a href="detail.html?id=${ref.id}" class="card-link-area">
                        <img src="${ref.image}" alt="${ref.title} 이미지">
                        <div class="card-content">
                            <span class="category-badge">${ref.category}</span>
                            <h2>${ref.title}</h2>
                            <p class="summary">${ref.summary}</p>
                            <div class="tags-wrapper">
                                ${ref.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                        </div>
                    </a>
                    <div class="save-button-container">
                        <button class="save-btn" data-id="${doc.id}">💾</button>
                    </div>
                </div>
            `;
        });
        cardWrapper.innerHTML = html;

        // '이벤트 위임' 방식으로 저장 버튼 이벤트 리스너 추가
        cardWrapper.addEventListener('click', (event) => {
            const saveButton = event.target.closest('.save-btn');

            if (saveButton) {
                handleSaveButtonClick(saveButton); // 저장 로직 함수 호출
            }
        });

    } catch (error) {
        console.error("Error fetching references: ", error);
        cardWrapper.innerHTML = `<p class="error-message">데이터를 불러오는 데 실패했습니다.</p>`;
    }
}

// 저장 버튼 클릭 처리 함수
async function handleSaveButtonClick(button) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        alert("로그인이 필요한 기능입니다.");
        window.location.href = "login.html";
        return;
    }

    const referenceId = button.dataset.id;
    const userId = currentUser.uid;

    try {
        await addDoc(collection(db, "userSaves"), {
            userId: userId,
            referenceId: referenceId,
            savedAt: serverTimestamp()
        });
        alert("내 서랍에 저장되었습니다!");
    } catch (error) {
        alert("저장에 실패했습니다. 다시 시도해주세요.");
        console.error("저장 에러:", error);
    }
}

// 페이지 로드 시 함수 실행
fetchReferences();