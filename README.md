# bbcode

Extensión de Visual Studio Code para dar soporte básico a archivos BBCode con resaltado de sintaxis y pares de caracteres automáticos.

## Características

- Resaltado de etiquetas BBCode, atributos y cierres usando el grammar `source.bbcode`.
- Registro de idioma `BBCode`/`bbcode` con extensión `.bbcode`.
- Pares automáticos para corchetes `[]` y comillas dobles, más bracket matching en los documentos.
- Configuración de lenguaje con soporte para plegado y comentarios estilo `//` o `/* */` cuando sea necesario.
- Vista previa en un panel lateral (botón en la barra del editor o `Ctrl/Cmd+K V`) que se actualiza mientras escribes y sigue al archivo `.bbcode` activo.
- Renderer compatible con el dialecto de XenForo/XDA:
  - Texto: `[B]`, `[I]`, `[U]`, `[S]`, `[SUB]`, `[SUP]`, `[COLOR]`, `[SIZE]` (escala 1–7), `[FONT]`, `[HIGHLIGHT]`.
  - Bloques: `[CENTER]`, `[LEFT]`, `[RIGHT]`, `[JUSTIFY]`, `[INDENT]`, `[HEADING]`, `[HR]`, `[QUOTE]` (con autor), `[SPOILER]` (con título), `[ISPOILER]`.
  - Listas: `[LIST]`, `[LIST=1]`, `[LIST=a]`, `[*]`, `[UL]`, `[OL]`, `[LI]`, con anidamiento.
  - Tablas: `[TABLE]`, `[TR]`, `[TD]`, `[TH]`.
  - Enlaces y medios: `[URL]`, `[EMAIL]`, `[IMG]` (también rutas relativas al archivo), `[MEDIA=youtube]`, `[YOUTUBE]`, `[MENTION]`, `[USER]`, `[ATTACH]`, autoenlazado de URLs.
  - Código: `[CODE]`, `[CODE=lang]`, `[PHP]`, `[HTML]`, `[ICODE]`, `[PLAIN]`.
  - Atributos con o sin comillas (`[SIZE="4"]`, `[URL='...']`), etiquetas desconocidas como texto y corrección de anidamientos cruzados.

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

- `bbcode.preview.mentionUrl`: URL para `[MENTION=id]`/`[USER=id]` (`{id}` se reemplaza). Por defecto apunta a los perfiles de XDA.

## Problemas conocidos

- No se han reportado problemas todavía. Si encuentras algo, abre un issue en el repositorio.

## Notas de versión

### 1.1.0

Nuevo renderer con parser real: soporta el BBCode de XDA (atributos con comillas, `[SIZE]` 1–7, listas anidadas, `[PLAIN]`, `[MENTION]`, `[SPOILER]`, tablas...) y la vista previa sigue al editor activo.

### 0.0.1

Versión inicial con soporte de lenguaje BBCode y resaltado de sintaxis.
