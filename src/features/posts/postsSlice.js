import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';


export const fetchPosts = createAsyncThunk('posts/fetchPosts', async () => {
  const response = await new Promise(resolve => {
    setTimeout(() => {
      resolve(
        [
          { id: '1', title: 'First Post!', content: 'Hello!' },
          { id: '2', title: 'Second Post', content: 'More text' }
        ]
      );  
    }, 1000);
  });
  return response;
});

const postsSlice = createSlice({
  name: 'posts',
  initialState: [],
  reducers: {
    postAdded(state, action) {
      state.push(action.payload);
    }
  },
  extraReducers: builder => {
    builder.addCase(fetchPosts.fulfilled, (state, action) => {
      return action.payload;
    });
  }
});

export const { postAdded } = postsSlice.actions;
export default postsSlice.reducer;
