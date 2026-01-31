import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/app');
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      navigate('/app');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8 animate-fade-in">
        <h1 className="text-3xl text-pine-900">Welcome to YumTrail</h1>
        <p className="mt-2 text-sm text-mist-700">
          Cozy meal moments become points for each kid and the whole family.
        </p>

        <div className="mt-6 space-y-4">
          {error ? <p className="text-sm text-sun-700">{error}</p> : null}
          <button className="btn-primary w-full" type="button" onClick={handleGoogleSignIn} disabled={loading}>
            {loading ? 'Connecting...' : 'Continue with Google'}
          </button>
          <p className="text-xs text-mist-600">
            Sign in with Google to create or access your family account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
