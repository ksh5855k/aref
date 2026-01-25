import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, deleteDoc, updateDoc, increment, collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const docId = Number(params.get('id')); // ID는 숫자형

    if (!docId) {
        alert("잘못된 접근입니다.");
        window.location.href = "index.html";
        return;
    }

    // 1. 내비게이션 설정 (이전/다음/목록)
    setupNavigation(docId);

    // 2. 데이터 불러오기 & 조회수 증가
    let firestoreDocId = null; 

    try {
        const q = query(collection(db, "references"), where("id", "==", docId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            alert("삭제되거나 존재하지 않는 자료입니다.");
            window.location.href = "index.html";
            return;
        }

        querySnapshot.forEach(async (document) => {
            firestoreDocId = document.id;
            const data = document.data();
            
            // 조회수 +1
            await updateDoc(document.ref, { views: increment(1) });

            renderDetail(data);
        });

    } catch (error) {
        console.error("상세 정보 로딩 실패:", error);
    }

    // 3. 버튼 이벤트 (저장, 삭제)
    const saveBtn = document.getElementById('detail-save-btn');
    const deleteBtn = document.getElementById('delete-btn');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            deleteBtn.style.display = 'flex'; // 스타일 flex로 변경 (가로 정렬 위해)
            
            // 저장 상태 확인
            checkIfSaved(user, docId, saveBtn);

            saveBtn.onclick = () => toggleSave(user, docId, saveBtn);
            deleteBtn.onclick = () => deleteReference(firestoreDocId);
        } else {
            deleteBtn.style.display = 'none';
            saveBtn.onclick = () => {
                if(confirm("로그인이 필요한 기능입니다.")) window.location.href = "login.html";
            };
        }
    });
});

// 내비게이션(이전/다음) 설정 함수
function setupNavigation(currentId) {
    const backBtn = document.getElementById('back-to-list-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    // ★ 목록으로 돌아가기
    // history.back() 대신 index.html로 직접 이동하여 script.js가 세션을 읽도록 유도
    if(backBtn) {
        backBtn.onclick = () => {
            window.location.href = "index.html";
        };
    }

    // 세션에서 현재 검색 결과 목록 가져오기
    const searchResults = JSON.parse(sessionStorage.getItem('currentResults') || '[]');
    const currentIndex = searchResults.indexOf(currentId);

    // 검색 결과 내 이동 로직
    if (searchResults.length > 0 && currentIndex !== -1) {
        // 이전 버튼
        if (currentIndex > 0) {
            prevBtn.onclick = () => window.location.href = `detail.html?id=${searchResults[currentIndex - 1]}`;
            prevBtn.disabled = false;
        } else {
            prevBtn.disabled = true; // 첫 번째 글이면 비활성화
        }

        // 다음 버튼
        if (currentIndex < searchResults.length - 1) {
            nextBtn.onclick = () => window.location.href = `detail.html?id=${searchResults[currentIndex + 1]}`;
            nextBtn.disabled = false;
        } else {
            nextBtn.disabled = true; // 마지막 글이면 비활성화
        }
    } else {
        // 목록 정보가 없으면 화살표 숨김
        prevBtn.style.visibility = 'hidden';
        nextBtn.style.visibility = 'hidden';
    }
}

function renderDetail(data) {
    document.getElementById('detail-category').textContent = data.category;
    document.getElementById('detail-title').textContent = data.title;
    
    // 이미지 처리
    const imgEl = document.getElementById('detail-image');
    if(data.image) {
        imgEl.src = data.image;
        imgEl.style.display = 'block';
    } else {
        imgEl.style.display = 'none';
    }

    document.getElementById('detail-summary').textContent = data.summary;
    
    const tagContainer = document.getElementById('detail-tags');
    tagContainer.innerHTML = '';
    (data.tags || []).forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        tagContainer.appendChild(span);
    });

    document.getElementById('detail-why').textContent = data.detailWhy || "내용 없음";
    document.getElementById('detail-how').textContent = data.detailHow || "내용 없음";

    const linkBtn = document.getElementById('go-link-btn');
    linkBtn.onclick = () => window.open(data.link, '_blank');
}

async function checkIfSaved(user, refId, btnElement) {
    try {
        const q = query(collection(db, "userSaves"), where("uid", "==", user.uid), where("referenceId", "==", refId));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) btnElement.textContent = '✅';
        else btnElement.textContent = '📂';
    } catch (e) { console.error(e); }
}

async function toggleSave(user, refId, btnElement) {
    const isSaved = btnElement.textContent === '✅';
    btnElement.textContent = isSaved ? '📂' : '✅'; 

    try {
        if (isSaved) {
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
        btnElement.textContent = isSaved ? '✅' : '📂';
        alert("오류가 발생했습니다.");
    }
}

async function deleteReference(firestoreDocId) {
    if (confirm("정말로 이 자료를 삭제하시겠습니까? (복구 불가)")) {
        try {
            await deleteDoc(doc(db, "references", firestoreDocId));
            alert("삭제되었습니다.");
            window.location.href = "index.html";
        } catch (error) {
            console.error("삭제 실패:", error);
            alert("삭제 중 오류가 발생했습니다.");
        }
    }
}