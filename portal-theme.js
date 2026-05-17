/* ===============================
   THEME TOGGLE
=============================== */

function applyTheme(mode){
  if(mode === 'light'){
    document.body.classList.add('light-mode');
  }else{
    document.body.classList.remove('light-mode');
  }

  localStorage.setItem('portal-theme', mode);

  const icon = document.getElementById('themeIcon');
  if(icon){
    icon.innerText = mode === 'light' ? '☀️' : '🌙';
  }
}

function toggleTheme(){
  const isLight = document.body.classList.contains('light-mode');
  applyTheme(isLight ? 'dark' : 'light');
}

window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('portal-theme') || 'dark';
  applyTheme(saved);

  const sidebar = document.querySelector('.sidebar');
  if(!sidebar) return;

  const box = document.createElement('div');
  box.className = 'theme-toggle';

  box.innerHTML = `
    <div>
      <div style="font-size:12px;opacity:.7;">Appearance</div>
      <div class="mode-label"></div>
    </div>
    <button onclick="toggleTheme()" id="themeIcon">🌙</button>
  `;

  sidebar.appendChild(box);
});
