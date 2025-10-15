// edit.js

// 필요한 기능들을 Firebase에서 직접 가져옵니다.
import { app } from './config.js';
import { getFirestore, collection, getDocs, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firestore 서비스를 초기화합니다.
const db = getFirestore(app);

// HTML 문서 로딩이 끝나면 실행될 코드
document.addEventListener('DOMContentLoaded', async () => {
    // 1. URL에서 수정할 레퍼런스의 id를 가져옵니다.
    const urlParams = new URLSearchParams(window.location.search);
    const id = parseInt(urlParams.get('id'));

    if (!id) {
        alert("잘못된 접근입니다.");
        window.location.href = "index.html";
        return;
    }

    // 2. Firestore에서 해당 id의 데이터를 찾아옵니다.
    const q = query(collection(db, "references"), where("id", "==", id));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        alert("수정할 데이터를 찾을 수 없습니다.");
        window.location.href = "index.html";
        return;
    }
    
    const doc = querySnapshot.docs[0];
    const ref = doc.data();

    // 3. 찾은 데이터로 폼의 각 입력창을 채워줍니다.
    document.getElementById('upload-category').value = ref.category;
    document.getElementById('upload-title').value = ref.title;
    document.getElementById('upload-summary').value = ref.summary;
    document.getElementById('upload-tags').value = ref.tags.join(', '); // 배열을 다시 쉼표로 구분된 문자열로
    document.getElementById('upload-link').value = ref.externalLink;

    
    // 4. '수정 완료' 버튼을 눌렀을 때의 동작을 추가합니다.
    const uploadForm = document.getElementById('upload-form');
    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // 페이지가 새로고침되는 것을 막습니다.

        // 폼에서 수정된 값들을 가져옵니다.
        const updatedData = {
            category: document.getElementById('upload-category').value,
            title: document.getElementById('upload-title').value,
            summary: document.getElementById('upload-summary').value,
            tags: document.getElementById('upload-tags').value.split(',').map(tag => tag.trim()),
            externalLink: document.getElementById('upload-link').value,
            // (이미지 수정은 나중에 다룰 고급 주제입니다.)
        };

        try {
            // Firestore에 있는 문서를 업데이트합니다.
            await updateDoc(doc.ref, updatedData);

            alert("수정이 완료되었습니다!");
            window.location.href = `detail.html?id=${id}`; // 수정된 상세 페이지로 돌아갑니다.

        } catch (error) {
            alert("수정에 실패했습니다. 다시 시도해주세요.");
            console.error("업데이트 에러:", error);
        }
    });
});