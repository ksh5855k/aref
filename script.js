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

// 페이지 로드 시 저장된 카테고리가 있으면 가져오고, 없으면 'all'
let currentCategory = sessionStorage.getItem('selectedCategory') || 'all'; 

// 정식 카테고리 목록
const STANDARD_CATEGORIES = [
    '디지털', 
    '인쇄/옥외', 
    '프로모션', 
    '콘텐츠',
    '인사이트',
    '캠페인'
];

// 스켈레톤 HTML 생성
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

// 카테고리 클릭 시 저장소에 저장하는 로직
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
    // 탭 상태 복구
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

        if(currentCategory === btnCategory) {
            btn.classList.add('active');
        }
    });

    refreshContent(); 

    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');

    // URL 검색어 처리
    const params = new URLSearchParams(window.location.search);
    const urlSearchParam = params.get('search');

    if (urlSearchParam && searchInput) {
        searchInput.value = urlSearchParam;
        sessionStorage.setItem('searchKeyword', urlSearchParam);
    } else {
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
    cardWrapper.innerHTML = getSkeletonHTML(); 

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
            
            // 전체 저장 수 계산
            const saveCounts = {}; 
            allSavesSnapshot.forEach(doc => {
                const rid = doc.data().referenceId;
                saveCounts[rid] = (saveCounts[rid] || 0) + 1;
            });

            allData = [];
            refSnapshot.forEach(doc => {
                const data = doc.data();
                data.saveCount = saveCounts[data.id] || 0; // 저장 수 데이터에 추가
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
        
        // 저장순일 때 예외 처리
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
        if (currentCategory !== 'all') {
            if (currentCategory === '기타') {
                if (STANDARD_CATEGORIES.includes(item.category)) {
                    return false;
                }
            } else {
                if (item.category !== currentCategory) {
                    return false;
                }
            }
        }

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
        cardWrapper.innerHTML = `
            <div class="empty-message">
                <p>아직 등록된 레퍼런스가 없어요.</p>
                <p style="font-size: 0.9em; color: #888; margin-top: 5px;">이 키워드의 첫 번째 발견자가 되어주세요! 🕵️‍♀️</p>
            </div>`;
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
            showToast("내 서랍에 보관했습니다! 📂"); 
        }
    } catch (error) {
        console.error(error);
        btnElement.textContent = isCurrentlySaved ? '✅' : '📂';
        showToast("오류가 발생했습니다.");
    }
};