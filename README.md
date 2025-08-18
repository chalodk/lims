# LIMS - Sistema de Gestión de Laboratorio

Sistema de gestión integral para laboratorios de análisis fitopatológico construido con Next.js, Supabase y TypeScript.

## 🚀 Características

- **Autenticación y Autorización**: Sistema de roles (admin, validador, comun, consumidor)
- **Gestión de Muestras**: Registro, seguimiento y análisis de muestras
- **Generación de Informes**: Creación automática de informes con PDF
- **Multi-tenant**: Soporte para múltiples empresas y clientes
- **Auditoría Completa**: Logs de todas las acciones del sistema
- **Interfaz Responsiva**: Diseño moderno y accesible

## 🛠️ Tecnologías

- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Estado**: Zustand
- **UI**: Tailwind CSS, Heroicons
- **Autenticación**: Supabase Auth
- **Base de Datos**: PostgreSQL con RLS

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase

## 🔧 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd lims
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   Crear un archivo `.env.local` con:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

4. **Configurar Supabase**
   - Crear un proyecto en [Supabase](https://supabase.com)
   - Ejecutar el script SQL en `er_schema_complete.sql` en el SQL Editor
   - Copiar las credenciales del proyecto

5. **Ejecutar el proyecto**
   ```bash
   npm run dev
   ```

## 🗄️ Estructura de Base de Datos

El sistema incluye las siguientes tablas principales:

- **companies**: Empresas que usan el sistema
- **users**: Usuarios autenticados
- **roles**: Roles del sistema (admin, validador, comun, consumidor)
- **clients**: Clientes de las empresas
- **samples**: Muestras de análisis
- **results**: Resultados de análisis
- **reports**: Informes generados
- **action_logs**: Logs de auditoría

## 🔐 Sistema de Roles

- **admin**: Acceso completo al sistema
- **validador**: Puede validar resultados y generar informes
- **comun**: Usuario del laboratorio con acceso limitado
- **consumidor**: Cliente con acceso solo a sus muestras

## 📁 Estructura del Proyecto

```
src/
├── app/                    # App Router de Next.js
│   ├── dashboard/         # Páginas del dashboard
│   ├── login/            # Página de login
│   └── layout.tsx        # Layout raíz
├── components/           # Componentes React
│   ├── auth/            # Componentes de autenticación
│   └── layout/          # Componentes de layout
├── lib/                 # Utilidades y configuración
│   └── supabase.ts      # Configuración de Supabase
├── store/               # Estado global (Zustand)
└── types/               # Tipos TypeScript
```

## 🚀 Despliegue

### Netlify (Recomendado)

1. Conectar el repositorio a Netlify
2. Configurar las variables de entorno en Netlify
3. Desplegar automáticamente

### Vercel

1. Conectar el repositorio a Vercel
2. Configurar las variables de entorno
3. Desplegar

## 🔧 Desarrollo

### Scripts Disponibles

- `npm run dev`: Servidor de desarrollo
- `npm run build`: Construir para producción
- `npm run start`: Servidor de producción
- `npm run lint`: Ejecutar ESLint

### Convenciones de Código

- TypeScript estricto
- ESLint + Prettier
- Componentes funcionales con hooks
- Tailwind CSS para estilos

## 📝 Próximas Características

- [ ] Integración con n8n para automatizaciones
- [ ] Generación automática de PDFs
- [ ] Notificaciones por email
- [ ] API REST completa
- [ ] Tests unitarios y de integración
- [ ] Dashboard de analytics
- [ ] Sistema de notificaciones en tiempo real

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte técnico, contactar a [tu-email@ejemplo.com]
