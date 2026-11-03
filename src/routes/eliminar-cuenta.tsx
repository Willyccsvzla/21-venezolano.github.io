import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/eliminar-cuenta")({
  head: () => ({ meta: [{ title: "Eliminar cuenta · 21 Venezolano" }] }),
  component: EliminarCuenta,
});

const MAIL = "mailto:willcontreras357@gmail.com?subject=Eliminar%20mi%20cuenta%20de%2021%20Venezolano&body=Quiero%20eliminar%20mi%20cuenta.%20Correo%20de%20la%20cuenta%3A%20";

function EliminarCuenta() {
  return (
    <LegalPage title="Eliminar tu cuenta de 21 Venezolano">
      <p>Puedes pedir que eliminemos tu cuenta de <b>21 Venezolano</b> (desarrollador: Willy Contreras) y todos sus datos cuando quieras.</p>
      <h2>Cómo pedirlo</h2>
      <ol>
        <li>Escribe a <a href={MAIL}>willcontreras357@gmail.com</a> con el asunto <b>"Eliminar mi cuenta de 21 Venezolano"</b>.</li>
        <li>Envíalo desde el correo con el que entras al juego (o indica ese correo y tu apodo), para que podamos verificar que la cuenta es tuya.</li>
        <li>Te confirmaremos por correo cuando la cuenta esté eliminada, en un plazo máximo de 30 días.</li>
      </ol>
      <p><a href={MAIL} style={{ display: "inline-block", padding: "10px 18px", background: "#d9b25a", color: "#111", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>Solicitar eliminación por correo</a></p>
      <h2>Qué se elimina</h2>
      <ul>
        <li>Tu cuenta y datos de inicio de sesión (nombre, correo, foto de perfil e identificador de Google).</li>
        <li>Tu perfil de juego: apodo, avatar, marcos, saldo de fichas y objetos virtuales, historial de partidas y posición en el ranking.</li>
        <li>Tus mensajes de chat en las mesas.</li>
      </ul>
      <h2>Qué se puede conservar</h2>
      <p>Registros técnicos de seguridad (por ejemplo, de errores o accesos) se borran automáticamente en un máximo de 90 días. Si en el futuro hubiera compras por Google Play, los comprobantes podrían conservarse el tiempo que exija la ley. Las fichas virtuales no tienen valor monetario y no se reembolsan al eliminar la cuenta.</p>
      <p>Más información en la <a href="/privacidad">política de privacidad</a>.</p>
    </LegalPage>
  );
}
