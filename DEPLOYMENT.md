# SkriptPanda Studio - Deployment Guide

## 🚀 Netlify Deployment

This application is optimized for deployment on Netlify with the following features:

### Production Features
- ✅ **Optimized Build**: Chunked bundles for better caching
- ✅ **Error Boundary**: Production-ready error handling
- ✅ **Security Headers**: XSS protection, CSRF protection, etc.
- ✅ **SPA Routing**: Proper redirects for single-page application
- ✅ **Environment Configuration**: Production-ready environment handling
- ✅ **Performance Optimizations**: Code splitting and lazy loading

### Quick Deploy to Netlify

#### Option 1: Deploy from Git Repository
1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository to Netlify
3. Set build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: `18`

#### Option 2: Manual Deploy
1. Build the application:
   ```bash
   npm run build:prod
   ```
2. Upload the `dist` folder to Netlify

### Environment Variables (Optional)
Set these in Netlify's environment variables if needed:
- `NODE_VERSION=18`
- `NPM_FLAGS=--legacy-peer-deps` (if needed for dependencies)

### Build Configuration
The application includes:
- `netlify.toml` - Netlify configuration
- `_redirects` - SPA routing redirects (auto-generated)
- `_headers` - Security headers (auto-generated)

### Performance Optimizations
- **Code Splitting**: Vendor, UI, Monaco, AI, and Markdown chunks
- **Caching**: Long-term caching for static assets
- **Minification**: Optimized bundle sizes
- **Tree Shaking**: Unused code elimination

### Security Features
- **CSP Headers**: Content Security Policy
- **XSS Protection**: Cross-site scripting protection
- **CSRF Protection**: Cross-site request forgery protection
- **Frame Options**: Clickjacking protection

### Monitoring & Analytics
- **Error Boundary**: Catches and displays production errors gracefully
- **Build Info**: Version and build time tracking
- **Performance Metrics**: Core Web Vitals optimization

## 🔧 Local Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build:prod

# Preview production build
npm run preview:prod
```

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:prod` - Build with optimizations and checks
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks
- `npm run preview` - Preview production build

## 📱 Features
- **Modern IDE**: Monaco Editor with SkriptLang support
- **AI Assistant**: Gemini-powered code generation and help
- **File Management**: Create, edit, and organize SkriptLang files
- **Theme Support**: Light and dark themes
- **Responsive Design**: Works on desktop and mobile
- **Early Access**: Controlled access with authentication

## 🛠 Tech Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Framework**: Tailwind CSS + shadcn/ui
- **Editor**: Monaco Editor
- **AI**: Google Gemini API
- **Deployment**: Netlify

## 📞 Support
For deployment issues or questions, please check the documentation or contact support.
