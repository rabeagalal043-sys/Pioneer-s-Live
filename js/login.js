(function(){
  document.getElementById('yearNow').textContent = new Date().getFullYear();

  const veil = document.getElementById('loadingVeil');
  const form = document.getElementById('loginForm');
  const phoneInput = document.getElementById('phoneInput');
  const errorMsg = document.getElementById('errorMsg');
  const submitBtn = document.getElementById('submitBtn');

  let students = [];
  let dataReady = false;

  // منع إعادة عرض شاشة الدخول لو الطالب داخل جلسة فعلاً
  const existingSession = sessionStorage.getItem('pls_student');
  if (existingSession) {
    window.location.replace('player.html');
    return;
  }

  function normalizePhone(p){
    return (p || '').replace(/[^\d]/g, '').trim();
  }

  function showError(text){
    errorMsg.textContent = text;
    errorMsg.classList.add('show');
  }
  function clearError(){
    errorMsg.classList.remove('show');
    errorMsg.textContent = '';
  }

  fetch('data/students.json')
    .then(res => {
      if (!res.ok) throw new Error('bad-response');
      return res.json();
    })
    .then(json => {
      students = Array.isArray(json.students) ? json.students : [];
      dataReady = true;
    })
    .catch(() => {
      // فشل تحميل الملف (غالبًا لأن الصفحة فُتحت مباشرة من الجهاز بدون سيرفر محلي)
      dataReady = false;
    })
    .finally(() => {
      veil.classList.add('hidden');
    });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    clearError();

    if (!dataReady) {
      showError('تعذّر تحميل قاعدة بيانات الطلاب. برجاء تشغيل المنصة عبر سيرفر محلي (راجع ملف README).');
      return;
    }

    const entered = normalizePhone(phoneInput.value);

    if (entered.length < 10) {
      showError('برجاء إدخال رقم موبايل صحيح.');
      phoneInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري التحقق…';

    const match = students.find(s => normalizePhone(s.phone) === entered);

    if (!match) {
      showError('رقم الموبايل غير مسجل على المنصة. تواصل مع إدارة المنصة لو الرقم صحيح.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'دخول قاعة البث';
      return;
    }

    sessionStorage.setItem('pls_student', JSON.stringify({
      name: match.name,
      phone: normalizePhone(match.phone)
    }));

    window.location.href = 'player.html';
  });

  phoneInput.addEventListener('input', () => {
    phoneInput.value = phoneInput.value.replace(/[^\d]/g, '');
    clearError();
  });
})();
