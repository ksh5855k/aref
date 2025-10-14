import { app } from './config.js';
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const db = getFirestore(app);

async function fetchReferences() {
    const cardWrapper = document.querySelector('.card-wrapper');

    if (!cardWrapper) {
        return;
    }
    
    const q = query(collection(db, "references"), orderBy("id"));
    const querySnapshot = await getDocs(q);
    
    let html = ''; 

    querySnapshot.forEach((doc) => {
        const ref = doc.data(); 

        const cardHTML = `
            <div class="reference-card">
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
                    <button class="save-btn" data-id="${doc.id}">💾</button>
                </div>
            </div>
        `;
        html += cardHTML; 
    });

    cardWrapper.innerHTML = html; 

const saveButtons = document.querySelectorAll('.save-btn');
    
    saveButtons.forEach(button => {
        button.addEventListener('click', () => {
            const currentUser = auth.currentUser;

            if (!currentUser) {
                alert("로그인이 필요한 기능입니다.");
                window.location.href = "login.html";
                return;
            }

            const referenceId = button.dataset.id;
            const userId = currentUser.uid;

            addDoc(collection(db, "userSaves"), {
                userId: userId,
                referenceId: referenceId,
                savedAt: serverTimestamp()
            })
            .then(() => {
                alert("내 서랍에 저장되었습니다!");
            })
            .catch((error) => {
                alert("저장에 실패했습니다. 다시 시도해주세요.");
                console.error("저장 에러:", error);
            });
        });
    });
}

fetchReferences();