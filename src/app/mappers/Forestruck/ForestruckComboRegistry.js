import { listarClientes } from "@/app/services/Parametros/ClienteService";
import { listarTransportistas } from "@/app/services/Parametros/TransportistaService";
import { listarTodosLosLargos } from "@/app/services/Parametros/ProductoService";

export const FORESTRUCK_COMBO_REGISTRY = {
    cliente: {
        title: "Cliente",
        placeholder: "Seleccione un Cliente",
        list: async () => await listarClientes(),
        value: (x) => x?.rutCliente ?? "",
        label: (x) => `${x?.rutCliente || ""} ${x?.razonSocialCliente || ""}`.trim(),
    },
    largo: {
        title: "largoProducto",
        placeholder: "Seleccione un Largo",
        list: async () => await listarTodosLosLargos(),
        value: (x) => x,
        label: (x) => `${x || ""}`.trim(),
    },

    transportista: {
        title: "Transportista",
        placeholder: "Seleccione un Transportista",
        list: async () => await listarTransportistas(),
        value: (x) => x?.rutTransportista ?? "",
        label: (x) => `${x?.rutTransportista || ""} ${x?.nomTransportista || ""}`.trim(),
    },
};
