import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { showToast } from './toast.js'; // ★ 새로 추가된 부분!

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.querySelector('#upload-form button');
    
    // 1. 값 가져오기
    const title = document.getElementById('upload-title').value.trim();
    const category = document.getElementById('upload-category').value.trim();
    const summary = document.getElementById('upload-summary').value.trim();
    const detailWhy = document.getElementById('upload-detail-why').value.trim();
    const detailHow = document.getElementById('upload-detail-how').value.trim();
    const link = document.getElementById('upload-link').value.trim();
    const videoLink = document.getElementById('upload-video').value.trim();
    let imageUrl = document.getElementById('upload-image-url').value.trim(); 
    
    const rawTags = document.getElementById('upload-tags').value;
    const tags = rawTags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

    // 이미지 없을 때 기본 이미지
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
            image: imageUrl,
            video: videoLink || "",
            tags: tags,
            views: 0,
            createdAt: new Date().toISOString()
        });

        // ★ alert 대신 예쁜 토스트 사용!
        showToast("🎉 성공적으로 공유되었습니다!");
        
        // 토스트가 보일 시간을 조금 주고 이동 (1초 뒤 이동)
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);

    } catch (error) {
        console.error("업로드 실패:", error);
        // ★ 에러도 토스트로!
        showToast("⚠️ 업로드 중 오류가 발생했습니다.");
        submitBtn.disabled = false;
        submitBtn.textContent = "공유하기";
    }
});