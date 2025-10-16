# Add-Ons:
- [x] Add date to each post at the bottom.

## Steps to Complete:
- [x] Remove unnecessary validation code from PostForm.jsx (useState errors, validate function, handleSave, onChange on form)
- [x] Add errors state to PostManager.jsx
- [x] Add validate function to PostManager.jsx
- [x] Modify handleSave in PostManager.jsx to validate before dispatching savePost
- [x] Pass errors as props to PostForm.jsx
- [x] Update PostForm.jsx to receive errors as props and display them
- [x] Clear errors when editing starts or when title/content changes in PostManager.jsx
- [x] When search results are empty, disable pagination (no switching between empty pages).
- [x] Fix search so it works correctly on all pages, not just page one.
- [x] Implement proper sorting functionality for posts.
- [x] Ensure the browser remembers scroll position when navigating back to the posts list.
- [x] Add a **Delete Selected** button if it’s missing.
- [x] When adding a new post from page 2 (or beyond), the user should remain on the same page instead of being redirected to page 1.
- [x] Add a **Home (font icon)** next to the "All Posts" title.
- [x] Add a **Delete (font icon)** for each individual post with delete functionality.