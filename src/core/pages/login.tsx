import { useState } from 'react';
import { login } from '../api/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const [phone_number, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login: authLogin } = useAuth();
  
  console.log('[LoginPage] Rendering login page');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      console.log('[LoginPage] Attempting login with phone:', phone_number);
      const response = await login({ phone_number, password });
      console.log('[LoginPage] Login successful, got token');
      
      // Use the auth context to set the user
      authLogin(response.access);
      
      // Navigate to the redirected location or home
      const from = location.state?.from?.pathname || '/';
      console.log('[LoginPage] Redirecting to:', from);
      navigate(from, { replace: true });
    } catch (err) {
      // Error is automatically handled by axios interceptor
    } finally {
      setIsLoading(false);
    }
  };

  // Custom mask for +998 phone numbers, no spaces
  const formatUzPhone = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('998')) digits = digits.slice(3);
    digits = digits.slice(0, 9);
    return '+998' + digits;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="flex flex-col items-center space-y-4">
          <img
            src="/smart-sawda.png"
            alt="Smart Sawda Logo"
            className="h-16 w-auto"
          />
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Войти в аккаунт
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="username" className="sr-only">
                Имя пользователя
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="+998970953905"
                value={phone_number}
                onChange={(e) => setPhoneNumber(formatUzPhone(e.target.value))}
                maxLength={13}
                inputMode="numeric"
                autoComplete="tel"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {isLoading ? 'Выполняется вход...' : 'Войти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}