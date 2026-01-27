import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { showToast } from './toast.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let savedDataList = []; 
let currentSort = 'id-desc'; 

// 스켈레톤 HTML
function getSkeletonHTML() {
    let html = '';
    for(let i=0; i<4; i++) {
        html += `
        <div class="skeleton-card">
            <div class="skeleton skeleton-img"></div>
            <div class="skeleton-content">
                <div class="skeleton skeleton-text" style="width: 30%;"></div>
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text short"></div>
            </div>
        </div>`;
    }
    return html;
}

document.addEventListener('DOMContentLoaded', () => {
    const drawerList = document.getElementById('my-drawer-list');
    
    // 정렬 이벤트
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderDrawer(); 
        });
    }

    // ★ [추가됨] 헤더 검색창 기능 연결
    // 내 서랍에서 검색하면 -> 전체 검색(메인페이지)으로 이동
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const keyword = searchInput.value.trim();
                if (keyword) {
                    window.location.href = `index.html?search=${encodeURIComponent(keyword)}`;
                }
            }
        });
    }

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            alert("로그인이 필요한 서비스입니다.");
            window.location.href = "login.html";
            return;
        }

        drawerList.innerHTML = getSkeletonHTML();

        try {
            // 1. 내가 저장한 목록
            const mySaveQ = query(collection(db, "userSaves"), where("uid", "==", user.uid));
            const mySaveSnapshot = await getDocs(mySaveQ);

            if (mySaveSnapshot.empty) {
                drawerList.innerHTML = '<div class="empty-message" style="text-align:center; padding: 50px;"><h3>텅 비어있어요 🗑️</h3><p>마음에 드는 레퍼런스를 저장해보세요!</p></div>';
                return;
            }

            const mySavedRefIds = new Set();
            mySaveSnapshot.forEach(doc => mySavedRefIds.add(doc.data().referenceId));

            // 2. 전체 레퍼런스 가져오기
            const refSnapshot = await getDocs(collection(db, "references"));
            
            // 3. 전체 저장 수 카운트
            const allSavesSnapshot = await getDocs(collection(db, "userSaves"));
            const saveCounts = {};
            allSavesSnapshot.forEach(doc => {
                const rid = doc.data().referenceId;
                saveCounts[rid] = (saveCounts[rid] || 0) + 1;
            });

            // 4. 데이터 합치기
            savedDataList = [];
            refSnapshot.forEach(doc => {
                const data = doc.data();
                if (mySavedRefIds.has(data.id)) {
                    data.saveCount = saveCounts[data.id] || 0;
                    savedDataList.push(data);
                }
            });

            renderDrawer();

        } catch (error) {
            console.error("내 서랍 로딩 실패:", error);
            drawerList.innerHTML = `<p class="error-message">오류 발생: ${error.message}</p>`;
        }
    });
});

function renderDrawer() {
    const drawerList = document.getElementById('my-drawer-list');
    drawerList.innerHTML = '';

    if (savedDataList.length === 0) {
         drawerList.innerHTML = '<div class="empty-message" style="text-align:center; padding: 50px;"><h3>텅 비어있어요 🗑️</h3><p>마음에 드는 레퍼런스를 저장해보세요!</p></div>';
         return;
    }

    // 정렬
    const [field, direction] = currentSort.split('-');
    savedDataList.sort((a, b) => {
        let valA = a[field] || 0;
        let valB = b[field] || 0;
        
        if (field === 'saves') {
            valA = a.saveCount || 0;
            valB = b.saveCount || 0;
        }

        if (direction === 'desc') return valB - valA;
        else return valA - valB;
    });

    savedDataList.forEach(data => {
        const card = createDrawerCard(data);
        drawerList.appendChild(card);
    });
}

function createDrawerCard(data) {
    const div = document.createElement('div');
    div.className = 'reference-card';
    const fallbackImage = "https://placehold.co/300x200?text=No+Image";

    div.innerHTML = `
        <div class="save-button-container">
           <button class="save-btn" onclick="removeFromDrawer(${data.id}, this)">✅</button>
        </div>
        <a href="detail.html?id=${data.id}" class="card-link-area">
            <img src="${data.image}" alt="${data.title}" 
                 onerror="this.onerror=null; this.src='${fallbackImage}';">
            <div class="card-content">
                <span class="category-badge">${data.category}</span>
                <h2>${data.title}</h2>
                <p class="summary">${data.summary}</p>
                <div class="card-meta">
                     <span class="view-count">👁️ ${data.views || 0}</span>
                     <span class="save-count" style="margin-left:8px; font-size:0.85em; color:#666;">📂 ${data.saveCount || 0}</span>
                </div>
                <div class="tags-wrapper">
                    ${(data.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        </a>
    `;
    return div;
}

window.removeFromDrawer = async function(refId, btnElement) {
    const user = auth.currentUser;
    if (!user) return;

    if (confirm("보관함에서 삭제하시겠습니까?")) {
        try {
            const q = query(collection(db, "userSaves"), where("uid", "==", user.uid), where("referenceId", "==", refId));
            const snapshot = await getDocs(q);
            
            snapshot.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });
            
            const card = btnElement.closest('.reference-card');
            card.style.transition = 'opacity 0.3s, transform 0.3s';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            
            setTimeout(() => {
                savedDataList = savedDataList.filter(item => item.id !== refId);
                renderDrawer(); 
                showToast("보관함에서 삭제되었습니다.");
            }, 300);

        } catch (error) {
            console.error(error);
            showToast("삭제 중 오류가 발생했습니다.");
        }
    }
};