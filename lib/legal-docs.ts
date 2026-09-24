import { LEGAL } from "@/lib/legal";
import { LICENSE_VERSION, TERMS_VERSION } from "@/lib/commerce";

export const LEGAL_DOCS = {
  terms: {
    title: "Condiciones de contratación",
    eyebrow: "Compra y suscripciones",
    sections: [
      ["Cuenta y contratación", "Para comprar o suscribirse es necesario acceder mediante una cuenta asociada a una dirección de correo electrónico. El pago se procesa mediante Stripe."],
      ["Compra única", "La compra única concede una licencia sobre el Design ID concreto generado y pagado. No supone la adquisición de derechos sobre otros diseños ni sobre los modelos base de la plataforma."],
      ["Suscripciones", "Los planes Maker y Commercial conceden los derechos descritos para su nivel mientras el entitlement correspondiente permanezca activo. La cancelación, impago, reembolso o disputa puede suspender el acceso cuando proceda."],
      ["Contenido digital", "Cuando la entrega digital se habilita inmediatamente tras el pago, el flujo comercial debe recoger el consentimiento aplicable para iniciar la ejecución sin demora, conforme a la jurisdicción del comprador."],
      ["Licencia", "Cada paquete descargado incluye LICENSE.txt. Versión de licencia " + LICENSE_VERSION + ". Queda prohibida la redistribución o reventa del archivo STL, manifiesto o geometría digital sustancialmente equivalente salvo autorización expresa."],
      ["Fabricación y seguridad", "El usuario debe comprobar dimensiones, tolerancias, material, orientación, resistencia y parámetros de fabricación. Teknovashop Forge no certifica una pieza para aplicaciones críticas, estructurales o de seguridad."],
      ["Versión contractual", "Estas condiciones corresponden a la versión " + TERMS_VERSION + "."],
    ],
  },
  privacy: {
    title: "Política de privacidad",
    eyebrow: "Protección de datos",
    sections: [
      ["Responsable", "Responsable: " + LEGAL.operator + ", NIF/CIF " + LEGAL.taxId + ", domicilio " + LEGAL.address + ", contacto " + LEGAL.email + "."],
      ["Datos tratados", "Podemos tratar identificadores de cuenta, correo electrónico, datos de contratación, referencias de Stripe, Design IDs, entitlements, eventos de descarga y parámetros técnicos necesarios para prestar el servicio."],
      ["Finalidades", "Los datos se utilizan para autenticar usuarios, gestionar compras y suscripciones, entregar archivos autorizados, prevenir fraude, mantener trazabilidad y atender incidencias."],
      ["Proveedores", "La prestación técnica puede implicar proveedores de alojamiento, base de datos, almacenamiento, autenticación y pagos, entre ellos Vercel, Supabase, Render y Stripe, según la configuración efectiva del servicio."],
      ["Derechos", "Las solicitudes relacionadas con protección de datos pueden dirigirse a " + LEGAL.email + "."],
      ["Seguridad", "Los archivos finales se almacenan de forma privada y las descargas se autorizan en servidor mediante la cuenta y licencia aplicables."],
    ],
  },
  refunds: {
    title: "Reembolsos y cancelaciones",
    eyebrow: "Compras digitales",
    sections: [
      ["Compra única", "Si existe un fallo técnico atribuible al servicio que impida obtener el paquete adquirido y no pueda resolverse razonablemente, el usuario puede contactar con " + LEGAL.email + " aportando la referencia de pago y el Design ID."],
      ["Suscripciones", "La cancelación evita renovaciones futuras conforme a las condiciones del plan. La mera cancelación no implica por sí sola el reembolso de periodos ya cobrados, sin perjuicio de los derechos irrenunciables que correspondan."],
      ["Reembolsos y acceso", "Un reembolso completo o una disputa de pago puede desactivar la licencia o entitlement asociado. Si una disputa se resuelve a favor del comercio y el pago sigue vigente, el acceso puede restaurarse."],
    ],
  },
  license: {
    title: "Licencia de diseños digitales",
    eyebrow: "Uso permitido",
    sections: [
      ["Compra única", "Permite usar y modificar el diseño concreto adquirido para uso personal y no comercial, salvo que se indique expresamente otro nivel de licencia."],
      ["Maker", "Permite uso personal, educativo y maker no comercial de los diseños cubiertos mientras el entitlement correspondiente esté vigente."],
      ["Commercial", "Permite utilizar los diseños cubiertos para fabricar objetos físicos destinados a venta mientras el entitlement Commercial esté vigente."],
      ["Restricciones", "No se permite vender, sublicenciar, publicar, compartir o redistribuir los archivos STL, manifiestos, geometría fuente o archivos digitales sustancialmente equivalentes. La autorización para vender objetos físicos no implica autorización para redistribuir archivos digitales."],
    ],
  },
} as const;

export type LegalDocumentKey = keyof typeof LEGAL_DOCS;
