import React from 'react';
import PostsList from './features/posts/PostsList';
import AddPostForm from './features/posts/AddPostForm';

function App() {
  return (
    <main>
      <AddPostForm />
      <PostsList />
    </main>
  );
}

export default App;
