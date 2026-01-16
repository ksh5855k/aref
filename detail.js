// detail.js (최종 수정: 저장 기능 + 이모지 변경 + 조회수 + 삭제)

import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, getDoc, deleteDoc, updateDoc, increment, collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const docId = params.get('id'); // URL에서 id 가져오기 (문자열 형태)

    if (!docId) {
        alert("잘못된 접근입니다.");
        window.location.href = "index.html";
        return;
    }

    // 1. 조회수 증가 (새로고침 때마다 올라가는 방식)
    // 실제 서비스에선 쿠키나 세션으로 중복 방지하지만, 지금은 단순하게 갑니다.
    // 주의: id는 숫자형으로 저장했으므로 쿼리로 문서를 찾아야 합니다.
    let firestoreDocId = null; // 실제 문서 ID (난수)
    let currentRefData = null; // 현재 보고 있는 데이터

    try {
        const q = query(collection(db, "references"), where("id", "==", Number(docId)));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            alert("삭제되거나 존재하지 않는 자료입니다.");
            window.location.href = "index.html";
            return;
        }

        querySnapshot.forEach(async (document) => {
            firestoreDocId = document.id; // 나중에 삭제/수정할 때 필요
            currentRefData = document.data();
            
            // 조회수 +1 업데이트
            await updateDoc(document.ref, {
                views: increment(1)
            });

            // 화면에 데이터 뿌리기
            renderDetail(currentRefData);
        });

    } catch (error) {
        console.error("상세 정보 로딩 실패:", error);
    }

    // 2. 로그인 상태 및 저장 버튼 처리
    const saveBtn = document.getElementById('detail-save-btn');
    const deleteBtn = document.getElementById('delete-btn');

    onAuthStateChanged(auth, async (user) => {
        // A. 삭제 버튼 권한 (관리자만? 혹은 누구나? 일단 로그인하면 보이게)
        if (user) {
            deleteBtn.style.display = 'block';
            
            // B. 저장 상태 확인 (내가 찜했는지?)
            checkIfSaved(user, Number(docId), saveBtn);

            // C. 저장 버튼 클릭 이벤트
            saveBtn.onclick = () => toggleSave(user, Number(docId), saveBtn);

            // D. 삭제 버튼 클릭 이벤트
            deleteBtn.onclick = () => deleteReference(firestoreDocId);

        } else {
            deleteBtn.style.display = 'none';
            // 비로그인 상태에서 저장 버튼 누르면
            saveBtn.onclick = () => {
                if(confirm("로그인이 필요한 기능입니다. 로그인하시겠습니까?")) {
                    window.location.href = "login.html";
                }
            };
        }
    });
});

function renderDetail(data) {
    document.getElementById('detail-category').textContent = data.category;
    document.getElementById('detail-title').textContent = data.title;
    document.getElementById('detail-image').src = data.image;
    document.getElementById('detail-summary').textContent = data.summary;
    
    // 태그
    const tagContainer = document.getElementById('detail-tags');
    tagContainer.innerHTML = '';
    (data.tags || []).forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        tagContainer.appendChild(span);
    });

    // 상세 내용
    document.getElementById('detail-why').textContent = data.detailWhy || "내용 없음";
    document.getElementById('detail-how').textContent = data.detailHow || "내용 없음";

    // 원본 링크 버튼
    const linkBtn = document.getElementById('go-link-btn');
    linkBtn.onclick = () => window.open(data.link, '_blank');
}

// 저장 상태 확인 함수
async function checkIfSaved(user, refId, btnElement) {
    try {
        const q = query(
            collection(db, "userSaves"), 
            where("uid", "==", user.uid),
            where("referenceId", "==", refId)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            btnElement.textContent = '✅'; // 이미 저장됨
        } else {
            btnElement.textContent = '📂'; // 저장 안 됨
        }
    } catch (e) {
        console.error("저장 확인 중 오류", e);
    }
}

// 저장/취소 토글 함수
async function toggleSave(user, refId, btnElement) {
    const isSaved = btnElement.textContent === '✅';
    btnElement.textContent = isSaved ? '📂' : '✅'; // UI 즉시 반영

    try {
        if (isSaved) {
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
            alert("내 서랍에 추가했습니다! 📂");
        }
    } catch (error) {
        console.error("저장 실패", error);
        btnElement.textContent = isSaved ? '✅' : '📂'; // 원복
        alert("오류가 발생했습니다.");
    }
}

// 자료 삭제 함수
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