// scroll-top.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. 제외할 페이지 확인 (로그인, 회원가입, 업로드)
    const path = window.location.pathname;
    if (path.includes('login.html') || 
        path.includes('signup.html') || 
        path.includes('upload.html')) {
        return; // 이 페이지들에서는 버튼을 만들지 않고 종료
    }

    // 2. 버튼 HTML 생성 및 추가 (SVG 아이콘 사용)
    const btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 4l-8 8h6v8h4v-8h6z"/></svg>`; // 위로 가는 화살표
    btn.title = "맨 위로";
    document.body.appendChild(btn);

    // 3. 스크롤 이벤트: 300px 이상 내려가면 버튼 표시
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            btn.classList.add('show');
        } else {
            btn.classList.remove('show');
        }
    });

    // 4. 클릭 이벤트: 부드럽게 맨 위로 이동
    btn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});