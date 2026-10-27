// Waiver: signature pad + signed PDF copy emailed to the business via FormSubmit.
(function () {
  const form = document.getElementById('waiverForm');
  if (!form) return;

  const canvas = document.getElementById('sigCanvas');
  const pad = canvas.parentElement;
  const hint = document.getElementById('sigHint');
  const errorBox = document.getElementById('waiverError');
  const submitBtn = document.getElementById('waiverSubmit');
  const dateInput = document.getElementById('w-date');
  const ctx = canvas.getContext('2d');
  let hasSignature = false;
  let drawing = false;

  if (dateInput) dateInput.value = localDate(new Date());

  /* ---------- Signature pad ---------- */
  function sizeCanvas() {
    const saved = hasSignature ? canvas.toDataURL() : null;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1033';
    if (saved) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
      img.src = saved;
    }
  }
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  function point(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  canvas.addEventListener('pointerdown', e => {
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
    markSigned();
  });
  canvas.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => canvas.addEventListener(t, () => { drawing = false; }));

  function markSigned() {
    hasSignature = true;
    hint.hidden = true;
    pad.classList.remove('invalid');
  }
  document.getElementById('sigClear').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignature = false;
    hint.hidden = false;
  });

  /* ---------- Submit ---------- */
  form.addEventListener('submit', async e => {
    e.preventDefault();
    errorBox.hidden = true;

    if (!form.checkValidity() || !hasSignature) {
      if (!hasSignature) pad.classList.add('invalid');
      showError(!hasSignature && form.checkValidity()
        ? 'Please draw your signature in the box above.'
        : 'Please fill in all required fields, draw your signature and tick the agreement box.');
      form.reportValidity();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Preparing your signed waiver…';

    const signedAt = new Date();
    form.querySelector('[name="signed-at"]').value = signedAt.toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short' });
    form.querySelector('[name="_next"]').value = new URL('thank-you.html?form=waiver', location.href).href;

    try {
      const pdf = await buildPdf(signedAt);
      const fileName = 'Waiver - ' + safeName(form.elements['name'].value) + ' - ' + localDate(signedAt) + '.pdf';
      const dt = new DataTransfer();
      dt.items.add(new File([pdf], fileName, { type: 'application/pdf' }));
      form.querySelector('[name="attachment"]').files = dt.files;
      await keepCopyForDownload(pdf, fileName);
    } catch (err) {
      // If the PDF can't be made (old browser, script blocked), still send the waiver details by email.
      console.warn('Waiver PDF not attached:', err);
    }

    submitBtn.textContent = 'Sending…';
    HTMLFormElement.prototype.submit.call(form);
  });

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
  }

  /* ---------- PDF ---------- */
  async function buildPdf(signedAt) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 54;
    const ink = [42, 22, 80];
    const purple = [107, 63, 209];
    const grey = [80, 72, 100];
    let y = 0;

    // Header band
    doc.setFillColor(...ink);
    doc.rect(0, 0, W, 92, 'F');
    const logo = await loadImage('images/logo.png').catch(() => null);
    if (logo) doc.addImage(logo, 'JPEG', M - 6, 12, 68, 68);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Animal Rides Kingdom', M + 76, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.text('Rental Agreement and Release of Liability  ·  Signed copy', M + 76, 60);
    doc.text('Richibucto, NB  ·  (506) 233-7577  ·  animalrideskingdom@gmail.com', M + 76, 75);
    y = 122;

    const ensure = h => { if (y + h > H - 60) { doc.addPage(); y = 60; } };
    const heading = (t, size = 13, color = ink) => {
      ensure(size + 18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(size);
      doc.setTextColor(...color);
      doc.text(t, M, y);
      y += size + 6;
    };
    const para = (t, indent = 0) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(...grey);
      doc.splitTextToSize(t, W - M * 2 - indent).forEach(line => {
        ensure(14);
        doc.text(line, M + indent, y);
        y += 14;
      });
      y += 6;
    };
    const row = (label, value) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...ink);
      ensure(16);
      doc.text(label, M, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grey);
      const lines = doc.splitTextToSize(value || '—', W - M * 2 - 170);
      lines.forEach((line, i) => { ensure(14); doc.text(line, M + 170, y + i * 14); });
      y += Math.max(lines.length, 1) * 14 + 6;
    };

    // Waiver text, taken straight from the page so the PDF always matches what was signed
    document.querySelectorAll('.doc-card').forEach(card => {
      card.querySelectorAll('h2, h3, p, li').forEach((el, i) => {
        const text = el.textContent.replace(/\s+/g, ' ').trim();
        if (el.tagName === 'H2') { y += 4; heading(text, 13); }
        else if (el.tagName === 'H3') heading(text, 11, purple);
        else if (el.tagName === 'LI') para((Array.from(el.parentElement.children).indexOf(el) + 1) + '. ' + text, 10);
        else para(text);
      });
    });

    // Signer details
    y += 8;
    ensure(40);
    doc.setDrawColor(...ink);
    doc.setLineWidth(1);
    doc.line(M, y, W - M, y);
    y += 24;
    heading('Lessee details', 13);
    const f = form.elements;
    row('Full name (lessee):', f['name'].value);
    row('Celebrant/s:', f['celebrant'].value);
    row('Other minors:', f['other-minors'].value);
    row('Email:', f['email'].value);
    row('Phone:', f['phone'].value);
    const photo = form.querySelector('[name="photo-permission"]:checked');
    row('Photo permission:', photo ? photo.closest('label').textContent.replace(/\s+/g, ' ').trim() : '');
    row('Agreement:', 'I have read and agree to the Release of Liability and Rental Agreement above.');

    // Signature block
    y += 6;
    ensure(150);
    heading('Signature', 13);
    const sig = trimmedSignature();
    const maxW = 260, maxH = 90;
    const scale = Math.min(maxW / sig.width, maxH / sig.height, 1);
    const sw = sig.width * scale, sh = sig.height * scale;
    doc.addImage(sig.data, 'PNG', M, y, sw, sh, undefined, 'FAST');
    y += sh + 6;
    doc.setDrawColor(...grey);
    doc.line(M, y, M + maxW, y);
    y += 16;
    row('Typed name:', f['signature'].value);
    row('Date:', f['date'].value);
    row('Submitted online:', signedAt.toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'long' }));

    // Page numbers
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(140, 130, 160);
      doc.text('Animal Rides Kingdom waiver  ·  ' + f['name'].value + '  ·  Page ' + i + ' of ' + pages, W / 2, H - 28, { align: 'center' });
    }
    return doc.output('blob');
  }

  // Crop the signature to the drawn area so it sits neatly on the PDF
  function trimmedSignature() {
    const { width, height } = canvas;
    const px = ctx.getImageData(0, 0, width, height).data;
    let minX = width, minY = height, maxX = 0, maxY = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (px[(y * width + x) * 4 + 3] > 0) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    const pad = 10;
    minX = Math.max(minX - pad, 0); minY = Math.max(minY - pad, 0);
    maxX = Math.min(maxX + pad, width); maxY = Math.min(maxY + pad, height);
    const out = document.createElement('canvas');
    out.width = maxX - minX;
    out.height = maxY - minY;
    out.getContext('2d').drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return { data: out.toDataURL('image/png'), width: out.width, height: out.height };
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Small JPEG on the header colour keeps the PDF light enough to email
        const c = document.createElement('canvas');
        c.width = c.height = 180;
        const g = c.getContext('2d');
        g.fillStyle = '#2a1650';
        g.fillRect(0, 0, 180, 180);
        g.drawImage(img, 0, 0, 180, 180);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  // Keep the PDF in this tab so the thank-you page can offer "Download my signed waiver"
  function keepCopyForDownload(blob, name) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => {
        try { sessionStorage.setItem('arkWaiverPdf', JSON.stringify({ name, data: reader.result })); } catch (e) { /* storage blocked: skip the download button */ }
        resolve();
      };
      reader.onerror = () => resolve();
      reader.readAsDataURL(blob);
    });
  }

  function localDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function safeName(s) {
    return (s || 'Guest').replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'Guest';
  }
})();
