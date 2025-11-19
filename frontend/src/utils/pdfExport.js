// Importación diferida: evita problemas de pre-bundling de Vite con jspdf
// Las librerías se cargan sólo cuando se genera el PDF.

async function getJsPdf() {
  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable'); // registra autoTable en la instancia
  return jsPDF;
}
import { formatCurrency } from './formatCurrency';

/**
 * Exportar detalles de un préstamo a PDF
 */
export async function exportPrestamoPDF(prestamo, cliente, pagos = [], amortizacion = [], vendedor = null) {
  const jsPDF = await getJsPdf();
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.setTextColor(102, 126, 234);
  doc.text('Detalle del Préstamo', 14, 20);
  
  // Información del cliente
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Cliente: ${cliente?.nombre || 'N/A'}`, 14, 35);
  doc.setFontSize(10);
  doc.text(`DNI: ${cliente?.dni || 'N/A'}`, 14, 42);
  doc.text(`Teléfono: ${cliente?.telefono || 'N/A'}`, 14, 48);
  
  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 52, 196, 52);
  
  // Datos del préstamo
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Datos del Préstamo', 14, 60);
  doc.setFont(undefined, 'normal');
  
  // formatCurrency importado se usa para respetar la moneda seleccionada
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const [year, month, day] = dateString.split('T')[0].split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES');
  };
  
  let yPos = 68;
  const leftCol = 14;
  const rightCol = 110;
  
  // Columna izquierda
  doc.text(`ID Préstamo: #${prestamo.id}`, leftCol, yPos);
  yPos += 6;
  doc.text(`Fecha Inicio: ${formatDate(prestamo.fecha_inicio)}`, leftCol, yPos);
  yPos += 6;
  doc.text(`Fecha Vencimiento: ${formatDate(prestamo.fecha_vencimiento)}`, leftCol, yPos);
  yPos += 6;
  doc.text(`Monto: ${formatCurrency(prestamo.monto)}`, leftCol, yPos);
  yPos += 6;
  doc.text(`Tasa de Interés: ${prestamo.tasa_interes}%`, leftCol, yPos);
  yPos += 6;
  doc.text(`Intereses: ${formatCurrency(prestamo.monto_total - prestamo.monto)}`, leftCol, yPos);
  
  // Columna derecha
  yPos = 68;
  doc.text(`Total: ${formatCurrency(prestamo.monto_total)}`, rightCol, yPos);
  yPos += 6;
  doc.text(`Saldo Pendiente: ${formatCurrency(prestamo.saldo_pendiente)}`, rightCol, yPos);
  yPos += 6;
  doc.text(`Frecuencia: ${prestamo.frecuencia_pago || 'Semanal'}`, rightCol, yPos);
  yPos += 6;
  doc.text(`Cuotas Totales: ${prestamo.cuotas_totales}`, rightCol, yPos);
  yPos += 6;
  doc.text(`Cuotas Pagadas: ${prestamo.cuotas_pagadas}`, rightCol, yPos);
  yPos += 6;
  doc.text(`Estado: ${prestamo.estado}`, rightCol, yPos);
  
  yPos += 10;
  
  // Tabla de amortización
  if (amortizacion && amortizacion.length > 0) {
    doc.autoTable({
      startY: yPos,
      head: [['Cuota', 'Fecha', 'Monto', 'Estado']],
      body: amortizacion.map(row => [
        row.numero,
        formatDate(row.fecha),
        formatCurrency(row.monto),
        row.estado
      ]),
      theme: 'striped',
      headStyles: { fillColor: [102, 126, 234] },
      styles: { fontSize: 9 },
      margin: { left: 14 }
    });
    yPos = doc.lastAutoTable.finalY + 10;
  }
  
  // Historial de pagos
  if (pagos && pagos.length > 0) {
    doc.autoTable({
      startY: yPos,
      head: [['Fecha Pago', 'Monto', 'Método', 'Notas']],
      body: pagos.map(pago => [
        formatDate(pago.fecha_pago),
        formatCurrency(pago.monto),
        pago.metodo_pago || 'Efectivo',
        pago.notas || '-'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [40, 167, 69] },
      styles: { fontSize: 9 },
      margin: { left: 14 }
    });
  }
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generado el ${new Date().toLocaleDateString('es-ES')} - Página ${i} de ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }
  
  // Guardar PDF
  doc.save(`Prestamo_${prestamo.id}_${cliente?.nombre || 'Cliente'}.pdf`);
}

/**
 * Exportar detalles de un pago a PDF
 */
export async function exportPagoPDF(pago, prestamo, cliente, cobrador = null) {
  const jsPDF = await getJsPdf();
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.setTextColor(40, 167, 69);
  doc.text('Comprobante de Pago', 14, 20);
  
  // Información del pago
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Recibo #${pago.id}`, 14, 35);
  
  // formatCurrency importado se usa para respetar la moneda seleccionada
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const [year, month, day] = dateString.split('T')[0].split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES');
  };
  
  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 40, 196, 40);
  
  let yPos = 48;
  
  // Datos del cliente
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Cliente', 14, yPos);
  doc.setFont(undefined, 'normal');
  yPos += 8;
  doc.text(`Nombre: ${cliente?.nombre || 'N/A'}`, 14, yPos);
  yPos += 6;
  doc.text(`DNI: ${cliente?.dni || 'N/A'}`, 14, yPos);
  yPos += 6;
  doc.text(`Teléfono: ${cliente?.telefono || 'N/A'}`, 14, yPos);
  
  yPos += 10;
  doc.line(14, yPos, 196, yPos);
  yPos += 8;
  
  // Datos del préstamo
  doc.setFont(undefined, 'bold');
  doc.text('Préstamo Asociado', 14, yPos);
  doc.setFont(undefined, 'normal');
  yPos += 8;
  doc.text(`ID: #${prestamo?.id || 'N/A'}`, 14, yPos);
  yPos += 6;
  doc.text(`Monto Total: ${formatCurrency(prestamo?.monto_total || 0)}`, 14, yPos);
  yPos += 6;
  doc.text(`Saldo Pendiente: ${formatCurrency(prestamo?.saldo_pendiente || 0)}`, 14, yPos);
  
  yPos += 10;
  doc.line(14, yPos, 196, yPos);
  yPos += 8;
  
  // Datos del pago
  doc.setFont(undefined, 'bold');
  doc.text('Detalles del Pago', 14, yPos);
  doc.setFont(undefined, 'normal');
  yPos += 8;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(`Monto Pagado: ${formatCurrency(pago.monto)}`, 14, yPos);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  yPos += 10;
  
  doc.text(`Fecha de Pago: ${formatDate(pago.fecha_pago)}`, 14, yPos);
  yPos += 6;
  doc.text(`Método de Pago: ${pago.metodo_pago || 'Efectivo'}`, 14, yPos);
  yPos += 6;
  doc.text(`Tipo: ${pago.tipo_pago || 'Parcial'}`, 14, yPos);
  yPos += 6;
  if (pago.notas) {
    doc.text(`Notas: ${pago.notas}`, 14, yPos);
    yPos += 6;
  }
  
  // Comisión del cobrador (si existe)
  if (cobrador) {
    yPos += 4;
    doc.line(14, yPos, 196, yPos);
    yPos += 8;
    doc.setFont(undefined, 'bold');
    doc.text('Comisión del Cobrador', 14, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 8;
    doc.text(`Cobrador: ${cobrador.empleado_nombre}`, 14, yPos);
    yPos += 6;
    doc.text(`Porcentaje: ${cobrador.porcentaje}%`, 14, yPos);
    yPos += 6;
    doc.text(`Comisión: ${formatCurrency(cobrador.monto_comision)}`, 14, yPos);
  }
  
  // Cuadro de resumen
  yPos += 15;
  doc.setDrawColor(40, 167, 69);
  doc.setLineWidth(0.5);
  doc.rect(14, yPos, 182, 30);
  
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Estado del Préstamo después del Pago', 20, yPos);
  doc.setFont(undefined, 'normal');
  yPos += 8;
  doc.text(`Saldo Restante: ${formatCurrency(prestamo?.saldo_pendiente || 0)}`, 20, yPos);
  yPos += 6;
  doc.text(`Cuotas Pagadas: ${prestamo?.cuotas_pagadas || 0} de ${prestamo?.cuotas_totales || 0}`, 20, yPos);
  
  // Footer
  yPos = doc.internal.pageSize.height - 20;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`, 14, yPos);
  yPos += 5;
  doc.text('Este documento es un comprobante de pago válido', 14, yPos);
  
  // Guardar PDF
  doc.save(`Pago_${pago.id}_${formatDate(pago.fecha_pago)}.pdf`);
}

// =================== FORMATOS TIPO PLANTILLA ===================

function numeroALetrasSimple(n) {
  try {
    const unidades = ['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve'];
    const decenas = ['','diez','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
    const centenas = ['','cien','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];
    n = Math.round(Number(n));
    if (isNaN(n)) return '';
    if (n < 10) return unidades[n];
    if (n < 100) {
      const d = Math.floor(n/10), u = n%10;
      if (u === 0) return decenas[d];
      if (d === 2) return `veinti${unidades[u]}`;
      return `${decenas[d]} y ${unidades[u]}`;
    }
    if (n < 1000) {
      const c = Math.floor(n/100), r = n%100;
      if (r === 0) return centenas[c];
      if (c === 1) return `ciento ${numeroALetrasSimple(r)}`;
      return `${centenas[c]} ${numeroALetrasSimple(r)}`;
    }
    if (n < 1000000) {
      const miles = Math.floor(n/1000), r = n%1000;
      const pref = miles === 1 ? 'mil' : `${numeroALetrasSimple(miles)} mil`;
      return r === 0 ? pref : `${pref} ${numeroALetrasSimple(r)}`;
    }
    return String(n);
  } catch { return ''; }
}

export async function exportContratoPrestamoFormatoPDF({ prestamo, cliente, vendedor = null, adminData = null, lugar = '', fecha = new Date() }) {
  const jsPDF = await getJsPdf();
  const doc = new jsPDF('p','mm','a4');

  const formatDate = (d) => new Date(d).toLocaleDateString('es-ES', { day:'2-digit', month:'long', year:'numeric' });
  const moneda = (v) => formatCurrency(v);

  // Determinar quién es el prestamista (vendedor o admin)
  const prestamista = vendedor ? {
    nombre: vendedor.empleado_nombre,
    dni: vendedor.dni || 'N/A',
    domicilio: vendedor.direccion || 'N/A'
  } : {
    nombre: adminData?.nombre_completo || 'Administrador',
    dni: adminData?.dni || 'N/A',
    domicilio: adminData?.direccion || 'N/A'
  };

  // Título
  doc.setFontSize(18); doc.setFont(undefined,'bold');
  doc.text('CONTRATO DE PRESTAMO DE DINERO', 105, 20, { align:'center' });
  doc.setFontSize(16); doc.text('REUNIDOS', 105, 30, { align:'center' });

  // Cuerpo tipo plantilla
  doc.setFontSize(12); doc.setFont(undefined,'normal'); doc.setTextColor(0,0,0);
  const left = 20, width = 170, lineH = 8;
  let y = 50;

  const linea1 = `Yo ${prestamista.nombre} con DNI Nº ${prestamista.dni} y con domicilio ${prestamista.domicilio} mediante este documento hago préstamo de dinero la cantidad de ${moneda(prestamo?.monto)}.`;
  const linea2 = `Al señor(a) ${cliente?.nombre || '________________'} con DNI Nº ${cliente?.dni || '______________'} y con domicilio ${cliente?.direccion || '__________________________'} comprometiéndose a devolver el préstamo hasta el ${formatDate(prestamo?.fecha_vencimiento || fecha)} pagando mensualmente el interés del ${prestamo?.tasa_interes ?? 0}%.`;

  const textoParrafos = [linea1, linea2];
  textoParrafos.forEach(p => {
    const splitted = doc.splitTextToSize(p, width);
    doc.text(splitted, left, y);
    y += lineH * splitted.length + 2;
  });

  // Pie con lugar y fecha
  y += 6;
  doc.setFont(undefined,'bold');
  doc.text(`${lugar || ''} ${formatDate(fecha)}`, 105, y, { align:'center' });

  // Firma
  y += 25;
  doc.setFont(undefined,'normal');
  doc.line(35, y, 95, y);
  doc.line(115, y, 175, y);
  doc.text('Firma Prestamista', 65, y + 6, { align:'center' });
  doc.text('Firma Deudor', 145, y + 6, { align:'center' });

  doc.save(`Contrato_Prestamo_${prestamo?.id || ''}.pdf`);
}

export async function exportReciboPagoFormatoPDF({ pago, cliente, prestamo, receptor, metodo = 'Efectivo' }) {
  const jsPDF = await getJsPdf();
  const doc = new jsPDF('p','mm','a4');

  const formatDate = (d) => new Date(d).toLocaleDateString('es-ES');
  const moneda = (v) => formatCurrency(v);

  // Encabezado
  doc.setFontSize(22); doc.setFont(undefined,'bold');
  doc.setTextColor(0,102,204);
  doc.text('RECIBO DE PAGO', 20, 20);
  doc.setTextColor(0,0,0);
  doc.setFontSize(11); doc.setFont(undefined,'normal');
  doc.text(`Fecha: ${formatDate(pago?.fecha_pago)}`, 150, 20);
  doc.text(`No.: ${pago?.id || ''}`, 150, 27);

  // Cajas / líneas
  const x = 20, w = 170; let y = 35;
  const drawLine = () => { doc.setDrawColor(200); doc.line(x, y, x+w, y); y += 8; };

  doc.setFont(undefined,'bold'); doc.text('Recibí de:', x, y); doc.setFont(undefined,'normal');
  doc.text(`${cliente?.nombre || ''}`, x+30, y);
  drawLine();
  // DNI del pagador (cliente)
  doc.setFont(undefined,'bold'); doc.text('DNI:', x, y); doc.setFont(undefined,'normal');
  doc.text(`${cliente?.dni || '-'}`, x+30, y); drawLine();
  doc.setFont(undefined,'bold'); doc.text('Cantidad:', x, y); doc.setFont(undefined,'normal');
  const enLetras = numeroALetrasSimple(pago?.monto || 0);
  doc.text(`${enLetras} (${moneda(pago?.monto)})`, x+30, y); drawLine();
  doc.setFont(undefined,'bold'); doc.text('Concepto:', x, y); doc.setFont(undefined,'normal');
  const cuotaActual = prestamo?.cuotas_pagadas || 0;
  const cuotasTotales = prestamo?.cuotas_totales || 0;
  let concepto = 'Pago de Cuota';
  if (pago?.tipo_pago === 'total') {
    concepto = 'Pago Total del Préstamo';
  } else if (pago?.tipo_pago === 'parcial') {
    concepto = 'Pago Parcial';
  }
  if (pago?.notas) {
    const nota = String(pago.notas).trim();
    // Evitar repetir si la nota contiene ya el concepto base
    if (nota && !nota.toLowerCase().includes(concepto.toLowerCase())) {
      concepto += ` - ${nota}`;
    }
  }
  doc.text(concepto, x+30, y); drawLine();
  // Línea adicional mostrando el progreso de cuotas
  doc.setFont(undefined,'bold'); doc.text('Cuota:', x, y); doc.setFont(undefined,'normal');
  doc.text(`${cuotaActual}/${cuotasTotales}`, x+30, y); drawLine();

  doc.text('Forma de pago:', x + 95, 35);
  const yfp = 42;
  const check = (cx, cy, mark) => { doc.rect(cx, cy, 4, 4); if (mark) { doc.line(cx, cy, cx+4, cy+4); doc.line(cx+4, cy, cx, cy+4); } };
  check(145, yfp-4, metodo?.toLowerCase() === 'efectivo'); doc.text('Efectivo', 151, yfp);
  check(145, yfp+4, metodo?.toLowerCase() === 'cheque'); doc.text('Cheque', 151, yfp+8);
  check(145, yfp+12, metodo?.toLowerCase() === 'transferencia'); doc.text('Transferencia', 151, yfp+16);

  // Datos de quien recibe (sin firma)
  y += 20;
  doc.setFont(undefined,'bold');
  doc.text('Recibido por:', x, y); doc.setFont(undefined,'normal');
  doc.text(`${receptor?.nombre || ''}`, x+35, y);
  y += 8;
  doc.setFont(undefined,'bold'); doc.text('DNI:', x, y); doc.setFont(undefined,'normal');
  doc.text(`${receptor?.dni || '-'}`, x+35, y);

  doc.save(`Recibo_Pago_${pago?.id || ''}.pdf`);
}
