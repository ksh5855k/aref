// detail.js (최종본 - 조회수 및 삭제 기능 통합)

import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, updateDoc, increment, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Firebase 앱 및 서비스 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 전역 변수로 사용자 ID를 저장
let currentUserId = null; 

// HTML 문서 로딩이 끝났을 때 실행될 코드
document.addEventListener('DOMContentLoaded', async () => {
    // 1. URL에서 레퍼런스의 id를 가져옵니다.
    const urlParams = new URLSearchParams(window.location.search);
    const id = parseInt(urlParams.get('id'));

    // 2. 로그인 상태 감지
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            alert("자료를 보려면 로그인이 필요합니다.");
            window.location.href = "login.html";
            return;
        }
        currentUserId = user.uid; // 사용자 ID 저장

        // 3. ID 유효성 검사
        if (isNaN(id)) {
            document.querySelector('.detail-content').innerHTML = `<p class="error-message">유효하지 않은 임무 자료 ID입니다.</p>`;
            return;
        }

        await fetchAndRenderReference(id); // 메인 렌더링 함수 호출
        attachDeleteListener(); // 삭제 이벤트 리스너 추가
    });
});


// 상세 페이지 데이터를 가져와 화면에 그리는 메인 함수
async function fetchAndRenderReference(id) {
    const detailContent = document.querySelector('.detail-content');
    if (!detailContent) return;

    try {
        const q = query(collection(db, "references"), where("id", "==", id));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            detailContent.innerHTML = `<p class="error-message">임무 자료를 찾을 수 없습니다.</p>`;
            return;
        }

        const docSnapshot = querySnapshot.docs[0];
        const refData = docSnapshot.data();
        const docRef = docSnapshot.ref; 
        
        // 조회수 증가 및 계산
        await updateDoc(docRef, { views: increment(1) });
        const currentViews = refData.views || 0;
        const newViews = currentViews + 1;
        
        // 4. 모든 데이터를 동적으로 생성하여 화면에 그립니다.
        const contentHTML = `
            <h2>${refData.title || '제목 없음'}</h2>
            
            <p class="ref-meta">
                <span>작성자: <span id="ref-author">${refData.author || '익명 에이전트'}</span></span>
                | <span>조회수: <span id="ref-views">${newViews}</span></span>
            </p>

            <div class="edit-button-container">
                <a href="edit.html?id=${id}" class="edit-link">수정하기 ✏️</a>
                <button id="delete-post-btn" class="delete-post-btn" data-doc-id="${docSnapshot.id}">자료 삭제 🗑️</button>
            </div>

            <img src="${refData.image}" alt="${refData.title} 이미지">
            
            <h3>[캠페인 요약]</h3>
            <p>${refData.detailSummary || '요약 정보 없음'}</p>
            
            <h3>[Why it works]</h3>
            <p>${refData.detailWhy || '분석 정보 없음'}</p>

            <h3>[How to apply]</h3>
            <p>${refData.detailHow || '적용 방안 없음'}</p>

            <div class="button-wrapper">
                <a href="${refData.externalLink}" target="_blank" class="external-link">자세한 내용 확인하기</a>
                <a href="index.html" class="back-to-list">목록으로 돌아가기</a>
            </div>
        `;
        detailContent.innerHTML = contentHTML;
        document.title = `${refData.title} - A!Ref`;
        
    } catch (error) {
        console.error("임무 자료를 불러오는 중 오류 발생:", error);
        document.querySelector('.detail-content').innerHTML = `<p class="error-message">자료 처리 중 오류가 발생했습니다. (콘솔 확인 필요)</p>`;
    }
}


// 삭제 버튼 이벤트 리스너 함수
function attachDeleteListener() {
    const deleteBtn = document.getElementById('delete-post-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            const docId = deleteBtn.dataset.docId; // 문서 고유 ID를 가져옵니다.

            const confirmDelete = confirm("[에이전트님], 이 임무 자료를 영구적으로 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다.");
            
            if (confirmDelete) {
                try {
                    // 1. userSaves 컬렉션에서 해당 자료를 저장한 모든 기록을 삭제합니다. (보안상 중요한 단계)
                    const savesQuery = query(collection(db, "userSaves"), where("referenceId", "==", docId));
                    const savesSnapshot = await getDocs(savesQuery);
                    
                    const deletePromises = savesSnapshot.docs.map(doc => deleteDoc(doc.ref));
                    await Promise.all(deletePromises); 

                    // 2. references 컬렉션에서 해당 문서 자체를 삭제합니다.
                    await deleteDoc(doc(db, "references", docId));

                    alert("자료가 본부에서 영구 삭제되었습니다. 임무 완료! ✅");
                    window.location.href = "index.html"; // 메인 페이지로 이동

                } catch (error) {
                    alert("자료 삭제 중 치명적인 오류가 발생했습니다.");
                    console.error("Delete Error:", error);
                }
            }
        });
    }
}