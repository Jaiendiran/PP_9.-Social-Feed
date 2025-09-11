# TODO: Fix Error Handling in PostForm.jsx

## Steps to Complete:
- [x] Remove unnecessary validation code from PostForm.jsx (useState errors, validate function, handleSave, onChange on form)
- [x] Add errors state to PostManager.jsx
- [x] Add validate function to PostManager.jsx
- [x] Modify handleSave in PostManager.jsx to validate before dispatching savePost
- [x] Pass errors as props to PostForm.jsx
- [x] Update PostForm.jsx to receive errors as props and display them
- [x] Clear errors when editing starts or when title/content changes in PostManager.jsx
