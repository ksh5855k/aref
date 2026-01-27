import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { showToast } from './toast.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// URL에서 수정할 글 ID 확인
const params = new URLSearchParams(window.location.search);
const editDocId = params.get('id') ? Number(params.get('id')) : null;
let firestoreRef = null;

// ★ [추가됨] 드롭다운 변경 시 입력창 토글 함수
function setupCategoryToggle() {
    const select = document.getElementById('category-select');
    const customInput = document.getElementById('custom-category-input');

    select.addEventListener('change', () => {
        if (select.value === 'custom') {
            customInput.style.display = 'block';
            customInput.required = true;
            customInput.focus();
        } else {
            customInput.style.display = 'none';
            customInput.required = false;
            customInput.value = ''; // 다른 걸 선택하면 입력값 초기화
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    setupCategoryToggle(); // 토글 이벤트 연결

    // 만약 수정 모드라면 기존 데이터 불러오기
    if (editDocId) {
        document.querySelector('h2').textContent = "레퍼런스 수정하기";
        document.getElementById('submit-btn').textContent = "수정 완료";
        
        try {
            const q = query(collection(db, "references"), where("id", "==", editDocId));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                querySnapshot.forEach((doc) => {
                    firestoreRef = doc.ref;
                    const data = doc.data();

                    // ★ [수정됨] 카테고리 데이터 복구 로직
                    const select = document.getElementById('category-select');
                    const customInput = document.getElementById('custom-category-input');
                    
                    // 저장된 카테고리가 드롭다운 옵션 중에 있는지 확인
                    const options = Array.from(select.options).map(opt => opt.value);
                    
                    if (options.includes(data.category)) {
                        // 목록에 있으면 그대로 선택
                        select.value = data.category;
                    } else {
                        // 목록에 없으면(직접 입력했던 것) 'custom' 선택 후 값 채우기
                        select.value = 'custom';
                        customInput.style.display = 'block';
                        customInput.value = data.category;
                    }

                    document.getElementById('upload-title').value = data.title;
                    document.getElementById('upload-summary').value = data.summary;
                    document.getElementById('upload-tags').value = (data.tags || []).join(', ');
                    document.getElementById('upload-image-url').value = data.image;
                    document.getElementById('upload-video').value = data.video || "";
                    document.getElementById('upload-link').value = data.link;
                    document.getElementById('upload-detail-summary').value = data.detailSummary || "";
                    document.getElementById('upload-detail-why').value = data.detailWhy || "";
                    document.getElementById('upload-detail-how').value = data.detailHow || "";
                });
            } else {
                alert("존재하지 않는 게시글입니다.");
                window.location.href = "index.html";
            }
        } catch (e) {
            console.error("데이터 로드 실패:", e);
        }
    }
});

document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.querySelector('#upload-form button');
    
    // 값 가져오기
    const title = document.getElementById('upload-title').value.trim();
    const summary = document.getElementById('upload-summary').value.trim();
    
    // ★ [수정됨] 카테고리 최종 값 결정 로직
    const select = document.getElementById('category-select');
    const customInput = document.getElementById('custom-category-input');
    let finalCategory = select.value;
    
    if (finalCategory === 'custom') {
        finalCategory = customInput.value.trim();
    }

    // 유효성 검사
    if (!finalCategory) {
        alert("카테고리를 입력해주세요.");
        return;
    }

    const detailSummary = document.getElementById('upload-detail-summary').value.trim();
    const detailWhy = document.getElementById('upload-detail-why').value.trim();
    const detailHow = document.getElementById('upload-detail-how').value.trim();
    const link = document.getElementById('upload-link').value.trim();
    const videoLink = document.getElementById('upload-video').value.trim();
    let imageUrl = document.getElementById('upload-image-url').value.trim(); 
    
    const rawTags = document.getElementById('upload-tags').value;
    const tags = rawTags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

    if (!imageUrl) {
        imageUrl = "https://placehold.co/600x400?text=No+Thumbnail";
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "처리 중...";

    try {
        if (editDocId && firestoreRef) {
            // [수정 모드]
            await updateDoc(firestoreRef, {
                title: title,
                category: finalCategory, // 결정된 카테고리 저장
                summary: summary,
                detailSummary: detailSummary,
                detailWhy: detailWhy,
                detailHow: detailHow,
                link: link,
                image: imageUrl,
                video: videoLink || "",
                tags: tags,
            });
            showToast("✨ 수정되었습니다!");
            
            setTimeout(() => {
                window.location.href = `detail.html?id=${editDocId}`;
            }, 1000);

        } else {
            // [생성 모드]
            // ★ 중요: ID를 미리 만들어서 변수에 저장합니다.
            const newId = Date.now(); 

            await addDoc(collection(db, "references"), {
                id: newId, // 미리 만든 ID 사용
                title: title,
                category: finalCategory,
                summary: summary,
                detailSummary: detailSummary,
                detailWhy: detailWhy,
                detailHow: detailHow,
                link: link,
                image: imageUrl,
                video: videoLink || "",
                tags: tags,
                views: 0,
                createdAt: new Date().toISOString()
            });
            showToast("🎉 성공적으로 공유되었습니다!");
            
            // ★ 메인(index.html)이 아니라, 방금 만든 상세 페이지(newId)로 이동
            setTimeout(() => {
                window.location.href = `detail.html?id=${newId}`;
            }, 1000);
        }

    } catch (error) {
        console.error("업로드/수정 실패:", error);
        showToast("⚠️ 오류가 발생했습니다.");
        submitBtn.disabled = false;
        submitBtn.textContent = editDocId ? "수정 완료" : "공유하기";
    }
});