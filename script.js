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
        html += `
            <a href="detail.html?id=${ref.id}" class="reference-card">
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
        `;
    });
    cardWrapper.innerHTML = html;
}

fetchReferences();