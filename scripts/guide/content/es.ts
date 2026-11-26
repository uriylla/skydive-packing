import type { GuideContent } from "../pdf";

const guide: GuideContent = {
  file: "guia-usuario.pdf",
  title: "Guía de uso · Plegados",
  subtitle: "Registro de plegados de paracaídas",
  footer: "Plegados · Guía de uso",
  pageOf: "{page} / {pages}",
  body: ({ fig, src, edition }) => `
<section class="cover">
  <div class="kicker">Saltamos</div>
  <h1>Guía de uso</h1>
  <div class="sub">Registro de plegados de paracaídas</div>
  <img src="${src("station-registered")}" alt="">
  <div class="edition">Edición de ${edition}</div>
</section>

<h1>Contenido</h1>
<ul class="toc">
  <li><a href="#intro">1. Antes de empezar</a>
    <ul><li><a href="#que-es">Qué es y quién lo usa</a></li><li><a href="#idioma">Idioma</a></li></ul></li>
  <li><a href="#plegadores">2. Para plegadores</a>
    <ul>
      <li><a href="#registrar">Registrar un plegado</a></li>
      <li><a href="#externo">Paracaídas que no está en el sistema</a></li>
      <li><a href="#errores">Mensajes de error</a></li>
      <li><a href="#sin-conexion">Sin conexión</a></li>
      <li><a href="#pin">PIN</a></li>
      <li><a href="#movil">En el móvil o la tablet</a></li>
    </ul></li>
  <li><a href="#responsables">3. Para responsables</a>
    <ul>
      <li><a href="#entrar">Entrar y salir</a></li>
      <li><a href="#autorizar">Autorizar un dispositivo</a></li>
      <li><a href="#jornadas">Jornadas</a></li>
      <li><a href="#historial">Historial</a></li>
      <li><a href="#corregir">Corregir o anular un plegado</a></li>
      <li><a href="#paracaidas">Paracaídas</a></li>
      <li><a href="#personas">Plegadores y responsables</a></li>
      <li><a href="#dispositivos">Dispositivos</a></li>
    </ul></li>
  <li><a href="#faq">4. Preguntas frecuentes</a></li>
</ul>

<h1 class="chapter" id="intro"><small>Capítulo 1</small>Antes de empezar</h1>

<h2 id="que-es">Qué es y quién lo usa</h2>
<p><b>Plegados</b> registra quién ha plegado cada paracaídas y cuándo. Cada plegado guarda la hora, el plegador, el paracaídas y su tipo (<b>Tándem</b> o <b>Normal</b>). Con eso, los responsables pueden ver el trabajo de cada jornada y sacar totales por persona, paracaídas o tipo.</p>
<ul>
  <li><b>Plegadores:</b> registran sus plegados desde el PC o la tablet de la zona de plegado. No necesitan usuario ni contraseña.</li>
  <li><b>Responsables:</b> entran con usuario y contraseña para gestionar paracaídas, personas y dispositivos, revisar las jornadas y corregir errores. También pueden plegar.</li>
</ul>
<p>Solo los <b>dispositivos autorizados</b> por un responsable pueden registrar plegados. Así nadie puede registrar desde fuera del aeródromo.</p>

<div class="tip"><b>Cómo leer las capturas</b>En las capturas de esta guía, un recuadro naranja señala el botón o el mensaje del que se habla.</div>

<h2 id="idioma">Idioma</h2>
<p>La aplicación está en <b>español, inglés y catalán</b>. Cambia el idioma con <span class="ui">ES · EN · CA</span>, arriba a la derecha.</p>
${fig("language", "La barra superior. El idioma activo aparece resaltado a la derecha.")}
<p>Cada dispositivo recuerda su idioma, así que el PC de la zona de plegado puede seguir en español aunque tú uses otro en tu móvil. La primera vez se usa el idioma del navegador.</p>

<h1 class="chapter" id="plegadores"><small>Capítulo 2</small>Para plegadores</h1>

<h2 id="registrar">Registrar un plegado</h2>
<ol>
  <li>En la pantalla <span class="ui">Registrar</span>, toca <b>tu nombre</b>. El dispositivo lo recuerda, así que solo lo haces una vez.</li>
  <li>Escribe el <b>número del paracaídas</b> (por ejemplo <code>23</code> o <code>023</code>; los ceros a la izquierda dan igual) y pulsa <span class="ui">Registrar</span> o Intro.</li>
  <li>Aparece un <b>mensaje verde</b> con la hora, tu nombre, el paracaídas y el tipo.</li>
</ol>
${fig("station-select", "Toca tu nombre. Al tocarlo se marca en azul, como en la figura siguiente.")}
${fig("station-registered", "El plegado queda registrado y aparece en el resumen del día, a la derecha.")}
<p>A la derecha ves el <b>resumen del día</b>: el total, cuántos lleva cada plegador (tándem y normales) y los últimos plegados.</p>
<div class="tip"><b>¿Cambia el plegador?</b>Toca otro nombre antes de registrar. Fíjate en «Registrando como…», debajo del número.</div>

<h2 id="externo">Paracaídas que no está en el sistema</h2>
<p>Para equipos de clientes o de visitantes que no están dados de alta:</p>
<ol>
  <li>Toca <span class="ui">¿No está registrado? Paracaídas externo</span>.</li>
  <li>Elige <span class="ui">Tándem</span> o <span class="ui">Normal</span>.</li>
  <li>Escribe una descripción corta que lo identifique, por ejemplo <code>Pedro – Javelin azul</code>.</li>
  <li>Pulsa <span class="ui">Registrar externo</span>.</li>
</ol>
${fig("station-external", "Registro de un paracaídas externo.")}

<h2 id="errores">Mensajes de error</h2>
${fig("station-error", "Si el número no existe, el mensaje aparece en rojo y no se registra nada.")}
<table class="qa">
  <tr><td>«No existe el paracaídas…»</td><td>Revisa el número. Si es un equipo que no está dado de alta, usa <i>Paracaídas externo</i>.</td></tr>
  <tr><td>«Fuera de servicio» o «dado de baja»</td><td>Ese paracaídas no se puede usar. Avisa a un responsable.</td></tr>
  <tr><td>«Dispositivo no autorizado»</td><td>Este PC o tablet no puede registrar. Un responsable tiene que autorizarlo (ver <a href="#autorizar">Autorizar un dispositivo</a>).</td></tr>
  <tr><td>¿Te has equivocado?</td><td>Díselo a un responsable: puede corregir o anular el plegado.</td></tr>
</table>

<h2 id="sin-conexion">Sin conexión</h2>
<p>Si se cae la conexión, <b>sigue registrando con normalidad</b>. El plegado se guarda en el dispositivo con su hora real y se envía solo cuando vuelve la conexión. Mientras tanto verás un aviso amarillo y el número de plegados pendientes.</p>
${fig("station-offline", "Plegado guardado sin conexión, pendiente de enviar.")}
<div class="warn"><b>Importante</b>No cierres el navegador ni borres sus datos hasta que desaparezca el aviso de plegados pendientes. Cuando se envían, el aviso desaparece solo.</div>

<h2 id="pin">PIN</h2>
<p>Si el aeródromo usa PIN, al tocar tu nombre te lo pedirá antes de registrar. El dispositivo lo recuerda durante un tiempo. Si no tienes PIN o no lo recuerdas, pídeselo a un responsable.</p>

<h2 id="movil">En el móvil o la tablet</h2>
${fig("station-phone", "La pantalla de registro en un móvil.", { width: "52mm", float: true })}
<p>La pantalla de registro se adapta a móviles y tablets: los botones de nombre son grandes y el resumen del día aparece debajo.</p>
<p>Igual que el PC, el móvil o la tablet tiene que estar <b>autorizado</b> por un responsable antes de registrar.</p>
<p>Consejo: añade la página a la pantalla de inicio para abrirla como una aplicación.</p>
<div class="clear"></div>

<h1 class="chapter" id="responsables"><small>Capítulo 3</small>Para responsables</h1>

<h2 id="entrar">Entrar y salir</h2>
<p>Pulsa <span class="ui">Entrar</span> (arriba a la derecha) e introduce tu usuario y contraseña. Al entrar aparecen en la barra superior las secciones de gestión: <span class="ui">Jornadas</span>, <span class="ui">Historial</span>, <span class="ui">Paracaídas</span>, <span class="ui">Plegadores</span> y <span class="ui">Dispositivos</span>.</p>
${fig("login", "Acceso de responsables.")}
<ul>
  <li>Tras varios intentos fallidos, la cuenta se bloquea unos minutos.</li>
  <li>La sesión dura 12 horas. Cuando termines en un dispositivo compartido, pulsa <span class="ui">Salir</span>.</li>
  <li>Para cambiar tu contraseña: <span class="ui">Plegadores</span> → tu nombre → <span class="ui">Editar</span>.</li>
</ul>

<h2 id="autorizar">Autorizar un dispositivo</h2>
<p>Hazlo una vez en cada PC, tablet o móvil desde el que se vaya a registrar:</p>
<ol>
  <li>En el dispositivo nuevo, abre la aplicación. Verás «Dispositivo no autorizado».</li>
  <li>Pulsa <span class="ui">Autorizar este dispositivo</span> y entra como responsable.</li>
  <li>Ponle un nombre que lo identifique, por ejemplo «PC zona de plegado», y pulsa <span class="ui">Autorizar este dispositivo</span>.</li>
  <li>Pulsa <span class="ui">Salir</span>, para que los plegadores no tengan acceso de responsable. El dispositivo sigue autorizado.</li>
</ol>
<div class="two">
${fig("station-unauthorized", "Un dispositivo sin autorizar.")}
${fig("setup", "Ponle nombre y autorízalo.")}
</div>
<p>La autorización dura 90 días; después hay que repetir estos pasos. También termina si la revocas en <a href="#dispositivos">Dispositivos</a>.</p>

<h2 id="jornadas">Jornadas</h2>
<p><span class="ui">Jornadas</span> muestra cada día con plegados: el total (tándem y normales), cuántos plegadores y paracaídas hubo y la hora del primer y el último plegado. Una jornada se crea sola con su primer plegado.</p>
${fig("days", "Lista de jornadas.")}
<p>Abre un día para ver todos sus plegados y el <b>total por plegador</b>. <span class="ui">Filtrar en el historial</span> abre el historial con esa jornada ya seleccionada.</p>
${fig("day", "Detalle de una jornada, con el total por plegador arriba.")}

<h2 id="historial">Historial</h2>
<p><span class="ui">Historial</span> muestra todos los plegados. Puedes filtrar por:</p>
<ul>
  <li><b>fechas</b> (desde/hasta; un solo día es una jornada),</li>
  <li><b>franja horaria</b>,</li>
  <li><b>plegador</b>,</li>
  <li><b>paracaídas</b>, incluidos los <b>externos</b>,</li>
  <li><b>tipo</b> (tándem o normal).</li>
</ul>
<p>Encima de la tabla aparece el <b>total filtrado</b>, separado por tipo. Por ejemplo, para saber los tándem de Carlos este mes, elige desde el día 1 hasta hoy, Carlos y Tándem, y pulsa <span class="ui">Filtrar</span>:</p>
${fig("history", "Tándem de Carlos en el mes: el total aparece encima de la tabla.")}
<div class="tip"><b>Atajos</b><span class="ui">Hoy</span> muestra el día actual y <span class="ui">Quitar filtros</span> vuelve a mostrarlo todo. La dirección de la página guarda los filtros, así que puedes añadirla a favoritos o enviarla a otro responsable.</div>

<h2 id="corregir">Corregir o anular un plegado</h2>
<p>En cualquier tabla de plegados, pulsa <span class="ui">Corregir</span> en la fila. Se abre el detalle del plegado con dos opciones:</p>
<ul>
  <li><b>Corregir:</b> cambia el plegador, el paracaídas (registrado o externo) o el tipo. Se mantiene la hora y queda constancia del registro original.</li>
  <li><b>Anular:</b> para un plegado que no debía registrarse, por ejemplo uno duplicado. Indica el motivo. Deja de contar en los totales, pero sigue visible tachado en el historial. Se puede deshacer.</li>
</ul>
${fig("pack", "Detalle de un plegado: corregir a la izquierda, anular a la derecha.")}
<p>Para ver los plegados anulados en el historial, marca <span class="ui">Incluir anulados</span>. Aparecen tachados, con el motivo:</p>
${fig("history-voided", "Un plegado anulado en el historial.")}

<h2 id="paracaidas">Paracaídas</h2>
<p>En <span class="ui">Paracaídas</span> ves todos los equipos con su tipo, estado, número de plegados y la fecha del último. Puedes buscar por número, modelo, número de serie o propietario, y filtrar por tipo y estado.</p>
${fig("parachutes", "Lista de paracaídas.")}
<h3>Dar de alta un paracaídas</h3>
<p>Pulsa <span class="ui">+ Nuevo paracaídas</span>. El <b>número</b> (el que va pintado en el equipo) y el <b>tipo</b> son obligatorios; el resto (modelo, número de serie, propietario, observaciones) es opcional.</p>
${fig("parachute-new", "Alta de un paracaídas.")}
<h3>Estados</h3>
<table class="qa">
  <tr><td>Activo</td><td>Se puede registrar normalmente.</td></tr>
  <tr><td>En mantenimiento</td><td>Para avisar de que está en revisión. Se puede seguir registrando.</td></tr>
  <tr><td>Fuera de servicio</td><td>No se puede registrar: la pantalla de registro lo rechaza.</td></tr>
  <tr><td>Dado de baja</td><td>Ya no se usa. Desaparece de la lista (marca <span class="ui">Ver dados de baja</span> para verlo) y no se puede registrar. Su historial se conserva y se puede reactivar.</td></tr>
</table>
<p>Abre un paracaídas para ver sus datos y su <b>historial de plegados</b>, o para <span class="ui">Editar</span> y <span class="ui">Dar de baja</span>.</p>
${fig("parachute", "Ficha de un paracaídas con su historial.")}
<div class="tip"><b>El tipo se guarda con cada plegado</b>Si cambias el tipo de un paracaídas, los plegados anteriores conservan el tipo que tenían al registrarlos.</div>

<h2 id="personas">Plegadores y responsables</h2>
<p>En <span class="ui">Plegadores</span> están todas las personas que registran plegados, con su rol, si tienen PIN, cuántos plegados llevan y el último.</p>
${fig("packers", "Lista de plegadores.")}
<ul>
  <li><span class="ui">+ Nueva persona</span>: añade un plegador o un responsable. Los responsables necesitan <b>usuario</b> y <b>contraseña</b> (mínimo 8 caracteres).</li>
  <li><b>PIN:</b> en la ficha de cada persona puedes asignar, cambiar o quitar su PIN (de 4 a 8 cifras).</li>
  <li><span class="ui">Desactivar</span>: para quien ya no pliega. Deja de aparecer en la pantalla de registro (y, si es responsable, ya no puede entrar), pero su historial se conserva. Se puede reactivar.</li>
</ul>
${fig("packer", "Ficha de un plegador: PIN e historial de plegados.")}
<div class="tip"><b>Siempre hay un responsable</b>La aplicación no deja desactivar ni quitar el rol al último responsable activo, ni que te desactives a ti mismo.</div>

<h2 id="dispositivos">Dispositivos</h2>
<p><span class="ui">Dispositivos</span> lista los dispositivos autorizados, quién los autorizó y cuándo se usaron por última vez. El dispositivo desde el que miras aparece marcado como «Este dispositivo».</p>
${fig("stations", "Dispositivos autorizados.")}
<p>Si un dispositivo se pierde, se lo roban o deja de usarse, pulsa <span class="ui">Revocar</span>. Deja de poder registrar en el momento.</p>

<h1 class="chapter" id="faq"><small>Capítulo 4</small>Preguntas frecuentes</h1>
<table class="qa">
  <tr><td>He registrado un plegado con el nombre de otro.</td><td>Un responsable puede <a href="#corregir">corregirlo</a> y cambiar el plegador. La hora se mantiene.</td></tr>
  <tr><td>He registrado el mismo plegado dos veces.</td><td>Un responsable puede <a href="#corregir">anular</a> el duplicado con el motivo «Registrado dos veces».</td></tr>
  <tr><td>Un paracaídas nuevo no aparece.</td><td>Hay que darlo de alta en <a href="#paracaidas">Paracaídas</a>. Mientras tanto, regístralo como <a href="#externo">externo</a>.</td></tr>
  <tr><td>Un plegador nuevo no aparece en la pantalla de registro.</td><td>Hay que añadirlo en <a href="#personas">Plegadores</a>. Recarga la página de registro después.</td></tr>
  <tr><td>La pantalla dice «Dispositivo no autorizado».</td><td>La autorización caduca a los 90 días, o se ha revocado. Vuelve a <a href="#autorizar">autorizarlo</a>.</td></tr>
  <tr><td>Se ha ido la conexión.</td><td>Sigue registrando. Los plegados se envían solos al volver la conexión (ver <a href="#sin-conexion">Sin conexión</a>).</td></tr>
  <tr><td>¿A qué jornada cuenta un plegado?</td><td>Al día en que se registró, en hora de España.</td></tr>
  <tr><td>He olvidado mi contraseña de responsable.</td><td>Otro responsable puede ponerte una nueva desde <span class="ui">Plegadores</span> → tu nombre → <span class="ui">Editar</span>.</td></tr>
</table>
`,
};

export default guide;
