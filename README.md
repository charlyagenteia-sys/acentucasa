# AC Arriendos (MVP local)

App local para gestionar reservas por fecha, controlar stock diario y visualizar catálogo de arriendo.

## Qué incluye

- Catálogo de ítems con propiedades, stock total, valor unitario e identificador de imagen de referencia.
- Calendario propio mensual con carga diaria de reservas y unidades ocupadas.
- Creación de reservas con validación de stock por rango de fechas (evita sobreventa).
- Estados de reserva (`pending`, `confirmed`, `delivered`, `returned`, `cancelled`) con actualización en vivo.
- Persistencia en disco en archivos JSON.
- Asignación de bodega por producto y estado de autorización por ítem, visible dentro de la reserva.
- En el alta y edición de inventario solo se elige la bodega; la autorización del producto se calcula automáticamente según esa bodega (`JP`, `Amelita` y `Mamá` requieren autorización).
- En las cards del catálogo se muestran el stock total y el stock ya reservado para la fecha del evento activa.
- La portada muestra `Nueva reserva` arriba a la izquierda, `Categorías` debajo y el `Calendario de reservas` a la derecha; al abrir una categoría se muestran sus productos con cantidad editable y la reserva se guarda desde el botón superior.
- Al abrir una categoría en ventana aparte, la vista muestra una barra superior con accesos directos a las categorías y deja `Home` al final; al guardar o pulsar `Home`, vuelve al home para seguir con otras categorías.
- La vista standalone de categoría usa cards compactas para que entren más productos en pantalla y el scroll sea el mínimo posible.

## Estructura

- `server.js`: backend API + servidor web local.
- `public/`: interfaz web.
- `data/items.json`: inventario y catálogo.
- `data/reservations.json`: reservas confirmadas/pedientes.
- `data/warehouses.json`: catálogo de bodegas disponibles.

## Ejecutar local

```bash
cd /Users/charly/.openclaw/workspace/projects/app-arriendo-platos
npm install
npm start
```

Abrir en navegador: `http://localhost:4780`

## Flujo operativo

1. Abrir la app local.
2. Ingresar reserva con fecha de evento e ítems.
3. La API valida stock disponible en el día o rango guardado.
4. Si hay stock, guarda reserva y actualiza calendario + stock diario.
5. Si falta stock, rechaza la reserva indicando disponible vs solicitado.

## Bodegas y autorización

- Cada producto tiene una bodega asignada en `data/items.json` y las opciones vigentes son `Ppal Izco`, `JP`, `Amelita` y `Mamá`.
- Cada producto también puede marcarse como `requiere autorización`, asignar un usuario autorizado y dejar su estado en `pending` o `confirmed`.
- El estado de autorización se copia dentro de la reserva para que cada ítem muestre su propio estado.
- Las categorías del inventario son cerradas: `Sillas`, `Platos`, `Lounge`, `Manteleria`, `Bares`, `Plaqué` y `Carpa India`.
- El selector de cojín solo aparece para productos de categoría `Sillas`; en cualquier otra categoría queda apagado y se guarda como `No usa`.
- El home solo muestra el catálogo por categorías en el bloque inferior izquierdo. Cada tarjeta de categoría abre una ventana nueva con sus productos, cada producto muestra un input de cantidad y desde ahí cada ficha sigue abriéndose en una pestaña nueva; el stock diario solo aparece al abrir un producto en una fecha específica.

## Cargar/editar ítems

Opción recomendada: entrar como `admin` y usar el botón **Agregar producto** dentro del detalle de un producto para crear uno nuevo.
Tambien puedes abrir la ficha desde la tarjeta de un producto dentro de su categoría, lo que abre una pestaña nueva, o usar **Editar inventario** dentro del detalle del producto.

Eso abre un modal para cambiar o crear:
- nombre
- categoría guiada
- medida
- stock total
- valor unitario
- bodega obligatoria entre `Ppal Izco`, `JP`, `Amelita` y `Mamá`
- requiere autorización
- usuario que autoriza
- estado de autorización (`pending` o `confirmed`)
- propiedades
- cojín asociado para sillas (`No usa`, `Blanco`, `Negro`)
- imagen de referencia

Las categorías vigentes del catálogo son:

- `Sillas`
- `Platos`
- `Lounge`
- `Manteleria`
- `Bares`
- `Plaqué`
- `Carpa India`

Para fotos, el modal acepta:
- arrastrar y soltar una imagen sobre la caja de carga
- usar el botón **Buscar foto**

Cuando estás agregando un producto nuevo, la foto puede quedar preparada antes de guardar y se persiste junto con el alta.

Los cambios se guardan directo en `data/items.json` y se reflejan al recargar la vista.

Si prefieres hacerlo a mano, también puedes editar `data/items.json` y refrescar la app.

Formato por ítem:

```json
{
  "id": "item-id-unico",
  "name": "Nombre",
  "category": "Categoría",
  "size": "Medida",
  "stockTotal": 10,
  "unitPriceCLP": 1000,
  "warehouseId": "ppal-izco",
  "authorizationRequired": false,
  "authorizationStatus": "not_required",
  "authorizationOwnerUsername": "",
  "cushionOption": "none",
  "properties": ["prop1", "prop2"],
  "imageRef": "media://inbound/..."
}
```

## Respaldo rápido

- Inventario: copiar `data/items.json`
- Reservas y calendario operativo: copiar `data/reservations.json`

Con ambos archivos se restaura el estado completo del MVP.

## Deploy en Render

Si vas a usar Render con disco persistente:

1. Crea un disco y móntalo en `/var/data`.
2. En el servicio, agrega estas variables de entorno:
   - `APP_DATA_DIR=/var/data/data`
   - `APP_MEDIA_DIR=/var/data/media/inbound`
3. Usa `npm start` como comando de arranque.

La app copia los JSON iniciales desde `data/` y las imágenes base desde `seed/inbound/` la primera vez que arranca con esas rutas, así Render no queda con el catálogo sin fotos.

## Acceso remoto (mas estable)

Para evitar reinicios manuales cada vez que cae el tunnel:

```bash
cd /Users/charly/.openclaw/workspace/projects/app-arriendo-platos
./scripts/remote-up.sh
```

Ese comando:
- levanta/reinicia `server.js`
- levanta `localtunnel`
- guarda la URL activa en `.remote-url`
- valida que local/public respondan `200` y no devuelvan `Bad Gateway`/`Tunnel Unavailable`

Para auto-recuperacion:

```bash
cd /Users/charly/.openclaw/workspace/projects/app-arriendo-platos
nohup ./scripts/remote-watchdog.sh >/dev/null 2>&1 &
```

El watchdog chequea cada 30s (configurable con `CHECK_EVERY_SEC`) y si falla dos veces seguidas (configurable con `MAX_FAILS`) ejecuta `remote-up.sh` para recuperar la URL automaticamente.
