# 🚀 EmbedDB

[English](README.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

¡Hola! ¡Bienvenido a EmbedDB! Este es un increíble sistema de etiquetas basado en vectores escrito en TypeScript. ¡Hace que la búsqueda por similitud sea tan fácil como tener un asistente de IA ayudándote a encontrar cosas! 🎯

## ✨ Características

- 🔍 Potente búsqueda de similitud basada en vectores
- ⚖️ Etiquetas con pesos (¡Si dices que es importante, lo es!)
- ⚖️ Pesos por categoría (¡Control preciso de la importancia de cada categoría!)
- 🚄 Operaciones por lotes (¡Maneja grandes cantidades de datos eficientemente!)
- 💾 Caché de consultas incorporado (¡Consultas repetidas a la velocidad del rayo!)
- 📝 Soporte completo de TypeScript (¡Seguro en tipos, amigable para desarrolladores!)
- 🎯 Implementación eficiente de vectores dispersos (¡Tu RAM te lo agradecerá!)
- 🔄 Funcionalidad de importación/exportación (¡Guarda y restaura tus índices!)
- 📊 Soporte de paginación (¡Obtén resultados en lotes!)

## 🎮 Inicio Rápido

Primero, instala el paquete:
```bash
npm install embeddb
```

Veamos un ejemplo de uso:

```typescript
import { TagVectorSystem, Tag, IndexTag } from 'embeddb';

// Crear un nuevo sistema
const system = new TagVectorSystem();

// Definir nuestro universo de etiquetas
const tags: IndexTag[] = [
    { category: 'color', value: 'red' },    // Rojo
    { category: 'color', value: 'blue' },   // Azul
    { category: 'size', value: 'large' }    // Grande
];

// Construir el índice de etiquetas (¡paso importante!)
system.buildIndex(tags);

// Agregar un elemento con sus etiquetas y niveles de confianza
const item = {
    id: 'cool-item-1',
    tags: [
        { category: 'color', value: 'red', confidence: 1.0 },   // ¡Seguro que es rojo!
        { category: 'size', value: 'large', confidence: 0.8 }   // Bastante grande
    ]
};
system.addItem(item);

// Busquemos elementos similares
const query = {
    tags: [
        { category: 'color', value: 'red', confidence: 0.9 }
    ]
};

// Configurar pesos de categoría para priorizar coincidencias de color
system.setCategoryWeight('color', 2.0); // Las coincidencias de color son el doble de importantes

// Consulta con paginación
const results = system.query(query.tags, { page: 1, size: 10 }); // Obtener los primeros 10 resultados

// Exportar el índice para uso posterior
const exportedData = system.exportIndex();

// Importar el índice en otra instancia
const newSystem = new TagVectorSystem();
newSystem.importIndex(exportedData);

## 🛠 Referencia de la API

### Clase TagVectorSystem

¡Este es nuestro protagonista! Maneja todas las operaciones.

#### Métodos Principales

- 🏗 `buildIndex(tags: IndexTag[])`: Construir índice de etiquetas
  ```typescript
  // ¡Define tu mundo de etiquetas!
  system.buildIndex([
    { category: 'color', value: 'red' },
    { category: 'style', value: 'modern' }
  ]);
  ```

- ➕ `addItem(item: ItemTags)`: Agregar un elemento
  ```typescript
  // Agregar algo genial
  system.addItem({
    id: 'awesome-item',
    tags: [
      { category: 'color', value: 'red', confidence: 1.0 }
    ]
  });
  ```

- 📦 `addItemBatch(items: ItemTags[], batchSize?: number)`: Agregar elementos por lotes
  ```typescript
  // ¡Agregar múltiples elementos a la vez para mejor rendimiento!
  system.addItemBatch([item1, item2, item3], 10);
  ```

- 🔍 `query(tags: Tag[], options?: QueryOptions)`: Buscar elementos similares
  ```typescript
  // Encontrar cosas similares
  const results = system.query([
    { category: 'style', value: 'modern', confidence: 0.9 }
  ], { page: 1, pageSize: 20 });
  ```

- 🎯 `queryFirst(tags: Tag[])`: Obtener el elemento más similar
  ```typescript
  // Solo obtener la mejor coincidencia
  const bestMatch = system.queryFirst([
    { category: 'color', value: 'red', confidence: 1.0 }
  ]);
  ```

- 📊 `getStats()`: Obtener estadísticas del sistema
  ```typescript
  // Revisar las estadísticas del sistema
  const stats = system.getStats();
  console.log(`Total de elementos: ${stats.totalItems}`);
  ```

- 🔄 `exportIndex()` & `importIndex()`: Exportar/Importar datos del índice
  ```typescript
  // Guardar datos para más tarde
  const data = system.exportIndex();
  // ... más tarde ...
  system.importIndex(data);
  ```

- ⚖️ `setCategoryWeight(category: string, weight: number)`: Establecer peso de categoría
  ```typescript
  // Priorizar coincidencias de color
  system.setCategoryWeight('color', 2.0);
  ```

## 🔧 Guía de Desarrollo

¿Quieres contribuir? ¡Excelente! Aquí hay algunos comandos útiles:

```bash
# Instalar dependencias
npm install

# Construir el proyecto
npm run build

# Ejecutar pruebas (¡nos encantan las pruebas!)
npm test

# Verificar estilo de código
npm run lint

# Formatear el código
npm run format
```

## 🤔 Cómo Funciona

EmbedDB utiliza magia vectorial para hacer posible la búsqueda por similitud:

1. 🏷 **Indexación de Etiquetas**:
   - Cada par categoría-valor se mapea a una posición única en el vector
   - Esto permite transformar etiquetas en vectores numéricos

2. 📊 **Transformación Vectorial**:
   - Las etiquetas de los elementos se convierten en vectores dispersos
   - Los niveles de confianza se usan como pesos vectoriales

3. 🎯 **Cálculo de Similitud**:
   - Usa similitud coseno para medir relaciones vectoriales
   - Esto ayuda a encontrar los elementos más similares

4. 🚀 **Optimizaciones de Rendimiento**:
   - Vectores dispersos para eficiencia de memoria
   - Caché de consultas para velocidad
   - Operaciones por lotes para mejor rendimiento

## 🧪 Detalles Técnicos

Bajo el capó, EmbedDB utiliza varias técnicas inteligentes:

1. **Implementación de Vectores Dispersos**
   - Solo almacena valores no cero
   - Reduce la huella de memoria
   - Perfecto para sistemas basados en etiquetas

2. **Similitud Coseno**
   - Mide el ángulo entre vectores
   - Rango: -1 a 1 (normalizado a 0 a 1)
   - Ideal para espacios dispersos de alta dimensión

3. **Estrategia de Caché**
   - Caché en memoria para resultados de consultas
   - Invalidación de caché en cambios de datos
   - Paginación configurable

4. **Seguridad de Tipos**
   - Tipos estrictos de TypeScript
   - Verificación de tipos en tiempo de ejecución
   - Manejo integral de errores

## 📝 Licencia

Licencia MIT - ¡Úsalo libremente, construye cosas increíbles!

## 🙋‍♂️ ¿Necesitas Ayuda?

¿Tienes preguntas o sugerencias?
- Abre un Issue
- Envía un PR

¡Hagamos EmbedDB aún mejor! 🌟

## 🌟 ¡Danos una Estrella!

Si encuentras útil EmbedDB, ¡danos una estrella! Ayuda a otros a descubrir este proyecto y nos motiva a seguir mejorándolo.
