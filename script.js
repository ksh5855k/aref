// script.js (전체 코드 복사 후 덮어쓰기)

import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, addDoc, deleteDoc, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 전역 변수로 내 찜 목록 관리
let mySavedIds = new Set(); 

document.addEventListener('DOMContentLoaded', async () => {
    const cardWrapper = document.querySelector('.card-wrapper');
    const loadingIndicator = document.querySelector('.loading-indicator');

    // 1. 우선 모든 레퍼런스 카드 불러오기
    let allReferences = [];
    try {
        const q = query(collection(db, "references"), orderBy("id", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            loadingIndicator.style.display = 'none';
            cardWrapper.innerHTML = '<p class="empty-message">등록된 임무 자료가 없습니다.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            allReferences.push(doc.data());
        });

    } catch (error) {
        console.error("데이터 로딩 실패:", error);
        loadingIndicator.textContent = "데이터를 불러오는 중 오류가 발생했습니다.";
    }

    // 2. 로그인 상태 체크 후, '내가 찜한 목록' 가져와서 하트 색칠하기
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const saveQ = query(collection(db, "userSaves"), where("uid", "==", user.uid));
                const saveSnapshot = await getDocs(saveQ);
                mySavedIds.clear();
                saveSnapshot.forEach(doc => {
                    mySavedIds.add(doc.data().referenceId);
                });
            } catch (e) {
                console.error("찜 목록 로딩 실패", e);
            }
        } else {
            mySavedIds.clear();
        }

        // 3. 카드 그리기
        loadingIndicator.style.display = 'none';
        cardWrapper.innerHTML = ''; 

        allReferences.forEach(data => {
            const isSaved = mySavedIds.has(data.id);
            const card = createReferenceCard(data, isSaved);
            cardWrapper.appendChild(card);
        });
    });
});

function createReferenceCard(data, isSaved) {
    const div = document.createElement('div');
    div.className = 'reference-card';
    
    const views = data.views || 0;
    const heartIcon = isSaved ? '✅' : '📂'; 

    div.innerHTML = `
        <div class="save-button-container">
           <button class="save-btn" onclick="toggleSave(${data.id}, this)">${heartIcon}</button>
        </div>
        <a href="detail.html?id=${data.id}" class="card-link-area">
            <img src="${data.image}" alt="${data.title}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
            <div class="card-content">
                <span class="category-badge">${data.category}</span>
                <h2>${data.title}</h2>
                <p class="summary">${data.summary}</p>
                <div class="card-meta">
                    <span class="view-count">👁️ ${views}</span>
                </div>
                <div class="tags-wrapper">
                    ${(data.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        </a>
    `;
    return div;
}

// 4. 저장/취소 기능
window.toggleSave = async function(refId, btnElement) {
    const user = auth.currentUser;
    
    if (!user) {
        if(confirm("이 기능을 사용하려면 로그인이 필요합니다. 로그인 페이지로 이동할까요?")) {
            window.location.href = "login.html";
        }
        return;
    }

    const isCurrentlySaved = btnElement.textContent === '✅';
    btnElement.textContent = isCurrentlySaved ? '📂' : '✅';

    try {
        if (isCurrentlySaved) {
            // 삭제 로직
            const q = query(
                collection(db, "userSaves"), 
                where("uid", "==", user.uid),
                where("referenceId", "==", refId)
            );
            const snapshot = await getDocs(q);
            snapshot.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });
        } else {
            // 저장 로직
            await addDoc(collection(db, "userSaves"), {
                uid: user.uid,
                referenceId: refId,
                savedAt: new Date().toISOString()
            });
            alert("내 서랍에 저장했습니다! 📂");
        }
    } catch (error) {
        console.error("저장/삭제 중 오류:", error);
        alert("처리에 실패했습니다.");
        btnElement.textContent = isCurrentlySaved ? '✅' : '📂';
    }
};