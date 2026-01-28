import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, deleteDoc, where, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { showToast } from './toast.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let allData = [];
let mySavedIds = new Set();
let currentSort = 'id-desc';

// ★ 페이지네이션 변수
let currentFilteredData = []; // 현재 필터링된 전체 데이터
let currentRenderCount = 0;   // 현재 화면에 그려진 개수
const BATCH_SIZE = 12;        // 한 번에 보여줄 개수

let currentCategory = sessionStorage.getItem('selectedCategory') || 'all'; 

const STANDARD_CATEGORIES = [
    '디지털', '인쇄/옥외', '프로모션', '콘텐츠', '인사이트', '캠페인'
];

function getSkeletonHTML() {
    let html = '';
    for(let i=0; i<8; i++) {
        html += `
        <div class="skeleton-card">
            <div class="skeleton skeleton-img"></div>
            <div class="skeleton-content">
                <div class="skeleton skeleton-text" style="width: 30%;"></div>
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text short"></div>
                <div style="margin-top: 10px;">
                    <div class="skeleton skeleton-tag"></div>
                    <div class="skeleton skeleton-tag"></div>
                </div>
            </div>
        </div>`;
    }
    return html;
}

window.filterCategory = function(category, btnElement) {
    currentCategory = category;
    sessionStorage.setItem('selectedCategory', currentCategory);
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    const searchInput = document.getElementById('search-input');
    const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
    filterAndRender(keyword);
};

window.searchByTag = function(tag) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = tag; 
        searchInput.dispatchEvent(new Event('input')); 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
        btn.classList.remove('active');
        let btnCategory = 'all';
        if (btn.getAttribute('onclick').includes("'디지털'")) btnCategory = '디지털';
        else if (btn.getAttribute('onclick').includes("'인쇄/옥외'")) btnCategory = '인쇄/옥외';
        else if (btn.getAttribute('onclick').includes("'프로모션'")) btnCategory = '프로모션';
        else if (btn.getAttribute('onclick').includes("'콘텐츠'")) btnCategory = '콘텐츠';
        else if (btn.getAttribute('onclick').includes("'인사이트'")) btnCategory = '인사이트';
        else if (btn.getAttribute('onclick').includes("'캠페인'")) btnCategory = '캠페인';
        else if (btn.getAttribute('onclick').includes("'기타'")) btnCategory = '기타';

        if(currentCategory === btnCategory) btn.classList.add('active');
    });

    refreshContent(); 

    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const params = new URLSearchParams(window.location.search);
    const urlSearchParam = params.get('search');

    if (urlSearchParam && searchInput) {
        searchInput.value = urlSearchParam;
        sessionStorage.setItem('searchKeyword', urlSearchParam);
    } else {
        const savedKeyword = sessionStorage.getItem('searchKeyword');
        if (savedKeyword && searchInput) searchInput.value = savedKeyword;
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

    // ★ [추가됨] 더 보기 버튼 이벤트 리스너
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            renderNextBatch();
        });
    }
});

async function refreshContent() {
    const cardWrapper = document.querySelector('.card-wrapper');
    const loadMoreContainer = document.getElementById('load-more-container');
    
    cardWrapper.innerHTML = getSkeletonHTML(); 
    if(loadMoreContainer) loadMoreContainer.style.display = 'none'; // 로딩 중 버튼 숨김

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
        if (field === 'saves') { valA = a.saveCount || 0; valB = b.saveCount || 0; }
        if (direction === 'desc') return valB - valA;
        else return valA - valB;
    });
}

function filterAndRender(keyword) {
    const cardWrapper = document.querySelector('.card-wrapper');
    const loadMoreContainer = document.getElementById('load-more-container');
    
    // 1. 필터링 로직 (기존과 동일)
    const filtered = allData.filter(item => {
        if (currentCategory !== 'all') {
            if (currentCategory === '기타') {
                if (STANDARD_CATEGORIES.includes(item.category)) return false;
            } else {
                if (item.category !== currentCategory) return false;
            }
        }
        const searchableText = [
            item.title, item.category, item.summary, 
            item.detailWhy, item.detailHow, ...(item.tags || [])
        ].join(' ').toLowerCase();

        return searchableText.includes(keyword);
    });

    // 2. ★ 결과 저장 및 초기화
    currentFilteredData = filtered; // 전역 변수에 저장
    currentRenderCount = 0;         // 렌더링 카운트 초기화
    cardWrapper.innerHTML = '';     // 화면 비우기

    const resultIds = filtered.map(item => item.id);
    sessionStorage.setItem('currentResults', JSON.stringify(resultIds));

    // 3. 결과가 없을 때
    if (filtered.length === 0) {
        cardWrapper.innerHTML = `
            <div class="empty-message">
                <p>아직 등록된 레퍼런스가 없어요.</p>
                <p style="font-size: 0.9em; color: #888; margin-top: 5px;">이 키워드의 첫 번째 발견자가 되어주세요! 🕵️‍♀️</p>
            </div>`;
        if(loadMoreContainer) loadMoreContainer.style.display = 'none';
        return;
    }

    // 4. ★ 첫 배치는 즉시 렌더링
    renderNextBatch();
}

// ★ [추가됨] 다음 배치 렌더링 함수
function renderNextBatch() {
    const cardWrapper = document.querySelector('.card-wrapper');
    const loadMoreContainer = document.getElementById('load-more-container');
    const loadMoreBtn = document.getElementById('load-more-btn');

    // 다음 12개 데이터 가져오기
    const nextBatch = currentFilteredData.slice(currentRenderCount, currentRenderCount + BATCH_SIZE);
    
    nextBatch.forEach(data => {
        const isSaved = mySavedIds.has(data.id);
        const card = createReferenceCard(data, isSaved);
        cardWrapper.appendChild(card);
    });

    // 카운트 업데이트
    currentRenderCount += nextBatch.length;

    // 더 보여줄 데이터가 남았는지 확인
    if (currentRenderCount >= currentFilteredData.length) {
        if(loadMoreContainer) loadMoreContainer.style.display = 'none';
    } else {
        if(loadMoreContainer) loadMoreContainer.style.display = 'block';
        if(loadMoreBtn) loadMoreBtn.textContent = '더 보기 ⬇️';
    }
}

function createReferenceCard(data, isSaved) {
    const div = document.createElement('div');
    div.className = 'reference-card';
    const views = data.views || 0;
    const saveIcon = isSaved ? '✅' : '📂'; 
    const fallbackImage = "https://placehold.co/300x200?text=No+Image";

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
                    <span class="save-count" style="margin-left:8px; font-size:0.85em; color:#666;">📂 ${data.saveCount || 0}</span>
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

    if (isCurrentlySaved) {
        if(!confirm("내 서랍에서 삭제하시겠습니까?")) return;
        
        try {
            const q = query(collection(db, "userSaves"), where("uid", "==", user.uid), where("referenceId", "==", refId));
            const snapshot = await getDocs(q);
            snapshot.forEach(async (doc) => await deleteDoc(doc.ref));
            
            btnElement.textContent = '📂';
            showToast("내 서랍에서 삭제되었습니다.");
        } catch (error) {
            console.error(error);
            showToast("오류가 발생했습니다.");
        }
        return;
    }

    openSaveModal(refId, btnElement);
};

async function openSaveModal(refId, btnElement) {
    const modal = document.getElementById('save-modal-overlay');
    const select = document.getElementById('modal-folder-select');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const input = document.getElementById('modal-new-folder-input');
    const user = auth.currentUser;

    if (!modal) return;

    modal.style.display = 'flex';
    input.style.display = 'none';
    input.value = '';
    
    select.innerHTML = '<option value="loading">폴더 불러오는 중...</option>';

    try {
        const q = query(collection(db, "folders"), where("uid", "==", user.uid));
        const snapshot = await getDocs(q);
        
        let folders = [];
        snapshot.forEach(doc => {
            folders.push({ id: doc.id, ...doc.data() });
        });
        
        folders.sort((a, b) => {
            if (a.createdAt < b.createdAt) return -1;
            if (a.createdAt > b.createdAt) return 1;
            return 0;
        });

        select.innerHTML = ''; 
        
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = '기본 보관함 (전체)';
        select.appendChild(allOption);

        folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = `📂 ${folder.name}`;
            select.appendChild(option);
        });

        const newOption = document.createElement('option');
        newOption.value = 'create_new'; 
        newOption.textContent = '➕ 새 폴더 추가';
        newOption.style.fontWeight = 'bold';
        newOption.style.color = '#333';
        select.appendChild(newOption);

    } catch (e) {
        console.error("폴더 로드 실패", e);
        select.innerHTML = '<option value="all">기본 보관함 (전체)</option>';
    }

    select.onchange = function() {
        if (select.value === 'create_new') {
            input.style.display = 'block'; 
            input.focus();
        } else {
            input.style.display = 'none'; 
        }
    };

    confirmBtn.onclick = () => confirmSaveInModal(refId, btnElement);
}

window.closeSaveModal = function() {
    const modal = document.getElementById('save-modal-overlay');
    const input = document.getElementById('modal-new-folder-input');
    if(modal) modal.style.display = 'none';
    if(input) {
        input.value = '';
        input.style.display = 'none';
    }
};

async function confirmSaveInModal(refId, btnElement) {
    const user = auth.currentUser;
    const select = document.getElementById('modal-folder-select');
    const newFolderInput = document.getElementById('modal-new-folder-input');
    
    let targetFolderId = select.value;
    let newFolderName = "";

    try {
        if (targetFolderId === 'create_new') {
            newFolderName = newFolderInput.value.trim();
            if (!newFolderName) {
                alert("새 폴더 이름을 입력해주세요!");
                return;
            }
            
            const folderDoc = await addDoc(collection(db, "folders"), {
                uid: user.uid,
                name: newFolderName,
                createdAt: new Date().toISOString()
            });
            targetFolderId = folderDoc.id; 
        } 

        await addDoc(collection(db, "userSaves"), {
            uid: user.uid,
            referenceId: refId,
            folderId: targetFolderId, 
            savedAt: new Date().toISOString()
        });

        btnElement.textContent = '✅';
        closeSaveModal();
        
        const msg = (newFolderName) ? 
            `📂 '${newFolderName}' 폴더에 저장했습니다!` : 
            "내 서랍에 보관했습니다! 📂";
        showToast(msg);

    } catch (error) {
        console.error("저장 실패:", error);
        showToast("저장 중 오류가 발생했습니다.");
    }
}