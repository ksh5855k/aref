const db = window.db;
const { collection, getDocs, orderBy, query } = window.firebaseUtils;

async function fetchReferences() {
    const cardWrapper = document.querySelector('.card-wrapper');
    
    const q = query(collection(db, "references"), orderBy("id"));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
        const ref = doc.data();
        const cardHTML = `
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
        cardWrapper.innerHTML += cardHTML;
    });
}

fetchReferences();