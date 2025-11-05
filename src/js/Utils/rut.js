// src/js/Utils/rut.js
export function limpiarRut(rut = '') {
    return String(rut)
        .replace(/[^0-9kK]/g, '')
        .toUpperCase();
}

export function calcularDv(num = '') {
    let suma = 0,
        multiplo = 2;
    for (let i = num.length - 1; i >= 0; i--) {
        suma += multiplo * parseInt(num.charAt(i), 10);
        multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }
    const resto = 11 - (suma % 11);
    if (resto === 11) return "0";
    if (resto === 10) return "K";
    return String(resto);
}

export function validarRut(rut = '') {
    const limpio = limpiarRut(rut);
    if (limpio.length < 2) return false;
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    return calcularDv(cuerpo) === dv;
}

export function formatearRut(rut = '') {
    const limpio = limpiarRut(rut);
    if (!limpio) return "";
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);

    let rev = cuerpo.split("").reverse().join("");
    let conPuntos = "";
    for (let i = 0; i < rev.length; i++) {
        conPuntos += rev[i] + (((i + 1) % 3 === 0 && i + 1 < rev.length) ? "." : "");
    }

    conPuntos = conPuntos.split("").reverse().join("");
    return `${conPuntos}-${dv}`;
}
