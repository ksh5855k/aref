
import { app } from './config.js';
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

const uploadForm = document.getElementById('upload-form');

onAuthStateChanged(auth, (user) => {
    if (!user) {
        alert("레퍼런스를 공유하려면 로그인이 필요합니다.");
        window.location.href = "login.html";
    }
});

uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault(); 

    const category = document.getElementById('upload-category').value;
    const title = document.getElementById('upload-title').value;
    const summary = document.getElementById('upload-summary').value;
    const tagsInput = document.getElementById('upload-tags').value;
    const externalLink = document.getElementById('upload-link').value;
    const imageFile = document.getElementById('upload-image').files[0];

    if (!imageFile) {
        alert("이미지를 선택해주세요.");
        return;
    }

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '업로드 중...';

    try {
        const imageRef = ref(storage, 'images/' + Date.now() + '-' + imageFile.name);
        const snapshot = await uploadBytes(imageRef, imageFile);
        const imageUrl = await getDownloadURL(snapshot.ref);

        const q = query(collection(db, "references"), orderBy("id", "desc"));
        const querySnapshot = await getDocs(q);
        const maxId = querySnapshot.empty ? 0 : querySnapshot.docs[0].data().id;
        const newId = maxId + 1;
        
        const tags = tagsInput.split(',').map(tag => tag.trim());

        await addDoc(collection(db, "references"), {
            id: newId,
            category,
            title,
            summary,
            tags,
            externalLink,
            image: imageUrl,
            createdAt: serverTimestamp(),
            detailSummary: "",
            detailWhy: "",
            detailHow: ""
        });

        alert("레퍼런스가 성공적으로 공유되었습니다!");
        window.location.href = "index.html";

    } catch (error) {
        alert("업로드에 실패했습니다. 다시 시도해주세요.");
        console.error("업로드 에러:", error);
        submitBtn.disabled = false;
        submitBtn.textContent = '공유하기';
    }
});