import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    const drawerList = document.getElementById('my-drawer-list');

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            alert("로그인이 필요한 서비스입니다.");
            window.location.href = "login.html";
            return;
        }

        try {
            // 1. 내가 찜한(userSaves) 목록 조회
            const savesQuery = query(collection(db, "userSaves"), where("uid", "==", user.uid));
            const savesSnapshot = await getDocs(savesQuery);

            if (savesSnapshot.empty) {
                drawerList.innerHTML = '<p class="empty-message">아직 보관한 레퍼런스가 없어요. <br><a href="index.html">탐색하러 가기</a></p>';
                return;
            }

            // 2. 찜한 자료의 ID 추출
            const savedRefIds = [];
            savesSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.referenceId) savedRefIds.push(data.referenceId);
            });

            if (savedRefIds.length === 0) {
                 drawerList.innerHTML = '<p class="empty-message">보관함이 비어있습니다.</p>';
                 return;
            }

            // 3. 실제 레퍼런스 데이터 조회 (최대 10개 제한)
            // *Firestore 'in' 쿼리 제약으로 인해 10개씩 끊어서 가져와야 함 (현재는 단순화)
            const q = query(collection(db, "references"), where("id", "in", savedRefIds.slice(0, 10)));
            const querySnapshot = await getDocs(q);
            
            drawerList.innerHTML = ''; // 로딩 문구 제거

            if (querySnapshot.empty) {
                 drawerList.innerHTML = '<p class="empty-message">원본 자료가 삭제되었거나 찾을 수 없습니다.</p>';
                 return;
            }

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const card = createDrawerCard(data);
                drawerList.appendChild(card);
            });

        } catch (error) {
            console.error("내 서랍 로딩 실패:", error);
            drawerList.innerHTML = `<p class="error-message">오류 발생: ${error.message}</p>`;
        }
    });
});

function createDrawerCard(data) {
    const div = document.createElement('div');
    div.className = 'reference-card';
    const views = data.views || 0;

    div.innerHTML = `
        <a href="detail.html?id=${data.id}" class="card-link-area">
            <img src="${data.image}" alt="${data.title}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
            <div class="card-content">
                <span class="category-badge">${data.category}</span>
                <h2>${data.title}</h2>
                <p class="summary">${data.summary}</p>
                <div class="card-meta">
                     <span class="view-count">👁️ ${views}</span>
                </div>
            </div>
        </a>
    `;
    return div;
}