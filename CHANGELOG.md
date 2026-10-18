# Change Log

All notable changes to the "bbcode" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [1.3.0]
- Vista previa con apariencia de XDA Forums: encabezado del hilo, post con columna de usuario y estilos de XenForo con los colores reales de XDA Dark, XDA Theme (claro) y XDA Classic. Botón para cambiar de estilo y ajuste `bbcode.preview.theme`.
- Saltos de línea como los deja el editor de XDA (`bbcode.preview.xdaLineBreaks`), y sin saltos extra después de bloques anidados ni al final del post.
- Scroll sincronizado entre el editor y la vista previa, en los dos sentidos (`bbcode.preview.scrollPreviewWithEditor` y `bbcode.preview.scrollEditorWithPreview`). Doble clic en la vista previa salta a esa línea del editor.
- La vista previa ya no vuelve al inicio con cada cambio: solo se reemplaza el contenido y se mantiene la posición.
- Nuevo resaltado de sintaxis:
  - Solo se colorean las etiquetas conocidas, así `[ROM][UNOFFICIAL]` queda como texto.
  - El contenido de `[CODE]`, `[ICODE]` y `[PLAIN]` no se colorea como BBCode; `[CODE=bash]`, `java`, `c`, `cpp`, `js`, `python`, `xml`, `json`, `diff`, `makefile` e `ini` usan el resaltado de ese lenguaje.
  - El texto dentro de `[B]`, `[I]`, `[U]` y `[S]` se muestra en negrita, cursiva, subrayado y tachado.
  - Las URLs (en `[URL]`, `[IMG]`, `[URL=...]` y sueltas en el texto) se resaltan como enlaces.
- Esquema del post en la vista *Outline* y en la barra de navegación: títulos de sección (`[SIZE=4..7]`, `[HEADING]`, `[B][U]…[/U][/B]`, `[B]Texto:[/B]`) y spoilers, anidados por nivel.
- Plegado de `[QUOTE]`, `[SPOILER]`, `[CODE]`, `[LIST]`, `[TABLE]`, `[CENTER]`… cuando ocupan varias líneas, y de cada sección del post.
- La vista previa se vuelve a abrir al reiniciar VS Code, en el mismo archivo y posición.
- Comandos **BBCode: Copiar como HTML** y **BBCode: Exportar a HTML…** (también en el menú contextual del editor). La exportación es una página completa con el estilo de XDA elegido.

## [1.2.0]
- Avisos (diagnósticos) de etiquetas sin cerrar, cierres sin apertura, anidamientos cruzados y `[*]` fuera de listas. Ajuste `bbcode.validate`.
- Autocierre de la última etiqueta abierta al escribir `[/`. Ajuste `bbcode.autoCloseTags`.
- Atajos `Cmd/Ctrl+B`, `Cmd/Ctrl+I`, `Cmd/Ctrl+U` (ponen o quitan la etiqueta) y `Cmd/Ctrl+Alt+K` (enlace).
- Autocompletado de etiquetas al escribir `[`, con opciones para color, tamaño, listas y código.
- Snippets de plantillas de XDA (`xda-header`, `xda-devdb`, `xda-instructions`...).
- Ajuste `bbcode.tagCase` para insertar etiquetas en mayúsculas o minúsculas.
- Se quitan los comentarios `//` de la configuración del lenguaje (BBCode no tiene comentarios).
- CI en GitHub Actions: tests en cada push y publicación automática al crear un tag `vX.Y.Z`.

## [1.1.0]
- Nuevo renderer basado en un parser con pila (`bbcode-renderer.js`), compatible con el BBCode de XenForo/XDA.
- Soporte de atributos entre comillas, `[SIZE]` en escala 1–7, `[LIST=1]`, listas anidadas, `[PLAIN]`, `[MENTION]`, `[FONT]`, `[SPOILER="título"]`, `[INDENT]`, `[HEADING]`, `[MEDIA]`, `[EMAIL]`, `[ICODE]` y más.
- Las etiquetas desconocidas se muestran como texto y los anidamientos cruzados se corrigen.
- Vista previa: panel único que sigue al archivo activo, imágenes relativas, CSP, estilos tipo foro y atajo `Ctrl/Cmd+K V`.
- Ajuste `bbcode.preview.mentionUrl`.
- Tests con `npm test`.

## [0.0.1]
- Soporte inicial de BBCode con resaltado de sintaxis y configuración de lenguaje.
- Botón y comando de vista previa para ver BBCode renderizado en un panel lateral.
