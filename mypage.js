
import { app } from './config.js';
import { getFirestore, collection, getDocs, query, where, documentId, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchMySavedReferences(user.uid);
    } else {
        alert("로그인이 필요한 페이지입니다.");
        window.location.href = "login.html";
    }
});

async function fetchMySavedReferences(userId) {
    const cardWrapper = document.querySelector('.card-wrapper');
    if (!cardWrapper) return;

    const savesQuery = query(collection(db, "userSaves"), where("userId", "==", userId));
    const savesSnapshot = await getDocs(savesQuery);
    const savedReferenceIds = savesSnapshot.docs.map(doc => doc.data().referenceId);

    if (savedReferenceIds.length > 0) {
        const refsQuery = query(collection(db, "references"), where(documentId(), "in", savedReferenceIds));
        const refsSnapshot = await getDocs(refsQuery);
        let html = '';
        refsSnapshot.forEach((doc) => {
            const ref = doc.data();
            html += `
                <div class="reference-card" id="card-${doc.id}">
                    <a href="detail.html?id=${ref.id}" class="card-link-area">
                        <img src="${ref.image}" alt="${ref.title} 이미지">
                        <div class="card-content">
                            <span class="category-badge">${ref.category}</span>
                            <h2>${ref.title}</h2>
                            <p class="summary">${ref.summary}</p>
                            <div class="tags-wrapper">
                                ${ref.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                        </div>
                    </a>
                    <div class="save-button-container">
                        <button class="delete-btn" data-id="${doc.id}">🗑️</button>
                    </div>
                </div>
            `;
        });
        cardWrapper.innerHTML = html;

        cardWrapper.addEventListener('click', async (event) => {
            const deleteButton = event.target.closest('.delete-btn');
            if (deleteButton) {
                const referenceId = deleteButton.dataset.id;
                
                const deleteQuery = query(collection(db, "userSaves"), where("userId", "==", userId), where("referenceId", "==", referenceId));
                const deleteSnapshot = await getDocs(deleteQuery);

                if (!deleteSnapshot.empty) {
                    const docToDelete = deleteSnapshot.docs[0];
                    await deleteDoc(docToDelete.ref);
                    alert("내 서랍에서 삭제되었습니다.");
                    
                    document.getElementById(`card-${referenceId}`).remove();
                }
            }
        });

    } else {
        cardWrapper.innerHTML = `<p class="empty-message">내 서랍이 비어있습니다. 마음에 드는 레퍼런스를 저장해보세요!</p>`;
    }
}