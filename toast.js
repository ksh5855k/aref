// toast.js (새 파일)

// 토스트 메시지를 띄우는 함수
export function showToast(message) {
    // 1. 컨테이너가 없으면 만들기
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // 2. 메시지 박스 만들기
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerHTML = message; // 이모지 포함 가능

    container.appendChild(toast);

    // 3. 애니메이션: 등장
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // 4. 애니메이션: 퇴장 (3초 뒤)
    setTimeout(() => {
        toast.classList.remove('show');
        // 투명해지면 DOM에서 완전히 제거
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3000);
}