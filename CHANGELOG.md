# Change Log

All notable changes to the "bbcode" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [1.2.0]
- Vista previa con apariencia de XDA Forums: encabezado del hilo, post con columna de usuario y estilos de XenForo con los colores reales de XDA Dark, XDA Theme (claro) y XDA Classic. Botón para cambiar de estilo y ajuste `bbcode.preview.theme`.
- Saltos de línea como los deja el editor de XDA (`bbcode.preview.xdaLineBreaks`), y sin saltos extra después de bloques anidados ni al final del post.
- Ajustes `bbcode.preview.author`, `bbcode.preview.userTitle` y `bbcode.preview.avatarUrl`.
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
