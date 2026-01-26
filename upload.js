import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.querySelector('#upload-form button');
    
    // 1. 값 가져오기 (공백 제거)
    const title = document.getElementById('upload-title').value.trim();
    const category = document.getElementById('upload-category').value.trim();
    const summary = document.getElementById('upload-summary').value.trim();
    const detailWhy = document.getElementById('upload-detail-why').value.trim();
    const detailHow = document.getElementById('upload-detail-how').value.trim();
    const link = document.getElementById('upload-link').value.trim();
    const videoLink = document.getElementById('upload-video').value.trim();
    
    // 이미지 URL: 사용자가 입력한 값 그대로 가져옴
    let imageUrl = document.getElementById('upload-image-url').value.trim(); 

    const rawTags = document.getElementById('upload-tags').value;
    const tags = rawTags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

    // ★ 안전장치: 이미지를 아예 안 넣었을 경우, 회색 기본 박스 이미지로 저장
    if (!imageUrl) {
        imageUrl = "https://placehold.co/600x400?text=No+Thumbnail";
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "업로드 중...";

    try {
        await addDoc(collection(db, "references"), {
            id: Date.now(),
            title: title,
            category: category,
            summary: summary,
            detailWhy: detailWhy,
            detailHow: detailHow,
            link: link,
            image: imageUrl, // 입력한 URL 또는 기본 이미지
            video: videoLink || "", // 영상 링크는 있으면 저장, 없으면 빈 값
            tags: tags,
            views: 0,
            createdAt: new Date().toISOString()
        });

        alert("성공적으로 공유되었습니다!");
        window.location.href = "index.html";

    } catch (error) {
        console.error("업로드 실패:", error);
        alert("업로드 중 오류가 발생했습니다.");
        submitBtn.disabled = false;
        submitBtn.textContent = "공유하기";
    }
});