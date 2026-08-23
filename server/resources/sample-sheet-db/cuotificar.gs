function procesarDatos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojaOrigen = ss.getSheetByName("expenses");
  var hojaDestino = ss.getSheetByName("expenses_by_installments");
  var hojaCambio = ss.getSheetByName("exchange");

  // 1. CARGAR COTIZACIONES
  var ultimaFilaCambio = hojaCambio.getLastRow();
  var mapaCambio = {};
  if (ultimaFilaCambio >= 2) {
    var datosCambio = hojaCambio.getRange(2, 1, ultimaFilaCambio - 1, 3).getValues();
    datosCambio.forEach(function(fila) {
      if (!fila[0]) return;
      var clave = normalizarClave(fila[0]); 
      mapaCambio[clave] = { usd: parseFloat(fila[1]), eur: parseFloat(fila[2]) };
    });
  }

  // 2. OBTENER ORIGEN
  var ultimaFila = hojaOrigen.getLastRow();
  if (ultimaFila < 2) return; 
  var datos = hojaOrigen.getRange(2, 1, ultimaFila - 1, 10).getValues();

  // 3. PREPARAR DESTINO
  hojaDestino.clear();
  var encabezados = [
    "ID", "PERÍODO", "PERIODO_ORIGEN", "CATEGORÍA", "MONTO CUOTA", 
    "CUOTAS", "MONEDA", "COMENTARIO", "INGRESO/EGRESO", "COMPARTIDO", 
    "USUARIO", "USD (MES CUOTA)", "USD (ORIGEN)", "MES-AÑO"
  ];
  hojaDestino.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);

  var nuevosDatos = [];

  // 4. PROCESAR TRANSACCIONES
  for (var i = 0; i < datos.length; i++) {
    var id = datos[i][0];
    var fechaBase = forzarFecha(datos[i][1]);
    
    var cuotas = (parseInt(datos[i][4]) > 0) ? parseInt(datos[i][4]) : 1;
    var montoCuotaLocal = parseFloat(datos[i][3]) / cuotas;
    var moneda = datos[i][5].toString().toUpperCase().trim();
    var claveOrigen = normalizarClave(fechaBase);

    // Extraemos los componentes originales para evitar errores de referencia
    var d = fechaBase.getDate();
    var m = fechaBase.getMonth();
    var y = fechaBase.getFullYear();

    for (var j = 0; j < cuotas; j++) {
      // LÓGICA DE DESBORDAMIENTO: 31/8 + 1 mes -> 31/9 -> 1/10
      var fechaCuota = new Date(y, m + j, d);
      
      var mesStr = ("0" + (fechaCuota.getMonth() + 1)).slice(-2);
      var mesAnioString = mesStr + "-" + fechaCuota.getFullYear();

      var claveCuota = normalizarClave(fechaCuota);
      var usdMesCuota = calcularUSD(montoCuotaLocal, moneda, claveCuota, mapaCambio);
      var usdOrigen   = calcularUSD(montoCuotaLocal, moneda, claveOrigen, mapaCambio);

      nuevosDatos.push([
        id, 
        fechaCuota, 
        fechaBase, 
        datos[i][2], 
        montoCuotaLocal, 
        cuotas, 
        moneda, 
        datos[i][6], 
        datos[i][7], 
        datos[i][8], 
        datos[i][9], 
        usdMesCuota, 
        usdOrigen,
        mesAnioString
      ]);
    }
  }

  // 5. VOLCAR Y FORMATEAR
  if (nuevosDatos.length > 0) {
    hojaDestino.getRange(2, 1, nuevosDatos.length, nuevosDatos[0].length).setValues(nuevosDatos);
    
    // B (PERÍODO) y C (PERIODO_ORIGEN) como fecha
    hojaDestino.getRange(2, 2, nuevosDatos.length, 2).setNumberFormat("yyyy-mm-dd");
    // E (MONTO CUOTA)
    hojaDestino.getRange(2, 5, nuevosDatos.length, 1).setNumberFormat("#,##0.00");
    // L y M (USDs)
    hojaDestino.getRange(2, 12, nuevosDatos.length, 2).setNumberFormat("$#,##0.00");
    // N (MES-AÑO) como texto
    hojaDestino.getRange(2, 14, nuevosDatos.length, 1).setNumberFormat("@");
  }
}

function forzarFecha(valor) {
  if (valor instanceof Date) return valor;
  var s = valor.toString().trim().split(" ")[0];
  var partes = s.split(/[-/]/);
  
  if (partes.length === 3) {
    if (partes[0].length === 4) { // YYYY-MM-DD
      return new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    } else { // DD-MM-YYYY
      return new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
    }
  }
  var d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Esta función toma cualquier entrada (Fecha, Texto 2026-01, etc) 
 * y devuelve siempre el formato estrictamente "2026-01"
 */
function normalizarClave(valor) {
  if (valor instanceof Date) {
    var y = valor.getFullYear();
    var m = ("0" + (valor.getMonth() + 1)).slice(-2);
    return y + "-" + m;
  }
  // Si es texto tipo "2/2/2026" o "2026-01"
  var s = valor.toString();
  if (s.includes("-")) {
    var p = s.split("-");
    var anio = p[0].trim();
    var mes = ("0" + p[1].trim()).slice(-2);
    return anio + "-" + mes.substring(0, 2);
  }
  // Fallback para fechas de sistema
  var d = new Date(valor);
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2);
}

function calcularUSD(monto, moneda, clave, mapa) {
  if (moneda === "USD") return monto;
  if (!mapa[clave]) {
    // Intenta buscar el último disponible si el mes actual falla
    var keys = Object.keys(mapa).sort();
    if (keys.length > 0) {
      var ultima = keys[keys.length - 1];
      var tasas = mapa[ultima];
    } else {
      return 0;
    }
  } else {
    var tasas = mapa[clave];
  }
  
  if (moneda === "ARS") return monto / tasas.usd;
  if (moneda === "EUR") return monto / tasas.eur;
  return 0;
}

/**
 * EL FILTRO: Esta función es la que debes conectar al Activador
 */
function onChange(e) {  
  var nombreHoja = e.source.getActiveSheet().getName();
  
  // AQUÍ FILTRAMOS: Solo si el cambio es en 'expenses'
  if (nombreHoja === "expenses") {
    procesarDatos();
  }
}