# Change Log

All notable changes to the "bbcode" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

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
