// mypage.js (최종 수정본)

import { firebaseConfig } from './config.js'; // 설정 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, documentId, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Firebase 앱 및 서비스 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchMySavedReferences(user.uid);
    } else {
        alert("로그인이 필요한 페이지입니다.");
        window.location.href = "login.html";
    }
});

async function fetchMySavedReferences(userId) {
    const cardWrapper = document.querySelector('.card-wrapper');
    if (!cardWrapper) return;

    try {
        const savesQuery = query(collection(db, "userSaves"), where("userId", "==", userId));
        const savesSnapshot = await getDocs(savesQuery);
        const savedReferenceIds = savesSnapshot.docs.map(doc => doc.data().referenceId);

        if (savedReferenceIds.length > 0) {
            const refsQuery = query(collection(db, "references"), where(documentId(), "in", savedReferenceIds));
            const refsSnapshot = await getDocs(refsQuery);
            let html = '';
            refsSnapshot.forEach((doc) => {
                const ref = doc.data();
                // 저장 버튼 대신 삭제 버튼 추가
                html += `
                    <div class="reference-card" id="card-${doc.id}">
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
                            <button class="delete-btn" data-ref-id="${doc.id}">🗑️</button>
                        </div>
                    </div>
                `;
            });
            cardWrapper.innerHTML = html;

            // '이벤트 위임' 방식으로 삭제 버튼 이벤트 리스너 추가
            cardWrapper.addEventListener('click', async (event) => {
                const deleteButton = event.target.closest('.delete-btn');
                if (deleteButton) {
                    await handleDeleteButtonClick(deleteButton, userId); // 삭제 로직 함수 호출
                }
            });

        } else {
            cardWrapper.innerHTML = `<p class="empty-message">내 서랍이 비어있습니다. 마음에 드는 레퍼런스를 저장해보세요!</p>`;
        }
    } catch (error) {
        console.error("Error fetching saved references: ", error);
        cardWrapper.innerHTML = `<p class="error-message">데이터를 불러오는 데 실패했습니다.</p>`;
    }
}

// 삭제 버튼 클릭 처리 함수
async function handleDeleteButtonClick(button, userId) {
    const referenceId = button.dataset.refId; // reference 컬렉션의 문서 ID

    // 사용자에게 정말 삭제할 것인지 확인 받기 (선택 사항)
    const confirmDelete = confirm("정말 이 레퍼런스를 내 서랍에서 삭제하시겠습니까?");
    if (!confirmDelete) {
        return;
    }

    try {
        // userSaves 컬렉션에서 삭제할 문서를 찾습니다. (userId와 referenceId가 모두 일치하는)
        const deleteQuery = query(collection(db, "userSaves"), where("userId", "==", userId), where("referenceId", "==", referenceId));
        const deleteSnapshot = await getDocs(deleteQuery);

        if (!deleteSnapshot.empty) {
            const docToDelete = deleteSnapshot.docs[0];
            await deleteDoc(docToDelete.ref); // 문서를 삭제합니다.
            alert("내 서랍에서 삭제되었습니다.");

            // 화면에서도 해당 카드를 즉시 제거합니다.
            document.getElementById(`card-${referenceId}`).remove();

            // 만약 삭제 후 서랍이 비었다면 메시지를 표시합니다.
            if (document.querySelectorAll('.reference-card').length === 0) {
                 document.querySelector('.card-wrapper').innerHTML = `<p class="empty-message">내 서랍이 비어있습니다.</p>`;
            }

        } else {
            alert("삭제할 항목을 찾지 못했습니다.");
        }
    } catch (error) {
        alert("삭제 중 오류가 발생했습니다.");
        console.error("삭제 에러:", error);
    }
}