# Manual del Negocio — BellsGroup

**Productora Asesora de Seguros · CRM, Embudo Comercial e Inteligencia Artificial**  
*Especificación exhaustiva de dominio de negocio y reglas funcionales para desarrollo.*

---

## Índice

1. [Propósito y alcance](#1-propósito-y-alcance)
2. [Visión del negocio y modelo de operación](#2-visión-del-negocio-y-modelo-de-operación)
3. [Modelo organizacional y roles](#3-modelo-organizacional-y-roles)
4. [Modelo de entidades conceptual (Contacto vs. Oportunidad vs. Póliza)](#4-modelo-de-entidades-conceptual)
5. [Gestión de Personas, Contactos y Vínculos](#5-gestión-de-personas-contactos-y-vínculos)
6. [Pipeline comercial (12 etapas) y Metodología BellsGroup](#6-pipeline-comercial-12-etapas-y-metodología-bellsgroup)
7. [Pólizas, Roles de Titularidad y Posventa](#7-pólizas-roles-de-titularidad-y-posventa)
8. [Planes de ahorro Zurich Invest y Productos](#8-planes-de-ahorro-zurich-invest-y-productos)
9. [Búsqueda con IA (Dual) y Descubrimiento de Cross-Sell](#9-búsqueda-con-ia-dual-y-descubrimiento-de-cross-sell)
10. [Comisiones, Rentabilidad y Fórmulas](#10-comisiones-rentabilidad-y-fórmulas)
11. [Nichos, Segmentación y Campañas](#11-nichos-segmentación-y-campañas)
12. [Supervisión, KPIs y SLAs Comerciales](#12-supervisión-kpis-y-slas-comerciales)
13. [Reglas de Negocio Transversales](#13-reglas-de-negocio-transversales)
14. [Glosario](#14-glosario)
15. [Fuentes y Referencias](#15-fuentes-y-referencias)

---

## 1. Propósito y alcance

Este manual documenta el **conocimiento de negocio integral** de BellsGroup. Funciona como la especificación funcional y de dominio definitiva para la arquitectura de base de datos, lógica de backend, interfaces de usuario y componentes de IA del sistema.

### Alcance del MVP:
- **Operación 100% manual:** En esta primera fase no hay integración vía API automatizada con aseguradoras (ej. portal PASS de Zurich). El asesor opera en el CRM BellsGroup y en el portal de la compañía en paralelo.
- **Foco funcional prioritario:** Vista Vendedora (Asesor Comercial), Autenticación completa (Email/Password + OAuth Social Logins con Google, Apple y Microsoft para sincronización de calendarios) y supervisión del Team Leader.
- **Base comercial escalable:** Arquitectura multiempresa y modular preparada para convertirse a futuro en un SaaS comercializable para agencias y brokers.

---

## 2. Visión del negocio y modelo de operación

BellsGroup es una **productora asesora de seguros** argentina que intermedia entre compañías aseguradoras de primer nivel (lideradas por **Zurich**) y clientes finales (individuos, familias y empresas).

### Líneas de Negocio Principales:
1. **Seguros de Vida, Ahorro e Inversión:** Planes **Zurich Invest** (capitalización en unidades de cuenta VRU$S, indexadas al dólar) y seguros de vida individual (*Option*).
2. **Seguros Patrimoniales y Personas:** Automotores, hogar, comercio, consorcio, accidentes personales, embarcaciones, etc.
3. **Seguros Corporativos y Empresas:** ART, convenios colectivos mercantiles, vida colectivo (LCT) y cauciones (garantías contractuales, financieras, aduaneras y judiciales).

### Principio Operativo:
> **Vender más y mejor sin perder trazabilidad.**  
> El sistema no es un CRM estático: conecta personas, relaciones familiares de confianza, pipeline metodológico, alertas de posventa, cálculo financiero y copiloto de inteligencia artificial.

---

## 3. Modelo organizacional y roles

### 3.1 Unificación de Conceptos
- **Vendedor = Asesor:** En todo el dominio del sistema, ambos términos son **exactos sinónimos**. Representan al profesional comercial responsable de la prospección, negociación y mantenimiento de cartera.

### 3.2 Roles del Sistema

| Rol | Alcance de Datos | Capacidades Principales |
|---|---|---|
| **Asesor / Vendedor** | Cartera asignada + Contactos libres/huérfanos | Gestión de su pipeline, carga de prospectos, registro de actividades, consulta de comisiones proyectadas, búsqueda con IA y seguimiento de clientes. |
| **Team Leader / Dirección / Manager** | Toda la agencia / equipo asignado (Visión global y estratégica) | Supervisión de KPIs, dashboards de rentabilidad, producción consolidada, persistencia, proyecciones anuales, configuración de fórmulas de comisión, reasignación de carteras, gestión de nichos y auditoría de embudos. |
| **Administrativo** | Operación global de pólizas | Gestión documental, actualización de estados de pago/mora, tramitación de endosos, siniestros y reclamos. |

---

## 4. Modelo de entidades conceptual

Para permitir ventas simultáneas, venta cruzada (*cross-sell*) y trazabilidad limpia, el dominio desacopla la persona física del proceso comercial:

```
┌─────────────────────────────────────────────────────────────┐
│                     CONTACTO / PERSONA                      │
│ (Identidad única: DNI, Email, Teléfono, Nichos, Vínculos)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ 1:N
        ┌──────────────────────┴──────────────────────┐
        ▼                                             ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│     OPORTUNIDAD / NEGOCIO    │        │       PÓLIZA EMITIDA         │
│ (En el Kanban de 12 etapas)  │        │ (Contrato vigente/saldado)   │
│ - Asesor Asignado            │        │ - Roles: Tomador, Asegurado, │
│ - Producto & Compañía        │        │   Pagador, Beneficiarios     │
│ - Tipo: Nuevo Negocio vs Inc │        │ - Moneda (VRU$S / USD / ARS) │
│ - SLA Global (7-10 días)     │        │ - Estado de Cobranza / Mora  │
└──────────────────────────────┘        └──────────────────────────────┘
```

- **Un Contacto** representa a la persona humana o jurídica. No se duplica.
- **Múltiples Oportunidades** pueden coexistir para un mismo contacto (ej. una oportunidad de Seguro de Vida con un asesor y otra de Seguro de Comercio con otro asesor).
- **Múltiples Pólizas** pueden pertenecer a un mismo cliente o ser financiadas por un mismo **Pagador**.

---

## 5. Gestión de Personas, Contactos y Vínculos

### 5.1 Ficha de Contacto y Datos
- **Datos Identificatorios:** Nombre, Apellido, Tipo y Número de Documento (DNI/CUIT/CUIL), Teléfono/WhatsApp, Email, Domicilio.
- **Datos Laborales y Segmentación:** Profesión, Empresa, Nicho/Etiqueta (ej. *Médicos*, *PyMEs Industriales*), Hobbies/Intereses (útiles para campañas).

### 5.2 Grafo de Relaciones Humanas (Nodos Informativos)
- Se registran vínculos directos: Cónyuge, Hijos, Padres, Socios comerciales, Referidos.
- **Datos de cobertura en vínculos:** Cada relación permite registrar si la persona vinculada posee cobertura aseguradora y monto estimado.
- **Regla:** El vínculo queda como **dato informativo** para enriquecer las consultas de IA y la visión 360°, **sin generar tarjetas automáticas en el embudo** hasta que el asesor decida abrirle una oportunidad explícita.

### 5.3 Importación Masiva y Deduplicación Estricta
- Se permite la importación masiva de contactos vía **Excel (.xlsx) y CSV**.
- **Control de Duplicados:** Validación obligatoria por Documento (DNI/CUIT), Email y Teléfono.
- **Comportamiento ante duplicados:** El sistema **bloquea** la creación duplicada, **informa** el estado y asesor asignado actual, y **permite modificar** los datos si corresponde al propio asesor o si es un contacto libre de la agencia.

---

## 6. Pipeline comercial (12 etapas) y Metodología BellsGroup

### 6.1 Las 12 Etapas del Pipeline

| # | Etapa | Código | Descripción operativa |
|---|---|---|---|
| 1 | **Prospecto** | `prospecto` | Lead cargado en base de datos, en reposo. |
| 2 | **Prospecto Activo** | `prospecto_activo` | Priorizado para iniciar gestión comercial activa. |
| 3 | **Abordaje** | `abordaje` | Primer intento de contacto (llamada atendida vs. no atendida). |
| 4 | **Contacto** | `contacto` | Conversación comercial efectiva establecida (speech). |
| 5 | **Preparación Previa** | `preparacion_previa` | Estudio del perfil, necesidades y armado del guion. |
| 6 | **Primera Entrevista** | `primera_entrevista` | Entrevista inicial (EI) de relevamiento y diagnóstico. |
| 7 | **Propuesta Generada** | `propuesta_generada` | Armado técnico y cotización de la propuesta. |
| 8 | **Entrevista de Cierre** | `entrevista_cierre` | Presentación de propuesta (EC) y manejo de objeciones. |
| 9 | **Cierre** | `cierre` | Acuerdo verbal de contratación / emisión pendiente. |
| 10 | **Cierre Concretado** | `cierre_concretado` | Póliza firmada, solicitud ingresada y prima cobrada. |
| 11 | **Reunión Postventa** | `reunion_postventa` | Entrega de póliza y fidelización. |
| 12 | **Reuniones Intermedias**| `reuniones_intermedias`| Entrevistas adicionales de seguimiento o renegociación. |

### 6.2 Metodología BellsGroup y Checklist Interactivo
En cada etapa de contacto, el sistema despliega el checklist metodológico:
1. Saludo cordial y profesional.
2. Pregunta de permiso: *"¿Tenés un minuto?"*.
3. Motivo del contacto generando intriga y valor.
4. **Técnica de alternativa inevitable:** Proponer siempre **2 horarios** y **2 lugares/modalidades** diferentes.
5. Resumen final de compromisos y confirmación.

### 6.3 Automatización con Control Humano (*Human-in-the-Loop*)
- Al registrar una llamada o reunión, el sistema **sugiere** el avance de etapa en el embudo.
- **Regla estricta:** Ningún cambio de etapa se ejecuta automáticamente sin la **confirmación explícita del asesor**.

### 6.4 SLA Global de Oportunidad y Cierres Perdidos
- **SLA Global:** El ciclo de vida completo de la oportunidad (desde *Prospecto Activo* hasta el cierre) tiene un plazo ideal de **7 a 10 días**.
- **Semáforo visual en Kanban:**
  - 🟢 **Verde:** < 7 días totales.
  - 🟡 **Amarillo:** 7 a 10 días totales.
  - 🔴 **Rojo:** > 10 días totales (oportunidad estancada).
- **Cierre Perdido:** Requiere obligatoriamente registrar:
  1. **Motivo de pérdida** (Precio, Falta de interés, Ya tiene cobertura, Capacidad de pago, etc.).
  2. **Fecha tentativa de re-contacto** (agenda automática de seguimiento a futuro).

---

## 7. Pólizas, Roles de Titularidad y Posventa

### 7.1 Los 4 Roles de la Póliza

Toda póliza y oportunidad discrimina 4 figuras clave:
1. **Tomador:** Persona o entidad que contrata formalmente la póliza.
2. **Vida Asegurada:** Persona sobre cuya vida, salud o riesgo recae la cobertura.
3. **Pagador:** Persona o entidad responsable del pago de las primas.
4. **Beneficiarios:** Personas designadas para cobrar el capital asegurado ante siniestro.

> **Regla Financiera del Pagador:** El análisis de solvencia, límite de primas anuales sin certificación contable (ej. hasta USD 12.000 anuales) y capacidad de incrementos se evalúa **sobre el Pagador consolidado**, sumando todas las pólizas que abona.

### 7.2 Estados de la Póliza y Gestión de Cobranzas
- **Estados de Póliza:** `Activa`, `Saldada` (vigente por valor de rescate acumulado), `Caducada` (anulada por falta de pago sin rescate).
- **Cobranzas y Mora:** Estados de pago (`Al día`, `Pago Rechazado`, `En Mora`) editables tanto por **Administración** como por el **Asesor**, generando tareas de posventa prioritarias en el Dashboard.
- **Trámites de Posventa:** Solicitudes de servicio (cambio de medio de pago, cambio de beneficiarios, rescates parciales, switch de fondos, aumento de suma asegurada) con fecha de solicitud y fecha de efecto.

---

## 8. Planes de ahorro Zurich Invest y Productos

### 8.1 Catálogo Zurich Invest (Ahorro e Inversión en VRU$S)
- **Moneda de Cuenta:** **VRU$S** (Valor de Referencia Unidad – Dólar).
- **Planes Principales:**
  - *Invest Future:* Ahorro a largo plazo (10 a 35 años).
  - *Invest Future Joven:* Para edades de 19 a 40 años (primas desde 250 VRU$S).
  - *Invest University:* Planificación educativa de hijos/nietos.
  - *Zurich Impact / Invest Advanced:* Inversión patrimonial con primas elevadas.
- **Flexibilidad:** Primas regulares modificables, aportes extraordinarios (primas únicas) y switch de fondos de inversión (Renta Fija vs. Renta Variable).

### 8.2 Tipo de Negocio en la Oportunidad
Toda operación se clasifica en:
- **Nuevo Negocio (NN):** Emisión de una nueva póliza.
- **Incremento:** Ampliación ad-hoc o automática de prima sobre póliza de cartera.
- Permite calcular el **Mix de Producción** (% Vida vs. % Ahorro vs. % Incrementos).

---

## 9. Búsqueda con IA (Dual) y Descubrimiento de Cross-Sell

### 9.1 Panel de Búsqueda Inteligente Dual
Ubicado en el Dashboard del asesor, ofrece dos modalidades integradas:
1. **Modo Tabla / Filtro Estructurado (Text-to-Filter):** Traduce preguntas coloquiales a filtros directos sobre la grilla del CRM para accionar de inmediato (ej. llamadas, WhatsApp, agendar reunión).
2. **Modo Copiloto Conversacional:** Proporciona análisis del perfil, puntos de dolor, sugerencia de guiones y estrategia comercial para abordar al prospecto.

### 9.2 Ejemplos de Búsquedas Semánticas y Relacionales
- *"Clientes casados cuya pareja no tenga seguros contratados superiores a USD 500"*
- *"Prospectos del nicho Médicos que no hayan sido contactados en los últimos 20 días"*
- *"Clientes con póliza de Vida Individual pero sin plan de Retiro/Ahorro"*
- *"Pagadores con más de 2 pólizas activas y pagos al día para ofrecer incremento"*

### 9.3 Alcance y Privacidad
- El asesor busca sobre su **cartera propia** + **contactos libres/huérfanos** de la agencia.
- Los contactos asignados a otros asesores permanecen protegidos.

---

## 10. Comisiones, Rentabilidad y Fórmulas

- **Parametrización por Team Leader:** Las fórmulas y porcentajes de comisión por compañía, producto y categoría de asesor son configuradas por el **Team Leader** desde el portal de gestión.
- **Visión del Asesor:** El asesor accede en modo consulta a su módulo de **Economía Personal**, visualizando:
  - Comisiones cobradas y liquidadas.
  - Comisiones proyectadas a fin de mes por stock de oportunidades en cierre.
  - Visualización dual en moneda extranjera (**USD**) y moneda local (**ARS**).

---

## 11. Nichos, Segmentación y Campañas

- **Libertad de Segmentación:** Tanto el **Asesor** como el **Team Leader** pueden crear y asignar libremente nichos, etiquetas y atributos (ej. *Médicos*, *Empresarios PyME*, *Abogados*, *Deportistas*).
- **Inmutabilidad del Proceso:** La creación de nichos no altera las 12 etapas estándar del embudo comercial.
- **Campañas e Incentivos:** Seguimiento de metas comerciales internas y de compañías (ej. premios por volumen de primas en USD o cantidad de pólizas NN).

---

## 12. Supervisión, KPIs y SLAs Comerciales

### 12.1 Dashboard Comercial del Asesor (Consolidado)
- **KPIs en tiempo real:** Producción acumulada ($ / VRU$S), Cantidad de pólizas NN, Incrementos, Mix de producto, Comisiones estimadas y Tasa de conversión histórica.
- **Panel del Día Unificado:** Tareas comerciales diarias, llamadas programadas, alertas operativas de posventa (pagos rechazados, vencimientos de documentación) y eventos de agenda/renovaciones.

### 12.2 Métricas de Conversión
- Cálculo de tasas de conversión entre cada etapa del embudo (`prospecto → abordaje → primera_entrevista → propuesta → cierre`).
- Alerta preventiva cuando la tasa de conversión global del asesor cae por debajo del umbral del 10%.

---

## 13. Reglas de Negocio Transversales

1. **Identidad e Inmutabilidad:** El email corporativo es el identificador único del usuario en el sistema.
2. **Autenticación Multicanal y Sincronización de Calendarios:** Soporte para login tradicional (usuario/password) y Social Login OAuth2 (Google, Apple, Microsoft). El inicio de sesión con estos proveedores responde a la necesidad del cliente de sincronizar automáticamente los calendarios externos (Google Calendar, Apple Calendar y Microsoft Outlook) con la agenda de citas, llamadas y reuniones del CRM.
3. **Multi-Oportunidad:** Un contacto puede tener N oportunidades abiertas simultáneamente con diferentes productos o asesores.
4. **Trazabilidad de Cierres Perdidos:** Exige motivo de pérdida estructurado y fecha de recontacto.
5. **Human-in-the-Loop:** Sugerencias automáticas de cambio de etapa siempre sujetas a confirmación del asesor.
6. **Prioridad del Pagador:** Controles de riesgo, volumen y facturación consolidados sobre el Pagador.

---

## 14. Glosario

| Término | Definición |
|---|---|
| **Asesor / Vendedor** | Profesional comercial de la productora (términos sinónimos). |
| **Oportunidad** | Proceso comercial vivo en el embudo de 12 etapas. |
| **NN (Nuevo Negocio)** | Venta de póliza nueva a un cliente. |
| **Incremento** | Aumento de prima/cobertura sobre póliza vigente. |
| **VRU$S** | Valor de Referencia Unidad – Dólar (Zurich). |
| **Tomador** | Contratante formal del seguro. |
| **Vida Asegurada** | Persona que recibe la cobertura de la póliza. |
| **Pagador** | Persona que financia y paga las primas. |
| **Saldada** | Póliza vigente sostenida por su valor de rescate. |
| **Caducada** | Póliza anulada por falta de pago sin valor de rescate. |

---

## 15. Fuentes y Referencias

- Minutas de Feedback de Negocio: `Feedbacks/1.Feedback 23.07.26.md`, `Feedbacks/2.Feedback 30.07.26.md`, `Feedbacks/3.Feedback 05.08.26.md`.
- Notas de Arquitectura: `Feedbacks/Notas generales.md`.
- Documentos de Zurich y Matrices: `Feedbacks/Archivos compartidos/`.
