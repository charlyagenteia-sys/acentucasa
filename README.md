# App arriendo platos/plaque (MVP local)

App local para gestionar reservas por fecha, controlar stock diario y visualizar catálogo de arriendo.

## Qué incluye

- Catálogo de ítems con propiedades, stock total, valor unitario e identificador de imagen de referencia.
- Calendario propio mensual con carga diaria de reservas y unidades ocupadas.
- Creación de reservas con validación de stock por rango de fechas (evita sobreventa).
- Estados de reserva (`pending`, `confirmed`, `delivered`, `returned`, `cancelled`) con actualización en vivo.
- Persistencia en disco en archivos JSON.
- Asignación de productos a bodegas y flujo de aprobación para reservas que pidan una bodega específica.

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
2. Ingresar reserva con fecha retiro/devolución e ítems.
3. La API valida stock disponible en todo el rango.
4. Si hay stock, guarda reserva y actualiza calendario + stock diario.
5. Si falta stock, rechaza la reserva indicando disponible vs solicitado.

## Bodegas y aprobaciones

- Cada producto tiene una bodega asignada en `data/items.json` y las opciones vigentes son `Ppal Izco`, `JP`, `Amelita` y `Mamá`.
- La reserva puede pedir una `bodega solicitada`.
- Si la reserva pide bodega específica, queda en `approvalStatus = pending` y el admin puede aprobar o rechazar desde el detalle.

## Cargar/editar ítems

Opción recomendada: entrar como `admin` y usar el botón **Agregar producto** arriba del catálogo para crear uno nuevo.
Tambien puedes abrir la ficha haciendo click sobre la tarjeta del producto o usar **Editar inventario** dentro de cada tarjeta.

Eso abre un modal para cambiar o crear:
- nombre
- categoría
- medida
- stock total
- valor unitario
- bodega obligatoria entre `Ppal Izco`, `JP`, `Amelita` y `Mamá`
- propiedades
- cojín asociado para sillas (`No usa`, `Blanco`, `Negro`)
- imagen de referencia

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
  "cushionOption": "none",
  "properties": ["prop1", "prop2"],
  "imageRef": "media://inbound/..."
}
```

## Respaldo rápido

- Inventario: copiar `data/items.json`
- Reservas y calendario operativo: copiar `data/reservations.json`

Con ambos archivos se restaura el estado completo del MVP.

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
