import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, deleteDoc, where, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 전역 변수
let allData = [];
let mySavedIds = new Set();
let currentSort = 'id-desc';

// ★ 태그 클릭 시 실행될 전역 함수 (window에 등록)
window.searchByTag = function(tag) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = tag; // 검색창에 태그 입력
        searchInput.dispatchEvent(new Event('input')); // 검색 이벤트 강제 실행
        window.scrollTo({ top: 0, behavior: 'smooth' }); // 맨 위로 스크롤
    }
};

document.addEventListener('DOMContentLoaded', () => {
    refreshContent();

    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');

    // ★ URL 파라미터 확인 (상세페이지에서 태그 누르고 왔을 때)
    const params = new URLSearchParams(window.location.search);
    const urlSearchParam = params.get('search');

    if (urlSearchParam && searchInput) {
        // 1. URL 검색어가 있으면 바로 검색 실행
        searchInput.value = urlSearchParam;
        sessionStorage.setItem('searchKeyword', urlSearchParam);
    } else {
        // 2. 없으면 세션에 저장된 검색어 복구 (뒤로가기 시)
        const savedKeyword = sessionStorage.getItem('searchKeyword');
        if (savedKeyword && searchInput) {
            searchInput.value = savedKeyword;
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const keyword = searchInput.value.trim().toLowerCase();
            sessionStorage.setItem('searchKeyword', keyword);
            filterAndRender(keyword);
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            sortAllData();
            const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
            filterAndRender(keyword);
        });
    }
});

async function refreshContent() {
    const cardWrapper = document.querySelector('.card-wrapper');
    cardWrapper.innerHTML = '<p class="loading-indicator">데이터를 불러오는 중...</p>';

    onAuthStateChanged(auth, async (user) => {
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
            const refSnapshot = await getDocs(collection(db, "references"));
            const allSavesSnapshot = await getDocs(collection(db, "userSaves"));
            
            const saveCounts = {}; 
            allSavesSnapshot.forEach(doc => {
                const rid = doc.data().referenceId;
                saveCounts[rid] = (saveCounts[rid] || 0) + 1;
            });

            allData = [];
            refSnapshot.forEach(doc => {
                const data = doc.data();
                data.saveCount = saveCounts[data.id] || 0; 
                allData.push(data);
            });

            sortAllData();
            
            // 데이터 로드 후 검색어 적용
            const searchInput = document.getElementById('search-input');
            const initialKeyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
            filterAndRender(initialKeyword);

        } catch (error) {
            console.error("로딩 실패:", error);
            cardWrapper.innerHTML = '<p class="empty-message">데이터를 불러오는 중 오류가 발생했습니다.</p>';
        }
    });
}

function sortAllData() {
    const [field, direction] = currentSort.split('-');
    allData.sort((a, b) => {
        let valA = a[field] || 0;
        let valB = b[field] || 0;
        if (field === 'saves') {
            valA = a.saveCount || 0;
            valB = b.saveCount || 0;
        }
        if (direction === 'desc') return valB - valA;
        else return valA - valB;
    });
}

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
    const fallbackImage = "https://placehold.co/300x200?text=No+Image";

    // ★ 태그 클릭 시 event.preventDefault()로 카드 이동 막고 검색 실행!
    const tagsHtml = (data.tags || []).map(tag => 
        `<span class="tag" onclick="event.preventDefault(); window.searchByTag('${tag}')">${tag}</span>`
    ).join('');

    div.innerHTML = `
        <div class="save-button-container">
           <button class="save-btn" onclick="toggleSave(${data.id}, this)">${saveIcon}</button>
        </div>
        <a href="detail.html?id=${data.id}" class="card-link-area">
            <img src="${data.image}" alt="${data.title}" 
                 onerror="this.onerror=null; this.src='${fallbackImage}';">
            <div class="card-content">
                <span class="category-badge">${data.category}</span>
                <h2>${data.title}</h2>
                <p class="summary">${data.summary}</p>
                <div class="card-meta">
                    <span class="view-count">👁️ ${views}</span>
                </div>
                <div class="tags-wrapper">
                    ${tagsHtml}
                </div>
            </div>
        </a>
    `;
    return div;
}

window.toggleSave = async function(refId, btnElement) {
    const user = auth.currentUser;
    if (!user) {
        if(confirm("로그인이 필요합니다. 로그인 페이지로 이동할까요?")) window.location.href = "login.html";
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
            // showToast가 있다면 사용 가능 (여기선 alert 유지 혹은 통합 필요)
            alert("내 서랍에 보관했습니다! 📂"); 
        }
    } catch (error) {
        console.error(error);
        btnElement.textContent = isCurrentlySaved ? '✅' : '📂'; 
    }
};