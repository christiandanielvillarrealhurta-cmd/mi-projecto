# Productos y Factores

Aplicación web para practicar **productos notables** y **factorización**.

1. Eliges el tema: Productos notables, Factorización (o mezclar los dos).
2. Marcas los casos que quieres practicar y la dificultad: Fácil, Medio, Difícil o Revuelto.
3. Aparece un ejercicio arriba y 4 opciones abajo. Escoges una.
4. Bien o mal, te muestra el **procedimiento paso a paso**. Si fallaste, también te dice el posible error.
5. Practicas los ejercicios que quieras. Cuando presionas **Terminar sesión**, ves tu **porcentaje de aciertos**, el caso en el que **más fallaste** y en el que **menos fallaste**, una tabla por caso y un repaso de tus errores.

## Casos

**Productos notables**

- Binomio al cuadrado
- Binomios conjugados
- Binomios con término común
- Binomio al cubo
- Trinomio al cuadrado
- Binomio por trinomio (suma o diferencia de cubos)

**Factorización**

- Factor común
- Factor común por agrupación
- Trinomio cuadrado perfecto
- Diferencia de cuadrados
- Trinomio cuadrado perfecto por adición y sustracción
- Trinomio de la forma x² + bx + c
- Trinomio de la forma ax² + bx + c
- Cubo perfecto de binomios
- Suma o diferencia de cubos

## Cómo abrirla

- **En la computadora:** abre `index.html` con doble clic (Chrome, Edge, Firefox o Safari). No necesita instalar nada.
- **En el celular o para compartir:** usa `dist/productos-y-factores.html`. Es un solo archivo con todo incluido; puedes mandarlo por WhatsApp o correo y abrirlo en el navegador.

Los ejercicios se generan al azar, así que nunca se acaban.

## Para desarrolladores

```
js/algebra.js            Polinomios, factorizaciones y su dibujo en HTML
js/motor.js              Registro de casos y armado de las 4 opciones
js/casos/productos.js    Casos de productos notables
js/casos/factorizacion-a.js, factorizacion-b.js   Casos de factorización
js/app.js                Pantallas, sesión y resultados
css/estilos.css          Estilos (tema claro y oscuro)
tests/                   Pruebas automáticas
tools/empaquetar.js      Genera el archivo único de dist/
```

Pruebas (necesitan Node.js):

```
node tests/algebra.test.js          # núcleo algebraico
node tests/verificar.js             # genera cientos de ejercicios por caso y nivel y revisa que todo sea correcto
node tests/verificar.js --muestras=2  # además imprime ejemplos para leerlos
```

Después de cambiar algo, vuelve a generar el archivo único:

```
node tools/empaquetar.js
```
