import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, deleteDoc, updateDoc, increment, collection, query, where, getDocs, addDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { showToast } from './toast.js';

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
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const keyword = searchInput.value.trim();
                if (keyword) window.location.href = `index.html?search=${encodeURIComponent(keyword)}`;
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
            loadComments(docId);
        });

    } catch (error) {
        console.error("상세 정보 로딩 실패:", error);
    }

    const saveBtn = document.getElementById('detail-save-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const shareBtn = document.getElementById('share-btn');
    const editBtn = document.getElementById('edit-btn');
    const commentForm = document.getElementById('comment-form-container');
    const loginMsg = document.getElementById('login-request-msg');
    const submitCommentBtn = document.getElementById('submit-comment-btn');

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

    if (editBtn) {
        editBtn.onclick = () => {
            window.location.href = `upload.html?id=${docId}`;
        };
    }

    if (submitCommentBtn) {
        submitCommentBtn.onclick = async () => {
            const input = document.getElementById('comment-input');
            const content = input.value.trim();
            const user = auth.currentUser;

            if (!content) { alert("내용을 입력해주세요."); return; }
            if (!user) return;

            try {
                await addDoc(collection(db, "comments"), {
                    referenceId: docId,
                    uid: user.uid,
                    author: user.displayName || user.email.split('@')[0], 
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

// ★ 기존 loadComments 함수를 지우고 이 코드로 교체하세요!
async function loadComments(refId) {
    const listContainer = document.getElementById('comments-list');
    const currentUser = auth.currentUser;

    if (!listContainer) return;

    try {
        const q = query(collection(db, "comments"), where("referenceId", "==", refId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            listContainer.innerHTML = '<div class="empty-message">아직 댓글이 없어요.<br>첫 번째 인사이트를 남겨주세요! 👇</div>';
            return;
        }

        let comments = [];
        snapshot.forEach(doc => comments.push({ id: doc.id, ...doc.data() }));
        // 최신순 정렬
        comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        listContainer.innerHTML = ''; 

        // ★ 유저 정보를 임시 저장할 캐시 (데이터베이스 중복 호출 방지 = 로딩 속도 향상)
        const userCache = {};

        for (const comment of comments) {
            // 과거 데이터를 위한 기본값 설정
            let authorName = comment.author || "알 수 없는 사용자"; 
            let authorPhoto = "https://placehold.co/40x40?text=User";

            // ★ Firestore의 users 컬렉션에서 '최신 프로필 정보'를 무조건 덮어씌움
            if (comment.uid) {
                if (!userCache[comment.uid]) {
                    try {
                        const userDocRef = doc(db, "users", comment.uid);
                        const userDoc = await getDoc(userDocRef);
                        if (userDoc.exists()) {
                            userCache[comment.uid] = userDoc.data();
                        } else {
                            userCache[comment.uid] = null; // 정보 없음
                        }
                    } catch (e) {
                        console.error("작성자 정보 조회 실패", e);
                    }
                }

                const userData = userCache[comment.uid];
                if (userData) {
                    if (userData.photoURL) authorPhoto = userData.photoURL;
                    
                    // 1순위: 현재 설정된 닉네임, 2순위: 이메일 아이디 (닉네임 설정 안 했을 경우)
                    if (userData.displayName) {
                        authorName = userData.displayName;
                    } else if (userData.email) {
                        authorName = userData.email.split('@')[0];
                    }
                }
            }

            const dateStr = new Date(comment.createdAt).toLocaleDateString();
            const isMyComment = currentUser && currentUser.uid === comment.uid;
            
            // 삭제 버튼 깔끔하게 디자인
            const deleteBtnHtml = isMyComment 
                ? `<button class="comment-delete-btn" onclick="deleteComment('${comment.id}', ${refId})" style="background:none; border:none; color:#ff4757; cursor:pointer; font-size:0.85rem; font-weight:bold;">삭제</button>` 
                : '';

            const div = document.createElement('div');
            div.className = 'comment-item';
            div.style.display = 'flex';
            div.style.gap = '15px';
            div.style.padding = '25px 0';
            div.style.borderBottom = '1px solid #f1f3f5';
            
            div.innerHTML = `
                <img src="${authorPhoto}" class="comment-avatar" alt="프로필" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; background: #eee; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <div style="flex-grow: 1;">
                    <div class="comment-meta" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span class="comment-author" style="font-weight: bold; font-size: 1.05rem; color: #333;">${authorName}</span>
                        <div style="display:flex; gap:12px; align-items: center;">
                            <span style="font-size: 0.85rem; color: #999;">${dateStr}</span>
                            ${deleteBtnHtml}
                        </div>
                    </div>
                    <div class="comment-text" style="font-size: 1.05rem; color: #555; line-height: 1.6;">${escapeHtml(comment.content)}</div>
                </div>
            `;
            listContainer.appendChild(div);
        }

    } catch (error) {
        console.error("댓글 로딩 에러:", error);
        listContainer.innerHTML = '<p class="error-message" style="text-align:center; color:#ff4757;">댓글을 불러오지 못했습니다.</p>';
    }
}

function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

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

// ★ [수정됨] 없는 ID(detail-summary-long) 제거하고 내용 통합
function renderDetail(data) {
    document.getElementById('detail-category').textContent = data.category;
    document.getElementById('detail-title').textContent = data.title;
    
    // 내용 요약: detailSummary가 없으면 summary 사용
    const summaryText = data.detailSummary || data.summary;
    document.getElementById('detail-summary').textContent = summaryText;
    
    document.getElementById('detail-why').textContent = data.detailWhy || "내용 없음";
    document.getElementById('detail-how').textContent = data.detailHow || "내용 없음";
    
    const videoContainer = document.getElementById('video-container');
    const imgEl = document.getElementById('detail-image');
    const videoId = getYouTubeId(data.video);

    if (videoId) {
        videoContainer.style.display = 'block';
        videoContainer.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="border-radius:12px; height:400px;"></iframe>`;
        imgEl.style.display = 'none';
    } else {
        videoContainer.style.display = 'none';
        imgEl.style.display = 'block';
        imgEl.src = data.image || "https://placehold.co/600x400?text=No+Image";
    }

    const tagContainer = document.getElementById('detail-tags');
    tagContainer.innerHTML = '';
    (data.tags || []).forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        span.onclick = () => window.location.href = `index.html?search=${encodeURIComponent(tag)}`;
        tagContainer.appendChild(span);
    });

    document.getElementById('go-link-btn').onclick = () => window.open(data.link, '_blank');
}

function setupNavigation(currentId) {
    const backBtn = document.getElementById('back-to-list-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    backBtn.onclick = () => window.location.href = "index.html";

    const searchResults = JSON.parse(sessionStorage.getItem('currentResults') || '[]');
    const currentIndex = searchResults.indexOf(currentId);

    if (searchResults.length > 0 && currentIndex !== -1) {
        if (currentIndex > 0) {
            prevBtn.onclick = () => window.location.href = `detail.html?id=${searchResults[currentIndex - 1]}`;
            prevBtn.disabled = false;
        } else { prevBtn.disabled = true; }

        if (currentIndex < searchResults.length - 1) {
            nextBtn.onclick = () => window.location.href = `detail.html?id=${searchResults[currentIndex + 1]}`;
            nextBtn.disabled = false;
        } else { nextBtn.disabled = true; }
    } else {
        prevBtn.style.visibility = 'hidden';
        nextBtn.style.visibility = 'hidden';
    }
}

async function checkIfSaved(user, refId, btnElement) {
    try {
        const q = query(collection(db, "userSaves"), where("uid", "==", user.uid), where("referenceId", "==", refId));
        const snapshot = await getDocs(q);
        btnElement.textContent = snapshot.empty ? '📂 보관하기' : '✅ 보관됨';
    } catch (e) { console.error(e); }
}

async function toggleSave(user, refId, btnElement) {
    const isSaved = btnElement.textContent === '✅ 보관됨';
    btnElement.textContent = isSaved ? '📂 보관하기' : '✅ 보관됨'; 

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
        btnElement.textContent = isSaved ? '✅ 보관됨' : '📂 보관하기';
        showToast("오류가 발생했습니다.");
    }
}

async function deleteReference(firestoreDocId) {
    if (confirm("정말로 이 자료를 삭제하시겠습니까?")) {
        try {
            await deleteDoc(doc(db, "references", firestoreDocId));
            showToast("삭제되었습니다.");
            setTimeout(() => window.location.href = "index.html", 1000);
        } catch (error) {
            console.error(error);
            showToast("삭제 중 오류가 발생했습니다.");
        }
    }
}