# bbcode

Extensión de Visual Studio Code para dar soporte básico a archivos BBCode con resaltado de sintaxis y pares de caracteres automáticos.

## Características

- Resaltado de etiquetas BBCode, atributos y cierres usando el grammar `source.bbcode`.
- Registro de idioma `BBCode`/`bbcode` con extensión `.bbcode`.
- Pares automáticos para corchetes `[]` y comillas dobles, más bracket matching en los documentos.
- Configuración de lenguaje con soporte para plegado y comentarios estilo `//` o `/* */` cuando sea necesario.

## Requisitos

- Visual Studio Code `^1.108.1`.

## Instalación

1. Abre el Marketplace de VS Code y busca `bbcode`.
2. Instala la extensión y recarga la ventana si es necesario.
3. Abre cualquier archivo con extensión `.bbcode` y debería detectarse automáticamente.

## Uso

- Crea o abre un archivo `.bbcode` para activar el resaltado.
- Escribe tus etiquetas con atributos; la gramática reconoce aperturas, cierres y asignaciones para facilitar la lectura.
- Usa los pares automáticos para corchetes y comillas al escribir etiquetas.

## Configuración de la extensión

Por ahora la extensión no expone configuraciones personalizables. Todo funciona con los valores por defecto incluidos.

## Problemas conocidos

- No se han reportado problemas todavía. Si encuentras algo, abre un issue en el repositorio.

## Notas de versión

### 0.0.1

Versión inicial con soporte de lenguaje BBCode y resaltado de sintaxis.
