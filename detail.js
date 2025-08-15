const db = window.db;
const { collection, getDocs, query, where } = window.firebaseUtils;

async function fetchReferenceDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = parseInt(urlParams.get('id'));

    const q = query(collection(db, "references"), where("id", "==", id));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const ref = querySnapshot.docs[0].data();
        const detailContent = document.querySelector('.detail-content');
        const contentHTML = `
            <h2>${ref.title}</h2>
            <img src="${ref.image}" alt="${ref.title} 이미지">
            <h3>[캠페인 요약]</h3>
            <p>${ref.detailSummary}</p>
            <h3>[Why it works]</h3>
            <p>${ref.detailWhy}</p>
            <h3>[How to apply]</h3>
            <p>${ref.detailHow}</p>
            <div class="button-wrapper">
                <a href="${ref.externalLink}" target="_blank" class="external-link">자세한 내용 확인하기</a>
                <a href="index.html" class="back-to-list">목록으로 돌아가기</a>
            </div>
        `;
        detailContent.innerHTML = contentHTML;
        document.title = `${ref.title} - A!Ref`;
    }
}

fetchReferenceDetail();