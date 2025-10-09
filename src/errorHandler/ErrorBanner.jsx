import { useSelector, useDispatch } from 'react-redux';
import { clearError } from './errorSlice';

function ErrorBanner() {
  const errors = useSelector(state => state.errors);
  const dispatch = useDispatch();

  if (!errors) return null;

  return (
    <div className="error-banner">
      {errors}
      <button onClick={() => dispatch(clearError())}>Dismiss</button>
    </div>
  );
}
