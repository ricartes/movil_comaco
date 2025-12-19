function numPositivo(v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
}

export function getAnchoCamion(doc) {
    // legacy y nuevo: patenteCamion siempre es objeto (según tus ejemplos)
    return numPositivo(doc?.patenteCamion?.anchoCamion);
}

export function getAnchoCarro(doc) {
    const pc = doc?.patenteCarro;

    // legacy: string => no hay ancho
    if (!pc || typeof pc === "string") return null;

    // nuevo: objeto con anchoCarro
    return numPositivo(pc?.anchoCarro);
}

export function tieneCarro(doc) {
    // si viene string o objeto, consideramos que hay carro
    return !!doc?.patenteCarro;
}
