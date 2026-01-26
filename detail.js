import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, deleteDoc, updateDoc, increment, collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { showToast } from './toast.js'; // ★ 토스트 알림 추가

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function getYouTubeId(url) {
    if (!url) return null;
    url = url.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
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

    setupNavigation(docId);
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
            await updateDoc(document.ref, { views: increment(1) });
            renderDetail(data);
        });

    } catch (error) {
        console.error("상세 정보 로딩 실패:", error);
    }

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
    
    const videoContainer = document.getElementById('video-container');
    const imgEl = document.getElementById('detail-image');
    const videoId = getYouTubeId(data.video);

    if (videoId) {
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
        imgEl.style.display = 'none';
    } else {
        videoContainer.style.display = 'none';
        videoContainer.innerHTML = '';
        if(data.image) {
            imgEl.src = data.image;
            imgEl.style.display = 'block';
            imgEl.onerror = function() {
                this.onerror = null;
                this.src = "https://placehold.co/600x400?text=No+Image";
            };
        } else {
            imgEl.style.display = 'none';
        }
    }

    // ★ 태그 렌더링 (클릭 시 메인 검색으로 이동)
    const tagContainer = document.getElementById('detail-tags');
    tagContainer.innerHTML = '';
    (data.tags || []).forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        span.onclick = () => {
            // 태그 클릭 시 검색어(쿼리 스트링)를 달고 메인으로 이동
            window.location.href = `index.html?search=${encodeURIComponent(tag)}`;
        };
        tagContainer.appendChild(span);
    });

    const linkBtn = document.getElementById('go-link-btn');
    linkBtn.onclick = () => window.open(data.link, '_blank');
}

function setupNavigation(currentId) {
    const backBtn = document.getElementById('back-to-list-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if(backBtn) backBtn.onclick = () => window.location.href = "index.html";

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
            showToast("내 서랍에 보관했습니다! 📂"); // ★ 토스트 적용
        }
    } catch (error) {
        console.error(error);
        btnElement.textContent = isSaved ? '✅' : '📂';
        showToast("오류가 발생했습니다.");
    }
}

async function deleteReference(firestoreDocId) {
    if (confirm("정말로 이 자료를 삭제하시겠습니까? (복구 불가)")) {
        try {
            await deleteDoc(doc(db, "references", firestoreDocId));
            showToast("삭제되었습니다.");
            setTimeout(() => window.location.href = "index.html", 1000);
        } catch (error) {
            console.error("삭제 실패:", error);
            showToast("삭제 중 오류가 발생했습니다.");
        }
    }
}