export default class PrecioPorductoGdeDTO {
    constructor({ precio, indicadorPrecioPorDefecto } = {}) {
        this.precio = precio;
        this.indicadorPrecioPorDefecto = indicadorPrecioPorDefecto;
    }
}