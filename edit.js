import { firebaseConfig } from './config.js'; 
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
// ★ 알림창 기능을 위해 추가
import { showToast } from './toast.js';

// ★ 이미지 업로드를 위한 API 키 추가
const IMGBB_API_KEY = "0a10f7852c88538fd64853b78e9e3cad";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let docFirestoreId = null; 

// ★ 이미지 미리보기 함수 추가
function updateImagePreview() {
    const urlInput = document.getElementById('upload-image-url');
    const previewContainer = document.getElementById('image-preview-container');
    const previewImg = document.getElementById('image-preview');
    
    const url = urlInput.value.trim();

    if (url) {
        previewImg.src = url;
        previewContainer.style.display = 'block';
        previewImg.onerror = () => {
            previewContainer.style.display = 'none';
        };
    } else {
        previewContainer.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const uploadForm = document.getElementById('upload-form');
    if (!uploadForm) return;

    // ★ 취소 버튼 기능 연결
    document.getElementById('cancel-btn').onclick = () => {
        window.history.back();
    };

    // ★ 이미지 URL 입력 시 미리보기 업데이트
    const imageUrlInput = document.getElementById('upload-image-url');
    if (imageUrlInput) {
        imageUrlInput.addEventListener('input', updateImagePreview);
    }

    // ★ 파일 업로드 버튼 로직 추가 (ImgBB 연동)
    const imageFileInput = document.getElementById('image-file-input');
    const uploadImageBtn = document.getElementById('upload-image-btn');

    if (uploadImageBtn && imageFileInput) {
        uploadImageBtn.addEventListener('click', () => {
            imageFileInput.click();
        });

        imageFileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const originalText = uploadImageBtn.textContent;
            uploadImageBtn.textContent = "업로드 중...⏳";
            uploadImageBtn.disabled = true;

            try {
                const formData = new FormData();
                formData.append("image", file);

                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: "POST",
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    imageUrlInput.value = data.data.url;
                    showToast("이미지 업로드 성공! 📸");
                    updateImagePreview();
                } else {
                    throw new Error("ImgBB API Error");
                }
            } catch (error) {
                console.error("이미지 업로드 실패:", error);
                showToast("이미지 업로드에 실패했습니다. 🥲");
            } finally {
                uploadImageBtn.textContent = originalText;
                uploadImageBtn.disabled = false;
                imageFileInput.value = "";
            }
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const id = parseInt(urlParams.get('id'));

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            alert("수정 권한이 없습니다. 로그인이 필요합니다.");
            window.location.href = "login.html";
            return;
        }

        if (isNaN(id)) {
            alert("잘못된 접근입니다.");
            window.location.href = "index.html";
            return;
        }

        try {
            const q = query(collection(db, "references"), where("id", "==", id));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("수정할 자료를 찾을 수 없습니다.");
                window.location.href = "index.html";
                return;
            }

            const docSnapshot = querySnapshot.docs[0];
            docFirestoreId = docSnapshot.id; 
            const originalData = docSnapshot.data();

            document.getElementById('upload-category').value = originalData.category || '';
            document.getElementById('upload-title').value = originalData.title || '';
            document.getElementById('upload-summary').value = originalData.summary || '';
            document.getElementById('upload-tags').value = (originalData.tags || []).join(', ');
            document.getElementById('upload-image-url').value = originalData.image || '';
            document.getElementById('upload-link').value = originalData.link || ''; // link 필드명 주의 (externalLink -> link)
            document.getElementById('upload-detail-summary').value = originalData.detailSummary || '';
            document.getElementById('upload-detail-why').value = originalData.detailWhy || '';
            document.getElementById('upload-detail-how').value = originalData.detailHow || '';

            // ★ 데이터 로드 후 이미지 미리보기 실행
            updateImagePreview();

        } catch (error) {
            console.error("데이터 로드 실패:", error);
            alert("자료를 불러오는 중 오류가 발생했습니다.");
        }
    });

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!docFirestoreId) return;

        const updatedData = {
            category: document.getElementById('upload-category').value,
            title: document.getElementById('upload-title').value,
            summary: document.getElementById('upload-summary').value,
            tags: document.getElementById('upload-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
            image: document.getElementById('upload-image-url').value, 
            link: document.getElementById('upload-link').value, // link 필드명 통일
            detailSummary: document.getElementById('upload-detail-summary').value,
            detailWhy: document.getElementById('upload-detail-why').value,
            detailHow: document.getElementById('upload-detail-how').value,
        };

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = "수정 중...";

        try {
            const refDoc = doc(db, "references", docFirestoreId);
            await updateDoc(refDoc, updatedData);

            showToast("수정이 완료되었습니다! ✅");
            setTimeout(() => {
                window.location.href = `detail.html?id=${id}`; 
            }, 1000);

        } catch (error) {
            console.error("수정 실패:", error);
            showToast("수정 중 오류가 발생했습니다.");
            submitBtn.disabled = false;
            submitBtn.textContent = "수정 완료";
        }
    });
});