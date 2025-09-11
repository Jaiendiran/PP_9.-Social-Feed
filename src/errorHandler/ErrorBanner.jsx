import { useSelector, useDispatch } from 'react-redux';
import { clearError } from './errorSlice';

function ErrorBanner() {
  const error = useSelector(state => state.error);
  const dispatch = useDispatch();

  if (!error) return null;

  return (
    <div className="error-banner">
      {error}
      <button onClick={() => dispatch(clearError())}>Dismiss</button>
    </div>
  );
}
