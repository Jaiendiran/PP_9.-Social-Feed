import { createSlice } from "@reduxjs/toolkit";

const errorSlice = createSlice({
  name: 'errors',
  initialState: null,
  reducers: {
    setError: (_, action) => action.payload,
    clearError: () => null
  }
});
export const { setError, clearError } = errorSlice.actions;
export default errorSlice.reducer;
