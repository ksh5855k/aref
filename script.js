const cardWrapper = document.querySelector('.card-wrapper');

references.forEach(ref => {
    const cardHTML = `
        <a href="${ref.detailPage}" class="reference-card">
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