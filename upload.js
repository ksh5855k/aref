import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.querySelector('#upload-form button');
    submitBtn.disabled = true;
    submitBtn.textContent = "업로드 중...";

    // 1. 입력값 가져오기
    const title = document.getElementById('upload-title').value;
    const category = document.getElementById('upload-category').value;
    const summary = document.getElementById('upload-summary').value;
    const detailWhy = document.getElementById('upload-why').value;
    const detailHow = document.getElementById('upload-how').value;
    const link = document.getElementById('upload-link').value;
    const imageFile = document.getElementById('upload-image').files[0];
    
    // ★ 추가된 부분: 유튜브 영상 링크 가져오기
    const videoLink = document.getElementById('upload-video').value; 

    // 태그 처리
    const rawTags = document.getElementById('upload-tags').value;
    const tags = rawTags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

    try {
        let imageUrl = "";

        // 2. 이미지 업로드 처리
        if (imageFile) {
            const storageRef = ref(storage, 'images/' + new Date().getTime() + '_' + imageFile.name);
            await uploadBytes(storageRef, imageFile);
            imageUrl = await getDownloadURL(storageRef);
        } else {
            // 이미지가 없으면 기본 이미지 혹은 빈 값 (여기서는 빈 값)
            // 필요하다면: imageUrl = "https://via.placeholder.com/600x400";
        }

        // 3. 데이터베이스 저장
        await addDoc(collection(db, "references"), {
            id: Date.now(), // 정렬용 단순 타임스탬프 ID
            title: title,
            category: category,
            summary: summary,
            detailWhy: detailWhy,
            detailHow: detailHow,
            link: link,
            image: imageUrl,
            
            // ★ 추가된 부분: 데이터베이스에 영상 링크 저장
            video: videoLink || "", 
            
            tags: tags,
            views: 0,
            createdAt: new Date().toISOString()
        });

        alert("성공적으로 업로드되었습니다!");
        window.location.href = "index.html";

    } catch (error) {
        console.error("업로드 실패:", error);
        alert("업로드 중 오류가 발생했습니다.");
        submitBtn.disabled = false;
        submitBtn.textContent = "레퍼런스 등록하기";
    }
});