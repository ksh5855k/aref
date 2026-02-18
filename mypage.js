import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, deleteDoc, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { showToast } from './toast.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let savedDataList = []; 
let myFolders = []; 
let currentSort = 'id-desc'; 
let currentFolderId = 'all';

function getSkeletonHTML() {
    let html = '';
    for(let i=0; i<4; i++) {
        html += `
        <div class="skeleton-card">
            <div class="skeleton skeleton-img"></div>
            <div class="skeleton-content">
                <div class="skeleton skeleton-text" style="width: 30%;"></div>
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text"></div>
            </div>
        </div>`;
    }
    return html;
}

document.addEventListener('DOMContentLoaded', () => {
    const drawerList = document.getElementById('my-drawer-list');
    
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderDrawer(); 
        });
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const keyword = searchInput.value.trim();
                if (keyword) window.location.href = `index.html?search=${encodeURIComponent(keyword)}`;
            }
        });
    }

    // 전체 선택 체크박스
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const checkboxes = document.querySelectorAll('.card-checkbox');
            checkboxes.forEach(cb => cb.checked = isChecked);
        });
    }

    // 개별 체크박스 -> 전체 선택 동기화
    if (drawerList) {
        drawerList.addEventListener('change', (e) => {
            if (e.target.classList.contains('card-checkbox')) {
                const totalCheckboxes = document.querySelectorAll('.card-checkbox').length;
                const checkedCheckboxes = document.querySelectorAll('.card-checkbox:checked').length;
                
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = (totalCheckboxes > 0 && totalCheckboxes === checkedCheckboxes);
                }
            }
        });
    }

    // 일괄 이동 버튼
    const bulkMoveBtn = document.getElementById('bulk-move-btn');
    if (bulkMoveBtn) {
        bulkMoveBtn.addEventListener('click', async () => {
            const selectedIds = getSelectedIds(); 
            const targetFolderId = document.getElementById('bulk-folder-select').value;

            if (selectedIds.length === 0) {
                alert("선택된 항목이 없습니다.");
                return;
            }
            if (!targetFolderId) {
                alert("이동할 폴더를 선택해주세요.");
                return;
            }

            if (confirm(`${selectedIds.length}개의 항목을 이동하시겠습니까?`)) {
                await bulkMoveItems(selectedIds, targetFolderId);
            }
        });
    }

    // 일괄 삭제 버튼
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', async () => {
            const selectedIds = getSelectedIds();
            
            if (selectedIds.length === 0) {
                alert("선택된 항목이 없습니다.");
                return;
            }

            if (confirm(`정말 ${selectedIds.length}개의 항목을 삭제하시겠습니까? (복구 불가)`)) {
                await bulkDeleteItems(selectedIds);
            }
        });
    }

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            if (sessionStorage.getItem('isLoggingOut')) {
                sessionStorage.removeItem('isLoggingOut'); 
                return; 
            }

            alert("로그인이 필요한 서비스입니다.");
            window.location.href = "login.html";
            return;
        }

        drawerList.innerHTML = getSkeletonHTML();
        await loadFolders(user);
        loadSavedData(user);
    });
});

// 체크된 항목들의 saveDocId 반환
function getSelectedIds() {
    const checkboxes = document.querySelectorAll('.card-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// 일괄 이동 함수
async function bulkMoveItems(saveDocIds, folderId) {
    try {
        const promises = saveDocIds.map(id => {
            const docRef = doc(db, "userSaves", id);
            return updateDoc(docRef, { folderId: folderId });
        });

        await Promise.all(promises);
        showToast("📦 이동되었습니다!");
        
        loadSavedData(auth.currentUser);
        
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;

    } catch (error) {
        console.error("일괄 이동 실패:", error);
        alert("이동 중 오류가 발생했습니다.");
    }
}

// 일괄 삭제 함수
async function bulkDeleteItems(saveDocIds) {
    try {
        const promises = saveDocIds.map(id => {
            return deleteDoc(doc(db, "userSaves", id));
        });

        await Promise.all(promises);
        showToast("🗑️ 삭제되었습니다!");
        
        loadSavedData(auth.currentUser);
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;

    } catch (error) {
        console.error("일괄 삭제 실패:", error);
        alert("삭제 중 오류가 발생했습니다.");
    }
}

// 폴더 목록 불러오기
async function loadFolders(user) {
    try {
        const q = query(collection(db, "folders"), where("uid", "==", user.uid));
        const snapshot = await getDocs(q);
        myFolders = [];
        snapshot.forEach(doc => {
            myFolders.push({ id: doc.id, ...doc.data() });
        });
        
        myFolders.sort((a, b) => {
            if (a.createdAt < b.createdAt) return -1;
            if (a.createdAt > b.createdAt) return 1;
            return 0;
        });

        renderFolderTabs();
    } catch (e) {
        console.error("폴더 로드 실패", e);
    }
}

function renderFolderTabs() {
    const container = document.getElementById('folder-tabs-container');
    const bulkSelect = document.getElementById('bulk-folder-select');

    if (!container) return;
    container.innerHTML = '';
    
    if (bulkSelect) {
        bulkSelect.innerHTML = '<option value="">이동할 폴더 선택...</option>';
    }

    const allBtn = document.createElement('button');
    allBtn.className = `folder-btn ${currentFolderId === 'all' ? 'active' : ''}`;
    allBtn.textContent = '전체 보기';
    allBtn.onclick = () => switchFolder('all');
    container.appendChild(allBtn);

    myFolders.forEach(folder => {
        const btn = document.createElement('button');
        btn.className = `folder-btn ${currentFolderId === folder.id ? 'active' : ''}`;
        btn.textContent = folder.name;
        
        btn.oncontextmenu = (e) => {
            e.preventDefault();
            deleteFolder(folder.id, folder.name);
        };
        btn.onclick = () => switchFolder(folder.id);
        
        container.appendChild(btn);

        if (bulkSelect) {
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = `📂 ${folder.name}`;
            bulkSelect.appendChild(option);
        }
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'folder-btn add-folder-btn';
    addBtn.textContent = '+ 새 폴더';
    addBtn.onclick = createNewFolder;
    container.appendChild(addBtn);
}

async function createNewFolder() {
    const name = prompt("새 폴더 이름을 입력하세요:");
    if (!name || name.trim() === "") return;

    const user = auth.currentUser;
    try {
        const docRef = await addDoc(collection(db, "folders"), {
            uid: user.uid,
            name: name.trim(),
            createdAt: new Date().toISOString()
        });
        
        showToast(`📂 '${name}' 폴더가 생성되었습니다.`);
        loadFolders(user);

    } catch (e) {
        console.error(e);
        showToast("오류가 발생했습니다.");
    }
}

async function deleteFolder(folderId, folderName) {
    if (!confirm(`'${folderName}' 폴더를 삭제하시겠습니까?\n(자료는 삭제되지 않고 '전체'로 이동됩니다)`)) return;
    
    try {
        await deleteDoc(doc(db, "folders", folderId));
        showToast("폴더가 삭제되었습니다.");
        
        if (currentFolderId === folderId) currentFolderId = 'all';
        
        const user = auth.currentUser;
        await loadFolders(user);
        renderDrawer(); 
    } catch (e) {
        console.error(e);
        showToast("삭제 실패");
    }
}

function switchFolder(folderId) {
    currentFolderId = folderId;
    renderFolderTabs(); 
    renderDrawer(); 
    
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
}

// ★ [수정됨] 데이터 로드 및 멘트 업데이트
async function loadSavedData(user) {
    const drawerList = document.getElementById('my-drawer-list');
    try {
        const mySaveQ = query(collection(db, "userSaves"), where("uid", "==", user.uid));
        const mySaveSnapshot = await getDocs(mySaveQ);

        // ★ 여기서 멘트 업데이트 (저장된 개수 기반)
        updateDrawerMessage(mySaveSnapshot.size);

        if (mySaveSnapshot.empty) {
            renderDrawer();
            return;
        }

        const mySavedMap = {}; 
        mySaveSnapshot.forEach(doc => {
            const data = doc.data();
            mySavedMap[data.referenceId] = {
                saveDocId: doc.id,
                folderId: data.folderId || 'all' 
            };
        });

        const refSnapshot = await getDocs(collection(db, "references"));
        const allSavesSnapshot = await getDocs(collection(db, "userSaves"));
        
        const saveCounts = {};
        allSavesSnapshot.forEach(doc => {
            const rid = doc.data().referenceId;
            saveCounts[rid] = (saveCounts[rid] || 0) + 1;
        });

        savedDataList = [];
        refSnapshot.forEach(doc => {
            const data = doc.data();
            if (mySavedMap[data.id]) {
                data.saveCount = saveCounts[data.id] || 0;
                data.saveDocId = mySavedMap[data.id].saveDocId;
                data.folderId = mySavedMap[data.id].folderId;   
                savedDataList.push(data);
            }
        });

        renderDrawer();

    } catch (error) {
        console.error("데이터 로드 실패:", error);
        drawerList.innerHTML = `<p class="error-message">오류 발생: ${error.message}</p>`;
    }
}

// ★ [추가됨] 멘트 생성 함수
function updateDrawerMessage(count) {
    const subtitleEl = document.getElementById('drawer-subtitle');
    if (!subtitleEl) return;

    const numHtml = `<span class="highlight-num">${count}</span>`;
    let message = "";

    if (count === 0) {
        message = "텅 빈 서랍, 당신의 첫 번째 영감을 기다립니다.";
    } else if (count < 10) {
        message = `막막했던 기획안에 ${numHtml}개의 실마리가 생겼습니다.`;
    } else if (count < 30) {
        message = `누구도 반박 못 할 ${numHtml}가지 단단한 근거를 확보했네요.`;
    } else if (count < 50) {
        message = `팀원들을 설득할 ${numHtml}개의 강력한 무기가 준비되었습니다.`;
    } else {
        message = `이제 ${numHtml}개의 인사이트가 당신의 기획을 증명합니다.`;
    }

    subtitleEl.innerHTML = message;
}

function renderDrawer() {
    const drawerList = document.getElementById('my-drawer-list');
    drawerList.innerHTML = '';

    let filteredList = savedDataList;
    if (currentFolderId !== 'all') {
        filteredList = savedDataList.filter(item => item.folderId === currentFolderId);
    }

    if (filteredList.length === 0) {
        const folderName = currentFolderId === 'all' ? '' : '이 폴더에 ';
        drawerList.innerHTML = `
            <div class="empty-message" style="text-align:center; padding: 60px 20px;">
                <h3 style="font-size: 1.5rem; margin-bottom: 10px; color: #333;">아직 수집된 레퍼런스가 없네요 🧐</h3>
                <p style="color: #666; font-size: 1rem;">
                    ${folderName}영감이 떠오르는 자료를 모아<br>
                    나만의 인사이트를 완성해보세요!
                </p>
                <button onclick="location.href='index.html'" style="margin-top:20px; padding:10px 20px; background:#333; color:white; border:none; border-radius:50px; cursor:pointer;">
                    레퍼런스 찾으러 가기 👉
                </button>
            </div>`;
         return;
    }

    const [field, direction] = currentSort.split('-');
    filteredList.sort((a, b) => {
        let valA = a[field] || 0;
        let valB = b[field] || 0;
        if (field === 'saves') { valA = a.saveCount || 0; valB = b.saveCount || 0; }
        
        if (direction === 'desc') return valB - valA;
        else return valA - valB;
    });

    filteredList.forEach(data => {
        const card = createDrawerCard(data);
        drawerList.appendChild(card);
    });
}

function createDrawerCard(data) {
    const div = document.createElement('div');
    div.className = 'reference-card';
    const fallbackImage = "https://placehold.co/300x200?text=No+Image";

    let folderOptions = `<option value="all">폴더 선택 안함</option>`;
    myFolders.forEach(f => {
        const selected = data.folderId === f.id ? 'selected' : '';
        folderOptions += `<option value="${f.id}" ${selected}>📂 ${f.name}</option>`;
    });

    div.innerHTML = `
        <input type="checkbox" class="card-checkbox" value="${data.saveDocId}" onclick="event.stopPropagation()">

        <div class="save-button-container">
           <button class="save-btn" onclick="removeFromDrawer('${data.id}', '${data.saveDocId}', this)">✅</button>
        </div>
        <a href="detail.html?id=${data.id}" class="card-link-area">
            <img src="${data.image}" alt="${data.title}" 
                 onerror="this.onerror=null; this.src='${fallbackImage}';">
            <div class="card-content">
                <span class="category-badge">${data.category}</span>
                <h2>${data.title}</h2>
                <div class="card-meta">
                     <span class="view-count">👁️ ${data.views || 0}</span>
                     <span class="save-count" style="margin-left:8px; font-size:0.85em; color:#666;">📂 ${data.saveCount || 0}</span>
                </div>
                
                <div onclick="event.preventDefault(); event.stopPropagation();" style="margin-top: 10px;">
                    <select class="folder-select-mini" onchange="moveToFolder('${data.saveDocId}', '${data.id}', this.value)">
                        ${folderOptions}
                    </select>
                </div>

            </div>
        </a>
    `;
    return div;
}

window.moveToFolder = async function(saveDocId, refId, folderId) {
    try {
        const saveRef = doc(db, "userSaves", saveDocId);
        await updateDoc(saveRef, { folderId: folderId });
        
        const targetItem = savedDataList.find(item => item.id == refId);
        if (targetItem) targetItem.folderId = folderId;

        showToast("폴더가 변경되었습니다! 📦");
        
        if (currentFolderId !== 'all') {
            renderDrawer();
        }
    } catch (e) {
        console.error(e);
        showToast("이동 실패");
    }
};

window.removeFromDrawer = async function(refId, saveDocId, btnElement) {
    if (!confirm("내 서랍에서 삭제하시겠습니까?")) return;

    try {
        await deleteDoc(doc(db, "userSaves", saveDocId));
        
        const card = btnElement.closest('.reference-card');
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            savedDataList = savedDataList.filter(item => item.id != refId);
            renderDrawer(); 
            showToast("내 서랍에서 삭제되었습니다.");
            // ★ 삭제 시 개수가 바뀌므로 멘트도 갱신
            updateDrawerMessage(savedDataList.length);
        }, 300);

    } catch (error) {
        console.error(error);
        showToast("삭제 중 오류가 발생했습니다.");
    }
};