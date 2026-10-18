# bbcode

Soporte BBCode para VS Code: vista previa compatible con XDA/XenForo y phpBB, avisos de etiquetas mal cerradas, autocompletado, atajos de formato y snippets.

## Características

- Resaltado de sintaxis: etiquetas y atributos, texto en negrita, cursiva, subrayado y tachado, URLs, y `[CODE=bash|java|c|xml…]` con el resaltado del lenguaje. Lo que va dentro de `[CODE]` y `[PLAIN]` no se colorea como BBCode.
- Registro de idioma `BBCode`/`bbcode` con extensión `.bbcode`.
- Pares automáticos para corchetes `[]` y comillas dobles, más bracket matching en los documentos.
- Vista previa con **apariencia de XDA Forums**: título del hilo, tarjeta del post con la columna del usuario, y citas, código, spoilers y tablas con los colores reales de los temas **XDA Dark**, **XDA Theme** (claro) y **XDA Classic**. El botón 🎨 de la vista previa cambia de estilo.
- Vista previa en un panel lateral (botón en la barra del editor o `Ctrl/Cmd+K V`) que se actualiza mientras escribes, sigue al archivo `.bbcode` activo y **sincroniza el scroll** con el editor. Doble clic en la vista previa salta a esa línea.
- Renderer compatible con el dialecto de XenForo/XDA:
  - Texto: `[B]`, `[I]`, `[U]`, `[S]`, `[SUB]`, `[SUP]`, `[COLOR]`, `[SIZE]` (escala 1–7), `[FONT]`, `[HIGHLIGHT]`.
  - Bloques: `[CENTER]`, `[LEFT]`, `[RIGHT]`, `[JUSTIFY]`, `[INDENT]`, `[HEADING]`, `[HR]`, `[QUOTE]` (con autor), `[SPOILER]` (con título), `[ISPOILER]`.
  - Listas: `[LIST]`, `[LIST=1]`, `[LIST=a]`, `[*]`, `[UL]`, `[OL]`, `[LI]`, con anidamiento.
  - Tablas: `[TABLE]`, `[TR]`, `[TD]`, `[TH]`.
  - Enlaces y medios: `[URL]`, `[EMAIL]`, `[IMG]` (también rutas relativas al archivo), `[MEDIA=youtube]`, `[YOUTUBE]`, `[MENTION]`, `[USER]`, `[ATTACH]`, autoenlazado de URLs.
  - Código: `[CODE]`, `[CODE=lang]`, `[PHP]`, `[HTML]`, `[ICODE]`, `[PLAIN]`.
  - Atributos con o sin comillas (`[SIZE="4"]`, `[URL='...']`), etiquetas desconocidas como texto y corrección de anidamientos cruzados.

### Escritura

- **Avisos de errores**: subraya las etiquetas sin cerrar, los cierres sin apertura (`[/LIST]` de más), los anidamientos cruzados (`[SIZE][CENTER]…[/SIZE]`) y los `[*]` fuera de una lista.
- **Autocierre**: al escribir `[/` se completa la última etiqueta abierta.
- **Atajos de formato** (sobre la selección; si ya tiene la etiqueta, la quita):

  | Atajo | Acción |
  | --- | --- |
  | `Cmd/Ctrl+B` | `[B]…[/B]` |
  | `Cmd/Ctrl+I` | `[I]…[/I]` |
  | `Cmd/Ctrl+U` | `[U]…[/U]` |
  | `Cmd/Ctrl+Alt+K` | `[URL=…]…[/URL]` |
  | `Cmd/Ctrl+K V` | Vista previa |

- **Autocompletado**: al escribir `[` se sugieren las etiquetas con sus opciones (colores, tamaños 1–7, tipos de lista, lenguajes de código...).
- **Snippets de XDA**: escribe `xda-` para ver las plantillas: `xda-header`, `xda-section`, `xda-features`, `xda-requirements`, `xda-instructions`, `xda-downloads`, `xda-credits`, `xda-devdb`, `xda-spoiler`, `xda-screenshots`.

## Requisitos

- Visual Studio Code `^1.75.0`.

## Instalación

1. Abre el Marketplace de VS Code y busca `bbcode`.
2. Instala la extensión y recarga la ventana si es necesario.
3. Abre cualquier archivo con extensión `.bbcode` y debería detectarse automáticamente.

## Uso

- Crea o abre un archivo `.bbcode` para activar el resaltado.
- Presiona el botón **BBCode: Vista previa** en la barra del editor (o usa el comando con el mismo nombre) para abrir el panel de vista previa.
- Escribe tus etiquetas con atributos; la gramática reconoce aperturas, cierres y asignaciones para facilitar la lectura.
- Usa los pares automáticos para corchetes y comillas al escribir etiquetas.

## Configuración de la extensión

- `bbcode.validate` (`true`): muestra los avisos de etiquetas mal cerradas.
- `bbcode.autoCloseTags` (`true`): completa el cierre al escribir `[/`.
- `bbcode.tagCase` (`auto`): mayúsculas (`upper`, estilo XDA) o minúsculas (`lower`, estilo phpBB) en las etiquetas que inserta la extensión; `auto` usa el estilo que predomina en el documento.
- `bbcode.preview.theme` (`xda`): estilo de la vista previa: `xda` (oscuro o claro según VS Code), `xda-dark`, `xda-light`, `xda-classic` o `vscode` (solo el contenido con los colores del editor).
- `bbcode.preview.scrollPreviewWithEditor` y `bbcode.preview.scrollEditorWithPreview` (`true`): sincronizan el scroll en cada sentido.
- `bbcode.preview.xdaLineBreaks` (`true`): muestra los saltos como los deja el editor de XDA, donde una línea en blanco entre párrafos queda como un solo salto.
- `bbcode.preview.mentionUrl`: URL para `[MENTION=id]`/`[USER=id]` (`{id}` se reemplaza). Por defecto apunta a los perfiles de XDA.

## Problemas conocidos

- No se han reportado problemas todavía. Si encuentras algo, abre un issue en el repositorio.

## Notas de versión

### 1.2.0

Vista previa con apariencia de XDA (temas Dark, claro y Classic) y scroll sincronizado, nuevo resaltado de sintaxis, avisos de etiquetas mal cerradas, autocierre con `[/`, atajos `Cmd+B/I/U`, autocompletado de etiquetas y snippets de XDA.

### 1.1.0

Nuevo renderer con parser real: soporta el BBCode de XDA (atributos con comillas, `[SIZE]` 1–7, listas anidadas, `[PLAIN]`, `[MENTION]`, `[SPOILER]`, tablas...) y la vista previa sigue al editor activo.

### 0.0.1

Versión inicial con soporte de lenguaje BBCode y resaltado de sintaxis.
