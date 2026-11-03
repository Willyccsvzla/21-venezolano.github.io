import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacidad")({
  head: () => ({ meta: [{ title: "Política de privacidad · 21 Venezolano" }] }),
  component: Privacidad,
});

function Privacidad() {
  return (
    <LegalPage title="Política de privacidad — 21 Venezolano">
      <p>Última actualización: 2 de noviembre de 2026. Responsable: Willy Contreras. Contacto: <a href="mailto:willcontreras357@gmail.com">willcontreras357@gmail.com</a>.</p>
      <h2>Datos que recogemos</h2>
      <ul>
        <li><b>Cuenta:</b> si entras con Google, tu nombre, correo electrónico, foto de perfil e identificador de cuenta de Google. Si te registras con correo, tu correo y una clave (guardada cifrada). La foto se muestra como tu avatar a los demás jugadores de la mesa.</li>
        <li><b>Perfil de juego:</b> apodo, avatar y marcos, saldo de fichas y objetos virtuales, partidas, historial de manos y posición en el ranking.</li>
        <li><b>Chat de la mesa:</b> los mensajes de texto que envías a los otros jugadores de tu mesa.</li>
        <li><b>Datos técnicos:</b> dirección IP, tipo de navegador o dispositivo y registros de error, para seguridad y para corregir fallos.</li>
      </ul>
      <h2>Fichas, compras y anuncios</h2>
      <p>Las fichas, monedas y objetos del juego son virtuales, <b>no tienen valor monetario</b> y no se pueden retirar ni cambiar por dinero. Actualmente el juego no muestra anuncios ni vende productos con dinero real. Si en el futuro se activan compras dentro de la app, se procesarán a través de Google Play: recibiremos solo un comprobante de compra, nunca los datos de tu tarjeta. Si se activan anuncios recompensados, Google AdMob podrá usar el identificador de publicidad de tu dispositivo según la <a href="https://policies.google.com/privacy">política de privacidad de Google</a>. Actualizaremos esta política antes de activarlos.</p>
      <h2>Para qué los usamos</h2>
      <p>Para operar el juego, mantener tu cuenta y tu saldo, mostrar el ranking, evitar trampas y abusos, y mejorar la app. No vendemos tus datos ni los usamos para publicidad personalizada.</p>
      <h2>Con quién los compartimos</h2>
      <p>Solo con los proveedores necesarios para prestar el servicio: Vercel (alojamiento), nuestro proveedor de base de datos y Google (inicio de sesión y, si se activan, Google Play y AdMob). Tu apodo, avatar, saldo en mesa, ranking y mensajes de chat son visibles para otros jugadores.</p>
      <h2>Conservación y borrado de la cuenta</h2>
      <p>Guardamos tus datos mientras tengas cuenta. Puedes pedir que borremos tu cuenta y todos tus datos en cualquier momento; ve a <a href="/eliminar-cuenta">Eliminar cuenta</a> o escribe a <a href="mailto:willcontreras357@gmail.com">willcontreras357@gmail.com</a>. Lo haremos en un plazo máximo de 30 días.</p>
      <h2>Seguridad</h2>
      <p>Las conexiones van cifradas (HTTPS) y las claves se guardan cifradas.</p>
      <h2>Menores</h2>
      <p>El juego no está dirigido a menores de 13 años y no recogemos a sabiendas datos de menores de esa edad.</p>
      <h2>Cambios</h2>
      <p>Si cambiamos esta política, actualizaremos la fecha de arriba.</p>
    </LegalPage>
  );
}
