import { app } from './config.js';
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const db = getFirestore(app);

async function fetchReferenceDetail() {
    const detailContent = document.querySelector('.detail-content');

    if (!detailContent) {
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const id = parseInt(urlParams.get('id'));

    const q = query(collection(db, "references"), where("id", "==", id));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const ref = querySnapshot.docs[0].data();
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
    } else {
        detailContent.innerHTML = `<p>해당 데이터를 찾을 수 없습니다.</p>`;
    }
}

fetchReferenceDetail();