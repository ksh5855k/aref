import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { showToast } from './toast.js';

const IMGBB_API_KEY = "0a10f7852c88538fd64853b78e9e3cad";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const params = new URLSearchParams(window.location.search);
const editDocId = params.get('id') ? Number(params.get('id')) : null;
let firestoreRef = null;

// ★ [추가됨] 태그 관리용 배열
let tagList = [];

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

// ★ [추가됨] 태그 렌더링 및 관리 함수
function setupTagInput() {
    const tagContainer = document.getElementById('tag-container');
    const tagInputVisual = document.getElementById('tag-input-visual');
    const hiddenInput = document.getElementById('upload-tags');

    // 1. 화면 그리기 (배열 -> HTML)
    function renderTags() {
        // 기존 칩들 삭제 (input은 남김)
        const chips = tagContainer.querySelectorAll('.tag-chip');
        chips.forEach(chip => chip.remove());

        // 배열 순서대로 칩 생성 (input 바로 앞에 삽입)
        tagList.slice().reverse().forEach(tag => {
            const chip = document.createElement('div');
            chip.className = 'tag-chip';
            chip.innerHTML = `
                #${tag}
                <span class="tag-close-btn" data-tag="${tag}">&times;</span>
            `;
            tagContainer.prepend(chip); // 맨 앞에 추가
        });

        // 숨겨진 input 값 업데이트 (서버 전송용)
        hiddenInput.value = tagList.join(', ');
    }

    // 2. 키보드 이벤트 (엔터, 스페이스, 쉼표)
    tagInputVisual.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
            e.preventDefault(); // 폼 제출 방지 & 문자 입력 방지
            
            const val = tagInputVisual.value.trim().replace(/,/g, '');
            if (val && !tagList.includes(val)) {
                tagList.push(val);
                renderTags();
                tagInputVisual.value = ''; // 입력창 비우기
            } else if (tagList.includes(val)) {
                tagInputVisual.value = ''; // 중복이면 그냥 비우기
            }
        }
        // 백스페이스로 마지막 태그 삭제 기능
        if (e.key === 'Backspace' && tagInputVisual.value === '' && tagList.length > 0) {
            tagList.pop();
            renderTags();
        }
    });

    // 3. 삭제 버튼 클릭 이벤트 (이벤트 위임)
    tagContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-close-btn')) {
            const tagToRemove = e.target.getAttribute('data-tag');
            tagList = tagList.filter(tag => tag !== tagToRemove);
            renderTags();
        }
    });

    // 외부에서 배열을 수정했을 때(수정 모드 등) 호출할 수 있게 전역에 연결하거나, 
    // 여기서 리턴해주면 좋은데, 간단하게 renderTags를 전역 변수로 할당해둡니다.
    window.renderTagsGlobal = renderTags;
}

document.addEventListener('DOMContentLoaded', async () => {
    
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            alert("로그인이 필요합니다.");
            window.location.href = "login.html";
        }
    });

    setupCategoryToggle();
    setupTagInput(); // ★ 태그 기능 초기화

    const imageUrlInput = document.getElementById('upload-image-url');
    if (imageUrlInput) {
        imageUrlInput.addEventListener('input', updateImagePreview);
    }

    const fetchBtn = document.getElementById('fetch-btn');
    if (fetchBtn) {
        fetchBtn.addEventListener('click', fetchMetaData);
    }

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

    if (editDocId) {
        document.querySelector('h2').textContent = "레퍼런스 수정하기";
        document.getElementById('submit-btn').textContent = "수정 완료";
        
        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.style.display = 'block'; 
            cancelBtn.onclick = () => window.location.href = `detail.html?id=${editDocId}`;
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
                    
                    // ★ [수정됨] 기존 태그 불러오기 로직
                    // 기존: hiddenInput에 string으로 넣기
                    // document.getElementById('upload-tags').value = (data.tags || []).join(', ');
                    
                    // 변경: tagList 배열에 넣고 화면 그리기
                    tagList = data.tags || [];
                    if (window.renderTagsGlobal) window.renderTagsGlobal();

                    document.getElementById('upload-image-url').value = data.image;
                    document.getElementById('upload-video').value = data.video || "";
                    document.getElementById('upload-link').value = data.link; 
                    document.getElementById('upload-detail-summary').value = data.detailSummary || "";
                    document.getElementById('upload-detail-why').value = data.detailWhy || "";
                    document.getElementById('upload-detail-how').value = data.detailHow || "";

                    updateImagePreview();
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
        if (ogImage && !imageInput.value) {
            imageInput.value = ogImage;
            updateImagePreview();
        }
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
    
    // ★ [수정됨] 태그 가져오는 로직 (숨겨진 input 값 사용)
    // tagList가 이미 관리되고 있지만, 안전하게 hiddenInput 값을 한 번 더 참조해도 됨.
    // 하지만 tagList 배열 자체가 가장 최신 상태임.
    const tags = tagList; // 배열 그대로 사용

    if (!imageUrl) {
        imageUrl = "https://placehold.co/600x400?text=No+Thumbnail";
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "처리 중...";

    try {
        if (editDocId && firestoreRef) {
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
            setTimeout(() => { window.location.href = `detail.html?id=${editDocId}`; }, 1000);

        } else {
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
            setTimeout(() => { window.location.href = `detail.html?id=${newId}`; }, 1000);
        }

    } catch (error) {
        console.error("업로드/수정 실패:", error);
        showToast("⚠️ 오류가 발생했습니다.");
        submitBtn.disabled = false;
        submitBtn.textContent = editDocId ? "수정 완료" : "업로드";
    }
});