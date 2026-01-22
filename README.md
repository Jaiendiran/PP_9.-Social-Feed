# Blogyst - React Social Feed

A feature-rich social feed application built with **React 19**, **Redux Toolkit**, and **Firebase**. This application demonstrates a modern, scalable architecture with real-time data synchronization, secure authentication, and a responsive user interface.

### 🔗 Live Demo: https://post-react-blog.web.app/

## � About Blogyst
Blogyst is a modern social platform designed to foster connection through shared stories and ideas. It provides a seamless and intuitive environment for users to publish content, managing their personal brand with ease. Built with a focus on user experience, Blogyst combines a clean, distraction-free reading interface with powerful content management tools, making it the perfect place for everyone from casual writers to serious content creators to share their voice with the world.

## �🚀 Key Features

### 🔐 Authentication & Security
- **Secure Login & Signup**: Powered by Firebase Authentication.
- **Route Protection**: `AuthGuard` and `PublicGuard` ensure secure access control.
- **Session Management**: Automatic session expiry handling and user persistence.

### 📝 Post Management
- **CRUD Operations**: Create, Read, Update, and Delete posts seamlessly.
- **Real-time Updates**: Instant data synchronization using Cloud Firestore.
- **Rich Text Support**: (Expandable for future rich text features).

### 🎨 User Experience & Interface
- **Responsive Design**: Fully responsive layout optimized for mobile and desktop.
- **Theme Support**: Built-in Light and Dark mode preferences saved to user profile.
- **Advanced Filtering**: Sort posts by date, title, or view specific subsets.
- **Interactive Feedback**: Toast notifications and confirmation dialogs for user actions.
- **Loading States**: Skeleton loaders and spinners for smooth perceived performance.

### ⚡ Performance & quality
- **Optimized Rendering**: Extensive use of `React.memo` and `useMemo` to minimize re-renders.
- **Code Splitting**: Route-based lazy loading with `React.lazy` and `Suspense`.
- **Error Handling**: React Error Boundaries to gracefully handle runtime errors.
- **Type Safety**: Prop validation and consistent state management.

## 🛠️ Technology Stack

- **Frontend Framework**: React 19
- **State Management**: Redux Toolkit (Slices, Thunks, Selectors)
- **Routing**: React Router v7
- **Backend / Database**: Firebase (Auth, Firestore)
- **Styling**: CSS Modules, CSS Variables
- **Build Tool**: Vite

## 📦 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <project-folder>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   Create a `.env.local` file in the root directory and add your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
