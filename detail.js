import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, deleteDoc, updateDoc, increment, collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ★ 유튜브 ID 추출 헬퍼 함수
function getYouTubeId(url) {
    if (!url) return null;
    // 다양한 유튜브 URL 패턴 대응 (youtu.be, watch?v= 등)
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const docId = Number(params.get('id'));

    if (!docId) {
        alert("잘못된 접근입니다.");
        window.location.href = "index.html";
        return;
    }

    // 1. 내비게이션 설정
    setupNavigation(docId);

    // 2. 데이터 로드
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
            
            // 조회수 증가
            await updateDoc(document.ref, { views: increment(1) });

            // 화면 그리기
            renderDetail(data);
        });

    } catch (error) {
        console.error("상세 정보 로딩 실패:", error);
    }

    // 3. 버튼 이벤트 설정
    const saveBtn = document.getElementById('detail-save-btn');
    const deleteBtn = document.getElementById('delete-btn');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            deleteBtn.style.display = 'flex';
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

function renderDetail(data) {
    document.getElementById('detail-category').textContent = data.category;
    document.getElementById('detail-title').textContent = data.title;
    document.getElementById('detail-summary').textContent = data.summary;
    document.getElementById('detail-why').textContent = data.detailWhy || "내용 없음";
    document.getElementById('detail-how').textContent = data.detailHow || "내용 없음";
    
    // ★ 영상 및 이미지 처리 로직
    const videoContainer = document.getElementById('video-container');
    const imgEl = document.getElementById('detail-image');
    
    // 1. 유튜브 링크가 있는지 확인
    const videoId = getYouTubeId(data.video);

    if (videoId) {
        // 영상이 있으면 영상 컨테이너 표시 & iframe 생성
        videoContainer.style.display = 'block';
        videoContainer.innerHTML = `
            <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/${videoId}" 
                title="YouTube video player" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        `;
        // 이미지는 숨기거나 작게 표시 (여기서는 숨김 처리)
        imgEl.style.display = 'none';
    } else {
        // 영상이 없으면 영상 컨테이너 숨김 & 이미지 표시
        videoContainer.style.display = 'none';
        videoContainer.innerHTML = '';
        
        if(data.image) {
            imgEl.src = data.image;
            imgEl.style.display = 'block';
        } else {
            imgEl.style.display = 'none';
        }
    }

    // 태그
    const tagContainer = document.getElementById('detail-tags');
    tagContainer.innerHTML = '';
    (data.tags || []).forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        tagContainer.appendChild(span);
    });

    // 원본 링크
    const linkBtn = document.getElementById('go-link-btn');
    linkBtn.onclick = () => window.open(data.link, '_blank');
}

// 내비게이션 설정
function setupNavigation(currentId) {
    const backBtn = document.getElementById('back-to-list-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if(backBtn) {
        backBtn.onclick = () => {
            window.location.href = "index.html";
        };
    }

    const searchResults = JSON.parse(sessionStorage.getItem('currentResults') || '[]');
    const currentIndex = searchResults.indexOf(currentId);

    if (searchResults.length > 0 && currentIndex !== -1) {
        if (currentIndex > 0) {
            prevBtn.onclick = () => window.location.href = `detail.html?id=${searchResults[currentIndex - 1]}`;
            prevBtn.disabled = false;
        } else {
            prevBtn.disabled = true;
        }

        if (currentIndex < searchResults.length - 1) {
            nextBtn.onclick = () => window.location.href = `detail.html?id=${searchResults[currentIndex + 1]}`;
            nextBtn.disabled = false;
        } else {
            nextBtn.disabled = true;
        }
    } else {
        prevBtn.style.visibility = 'hidden';
        nextBtn.style.visibility = 'hidden';
    }
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