const urlParams = new URLSearchParams(window.location.search);
const id = parseInt(urlParams.get('id'));

const reference = references.find(ref => ref.id === id);

if (reference) {
    const detailContent = document.querySelector('.detail-content');
    const contentHTML = `
        <h2>${reference.title}</h2>
        <img src="${reference.image}" alt="${reference.title} 이미지">

        <h3>[캠페인 요약]</h3>
        <p>${reference.detailSummary}</p>

        <h3>[Why it works]</h3>
        <p>${reference.detailWhy}</p>

        <h3>[How to apply]</h3>
        <p>${reference.detailHow}</p>

        <div class="button-wrapper">
            <a href="${reference.externalLink}" target="_blank" class="external-link">자세한 내용 확인하기</a>
            <a href="index.html" class="back-to-list">목록으로 돌아가기</a>
        </div>
    `;
    detailContent.innerHTML = contentHTML;        
    
    document.title = `${reference.title} - A!Ref`;
}