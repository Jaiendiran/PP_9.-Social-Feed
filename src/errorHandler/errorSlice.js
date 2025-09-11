const errorSlice = createSlice({
  name: 'error',
  initialState: null,
  reducers: {
    setError: (_, action) => action.payload,
    clearError: () => null
  }
});
export const { setError, clearError } = errorSlice.actions;
export default errorSlice.reducer;
