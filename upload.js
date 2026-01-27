import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { showToast } from './toast.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const params = new URLSearchParams(window.location.search);
const editDocId = params.get('id') ? Number(params.get('id')) : null;
let firestoreRef = null;

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
            customInput.value = ''; 
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            alert("로그인이 필요합니다.");
            window.location.href = "login.html";
        }
    });

    setupCategoryToggle(); 

    const fetchBtn = document.getElementById('fetch-btn');
    if (fetchBtn) {
        fetchBtn.addEventListener('click', fetchMetaData);
    }

    // ★ 수정 모드일 때 처리
    if (editDocId) {
        document.querySelector('h2').textContent = "레퍼런스 수정하기";
        document.getElementById('submit-btn').textContent = "수정 완료";
        
        // [추가됨] 취소 버튼 활성화
        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.style.display = 'block'; // 버튼 보이기
            cancelBtn.onclick = () => {
                // 상세 페이지로 돌아가기
                window.location.href = `detail.html?id=${editDocId}`;
            };
        }

        try {
            const q = query(collection(db, "references"), where("id", "==", editDocId));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                querySnapshot.forEach((doc) => {
                    firestoreRef = doc.ref;
                    const data = doc.data();

                    const select = document.getElementById('category-select');
                    const customInput = document.getElementById('custom-category-input');
                    const options = Array.from(select.options).map(opt => opt.value);
                    
                    if (options.includes(data.category)) {
                        select.value = data.category;
                    } else {
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

async function fetchMetaData() {
    const linkInput = document.getElementById('upload-link');
    const titleInput = document.getElementById('upload-title');
    const summaryInput = document.getElementById('upload-summary');
    const imageInput = document.getElementById('upload-image-url');
    const fetchBtn = document.getElementById('fetch-btn');

    const url = linkInput.value.trim();
    if (!url) {
        showToast("URL을 입력해주세요!");
        linkInput.focus();
        return;
    }

    const originalBtnText = fetchBtn.textContent;
    fetchBtn.textContent = "가져오는 중...⏳";
    fetchBtn.disabled = true;
    fetchBtn.style.opacity = "0.7";

    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        if (!data.contents) throw new Error("No data");

        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, "text/html");

        const ogTitle = doc.querySelector('meta[property="og:title"]')?.content || doc.querySelector('title')?.textContent;
        const ogImage = doc.querySelector('meta[property="og:image"]')?.content;
        const ogDescription = doc.querySelector('meta[property="og:description"]')?.content || doc.querySelector('meta[name="description"]')?.content;

        if (ogTitle && !titleInput.value) titleInput.value = ogTitle;
        if (ogImage && !imageInput.value) imageInput.value = ogImage;
        if (ogDescription && !summaryInput.value) summaryInput.value = ogDescription;

        showToast("정보를 성공적으로 가져왔습니다! 🎉");

    } catch (error) {
        console.error("크롤링 실패:", error);
        showToast("정보를 가져오지 못했습니다. 직접 입력해주세요. 🥲");
    } finally {
        fetchBtn.textContent = originalBtnText;
        fetchBtn.disabled = false;
        fetchBtn.style.opacity = "1";
    }
}

document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    
    const title = document.getElementById('upload-title').value.trim();
    const summary = document.getElementById('upload-summary').value.trim();
    
    const select = document.getElementById('category-select');
    const customInput = document.getElementById('custom-category-input');
    let finalCategory = select.value;
    
    if (finalCategory === 'custom') {
        finalCategory = customInput.value.trim();
    }

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
                category: finalCategory,
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
            const newId = Date.now(); 

            await addDoc(collection(db, "references"), {
                id: newId, 
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