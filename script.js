const scriptURL = "https://script.google.com/macros/s/AKfycbxOJAZtoRpHBRZpxOGO-wTmIErmHOLhxqz-hoq3wPQVs8S9ebIvwxSeHGv8UTSmH3LINw/exec";

const altaForm = document.getElementById("altaForm");
const altaSection = document.getElementById("altaSection");
const pagoSection = document.getElementById("pagoSection");
const alumnoInput = document.getElementById("alumnoInput");
const alumnoList = document.getElementById("alumnoList");

let alumnosData = [];

// --- Mostrar/Ocultar secciones ---
document.getElementById("btnAlta").addEventListener("click", () => {
  altaSection.classList.toggle("active");
  pagoSection.classList.remove("active");
});
document.getElementById("btnPago").addEventListener("click", () => {
  pagoSection.classList.toggle("active");
  altaSection.classList.remove("active");
  cargarAlumnos();
});

// --- Cargar alumnos ---
async function cargarAlumnos() {
  try {
    const res = await fetch(scriptURL);
    alumnosData = await res.json();
  } catch (err) {
    console.error("Error al cargar alumnos:", err);
  }
}

// --- Alta de alumnos ---
altaForm.addEventListener("submit", async e => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const apellido = document.getElementById("apellido").value.trim();
  const dni = document.getElementById("dni").value.trim();
  const telefono = document.getElementById("telefono").value.trim();

  altaForm.reset();

  const body = { tipo: "alta", Nombre: nombre, Apellido: apellido, DNI: dni, Telefono: telefono };

  try {
    const res = await fetch(scriptURL, { method: "POST", body: JSON.stringify(body) });
    const data = await res.json();

    alert(data.message);
    if (data.success) {
      await cargarAlumnos();
    }
  } catch (err) {
    alert("❌ Error al agregar alumno");
    console.error(err);
  }
});

// --- Autocomplete alumnos ---
alumnoInput.addEventListener("input", () => {
  const query = alumnoInput.value.toLowerCase();
  alumnoList.innerHTML = "";
  if (!query) return;

  const matches = alumnosData.filter(a =>
    `${a.Nombre} ${a.Apellido}`.toLowerCase().includes(query)
  );

  matches.forEach(a => {
    const item = document.createElement("div");
    item.className = "list-group-item list-group-item-action";
    item.textContent = `${a.Nombre} ${a.Apellido} (${a.DNI})`;
    item.dataset.alumno = JSON.stringify(a);
    item.addEventListener("click", () => {
      alumnoInput.value = `${a.Nombre} ${a.Apellido}`;
      alumnoInput.dataset.selected = JSON.stringify(a);
      alumnoList.innerHTML = "";
    });
    alumnoList.appendChild(item);
  });
});

// --- Registrar pago y generar PDF ---
document.getElementById("pagoForm").addEventListener("submit", async e => {
  e.preventDefault();

  const concepto = document.getElementById("conceptoSelect").value;
  const mes = document.getElementById("mesSelect").value;
  const importe = document.getElementById("importe").value;
  const medioPago = document.getElementById("medioPagoSelect").value;

  const alumno = alumnoInput.dataset.selected
    ? JSON.parse(alumnoInput.dataset.selected)
    : { Nombre: alumnoInput.value, Apellido: "", DNI: "", Telefono: "" };

  const body = {
    tipo: "pago",
    ...alumno,
    Concepto: concepto,
    Importe: importe,
    MesPago: mes,
    MedioPago: medioPago
  };

  try {
    // --- Enviar el POST ---
    const res = await fetch(scriptURL, { method: "POST", body: JSON.stringify(body) });
    const data = await res.json();
    if (!data.success) throw new Error("No se pudo registrar el pago");

    // --- Limpiar formulario ---
    e.target.reset();
    alumnoInput.dataset.selected = "";
    alumnoList.innerHTML = "";

    // --- Generar PDF ---
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    try {
      const img = new Image();
      img.src = "public/LOGO_RECIBO.png";
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      doc.addImage(img, "PNG", 15, 15, 40, 40);
    } catch (err) {
      console.warn("Logo no cargado", err);
    }

    doc.setFontSize(18);
    doc.text("COMPROBANTE DE PAGO", pageWidth / 2, 30, { align: "center" });
    doc.setFontSize(12);
    doc.text("SOMOS QUERENCIA by Matias Ivan Collazo", pageWidth / 2, 38, { align: "center" });
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, pageWidth - 20, 38, { align: "right" });

    doc.setLineWidth(0.5);
    doc.rect(10, 60, pageWidth - 20, 110);

    let startY = 70;
    doc.text(`Nombre: ${alumno.Nombre} ${alumno.Apellido}`, 15, startY); startY += 10;
    doc.text(`DNI: ${alumno.DNI}`, 15, startY); startY += 10;
    doc.text(`Teléfono: ${alumno.Telefono}`, 15, startY); startY += 10;
    doc.text(`Concepto: ${concepto}`, 15, startY); startY += 10;
    doc.text(`Mes: ${mes}`, 15, startY); startY += 10;
    doc.text(`Medio de Pago: ${medioPago}`, 15, startY); startY += 10;
    doc.text(`Importe: $${importe}`, 15, startY);

    doc.line(15, startY + 5, pageWidth - 15, startY + 5);
    doc.setFontSize(10);
    doc.text("Gracias por su pago. Conserva este comprobante.", pageWidth / 2, startY + 15, { align: "center" });

    // --- Detectar móvil ---
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, "_blank"); // Abrir PDF en nueva pestaña en móviles
    } else {
      doc.save(`Recibo_${alumno.Nombre}_${mes}.pdf`); // Descargar en escritorio
    }

  } catch (err) {
    alert("❌ Error al generar PDF o registrar pago");
    console.error(err);
  }
});
