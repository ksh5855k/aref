import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, addDoc, deleteDoc, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 전역 변수
let allData = [];           // 모든 레퍼런스 데이터 (저장 수 계산 포함)
let mySavedIds = new Set(); // 내가 저장한 글 ID 목록
let currentSort = 'id-desc'; // 기본 정렬

document.addEventListener('DOMContentLoaded', () => {
    // 1. 초기 데이터 로드
    refreshContent();

    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');

    // 2. 세션에 저장된 검색어가 있다면 복구 (목록으로 돌아왔을 때)
    const savedKeyword = sessionStorage.getItem('searchKeyword');
    if (savedKeyword && searchInput) {
        searchInput.value = savedKeyword;
    }

    // 3. 실시간 검색 이벤트
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const keyword = searchInput.value.trim().toLowerCase();
            // 검색어 세션에 저장
            sessionStorage.setItem('searchKeyword', keyword);
            filterAndRender(keyword);
        });
    }

    // 4. 정렬 변경 이벤트
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            sortAllData(); // 정렬 다시 하기
            
            // 검색어가 있으면 그 상태 유지하면서 재정렬
            const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
            filterAndRender(keyword);
        });
    }
});

// 데이터 로드 및 저장 수 계산 함수
async function refreshContent() {
    const cardWrapper = document.querySelector('.card-wrapper');
    cardWrapper.innerHTML = '<p class="loading-indicator">데이터를 불러오는 중...</p>';

    onAuthStateChanged(auth, async (user) => {
        // A. 찜 목록 로드 (나의 저장 상태 확인용)
        if (user) {
            try {
                const saveQ = query(collection(db, "userSaves"), where("uid", "==", user.uid));
                const saveSnapshot = await getDocs(saveQ);
                mySavedIds.clear();
                saveSnapshot.forEach(doc => mySavedIds.add(doc.data().referenceId));
            } catch (e) { console.error(e); }
        } else {
            mySavedIds.clear();
        }

        try {
            // B. 레퍼런스 데이터 & 전체 저장 횟수 로드
            const refSnapshot = await getDocs(collection(db, "references"));
            const allSavesSnapshot = await getDocs(collection(db, "userSaves"));
            
            // 저장 횟수 카운팅 (Reference ID별로 집계)
            const saveCounts = {}; 
            allSavesSnapshot.forEach(doc => {
                const rid = doc.data().referenceId;
                saveCounts[rid] = (saveCounts[rid] || 0) + 1;
            });

            // C. 데이터 합치기
            allData = [];
            refSnapshot.forEach(doc => {
                const data = doc.data();
                data.saveCount = saveCounts[data.id] || 0; 
                allData.push(data);
            });

            // D. 정렬 및 렌더링
            sortAllData();
            
            // 저장된 검색어가 있으면 그 검색어로, 없으면 전체 렌더링
            const searchInput = document.getElementById('search-input');
            const initialKeyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
            filterAndRender(initialKeyword);

        } catch (error) {
            console.error("로딩 실패:", error);
            cardWrapper.innerHTML = '<p class="error-message">데이터를 불러오는 중 오류가 발생했습니다.</p>';
        }
    });
}

// 정렬 로직
function sortAllData() {
    const [field, direction] = currentSort.split('-');

    allData.sort((a, b) => {
        let valA = a[field] || 0;
        let valB = b[field] || 0;

        // 'saves' 정렬일 경우 saveCount 필드 사용
        if (field === 'saves') {
            valA = a.saveCount || 0;
            valB = b.saveCount || 0;
        }

        if (direction === 'desc') return valB - valA;
        else return valA - valB;
    });
}

// 필터링 & 화면 그리기 & 결과 세션 저장
function filterAndRender(keyword) {
    const cardWrapper = document.querySelector('.card-wrapper');
    cardWrapper.innerHTML = '';

    const filtered = allData.filter(item => {
        const searchableText = [
            item.title,
            item.category,
            item.summary,
            item.detailWhy,
            item.detailHow,
            ...(item.tags || [])
        ].join(' ').toLowerCase();

        return searchableText.includes(keyword);
    });

    // ★ 핵심: 현재 보이는 순서(ID 목록)를 세션에 저장 (상세페이지 내비게이션용)
    const resultIds = filtered.map(item => item.id);
    sessionStorage.setItem('currentResults', JSON.stringify(resultIds));

    if (filtered.length === 0) {
        cardWrapper.innerHTML = '<p class="empty-message">일치하는 인사이트가 없습니다. 🔍</p>';
        return;
    }

    filtered.forEach(data => {
        const isSaved = mySavedIds.has(data.id);
        const card = createReferenceCard(data, isSaved);
        cardWrapper.appendChild(card);
    });
}

function createReferenceCard(data, isSaved) {
    const div = document.createElement('div');
    div.className = 'reference-card';
    const views = data.views || 0;
    const saveIcon = isSaved ? '✅' : '📂'; 

    div.innerHTML = `
        <div class="save-button-container">
           <button class="save-btn" onclick="toggleSave(${data.id}, this)">${saveIcon}</button>
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

// 저장/취소 기능
window.toggleSave = async function(refId, btnElement) {
    const user = auth.currentUser;
    if (!user) {
        if(confirm("로그인이 필요합니다. 로그인 페이지로 이동할까요?")) {
            window.location.href = "login.html";
        }
        return;
    }

    const isCurrentlySaved = btnElement.textContent === '✅';
    btnElement.textContent = isCurrentlySaved ? '📂' : '✅'; 

    try {
        if (isCurrentlySaved) {
            const q = query(collection(db, "userSaves"), where("uid", "==", user.uid), where("referenceId", "==", refId));
            const snapshot = await getDocs(q);
            snapshot.forEach(async (doc) => await deleteDoc(doc.ref));
        } else {
            await addDoc(collection(db, "userSaves"), {
                uid: user.uid,
                referenceId: refId,
                savedAt: new Date().toISOString()
            });
            alert("내 서랍에 보관했습니다! 📂");
        }
    } catch (error) {
        console.error(error);
        btnElement.textContent = isCurrentlySaved ? '✅' : '📂'; 
    }
};