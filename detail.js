import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, deleteDoc, updateDoc, increment, collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { showToast } from './toast.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 유튜브 ID 추출
function getYouTubeId(url) {
    if (!url) return null;
    url = url.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 검색창 엔터키 이벤트
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
            
            // 댓글 불러오기
            loadComments(docId);
        });

    } catch (error) {
        console.error("상세 정보 로딩 실패:", error);
    }

    // 버튼 요소들
    const saveBtn = document.getElementById('detail-save-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const shareBtn = document.getElementById('share-btn');
    const editBtn = document.getElementById('edit-btn');
    
    // 댓글 관련 요소
    const commentForm = document.getElementById('comment-form-container');
    const loginMsg = document.getElementById('login-request-msg');
    const submitCommentBtn = document.getElementById('submit-comment-btn');

    // 링크 복사하기 (기존 유지)
    if (shareBtn) {
        shareBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                showToast("링크가 복사되었습니다! 🔗");
            } catch (err) {
                console.error('복사 실패:', err);
                showToast("링크 복사에 실패했습니다.");
            }
        };
    }

    // 수정 버튼 클릭 시 이동
    if (editBtn) {
        editBtn.onclick = () => {
            window.location.href = `upload.html?id=${docId}`;
        };
    }

    // 댓글 등록 버튼 클릭 시
    if (submitCommentBtn) {
        submitCommentBtn.onclick = async () => {
            const input = document.getElementById('comment-input');
            const content = input.value.trim();
            const user = auth.currentUser;

            if (!content) {
                alert("내용을 입력해주세요.");
                return;
            }
            if (!user) return;

            try {
                await addDoc(collection(db, "comments"), {
                    referenceId: docId,
                    uid: user.uid,
                    author: user.email.split('@')[0],
                    content: content,
                    createdAt: new Date().toISOString()
                });
                
                input.value = ''; 
                showToast("댓글이 등록되었습니다. 💬");
                loadComments(docId); 

            } catch (error) {
                console.error("댓글 등록 실패:", error);
                showToast("오류가 발생했습니다.");
            }
        };
    }

    // 인증 상태 체크
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            deleteBtn.style.display = 'inline-block';
            editBtn.style.display = 'inline-block';
            
            if(commentForm) commentForm.style.display = 'flex';
            if(loginMsg) loginMsg.style.display = 'none';

            checkIfSaved(user, docId, saveBtn);

            saveBtn.onclick = () => toggleSave(user, docId, saveBtn);
            deleteBtn.onclick = () => deleteReference(firestoreDocId);
        } else {
            deleteBtn.style.display = 'none';
            editBtn.style.display = 'none';
            
            if(commentForm) commentForm.style.display = 'none';
            if(loginMsg) loginMsg.style.display = 'block';

            saveBtn.onclick = () => {
                if(confirm("로그인이 필요한 기능입니다. 로그인 하시겠습니까?")) window.location.href = "login.html";
            };
        }
        if(firestoreDocId || docId) loadComments(docId);
    });
});

// 댓글 목록 불러오기 함수
async function loadComments(refId) {
    const listContainer = document.getElementById('comments-list');
    const user = auth.currentUser;

    if (!listContainer) return;

    try {
        const q = query(collection(db, "comments"), where("referenceId", "==", refId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            listContainer.innerHTML = '<p class="empty-message" style="font-size: 0.9rem;">아직 댓글이 없어요. 첫 번째 인사이트를 남겨주세요! 👇</p>';
            return;
        }

        let comments = [];
        snapshot.forEach(doc => {
            comments.push({ id: doc.id, ...doc.data() });
        });

        // 최신순 정렬
        comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        listContainer.innerHTML = ''; 

        comments.forEach(comment => {
            const dateStr = new Date(comment.createdAt).toLocaleDateString();
            const isMyComment = user && user.uid === comment.uid;
            
            const deleteBtnHtml = isMyComment 
                ? `<button class="comment-delete-btn" onclick="deleteComment('${comment.id}', ${refId})">삭제</button>` 
                : '';

            const div = document.createElement('div');
            div.className = 'comment-item';
            div.innerHTML = `
                <div class="comment-meta">
                    <span class="comment-author">${comment.author}</span>
                    <div style="display:flex; gap:10px;">
                        <span>${dateStr}</span>
                        ${deleteBtnHtml}
                    </div>
                </div>
                <div class="comment-text">${escapeHtml(comment.content)}</div>
            `;
            listContainer.appendChild(div);
        });

    } catch (error) {
        console.error("댓글 로딩 중 에러:", error);
        listContainer.innerHTML = '<p class="error-message">댓글을 불러오지 못했습니다.</p>';
    }
}

// XSS 방지용
function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 댓글 삭제 함수
window.deleteComment = async function(commentId, refId) {
    if (confirm("댓글을 삭제하시겠습니까?")) {
        try {
            await deleteDoc(doc(db, "comments", commentId));
            showToast("댓글이 삭제되었습니다.");
            loadComments(refId); 
        } catch (error) {
            console.error(error);
            showToast("삭제 실패");
        }
    }
};

function renderDetail(data) {
    document.getElementById('detail-category').textContent = data.category;
    document.getElementById('detail-title').textContent = data.title;
    document.getElementById('detail-summary').textContent = data.summary;
    
    document.getElementById('detail-summary-long').textContent = data.detailSummary || data.summary;
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
        
        imgEl.style.display = 'block';
        imgEl.onerror = function() {
            this.onerror = null;
            this.src = "https://placehold.co/600x400?text=No+Image";
        };
        imgEl.src = data.image || "https://placehold.co/600x400?text=No+Image";
    }

    const tagContainer = document.getElementById('detail-tags');
    tagContainer.innerHTML = '';
    (data.tags || []).forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        span.onclick = () => {
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
            showToast("내 서랍에 보관되었습니다! 📂"); 
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