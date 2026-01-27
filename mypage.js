import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { showToast } from './toast.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 스켈레톤 HTML 생성 함수 (보관함용)
function getSkeletonHTML() {
    let html = '';
    for(let i=0; i<4; i++) { // 보관함은 4개 정도만 보여줘도 충분
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

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            alert("로그인이 필요한 서비스입니다.");
            window.location.href = "login.html";
            return;
        }

        // ★ 로딩 시작: 스켈레톤 보여주기
        drawerList.innerHTML = getSkeletonHTML();

        try {
            const savesQuery = query(collection(db, "userSaves"), where("uid", "==", user.uid));
            const savesSnapshot = await getDocs(savesQuery);

            if (savesSnapshot.empty) {
                drawerList.innerHTML = '<div class="empty-message" style="text-align:center; padding: 50px;"><h3>텅 비어있어요 🗑️</h3><p>마음에 드는 레퍼런스를 저장해보세요!</p></div>';
                return;
            }

            const savedRefIds = [];
            savesSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.referenceId) savedRefIds.push(data.referenceId);
            });

            savedRefIds.reverse();

            // 실제 데이터를 그리기 위해 비우기
            drawerList.innerHTML = ''; 

            for (const rid of savedRefIds) {
                const q = query(collection(db, "references"), where("id", "==", rid));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        const card = createDrawerCard(data, true); 
                        drawerList.appendChild(card);
                    });
                }
            }
            
            // 다 돌았는데 혹시 렌더링 된 게 하나도 없으면 (원본 삭제 등)
            if (drawerList.children.length === 0) {
                 drawerList.innerHTML = '<div class="empty-message" style="text-align:center; padding: 50px;"><h3>텅 비어있어요 🗑️</h3><p>마음에 드는 레퍼런스를 저장해보세요!</p></div>';
            }

        } catch (error) {
            console.error("내 서랍 로딩 실패:", error);
            drawerList.innerHTML = `<p class="error-message">오류 발생: ${error.message}</p>`;
        }
    });
});

function createDrawerCard(data, isSaved) {
    const div = document.createElement('div');
    div.className = 'reference-card';
    const views = data.views || 0;
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
                card.remove();
                const drawerList = document.getElementById('my-drawer-list');
                if (drawerList.children.length === 0) {
                     drawerList.innerHTML = '<div class="empty-message" style="text-align:center; padding: 50px;"><h3>텅 비어있어요 🗑️</h3><p>마음에 드는 레퍼런스를 저장해보세요!</p></div>';
                }
            }, 300);

            showToast("보관함에서 삭제되었습니다.");

        } catch (error) {
            console.error(error);
            showToast("삭제 중 오류가 발생했습니다.");
        }
    }
};